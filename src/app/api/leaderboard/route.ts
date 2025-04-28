import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { client } from "@/app/client";
import { base } from "thirdweb/chains";
import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { eth_blockNumber } from "thirdweb/rpc";
import { getRpcClient } from "thirdweb/rpc";
import NodeCache from "node-cache";

// Initialize cache with 5-minute TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const CACHE_KEY = "leaderboard";
const LAST_BLOCK_KEY = "last_fetched_block";
const NEYNAR_CACHE_KEY = "neynar_users";

// Define the contract ABI
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

// Retry utility for RPC calls
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
    const cachedLeaderboard = cache.get(CACHE_KEY);
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
    let neynar: NeynarAPIClient;
    try {
      neynar = new NeynarAPIClient({ apiKey: neynarApiKey } as any);
      console.log("✅ Neynar client initialized.");
    } catch (error) {
      console.error("❌ Failed to initialize Neynar client:", error);
      return NextResponse.json(
        {
          error: "Failed to initialize Neynar client",
          details: (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Fetch latest block number
    console.log("🔗 Fetching latest block number...");
    const rpcClient = getRpcClient({ client, chain: base });
    const latestBlock = await withRetry(() => eth_blockNumber(rpcClient));
    console.log(`🔢 Latest block: ${latestBlock}`);

    // Fetch Claimed events with pagination
    console.log("📦 Fetching Claimed events...");
    const DEPLOYMENT_BLOCK = BigInt(28965072);
    const cachedBlock = cache.get<string>(LAST_BLOCK_KEY);
    let fromBlock = cachedBlock ? BigInt(cachedBlock) : DEPLOYMENT_BLOCK;
    const blockRange = BigInt(1000);
    let allEvents: any[] = [];

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
      console.log(`✅ Fetched ${events.length} events in this batch.`);
      allEvents.push(...events);
      fromBlock = toBlock + BigInt(1);
    }

    console.log(`🧾 Total Claimed events fetched: ${allEvents.length}`);

    // Aggregate winnings in parallel
    console.log("💰 Aggregating winnings...");
    const TOKEN_DECIMALS = 18;
    const winnersMap = new Map<string, number>();
    await Promise.all(
      allEvents.map(async (event) => {
        if (
          !event.args ||
          typeof event.args.user !== "string" ||
          typeof event.args.amount === "undefined"
        ) {
          console.warn(
            "⚠️ Invalid event args:",
            JSON.stringify(event, null, 2)
          );
          return;
        }
        const user = event.args.user.toLowerCase();
        const amountWei = BigInt(event.args.amount);
        const amountDecimal = Number(amountWei) / Math.pow(10, TOKEN_DECIMALS);

        winnersMap.set(user, (winnersMap.get(user) || 0) + amountDecimal);
      })
    );
    console.log("📊 Winners map:", Array.from(winnersMap.entries()));

    // Convert to array of winners
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
      cache.get<Record<string, any[]>>(NEYNAR_CACHE_KEY) || {};
    const addressesToFetch = winners
      .map((w) => w.address)
      .filter((addr) => !neynarCache[addr]);
    let addressToUsersMap: Record<string, any[]> = { ...neynarCache };

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
        addressToUsersMap = { ...addressToUsersMap, ...newUsersMap };
        cache.set(NEYNAR_CACHE_KEY, addressToUsersMap);
        console.log(
          `✅ Neynar responded. Found users for ${
            Object.keys(newUsersMap).length
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
    const leaderboard = winners
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
    cache.set(LAST_BLOCK_KEY, latestBlock.toString());
    console.log("✅ Cached leaderboard and last block");

    return NextResponse.json(leaderboard);
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
