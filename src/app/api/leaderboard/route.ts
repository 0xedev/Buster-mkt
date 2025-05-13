import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import NodeCache from "node-cache";
import {
  publicClient,
  contractAddress,
  contractAbi,
  tokenAddress as defaultTokenAddress,
  tokenAbi as defaultTokenAbi,
} from "@/constants/contract";
import { Address, parseAbiItem } from "viem";

// Initialize cache
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 }); // 1-hour TTL
const EVENT_CACHE_KEY = "claimed_events";
const CACHE_KEY = "leaderboard";
const LAST_BLOCK_KEY = "last_fetched_block";
const NEYNAR_CACHE_KEY = "neynar_users";
const MAX_CONCURRENT_REQUESTS = 1; // Reduced to 1 to avoid rate limits

// Define types
interface ClaimedEvent {
  marketId: bigint;
  user: Address;
  amount: bigint;
  blockNumber: bigint;
}

interface NeynarRawUser {
  username: string;
  fid: number;
  pfp_url?: string;
}

interface NeynarUser {
  username: string;
  fid: string;
  pfp_url: string | null;
}

interface LeaderboardEntry {
  username: string;
  fid: string;
  pfp_url: string | null;
  winnings: number;
  address: string;
}

// Enhanced retry with 429 handling
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 2000 // Increased base delay
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (i === retries - 1) throw error;
      let delay = baseDelay * Math.pow(2, i); // Exponential backoff
      console.warn(`Retry ${i + 1}/${retries} failed:`, error);

      // Handle 429 Too Many Requests
      if (error?.status === 429) {
        delay = Math.max(delay, 10000); // Wait 10s for rate limit
        console.warn(`Rate limit hit, waiting ${delay}ms`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

// Batch utility for Neynar calls
async function batchFetchNeynarUsers(
  neynar: NeynarAPIClient,
  addresses: string[],
  batchSize = 25
): Promise<Record<string, NeynarUser[]>> {
  const result: Record<string, NeynarUser[]> = {};
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    try {
      const usersMap = await withRetry(() =>
        neynar.fetchBulkUsersByEthOrSolAddress({
          addresses: batch,
          addressTypes: ["custody_address", "verified_address"],
        })
      );
      for (const [address, users] of Object.entries(usersMap)) {
        result[address.toLowerCase()] = users.map((user: NeynarRawUser) => ({
          username: user.username,
          fid: user.fid.toString(),
          pfp_url: user.pfp_url || null,
        }));
      }
    } catch (error) {
      console.error(
        `Failed to fetch Neynar batch ${i / batchSize + 1}:`,
        error
      );
    }
  }
  return result;
}

// Throttle concurrent requests
async function throttleRequests<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map((task) => task()));
    results.push(...batchResults);
  }
  return results;
}

