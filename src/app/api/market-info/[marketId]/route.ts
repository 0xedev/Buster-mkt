import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  PolicastcontractAddress,
  PolicastcontractAbi,
} from "@/constants/contract";

export async function GET(
  request: NextRequest,
  { params }: { params: { marketId: string } },
) {
  try {
    const { marketId } = params;

    if (!marketId || isNaN(Number(marketId))) {
      return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
    }

    const marketIdBigInt = BigInt(marketId);

    // Get market info from contract using available functions
    const [basicInfo, extendedMeta, financials] = await Promise.all([
      publicClient.readContract({
        address: PolicastcontractAddress,
        abi: PolicastcontractAbi,
        functionName: "getMarketBasicInfo",
        args: [marketIdBigInt],
      }),
      publicClient.readContract({
        address: PolicastcontractAddress,
        abi: PolicastcontractAbi,
        functionName: "getMarketExtendedMeta",
        args: [marketIdBigInt],
      }),
      publicClient.readContract({
        address: PolicastcontractAddress,
        abi: PolicastcontractAbi,
        functionName: "getMarketFinancialsData",
        args: [marketIdBigInt],
      }),
    ]);

    const [
      question,
      description,
      endTime,
      category,
      optionCount,
      resolved,
      marketType,
      invalidated,
      totalVolume,
    ] = basicInfo as any;

    const [
      winningOptionId,
      disputed,
      validated,
      creator,
      earlyResolutionAllowed,
    ] = extendedMeta as any;

    const [
      createdAt,
      creatorFromFinancials,
      adminLiquidityClaimed,
      adminInitialLiquidity,
      adminRemainingLiquidity,
      userLiquidity,
      totalVolumeFromFinancials,
      platformFeesCollected,
    ] = financials as any;

    return NextResponse.json({
      marketId: Number(marketId),
      question,
      description,
      endTime: endTime.toString(),
      category,
      optionCount: Number(optionCount),
      resolved,
      disputed,
      marketType,
      invalidated,
      winningOptionId: Number(winningOptionId),
      creator,
      earlyResolutionAllowed,
      totalVolume: totalVolume.toString(),
      createdAt: createdAt.toString(),
      adminInitialLiquidity: adminInitialLiquidity.toString(),
      platformFeesCollected: platformFeesCollected.toString(),
    });
  } catch (error) {
    console.error("Error fetching market info:", error);
    return NextResponse.json(
      { error: "Failed to fetch market info" },
      { status: 500 },
    );
  }
}
