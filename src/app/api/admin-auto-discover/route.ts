import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { base } from "viem/chains";
import {
  V2contractAddress,
  V2contractAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
// import { MarketBasicInfoTuple } from "@/types/market";

// Typed wrappers to reduce any-casts; generic return typing follows call sites
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
  args: readonly any[] = []
): Promise<TReturn> {
  return (await publicClient.readContract({
    address: PolicastViews,
    abi: PolicastViewsAbi as any,
    functionName: functionName as any,
    args: args as any,
  })) as unknown as TReturn;
}

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "https://mainnet.base.org"
  ),
});
//
interface AdminWithdrawal {
  marketId: number;
  amount: bigint;
  type: "adminLiquidity" | "prizePool" | "lpRewards";
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    if (!isAddress(userAddress)) {
      return NextResponse.json(
        { error: "Invalid user address format" },
        { status: 400 }
      );
    }

    console.log("Auto-discovering admin withdrawals for user:", userAddress);

    // Discover all admin withdrawals available to user with timeout
    const timeoutMs = 30000; // 30 seconds
    const discoveryPromise = discoverAdminWithdrawals(userAddress);
    const timeoutPromise = new Promise<AdminWithdrawal[]>((_, reject) =>
      setTimeout(
        () => reject(new Error("Discovery timeout after 30 seconds")),
        timeoutMs
      )
    );
    const adminWithdrawals = await Promise.race([
      discoveryPromise,
      timeoutPromise,
    ]);

    console.log(`Found ${adminWithdrawals.length} admin withdrawals available`);

    // Group by type for easier frontend handling
    const groupedWithdrawals = {
      adminLiquidity: adminWithdrawals.filter(
        (w) => w.type === "adminLiquidity"
      ),
      prizePool: adminWithdrawals.filter((w) => w.type === "prizePool"),
      lpRewards: adminWithdrawals.filter((w) => w.type === "lpRewards"),
    };

    // Calculate totals
    const totals = {
      adminLiquidity: groupedWithdrawals.adminLiquidity.reduce(
        (sum, w) => sum + w.amount,
        0n
      ),
      prizePool: groupedWithdrawals.prizePool.reduce(
        (sum, w) => sum + w.amount,
        0n
      ),
      lpRewards: groupedWithdrawals.lpRewards.reduce(
        (sum, w) => sum + w.amount,
        0n
      ),
      total: adminWithdrawals.reduce((sum, w) => sum + w.amount, 0n),
    };

    // Convert BigInt values to strings for JSON serialization
    const serializedWithdrawals = {
      adminLiquidity: groupedWithdrawals.adminLiquidity.map((w) => ({
        ...w,
        amount: w.amount.toString(),
      })),
      prizePool: groupedWithdrawals.prizePool.map((w) => ({
        ...w,
        amount: w.amount.toString(),
      })),
      lpRewards: groupedWithdrawals.lpRewards.map((w) => ({
        ...w,
        amount: w.amount.toString(),
      })),
    };

    const serializedTotals = {
      adminLiquidity: totals.adminLiquidity.toString(),
      prizePool: totals.prizePool.toString(),
      lpRewards: totals.lpRewards.toString(),
      total: totals.total.toString(),
    };

