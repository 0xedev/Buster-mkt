import {
  contractAddress,
  contractAbi,
  V2contractAddress,
  V2contractAbi,
  publicClient,
  PolicastViewsAbi,
  PolicastViews,
} from "@/constants/contract";
import {
  Market,
  MarketV2,
  MarketCategory,
  MarketType,
  MarketOption,
} from "@/types/types";

// Determine if a market is V1 (binary) or V2 (multi-option)
export async function detectMarketVersion(
  marketId: number
): Promise<"v1" | "v2"> {
  try {
    // Try both V1 and V2 in parallel
    const [v1Result, v2Result] = await Promise.allSettled([
      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getMarketInfo",
        args: [BigInt(marketId)],
      }),
      publicClient.readContract({
        address: PolicastViews,
        abi: PolicastViewsAbi,
        functionName: "getMarketInfo",
        args: [BigInt(marketId)],
      }),
    ]);

    const v1Exists = v1Result.status === "fulfilled";
    const v2Exists = v2Result.status === "fulfilled";

    // If only one version exists, return that one
    if (v1Exists && !v2Exists) return "v1";
    if (v2Exists && !v1Exists) return "v2";

    // If both exist, we need to decide which one to prioritize
    if (v1Exists && v2Exists) {
      // Check if markets are active/ended to decide priority
      const v1Data = v1Result.value as unknown as any[];
      const v2Data = v2Result.value as unknown as any[];

      // V1 market structure: [question, optionA, optionB, endTime, outcome, totalOptionAShares, totalOptionBShares, resolved]
      const v1EndTime = Number(v1Data[3]);
      const v1Resolved = v1Data[7] as boolean;

      // V2 market structure: [question, description, endTime, category, optionCount, resolved, disputed, marketType, invalidated, winningOptionId, creator]
      const v2EndTime = Number(v2Data[2]);
      const v2Resolved = v2Data[5] as boolean;

      const currentTime = Math.floor(Date.now() / 1000);

      // Priority logic:
      // 1. If one is active and other is ended/resolved, prefer active
      // 2. If both are active or both are ended, prefer V2 (newer contract)
      // 3. If times are very different, prefer the one with later end time

      const v1Active = !v1Resolved && v1EndTime > currentTime;
      const v2Active = !v2Resolved && v2EndTime > currentTime;

      if (v2Active && !v1Active) {
        console.log(`Market ${marketId}: V2 active, V1 ended - choosing V2`);
        return "v2";
      }
      if (v1Active && !v2Active) {
        console.log(`Market ${marketId}: V1 active, V2 ended - choosing V1`);
        return "v1";
      }

      // If both have same status, prefer V2 (newer contract)
      console.log(
        `Market ${marketId}: Both versions exist with same status - preferring V2`
      );
      return "v2";
    }

    // If neither exists, fallback to V1
    console.log(`Market ${marketId}: Neither version found - defaulting to V1`);
    return "v1";
  } catch (error) {
    console.error(`Error detecting market version for ${marketId}:`, error);
    return "v1";
  }
}

// Fetch V1 market data
export async function fetchV1Market(marketId: number): Promise<Market> {
  const marketData = await publicClient.readContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getMarketInfo",
    args: [BigInt(marketId)],
  });

  const [
    question,
    optionA,
    optionB,
    endTime,
    outcome,
    totalOptionAShares,
    totalOptionBShares,
    resolved,
  ] = marketData;

  return {
    question,
    optionA,
    optionB,
    endTime: endTime.toString(),
    outcome: outcome.toString(),
    totalOptionAShares: Number(totalOptionAShares),
    totalOptionBShares: Number(totalOptionBShares),
    resolved,
  };
}

