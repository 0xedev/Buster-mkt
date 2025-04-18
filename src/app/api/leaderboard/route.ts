import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { client } from "@/app/client";
import { base } from "thirdweb/chains";
import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { eth_blockNumber } from "thirdweb/rpc"; // Adjusted import path
import { getRpcClient } from "thirdweb/rpc";

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
  },
] as const;

// Initialize contract
const contract = getContract({
  client,
  chain: base,
  address: "0xD3fa48B3bb4f89bF3B75F5763475B774076215D1",
  abi: CONTRACT_ABI,
});

// Prepare the Claimed event
const CLAIMED_EVENT = prepareEvent({
  signature:
    "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)",
});

export async function GET() {
  try {
    console.log("Starting leaderboard fetch...");

    // Validate environment variables
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      console.error("NEYNAR_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error: Missing NEYNAR_API_KEY" },
        { status: 500 }
      );
    }

    // Initialize Neynar client
    let neynar: NeynarAPIClient;
    try {
      neynar = new NeynarAPIClient({ apiKey: neynarApiKey });
    } catch (error) {
      console.error("Failed to initialize Neynar client:", error);
      return NextResponse.json(
        {
          error: "Failed to initialize Neynar client",
          details: (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Fetch Claimed events with pagination
    console.log("Fetching Claimed events...");
    const DEPLOYMENT_BLOCK = 28965072n; // Confirmed deployment block

    const test = await neynar.fetchBulkUsersByEthOrSolAddress({
      addresses: ["0x209296518BFFe5F06cB7131D85764D0339b21f1a"],
    });
    console.log(test);

    // Use eth_blockNumber to fetch the latest block number
    const rpcClient = getRpcClient({ client, chain: base });
    const latestBlock = await eth_blockNumber(rpcClient);

    const blockRange = 10000n; // Max 10,000 blocks per request
    let fromBlock = DEPLOYMENT_BLOCK;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allEvents: any[] = [];

    while (fromBlock <= latestBlock) {
      const toBlock =
        fromBlock + blockRange > latestBlock
          ? latestBlock
          : fromBlock + blockRange;
      console.log(`Fetching events from block ${fromBlock} to ${toBlock}`);
      const events = await getContractEvents({
        contract,
        events: [CLAIMED_EVENT],
        fromBlock,
        toBlock,
      });
      allEvents.push(...events);
      fromBlock = toBlock + 1n;
    }

    console.log(
      `Fetched ${allEvents.length} Claimed events`,
      allEvents.map((e) => ({
        marketId: e.args.marketId.toString(),
        user: e.args.user,
        amount: e.args.amount.toString(),
      }))
    );

    // Aggregate winnings
    console.log("Aggregating winnings...");
    const TOKEN_DECIMALS = 18; // Verify with token contract (0x55b04F15...)
    const winnersMap = new Map<string, number>();
    for (const event of allEvents) {
      if (!event.args?.user || !event.args?.amount) {
        console.warn("Invalid event data:", JSON.stringify(event, null, 2));
        continue;
      }
      const user = event.args.user as string;
      const amount = Number(event.args.amount) / Math.pow(10, TOKEN_DECIMALS);
      console.log(
        `Event: marketId=${event.args.marketId}, user=${user}, amount=${amount}`
      );
      const currentWinnings = winnersMap.get(user) || 0;
      winnersMap.set(user, currentWinnings + amount);
    }
    console.log("Winners map:", Array.from(winnersMap.entries()));

    // Convert to array of winners
    const winners = Array.from(winnersMap.entries()).map(
      ([address, winnings]) => ({
        address,
        winnings,
      })
    );
    console.log("Winners:", winners);

    // Fetch Farcaster usernames
    console.log("Fetching Farcaster users...");
    const addresses = winners.map((w) => w.address);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let users: any[] = [];
    if (addresses.length > 0) {
      try {
        const response = await neynar.fetchBulkUsersByEthOrSolAddress({
          addresses,
        });
        users = response.users || [];
        console.log(
          "Neynar users:",
          users.map((u) => ({
            username: u.username,
            fid: u.fid,
            verifications: u.verifications,
          }))
        );
      } catch (neynarError) {
        console.error("Neynar API error:", neynarError);
        users = []; // Continue with empty users
      }
    } else {
      console.log("No addresses to fetch from Neynar");
    }

    // Build leaderboard
    console.log("Building leaderboard...");
    const leaderboard = winners
      .map((winner) => {
        const user = users.find((u) =>
          u.verifications?.some(
            (v: string) => v.toLowerCase() === winner.address.toLowerCase()
          )
        );
        console.log(`Mapping winner: address=${winner.address}, user=`, user);
        return {
          username: user?.username || "Unknown",
          fid: user?.fid || 0,
          winnings: winner.winnings,
        };
      })
      .sort((a, b) => b.winnings - a.winnings)
      .slice(0, 10);
    console.log("Leaderboard:", leaderboard);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch leaderboard",
        details: (error as Error).message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