    return NextResponse.json({
      withdrawals: serializedWithdrawals,
      totals: serializedTotals,
      totalCount: adminWithdrawals.length,
    });
  } catch (error) {
    console.error("Admin auto-discover error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to auto-discover admin withdrawals: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Discover all admin withdrawals available to user
async function discoverAdminWithdrawals(
  userAddress: string
): Promise<AdminWithdrawal[]> {
  const withdrawals: AdminWithdrawal[] = [];

  try {
    // First get the actual market count from the contract
    const marketCount = await readCore<bigint>("marketCount");

    const maxMarketId = Number(marketCount);
    console.log(
      `Contract has ${maxMarketId} markets, checking for admin withdrawals...`
    );

    if (maxMarketId === 0) {
      console.log("No markets found in contract");
      return [];
    }

    // Prepare batch promises
    // lower batch size + concurrency to reduce RPC pressure (avoid 429s)
    const batchSize = 5;
    const batchPromises: (() => Promise<AdminWithdrawal[]>)[] = [];

    for (let startId = 0; startId < maxMarketId; startId += batchSize) {
      const endId = Math.min(startId + batchSize, maxMarketId);
      batchPromises.push(() =>
        checkMarketBatchForAdmin(userAddress, startId, endId)
      );
    }

    // Process batches with concurrency limit
    const concurrencyLimit = 2;
    for (let i = 0; i < batchPromises.length; i += concurrencyLimit) {
      const chunk = batchPromises.slice(i, i + concurrencyLimit);
      const results = await Promise.allSettled(chunk.map((fn) => fn()));

      for (const result of results) {
        if (result.status === "fulfilled") {
          withdrawals.push(...result.value);
        } else {
          console.error("Batch failed:", result.reason);
        }
      }

      // Small delay between chunks to avoid overwhelming the RPC
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(
      `Found ${withdrawals.length} admin withdrawals via batch checking`
    );
    return withdrawals;
  } catch (error) {
    console.error("Failed to discover admin withdrawals:", error);
    return [];
  }
}

// Check a batch of markets for admin withdrawal opportunities
async function checkMarketBatchForAdmin(
  userAddress: string,
  startId: number,
  endId: number
): Promise<AdminWithdrawal[]> {
  const withdrawals: AdminWithdrawal[] = [];

  for (let marketId = startId; marketId < endId; marketId++) {
    try {
      // Get market info to check market status
      const marketInfo = await readView<readonly any[]>("getMarketInfo", [
        BigInt(marketId),
      ]);

      if (!marketInfo) {
        console.log(`Market ${marketId} returned no info, skipping...`);
        continue;
      }

      // Get market creator from Views contract
      const creator = await readView<string>("getMarketCreator", [
        BigInt(marketId),
      ]);

      // Parse getMarketInfo defensively and fetch value-specific views to avoid
      // tuple-index drift between ABI versions. PolicastViews may return a
      // different tuple shape across deployments, so prefer dedicated getters
      // for fields like optionCount, totalVolume and marketType when available.
      const raw = marketInfo as readonly any[];
      const question = String(raw[0] ?? "");
      // const description = String(raw[1] ?? "");
      // const endTime = BigInt(raw[2] ?? 0n);
      // const category = Number(raw[3] ?? 0);
      // Some Views implementations include marketType at index 4; others put
      // optionCount there. Try to read explicit view getters for correctness.

      // Try to read explicit getters (these are small view calls and more
      // robust than relying on tuple positions):
      let optionCountBig: bigint = 0n;
      let totalVolumeBig: bigint = 0n;
      let explicitMarketType: number | undefined = undefined;

      try {
        optionCountBig = (await readView<bigint>("getMarketOptionCount", [
          BigInt(marketId),
        ])) as bigint;
      } catch (err) {
        // Fallback: if explicit getter not present, attempt to use tuple value
        optionCountBig = BigInt(raw[4] ?? 0n);
      }

      try {
        totalVolumeBig = (await readView<bigint>("getMarketTotalVolume", [
          BigInt(marketId),
        ])) as bigint;
      } catch (err) {
        totalVolumeBig = BigInt(raw[9] ?? 0n);
      }

      try {
        const mt = await readView<number | bigint>("getMarketType", [
          BigInt(marketId),
        ]);
        if (typeof mt === "bigint") explicitMarketType = Number(mt as bigint);
        else explicitMarketType = Number(mt as number);
      } catch (err) {
        // Fallback: try to obtain marketType from the tuple (common indices 4 or 7)
        explicitMarketType = Number(raw[4] ?? raw[7] ?? 0);
      }

      // const optionCount = optionCountBig;
      const totalVolume = totalVolumeBig;
      const marketType = explicitMarketType ?? 0; // 0 = paid, 1 = free (fallback)
      const resolved = Boolean(raw[5] ?? false);
      const _resolvedOutcome = Boolean(raw[6] ?? false);
      const invalidated = Boolean(raw[8] ?? false);

      // Check if user is the market creator
      const isCreator = creator.toLowerCase() === userAddress.toLowerCase();

      console.log(`Market ${marketId} analysis:`, {
        question: question.slice(0, 50),
        creator,
        userAddress,
        isCreator,
        resolved,
        _resolvedOutcome,
        invalidated,
        marketType,
        totalVolume: totalVolume.toString(),
      });

      if (isCreator) {
        // 1. Check for admin liquidity withdrawal
        // We need to get market financials to check admin liquidity status
        try {
          // PolicastViews.getMarketFinancials returns:
          // (creator, adminLiquidityClaimed, adminInitialLiquidity, userLiquidity, totalVolume, platformFeesCollected)
          const marketFinancials = await readView<readonly any[]>(
            "getMarketFinancials",
            [BigInt(marketId)]
          );

          if (marketFinancials) {
            const mf = marketFinancials as readonly any[];
            const creatorFromMF = String(mf[0] ?? "");
            const adminLiquidityClaimed = Boolean(mf[1] ?? false);
            const adminInitialLiquidity = BigInt(mf[2] ?? 0n);
            const userLiquidity = BigInt(mf[3] ?? 0n);
            const totalVolumeFromMF = BigInt(mf[4] ?? 0n);
            const platformFeesCollected = BigInt(mf[5] ?? 0n);

            console.log(`Market ${marketId} financials:`, {
              adminInitialLiquidity: adminInitialLiquidity.toString(),
              userLiquidity: userLiquidity.toString(),
              platformFeesCollected: platformFeesCollected.toString(),
              adminLiquidityClaimed,
              resolved,
              _resolvedOutcome,
              invalidated,
              isInvalidatedMarket: invalidated,
              marketType,
            });

            // For invalidated markets, check if there are any special withdrawal mechanisms
            if (invalidated && adminInitialLiquidity === 0n) {
              console.log(
                `Market ${marketId} is invalidated with 0 admin liquidity - this might be expected behavior for refunded markets`
              );
            }

            // Admin can withdraw initial liquidity if:
            // - There's admin liquidity to claim
            // - Admin hasn't claimed liquidity yet
            // - Market is resolved OR invalidated (invalidated markets also allow withdrawals)
            if (
              adminInitialLiquidity > 0n &&
              !adminLiquidityClaimed &&
              (resolved || invalidated)
            ) {
              const description = invalidated
                ? `Admin liquidity from invalidated market: ${question.slice(
                    0,
                    50
                  )}...`
                : `Admin liquidity from resolved market: ${question.slice(
                    0,
                    50
                  )}...`;

              withdrawals.push({
                marketId,
                amount: adminInitialLiquidity,
                type: "adminLiquidity",
                description,
              });
              console.log(
                `Found admin liquidity withdrawal for market ${marketId}: ${adminInitialLiquidity.toString()} (${
                  invalidated ? "invalidated" : "resolved"
                })`
              );
            } else {
              console.log(
                `No admin liquidity withdrawal for market ${marketId}: ` +
                  `amount=${adminInitialLiquidity.toString()}, ` +
                  `claimed=${adminLiquidityClaimed}, ` +
                  `resolved=${resolved}, ` +
                  `invalidated=${invalidated}`
              );
            }
          }
        } catch (error) {
          console.debug(
            `Could not get financials for market ${marketId}:`,
            error
          );
        }

        // 2. Check for unused prize pool withdrawal (free markets only)
        // Use marketType from tuple instead of heuristic contract call (0 = paid? 1 = free entry)
        const isFreeMarket = marketType === 1;
        if (isFreeMarket && resolved) {
          try {
            // getUnusedPrizePool now uses readView (PolicastViews) below
            const unusedPrizePool = await getUnusedPrizePool(marketId);
            if (unusedPrizePool > 0n) {
              withdrawals.push({
                marketId,
                amount: unusedPrizePool,
                type: "prizePool",
                description: `Unused prize pool for free market "${question.slice(
                  0,
                  30
                )}..."`,
              });
            }
          } catch (error) {
            console.debug(
              `Could not get unused prize pool for market ${marketId}:`,
              error
            );
          }
        }
      }

      // 3. LP Rewards are not available in V3 LMSR contract
      // The V3 contract uses LMSR instead of traditional LP reward system
      console.log(
        `Market ${marketId}: LP rewards not available in V3 contract (uses LMSR)`
      );
    } catch (error: any) {
      // Handle specific error types
      if (
        error?.data?.errorName === "InvalidMarket" ||
        error?.message?.includes("InvalidMarket")
      ) {
        console.debug(`Market ${marketId} does not exist, skipping...`);
      } else {
        console.error(
          `Market ${marketId} check failed with unexpected error:`,
          {
            error: error?.message || "Unknown error",
            errorName: error?.data?.errorName,
            marketId,
          }
        );
      }
      // Continue with next market regardless of error type
    }
  }

  return withdrawals;
}

// Get unused prize pool for a free market
async function getUnusedPrizePool(marketId: number): Promise<bigint> {
  try {
    // getFreeMarketInfo lives on the Views contract — use readView, not readCore
    const freeMarketInfo = await readView<readonly any[]>("getFreeMarketInfo", [
      BigInt(marketId),
    ]);

    if (!freeMarketInfo) {
      return 0n;
    }

    const fm = freeMarketInfo as readonly any[];
    // getFreeMarketInfo returns (maxFreeParticipants, tokensPerParticipant, currentFreeParticipants, totalPrizePool, remainingPrizePool, isActive)
    const maxParticipants = BigInt(fm[0] ?? 0n);
    const tokensPerParticipant = BigInt(fm[1] ?? 0n);
    const currentParticipants = BigInt(fm[2] ?? 0n);
    const _totalPrizePool = BigInt(fm[3] ?? 0n);
    const remainingPrizePool = BigInt(fm[4] ?? 0n);
    const isActive = Boolean(fm[5]);

    // If market still active, we do not allow unused prize pool withdrawal yet
    if (isActive) {
      return 0n;
    }

    // Unused prize pool is simply the remainingPrizePool reported by contract (already accounts for participants used)
    const unusedPrizePool = remainingPrizePool;

    console.debug(`Market ${marketId} prize pool analysis:`, {
      maxParticipants: maxParticipants.toString(),
      tokensPerParticipant: tokensPerParticipant.toString(),
      currentParticipants: currentParticipants.toString(),
      totalPrizePool: _totalPrizePool.toString(),
      remainingPrizePool: remainingPrizePool.toString(),
      isActive,
      unusedPrizePool: unusedPrizePool.toString(),
    });

    return unusedPrizePool > 0n ? unusedPrizePool : 0n;
  } catch (error) {
    console.error(
      `Error getting unused prize pool for market ${marketId}:`,
      error
    );
    return 0n;
  }
}
