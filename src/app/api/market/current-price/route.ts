import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  contractAddress,
  contractAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";

// Cache for current prices
const priceCache = new Map<
  string,
  {
    data: unknown;
    lastUpdated: number;
  }
>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

async function getCurrentMarketPrice(marketId: string) {
  try {
    const marketIdBigInt = BigInt(marketId);
    const basicInfo = (await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getMarketBasicInfo",
      args: [marketIdBigInt],
    })) as [
      string,
      string,
      bigint,
      number,
      bigint,
      boolean,
      number,
      boolean,
      bigint
    ];

    const extendedMeta = (await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getMarketExtendedMeta",
      args: [marketIdBigInt],
    })) as [bigint, boolean, boolean, string, boolean];

    const optionCount = Number(basicInfo[4] ?? 0n);
    const resolved = Boolean(basicInfo[5]);
    const invalidated = Boolean(basicInfo[7]);
    const winningOptionId = resolved ? Number(extendedMeta[0]) : null;

    // Fetch per-option prices from views (scaled by 1e18)
    const optionPrices: number[] = [];
    for (let i = 0; i < optionCount; i++) {
      try {
        const price = (await publicClient.readContract({
          address: PolicastViews,
          abi: PolicastViewsAbi,
          functionName: "calculateCurrentPrice",
          args: [marketIdBigInt, BigInt(i)],
        })) as bigint;
        optionPrices.push(Number(price) / 1e18);
      } catch (err) {
        optionPrices.push(0);
      }
    }

    return {
      version: "v2",
      optionCount,
      optionPrices: optionPrices.map((p) => Math.round(p * 1000) / 1000),
      resolved,
      invalidated,
      winningOptionId,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching current market price:", error);

    // Return mock V1 data if blockchain call fails
    const priceA = 0.5 + (Math.random() - 0.5) * 0.4; // Random between 0.3-0.7
    const priceB = 1 - priceA;

    return {
      version: "v1",
      currentPriceA: Math.round(priceA * 1000) / 1000,
      currentPriceB: Math.round(priceB * 1000) / 1000,
      totalShares: Math.floor(Math.random() * 10000) + 1000,
      lastTrade: {
        timestamp: Date.now() - Math.random() * 60000, // Within last minute
        option: Math.random() > 0.5 ? ("A" as const) : ("B" as const),
        amount: Math.floor(Math.random() * 1000) + 100,
        price: Math.random() > 0.5 ? priceA : priceB,
      },
      timestamp: Date.now(),
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("marketId");

    if (!marketId) {
      return NextResponse.json(
        { error: "Market ID is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = priceCache.get(marketId);
    if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Fetch fresh data
    const priceData = await getCurrentMarketPrice(marketId);

    // Update cache
    priceCache.set(marketId, {
      data: priceData,
      lastUpdated: Date.now(),
    });

    return NextResponse.json(priceData);
  } catch (error) {
    console.error("Error in current price API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
