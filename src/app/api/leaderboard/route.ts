import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { client } from "@/app/client";
import { base } from "thirdweb/chains";
import {
  getContract,
  getContractEvents,
  prepareEvent,
  readContract,
} from "thirdweb";
import { eth_blockNumber, eth_getBlockByNumber } from "thirdweb/rpc";
import { getRpcClient } from "thirdweb/rpc";
import NodeCache from "node-cache";

// Initialize cache
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const CACHE_KEY = "leaderboard";
const LAST_BLOCK_KEY = "last_fetched_block";
const NEYNAR_CACHE_KEY = "neynar_users";

// Define types
interface ClaimedEvent {
  args: {
    marketId: bigint;
    user: string;
    amount: bigint;
  };
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

// Contract ABI
const CONTRACT_ABI = [
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "bettingToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

// Initialize contract
const contract = getContract({
  client,
  chain: base,
  address: "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6",
  abi: CONTRACT_ABI,
});

const CLAIMED_EVENT = prepareEvent({
  signature:
    "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)",
});

// Retry utility
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

export async function GET() {
  try {
    console.log("🚀 Starting leaderboard fetch...");

    // Check cache
    const cachedLeaderboard = cache.get<LeaderboardEntry[]>(CACHE_KEY);
    if (cachedLeaderboard) {
      console.log("✅ Serving from cache");
      return NextResponse.json(cachedLeaderboard);
    }

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

    // Fetch latest block number and timestamp
    console.log("🔗 Fetching latest block number...");
    const rpcClient = getRpcClient({ client, chain: base });
    const latestBlock = await withRetry(() => eth_blockNumber(rpcClient));
    const blockInfo = await withRetry(() =>
      eth_getBlockByNumber(rpcClient, { blockNumber: latestBlock })
    );
    const lastUpdated = Number(blockInfo.timestamp) * 1000; // Convert to ms
    console.log(`🔢 Latest block: ${latestBlock}, Timestamp: ${lastUpdated}`);

    // Fetch bettingToken metadata
    const bettingTokenAddress = await readContract({
      contract,
      method: "bettingToken",
      params: [],
    });
    const tokenContract = getContract({
      client,
      chain: base,
      address: bettingTokenAddress,
    });
    const [tokenSymbol, tokenDecimals] = await Promise.all([
      readContract({
        contract: tokenContract,
        method: "function symbol() view returns (string)",
        params: [],
      }),
      readContract({
        contract: tokenContract,
        method: "function decimals() view returns (uint8)",
        params: [],
      }),
    ]);
    console.log(`💸 Token: ${tokenSymbol}, Decimals: ${tokenDecimals}`);

    // Fetch Claimed events
    console.log("📦 Fetching Claimed events...");
    const DEPLOYMENT_BLOCK = BigInt(29490017);
    const cachedBlock = cache.get<string>(LAST_BLOCK_KEY);
    let fromBlock = cachedBlock ? BigInt(cachedBlock) : DEPLOYMENT_BLOCK;
    const blockRange = BigInt(700);
    const allEvents: ClaimedEvent[] = [];

    while (fromBlock <= latestBlock) {
      const toBlock =
        fromBlock + blockRange - BigInt(1) > latestBlock
          ? latestBlock
          : fromBlock + blockRange - BigInt(1);
      if (toBlock < fromBlock) {
        console.log(`🏁 Reached end of blocks to scan.`);
        break;
      }
      console.log(`📄 Fetching events from block ${fromBlock} to ${toBlock}`);
      const events = await withRetry(() =>
        getContractEvents({
          contract,
          events: [CLAIMED_EVENT],
          fromBlock,
          toBlock,
        })
      );
      allEvents.push(...(events as ClaimedEvent[]));
      console.log(`✅ Fetched ${events.length} events in this batch.`);
      fromBlock = toBlock + BigInt(1);
    }

    console.log(`🧾 Total Claimed events fetched: ${allEvents.length}`);

    // Aggregate winnings
    console.log("💰 Aggregating winnings...");
    const winnersMap = new Map<string, number>();
    for (const event of allEvents) {
      if (
        !event.args ||
        typeof event.args.user !== "string" ||
        typeof event.args.amount === "undefined"
      ) {
        console.warn("⚠️ Invalid event args:", JSON.stringify(event, null, 2));
        continue;
      }
      const user = event.args.user.toLowerCase();
      const amountWei = BigInt(event.args.amount);
      const amountDecimal = Number(amountWei) / Math.pow(10, tokenDecimals);
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
      try {
        const newUsersMap = await withRetry(() =>
          neynar.fetchBulkUsersByEthOrSolAddress({
            addresses: addressesToFetch,
            addressTypes: ["custody_address", "verified_address"],
          })
        );
        // Transform raw users to NeynarUser
        const transformedUsersMap: Record<string, NeynarUser[]> = {};
        for (const [address, users] of Object.entries(newUsersMap)) {
          transformedUsersMap[address] = users.map((user: NeynarRawUser) => ({
            username: user.username,
            fid: user.fid.toString(),
            pfp_url: user.pfp_url || null,
          }));
        }
        addressToUsersMap = { ...addressToUsersMap, ...transformedUsersMap };
        cache.set(NEYNAR_CACHE_KEY, addressToUsersMap);
        console.log(
          `✅ Neynar responded. Found users for ${
            Object.keys(transformedUsersMap).length
          } addresses.`
        );
      } catch (neynarError) {
        console.error("❌ Neynar API error:", neynarError);
      }
    } else {
      console.log("🤷 All addresses cached for Neynar.");
    }

    // Build leaderboard
    console.log("🧠 Building leaderboard...");
    const leaderboard: LeaderboardEntry[] = winners
      .map((winner) => {
        const usersForAddress = addressToUsersMap[winner.address];
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

    // Cache leaderboard and last block
    cache.set(CACHE_KEY, leaderboard);
    if (fromBlock > latestBlock) {
      // This means the loop completed fully
      cache.set(LAST_BLOCK_KEY, latestBlock.toString());
    }
    console.log("✅ Cached leaderboard and last block");

    return NextResponse.json({
      leaderboard,
      tokenSymbol,
      lastUpdated,
    });
  } catch (error) {
    console.error("❌ Leaderboard fetch error:", error);
    console.error((error as Error).stack);
    return NextResponse.json(
      {
        error: "Failed to fetch leaderboard",
        details: (error as Error).message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