export async function GET() {
  // Return cached leaderboard immediately if available
  const cachedLeaderboard = cache.get<LeaderboardEntry[]>(CACHE_KEY);
  if (cachedLeaderboard) {
    console.log("✅ Serving from cache");
    return NextResponse.json(cachedLeaderboard);
  }

  try {
    console.log("🚀 Starting leaderboard fetch...");

    // Validate environment variables
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("❌ NEYNAR_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error: Missing NEYNAR_API_KEY" },
        { status: 500 }
      );
    }

    // Initialize Neynar client
    const neynar = new NeynarAPIClient({ apiKey: neynarApiKey });
    console.log("✅ Neynar client initialized.");

    // Fetch latest block number
    console.log("🔗 Fetching latest block number...");
    const latestBlock = await withRetry(() => publicClient.getBlockNumber());
    console.log(`🔢 Latest block: ${latestBlock}`);

    // Fetch token metadata using multicall
    const [tokenSymbol, tokenDecimals] = await withRetry(() =>
      publicClient.multicall({
        contracts: [
          {
            address: contractAddress,
            abi: contractAbi,
            functionName: "bettingToken",
          },
          {
            address: defaultTokenAddress,
            abi: defaultTokenAbi,
            functionName: "symbol",
          },
          {
            address: defaultTokenAddress,
            abi: defaultTokenAbi,
            functionName: "decimals",
          },
        ],
      })
    ).then((results) => [
      (results[0].result as Address) || defaultTokenAddress,
      results[1].result as string,
      Number(results[2].result),
    ]);
    console.log(`💸 Token: ${tokenSymbol}, Decimals: ${tokenDecimals}`);

    // Fetch Claimed events
    console.log("📦 Fetching Claimed events...");
    const DEPLOYMENT_BLOCK = BigInt(29490017);
    const cachedBlock = cache.get<string>(LAST_BLOCK_KEY);
    let fromBlock = cachedBlock ? BigInt(cachedBlock) : DEPLOYMENT_BLOCK;
    const blockRange = BigInt(500); // Alchemy's limit
    const cachedEvents = cache.get<ClaimedEvent[]>(EVENT_CACHE_KEY) || [];
    const allEvents: ClaimedEvent[] = [...cachedEvents];
    const fetchTasks: (() => Promise<void>)[] = [];

    while (fromBlock <= latestBlock) {
      const toBlock =
        fromBlock + blockRange - 1n > latestBlock
          ? latestBlock
          : fromBlock + blockRange - 1n;
      if (toBlock < fromBlock) break;

      fetchTasks.push(async () => {
        console.log(`📄 Fetching events from block ${fromBlock} to ${toBlock}`);
        try {
          const logs = await withRetry(() =>
            publicClient.getLogs({
              address: contractAddress,
              event: parseAbiItem(
                "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)"
              ),
              fromBlock,
              toBlock,
            })
          );
          const formattedEvents = logs
            .filter((log) => log.args.user && log.args.amount)
            .map((log) => ({
              marketId: log.args.marketId!,
              user: log.args.user!,
              amount: log.args.amount!,
              blockNumber: log.blockNumber,
            }));
          allEvents.push(...formattedEvents);
          console.log(
            `✅ Fetched ${formattedEvents.length} events from ${fromBlock} to ${toBlock}`
          );
        } catch (error) {
          console.error(
            `❌ Error fetching events for block range ${fromBlock}-${toBlock}:`,
            error
          );
          throw error; // Let retry handle this
        }
      });

      fromBlock = toBlock + 1n;
    }

    // Throttle requests to avoid rate limits
    await throttleRequests(
      fetchTasks.map((task) => async () => {
        await task();
      }),
      MAX_CONCURRENT_REQUESTS
    );

    console.log(`🧾 Total Claimed events fetched: ${allEvents.length}`);

    // Deduplicate and sort events
    const uniqueEvents = Array.from(
      new Map(
        allEvents.map((e) => [`${e.user}-${e.marketId}-${e.blockNumber}`, e])
      ).values()
    ).sort((a, b) => Number(a.blockNumber - b.blockNumber));

    // Cache events
    cache.set(EVENT_CACHE_KEY, uniqueEvents, 0); // No TTL for immutable data
    cache.set(LAST_BLOCK_KEY, latestBlock.toString());
    console.log("✅ Cached events and last block");

    // Aggregate winnings
    console.log("💰 Aggregating winnings...");
    const winnersMap = new Map<string, number>();
    for (const event of uniqueEvents) {
      const user = event.user.toLowerCase();
      const amountWei = event.amount;
      const amountDecimal =
        Number(amountWei) / Math.pow(10, Number(tokenDecimals));
      winnersMap.set(user, (winnersMap.get(user) || 0) + amountDecimal);
    }
    console.log("📊 Winners map:", Array.from(winnersMap.entries()));

    // Convert to winners array
    const winners = Array.from(winnersMap.entries()).map(
      ([address, winnings]) => ({
        address,
        winnings,
      })
    );
    console.log("🏅 Winners extracted:", winners);

    // Fetch Farcaster usernames
    console.log("📬 Fetching Farcaster users...");
    const neynarCache =
      cache.get<Record<string, NeynarUser[]>>(NEYNAR_CACHE_KEY) || {};
    const addressesToFetch = winners
      .map((w) => w.address)
      .filter((addr) => !neynarCache[addr]);
    let addressToUsersMap: Record<string, NeynarUser[]> = { ...neynarCache };

    if (addressesToFetch.length > 0) {
      console.log(
        `📬 Requesting Neynar for ${addressesToFetch.length} addresses`
      );
      const newUsersMap = await batchFetchNeynarUsers(neynar, addressesToFetch);
      addressToUsersMap = { ...addressToUsersMap, ...newUsersMap };
      cache.set(NEYNAR_CACHE_KEY, addressToUsersMap, 86400); // 1-day TTL
      console.log(
        `✅ Neynar responded. Found users for ${
          Object.keys(newUsersMap).length
        } addresses.`
      );
    }

    // Build leaderboard
    console.log("🧠 Building leaderboard...");
    const leaderboard: LeaderboardEntry[] = winners
      .map((winner) => {
        const usersForAddress = addressToUsersMap[winner.address.toLowerCase()];
        const user =
          usersForAddress && usersForAddress.length > 0
            ? usersForAddress[0]
            : undefined;
        return {
          username:
            user?.username ||
            `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`,
          fid: user?.fid || "nil",
          pfp_url: user?.pfp_url || null,
          winnings: winner.winnings,
          address: winner.address,
        };
      })
      .sort((a, b) => b.winnings - a.winnings)
      .slice(0, 10);

    console.log("🏆 Final Leaderboard:", leaderboard);

    // Cache leaderboard
    cache.set(CACHE_KEY, leaderboard);
    console.log("✅ Cached leaderboard");

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("❌ Leaderboard fetch error:", error);
    console.error((error as Error).stack);

    // Fallback to cached leaderboard
    const cachedLeaderboard = cache.get<LeaderboardEntry[]>(CACHE_KEY);
    if (cachedLeaderboard) {
      console.log("✅ Serving cached leaderboard due to error");
      return NextResponse.json(cachedLeaderboard);
    }

    return NextResponse.json(
      {
        error: "Failed to fetch leaderboard",
        details: "Rate limit exceeded. Please try again later.",
      },
      { status: 429 } // Return 429 instead of 500
    );
  }
}
