import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk"; 
import { client } from "@/app/client";
import { base } from "thirdweb/chains";
import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { eth_blockNumber } from "thirdweb/rpc";
import { getRpcClient } from "thirdweb/rpc";

export enum BulkUserAddressType {
  CustodyAddress = "custody_address",
  VerifiedAddress = "verified_address",
}
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
    anonymous: false, // Added for clarity if needed by thirdweb prepareEvent
  },
] as const;

// Initialize contract
const contract = getContract({
  client,
  chain: base,
  address: "0xD3fa48B3bb4f89bF3B75F5763475B774076215D1",
  abi: CONTRACT_ABI,
});

// Prepare the Claimed event - Ensure signature matches EXACTLY or use the ABI object
// Using ABI object is generally safer if ABI is stable

const CLAIMED_EVENT = prepareEvent({
  signature:
    "event Claimed(uint256 indexed marketId, address indexed user, uint256 amount)",
});

export async function GET() {
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
    let neynar: NeynarAPIClient;
    try {
      // Correct initialization if using apiKey directly (check SDK constructor)
      // If the SDK expects an object like { apiKey: '...' }, use that.
      // Based on the provided SDK structure, it seems to expect a Configuration object.
      // Let's assume your previous initialization was correct for your SDK version.
      // If not, adjust according to the actual SDK constructor.
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
      neynar = new NeynarAPIClient({ apiKey: neynarApiKey } as any); // Use 'as any' if type mismatch, or fix config
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

    // --- Test call (keep or remove as needed) ---
    try {
      const testAddress = "0x209296518BFFe5F06cB7131D85764D0339b21f1a";
      console.log(`🧪 Running test Neynar call for address: ${testAddress}`);
      const testResponse = await neynar.fetchBulkUsersByEthOrSolAddress({
        addresses: [testAddress],
        addressTypes: [
          BulkUserAddressType.CustodyAddress,
          BulkUserAddressType.VerifiedAddress,
        ], // Use Enum
      });
      console.log(
        "🧪 Test Neynar Response Structure:",
        JSON.stringify(testResponse, null, 2)
      );
    } catch (testError) {
      console.error("🧪 Test Neynar call failed:", testError);
    }
    // --- End Test call ---

    // Fetch latest block number
    console.log("🔗 Fetching latest block number...");
    const rpcClient = getRpcClient({ client, chain: base });
    const latestBlock = await eth_blockNumber(rpcClient);
    console.log(`🔢 Latest block: ${latestBlock}`);

    // Fetch Claimed events with pagination
    console.log("📦 Fetching Claimed events...");
    const DEPLOYMENT_BLOCK = BigInt(28965072); // Confirmed deployment block
    const blockRange = BigInt(10000); // Max 10,000 blocks per request seems reasonable
    let fromBlock = DEPLOYMENT_BLOCK;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allEvents: any[] = []; // Consider using a more specific type if possible

    while (fromBlock <= latestBlock) {
      const toBlock =
        fromBlock + blockRange - BigInt(1) > latestBlock // Subtract 1 for inclusive range
          ? latestBlock
          : fromBlock + blockRange - BigInt(1);
      // Prevent fetching negative range if latestBlock < fromBlock (shouldn't happen here)
      if (toBlock < fromBlock) {
        console.log(`🏁 Reached end of blocks to scan (or invalid range).`);
        break;
      }
      console.log(`📄 Fetching events from block ${fromBlock} to ${toBlock}`);
      try {
        const events = await getContractEvents({
          contract,
          events: [CLAIMED_EVENT],
          fromBlock,
          toBlock,
        });
        console.log(`✅ Fetched ${events.length} events in this batch.`);
        allEvents.push(...events);
        fromBlock = toBlock + BigInt(1);
      } catch (eventError) {
        console.error(
          `❌ Error fetching events from ${fromBlock} to ${toBlock}:`,
          eventError
        );
        // Optional: Decide how to handle errors - skip block range, retry, stop?
        // For now, let's skip this range and continue
        console.warn(
          `⚠️ Skipping block range ${fromBlock}-${toBlock} due to error.`
        );
        fromBlock = toBlock + BigInt(1);
      }
    }

    console.log(`🧾 Total Claimed events fetched: ${allEvents.length}`);
    if (allEvents.length > 0) {
      console.log(
        "👀 Sample Event Data:",
        allEvents.slice(0, 3).map((e) => ({
          marketId: e.args?.marketId?.toString(),
          user: e.args?.user,
          amount: e.args?.amount?.toString(),
          blockNumber: e.blockNumber?.toString(),
        }))
      );
    }

    // Aggregate winnings
    console.log("💰 Aggregating winnings...");
    const TOKEN_DECIMALS = 18; // Verify with token contract (0x55b04F15...)
    const winnersMap = new Map<string, number>();
    for (const event of allEvents) {
      // Add more robust checking for event args
      if (
        !event.args ||
        typeof event.args.user !== "string" ||
        typeof event.args.amount === "undefined"
      ) {
        console.warn(
          "⚠️ Invalid or missing event args:",
          JSON.stringify(event, null, 2)
        );
        continue;
      }
      const user = event.args.user.toLowerCase(); // Use lowercase for consistent map keys
      const amountWei = BigInt(event.args.amount); // Keep as BigInt initially
      const amountDecimal = Number(amountWei) / Math.pow(10, TOKEN_DECIMALS);

      console.log(
        `💸 Processing: user=${user}, marketId=${event.args.marketId}, amount=${amountDecimal}`
      );
      const currentWinnings = winnersMap.get(user) || 0;
      winnersMap.set(user, currentWinnings + amountDecimal);
    }
    console.log("📊 Winners map:", Array.from(winnersMap.entries()));

    // Convert to array of winners
    const winners = Array.from(winnersMap.entries()).map(
      ([address, winnings]) => ({
        address, // Already lowercase
        winnings,
      })
    );
    console.log("🏅 Winners extracted:", winners);

    // Fetch Farcaster usernames
    console.log(" Farcaster users...");
    const addressesToFetch = winners.map((w) => w.address);
    // Define the type for the map explicitly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let addressToUsersMap: Record<string, any[]> = {};

    if (addressesToFetch.length > 0) {
      console.log(
        `📬 Requesting Neynar for ${addressesToFetch.length} addresses:`,
        addressesToFetch
      );
      try {
        // CORRECT: Get the map response
        addressToUsersMap = await neynar.fetchBulkUsersByEthOrSolAddress({
          addresses: addressesToFetch,
          // Use Enum for safety if available and imported
          addressTypes: [
            BulkUserAddressType.CustodyAddress,
            BulkUserAddressType.VerifiedAddress,
          ],
        });
        console.log(
          `✅ Neynar responded. Found users for ${
            Object.keys(addressToUsersMap).length
          } addresses.`
        );
        console.log(
          "📄 Raw Neynar address-to-user map:",
          JSON.stringify(addressToUsersMap, null, 2)
        );
      } catch (neynarError) {
        console.error("❌ Neynar API error:", neynarError);
        // Keep addressToUsersMap as empty {}
      }
    } else {
      console.log("🤷 No addresses to fetch from Neynar.");
    }

    // Build leaderboard
    console.log("🧠 Building leaderboard...");
    const leaderboard = winners
      .map((winner) => {
        console.log(`🔗 Matching address: ${winner.address}`);
        // CORRECT: Look up in the map using the winner's address (already lowercase)
        const usersForAddress = addressToUsersMap[winner.address];
        // Take the first user found for that address (usually the correct one)
        const user =
          usersForAddress && usersForAddress.length > 0
            ? usersForAddress[0]
            : undefined;

        console.log(
          `➡️ Matched user:`,
          user ? { fid: user.fid, username: user.username } : undefined
        );
        return {
          username: user?.username || "Unknown", // Use optional chaining
          fid: user?.fid || 0, // Use optional chaining
          pfp_url: user?.pfp_url || null, // Add profile picture URL
          winnings: winner.winnings,
          address: winner.address, // Include address for debugging/display
        };
      })
      .sort((a, b) => b.winnings - a.winnings) // Sort by winnings descending
      .slice(0, 10); // Take top 10

    console.log("🏆 Final Leaderboard:", leaderboard);

    // Return the leaderboard
    // Consider adding caching headers here if appropriate
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("❌ Leaderboard fetch error:", error);
    // Log the stack trace for better debugging
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
