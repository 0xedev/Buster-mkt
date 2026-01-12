import {
  V2contractAddress,
  V2contractAbi,
  publicClient,
  PolicastViewsAbi,
  PolicastViews,
} from "@/constants/contract";
import {
  MarketV2,
  MarketCategory,
  MarketType,
  MarketOption,
} from "@/types/types";

// Policast-only market fetcher; legacy V1 logic removed
export async function fetchV2Market(marketId: number): Promise<MarketV2> {
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

  const basicInfoData = basicInfo.status === "fulfilled" ? basicInfo.value : null;
  const extendedMetaData = extendedMeta.status === "fulfilled" ? extendedMeta.value : null;
  const viewInfoData = viewInfo.status === "fulfilled" ? viewInfo.value : null;

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
    : BigInt(0n);

  const winningOptionId: bigint = extendedMetaData
    ? BigInt(extendedMetaData[0] ?? 0n)
    : BigInt(0n);
  const disputed = extendedMetaData ? Boolean(extendedMetaData[1]) : false;
  const validated = extendedMetaData ? Boolean(extendedMetaData[2]) : false;
  const creator = extendedMetaData ? String(extendedMetaData[3] ?? "") : "";
  const earlyResolutionAllowed = extendedMetaData
    ? Boolean(extendedMetaData[4])
    : false;

  const options: MarketOption[] = [];
  const optionPromises: Promise<any>[] = [];

  for (let i = 0; i < Number(optionCount); i++) {
    optionPromises.push(
      publicClient
        .readContract({
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "getMarketOption",
          args: [BigInt(marketId), BigInt(i)],
        })
        .catch(() => null)
    );
  }

  const optionResults = await Promise.all(optionPromises);

  for (let i = 0; i < optionResults.length; i++) {
    const optionData = optionResults[i];

    if (optionData === null) {
      options.push({
        name: `Option ${i + 1}`,
        description: "",
        totalShares: 0n,
        totalVolume: 0n,
        currentPrice: 0n,
        isActive: true,
      });
    } else {
      const [name, optionDescription, totalShares, optionTotalVolume, currentPrice, isActive] =
        optionData as readonly any[];

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
    optionCount,
    options,
    resolved,
    disputed,
    validated,
    invalidated,
    earlyResolutionAllowed,
    winningOptionId,
    creator,
    createdAt: 0n,
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

export async function fetchMarketData(
  marketId: number
): Promise<{ version: "v2"; market: MarketV2 }> {
  const market = await fetchV2Market(marketId);
  return { version: "v2", market };
}

export async function getTotalMarketCount(): Promise<{
  v1Count: number;
  v2Count: number;
  total: number;
}> {
  try {
    const v2Count = await publicClient.readContract({
      address: V2contractAddress,
      abi: V2contractAbi,
      functionName: "marketCount",
      args: [],
    });

    const v2CountNum = Number(v2Count);
    return {
      v1Count: 0,
      v2Count: v2CountNum,
      total: v2CountNum,
    };
  } catch (error) {
    console.error("Error fetching market count:", error);
    return { v1Count: 0, v2Count: 0, total: 0 };
  }
}
