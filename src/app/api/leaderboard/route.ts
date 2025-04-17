import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { client } from "@/app/client";
import { base } from "thirdweb/chains";
import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { toEther } from "thirdweb";

// Initialize Neynar client
const neynar = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY! });

// Define the contract ABI (subset relevant to events)
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

// Initialize contract with ABI
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
    // Fetch all Claimed events from the contract
    const events = await getContractEvents({
      contract,
      events: [CLAIMED_EVENT],
      fromBlock: BigInt(28965072), // Adjust for pre-ES2020 if needed
      toBlock: "latest",
    });

    // Aggregate winnings by user address
    const winnersMap = new Map<string, number>();
    for (const event of events) {
      const user = event.args.user as string;
      const amount = Number(toEther(event.args.amount as bigint));
      const currentWinnings = winnersMap.get(user) || 0;
      winnersMap.set(user, currentWinnings + amount);
    }

    // Convert to array of winners
    const winners = Array.from(winnersMap.entries()).map(
      ([address, winnings]) => ({
        address,
        winnings,
      })
    );

    // Fetch Farcaster usernames for winner addresses
    const addresses = winners.map((w) => w.address);
    const { users } = await neynar.fetchBulkUsersByEthOrSolAddress({
      addresses,
    });

    // Build leaderboard with Farcaster data
    const leaderboard = winners
      .map((winner) => {
        const user = users.find((u) =>
          u.verifications?.includes(winner.address)
        );
        return {
          username: user?.username || "Unknown",
          fid: user?.fid || 0,
          winnings: winner.winnings,
        };
      })
      .sort((a, b) => b.winnings - a.winnings)
      .slice(0, 10); // Top 10 winners

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
