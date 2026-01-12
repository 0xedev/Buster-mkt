import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  V2contractAddress,
  V2contractAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";

const alchemyRpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
if (!alchemyRpc && process.env.NODE_ENV === "production") {
  throw new Error(
    "Missing NEXT_PUBLIC_ALCHEMY_RPC_URL (required in production). Please set it in your environment."
  );
}

const publicClient = createPublicClient({
  chain: base,
  transport: http(alchemyRpc || "https://mainnet.base.org"),
});

// Typed wrappers to reduce any-casts
async function readCore<TReturn>(
  functionName: string,
  args: readonly any[] = []
): Promise<TReturn> {
  return (await publicClient.readContract({
    address: V2contractAddress,
    abi: V2contractAbi as any,
    functionName: functionName as any,
    args: args as any,
  })) as unknown as TReturn;
}

async function readView<TReturn>(
  functionName: string,
  args: readonly any[] = [],
  options: { silent?: boolean } = {}
): Promise<TReturn | null> {
  try {
    return (await publicClient.readContract({
      address: PolicastViews,
      abi: PolicastViewsAbi as any,
      functionName: functionName as any,
      args: args as any,
    })) as unknown as TReturn;
  } catch (error: any) {
    // Silently handle "Market does not exist" errors when checking markets
    if (
      options.silent &&
      (error?.message?.includes("Market does not exist") ||
        error?.shortMessage?.includes("Market does not exist") ||
        error?.reason?.includes("Market does not exist"))
    ) {
      return null;
    }
    throw error;
  }
}

interface UserWinnings {
  marketId: number;
  amount: bigint;
  hasWinnings: boolean;
  hasClaimed: boolean; // Track if user already claimed
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress } = body;

    if (!userAddress || typeof userAddress !== "string") {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    // Step 1: Discover markets where user participated
    const participatedMarkets = await discoverUserMarkets(userAddress);

    // Step 2: Check winnings eligibility AND claim status for each market
    const winningsData: UserWinnings[] = [];

    // Process sequentially to avoid RPC rate limits (markets count is usually small)
    for (const marketId of participatedMarkets) {
      try {
        // First, check if user has already claimed from this market
        const claimStatus = (await readCore<[boolean, boolean]>(
          "getUserClaimStatus",
          [BigInt(marketId), userAddress as `0x${string}`]
        )) as [boolean, boolean];
        const hasClaimed = claimStatus[0]; // claimedWinnings is first return value

        // Prefer Views.getUserWinnings(address,uint256)
        const abiHasFn =
          Array.isArray(PolicastViewsAbi) &&
          PolicastViewsAbi.some(
            (f: any) => f.type === "function" && f.name === "getUserWinnings"
          );

        if (!abiHasFn) {
          // Fallback: try core contract if view missing (older deployments)
          try {
            const result = (await readCore<readonly any[]>("getUserWinnings", [
              BigInt(marketId),
              userAddress as `0x${string}`,
            ])) as unknown;
            const r = result as readonly any[];
            const hasWinnings = Boolean(r[0]);
            const amount = BigInt(r[1] ?? 0n);
            if (hasWinnings && amount > 0n) {
              winningsData.push({
                marketId,
                amount,
                hasWinnings: true,
                hasClaimed,
              });
            }
            continue;
          } catch (err) {
            // Silently fallback
          }
        }

        // Call Views.getUserWinnings(address,uint256)
        const raw = (await readView<unknown>("getUserWinnings", [
          userAddress as `0x${string}`,
          BigInt(marketId),
        ])) as unknown;

        // Normalize raw to BigInt safely
        let amount = 0n;
        if (typeof raw === "bigint") {
          amount = raw;
        } else if (typeof raw === "number") {
          amount = BigInt(Math.trunc(raw));
        } else if (typeof raw === "string") {
          try {
            amount = BigInt(raw);
          } catch {
            amount = 0n;
          }
        } else if (raw && typeof (raw as any).toString === "function") {
          const s = (raw as any).toString();
          if (/^\d+$/.test(s)) {
            try {
              amount = BigInt(s);
            } catch {
              amount = 0n;
            }
          }
        }

        if (amount > 0n) {
          winningsData.push({
            marketId,
            amount,
            hasWinnings: true,
            hasClaimed,
          });
        }
      } catch (error) {
        // Silently continue with other markets
      }

      // small delay to reduce bursty RPC calls
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Serialize BigInt amounts to strings for JSON
    const winningsDataSerialized = winningsData.map((w) => ({
      marketId: w.marketId,
      amount: w.amount.toString(),
      hasWinnings: w.hasWinnings,
      hasClaimed: w.hasClaimed,
    }));

    return NextResponse.json({
      participatedMarkets,
      winningsData: winningsDataSerialized,
      totalMarkets: participatedMarkets.length,
      claimableMarkets: winningsDataSerialized.filter((w) => !w.hasClaimed)
        .length,
      claimedMarkets: winningsDataSerialized.filter((w) => w.hasClaimed).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to auto-discover user markets" },
      { status: 500 }
    );
  }
}

// Discover all markets where user participated
async function discoverUserMarkets(userAddress: string): Promise<number[]> {
  try {
    const markets = await readView<bigint[]>("getUserMarkets", [
      userAddress as `0x${string}`,
    ]);

    if (!markets || !Array.isArray(markets) || markets.length === 0) {
      return [];
    }

    const participatedMarkets = markets
      .map((m) => {
        try {
          return Number(m);
        } catch {
          return null;
        }
      })
      .filter((m): m is number => m !== null)
      .sort((a, b) => a - b);

    return participatedMarkets;
  } catch (error) {
    return [];
  }
}