// Fetch V2 market data
export async function fetchV2Market(marketId: number): Promise<MarketV2> {
  // Fetch all contract data in parallel for better performance
  const [basicInfo, extendedMeta, viewInfo] = await Promise.allSettled([
    publicClient.readContract({
      address: V2contractAddress,
      abi: V2contractAbi,
      functionName: "getMarketBasicInfo",
      args: [BigInt(marketId)],
    }),
    publicClient.readContract({
      address: V2contractAddress,
      abi: V2contractAbi,
      functionName: "getMarketExtendedMeta",
      args: [BigInt(marketId)],
    }),
    publicClient.readContract({
      address: PolicastViews,
      abi: PolicastViewsAbi,
      functionName: "getMarketInfo",
      args: [BigInt(marketId)],
    }),
  ]);

  // Extract values from settled promises
  const basicInfoData = basicInfo.status === "fulfilled" ? basicInfo.value : null;
  const extendedMetaData = extendedMeta.status === "fulfilled" ? extendedMeta.value : null;
  const viewInfoData = viewInfo.status === "fulfilled" ? viewInfo.value : null;

  // Map fields from available responses with safe fallbacks
  const question = String(
    (viewInfoData && viewInfoData[0]) || (basicInfoData && basicInfoData[0]) || ""
  );
  const description = String(
    (viewInfoData && viewInfoData[1]) || (basicInfoData && basicInfoData[1]) || ""
  );
  const endTime: bigint = BigInt(
    (viewInfoData && viewInfoData[2]) || (basicInfoData && basicInfoData[2]) || 0n
  );
  const category: MarketCategory = Number(
    (viewInfoData && viewInfoData[3]) || (basicInfoData && basicInfoData[3]) || 0
  ) as MarketCategory;

  const optionCount: bigint = basicInfoData
    ? BigInt(basicInfoData[4] ?? 0n)
    : BigInt((viewInfoData && viewInfoData[4]) ?? 0n);
  const resolved = Boolean(
    (basicInfoData && basicInfoData[5]) || (viewInfoData && viewInfoData[5])
  );
  const marketTypeValue = Number(
    (basicInfoData && basicInfoData[6]) || (viewInfoData && viewInfoData[4]) || 0
  );
  const invalidated = Boolean(
    (basicInfoData && basicInfoData[7]) || (viewInfoData && viewInfoData[6])
  );
  const totalVolume: bigint = basicInfoData
    ? BigInt(basicInfoData[8] ?? 0n)
    : BigInt(0n);  // viewInfo doesn't have totalVolume at index 9

  const winningOptionId: bigint = extendedMetaData
    ? BigInt(extendedMetaData[0] ?? 0n)
    : BigInt(0n);
  const disputed = extendedMetaData ? Boolean(extendedMetaData[1]) : false;
  const validated = extendedMetaData ? Boolean(extendedMetaData[2]) : false;
  // Use nullish coalescing consistently to avoid mixing '||' and '??' which
  // TypeScript disallows without parentheses. Prefer `??` because zero/false
  // could be valid values for some fields but here we want non-null defaults.
  const creator = extendedMetaData
    ? String(extendedMetaData[3] ?? "")
    : String("");  // basicInfo doesn't have creator at index 11
  const earlyResolutionAllowed = extendedMetaData
    ? Boolean(extendedMetaData[4])
    : Boolean(false);  // viewInfo doesn't have earlyResolutionAllowed at index 12

  // Fetch all options in parallel with batching to reduce RPC calls
  const options: MarketOption[] = [];
  const optionPromises = [];

  for (let i = 0; i < Number(optionCount); i++) {
    optionPromises.push(
      publicClient
        .readContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "getMarketOption",
          args: [BigInt(marketId), BigInt(i)],
        })
        .catch((error) => {
          console.error(`Error fetching option ${i}:`, error);
          return null; // Return null for failed fetches
        })
    );
  }

  // Wait for all options to resolve in parallel (much faster than sequential)
  const optionResults = await Promise.all(optionPromises);

  // Process results
  for (let i = 0; i < optionResults.length; i++) {
    const optionData = optionResults[i];

    if (optionData === null) {
      // Add placeholder option if fetch failed
      options.push({
        name: `Option ${i + 1}`,
        description: "",
        totalShares: 0n,
        totalVolume: 0n,
        currentPrice: 0n,
        isActive: true,
      });
    } else {
      const [
        name,
        optionDescription,
        totalShares,
        optionTotalVolume,
        currentPrice,
        isActive,
      ] = optionData as readonly any[];

      options.push({
        name: String(name ?? ""),
        description: String(optionDescription ?? ""),
        totalShares: BigInt(totalShares ?? 0n),
        totalVolume: BigInt(optionTotalVolume ?? 0n),
        currentPrice: BigInt(currentPrice ?? 0n),
        isActive: Boolean(isActive),
      });
    }
  }

  return {
    question,
    description,
    endTime,
    category: category as MarketCategory,
    marketType: marketTypeValue as MarketType,
    optionCount: optionCount,
    options,
    resolved,
    disputed,
    validated,
    invalidated,
    earlyResolutionAllowed,
    winningOptionId,
    creator,
    createdAt: 0n, // Not available in basic market info
    adminInitialLiquidity: 0n,
    userLiquidity: 0n,
    totalVolume,
    platformFeesCollected: 0n,
    ammFeesCollected: 0n,
    adminLiquidityClaimed: false,
    ammLiquidityPool: 0n,
    payoutIndex: 0n,
  };
}

// Unified market fetcher that returns appropriate market data
export async function fetchMarketData(
  marketId: number
): Promise<{ version: "v1" | "v2"; market: Market | MarketV2 }> {
  const version = await detectMarketVersion(marketId);

  try {
    if (version === "v2") {
      const market = await fetchV2Market(marketId);
      return { version: "v2", market };
    } else {
      const market = await fetchV1Market(marketId);
      return { version: "v1", market };
    }
  } catch (error) {
    console.error(`Failed to fetch ${version} market ${marketId}:`, error);

    // Fallback: try the other version if the detected one fails
    try {
      if (version === "v2") {
        console.log(`Fallback: trying V1 for market ${marketId}`);
        const market = await fetchV1Market(marketId);
        return { version: "v1", market };
      } else {
        console.log(`Fallback: trying V2 for market ${marketId}`);
        const market = await fetchV2Market(marketId);
        return { version: "v2", market };
      }
    } catch (fallbackError) {
      console.error(
        `Fallback also failed for market ${marketId}:`,
        fallbackError
      );
      throw new Error(
        `Market ${marketId} not found in either V1 or V2 contracts`
      );
    }
  }
}

// Get total market count across both contracts
export async function getTotalMarketCount(): Promise<{
  v1Count: number;
  v2Count: number;
  total: number;
}> {
  try {
    const [v1Count, v2Count] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getMarketCount",
        args: [],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "marketCount",
        args: [],
      }) as Promise<bigint>,
    ]);

    return {
      v1Count: Number(v1Count),
      v2Count: Number(v2Count),
      total: Number(v1Count) + Number(v2Count),
    };
  } catch (error) {
    console.error("Error fetching market counts:", error);
    // Fallback to V1 only
    try {
      const v1Count = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getMarketCount",
        args: [],
      });

      return {
        v1Count: Number(v1Count),
        v2Count: 0,
        total: Number(v1Count),
      };
    } catch (v1Error) {
      console.error("Error fetching V1 market count:", v1Error);
      return { v1Count: 0, v2Count: 0, total: 0 };
    }
  }
}
