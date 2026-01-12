"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import { Clock, Award, Users } from "lucide-react";
import { MarketBuyInterface } from "@/components/market-buy-interface";
import { MarketV2PositionManager } from "@/components/MarketV2PositionManager";
import { V3FinancialManager } from "@/components/V3FinancialManager";
import { MarketResolved } from "@/components/market-resolved";
import { MarketPending } from "@/components/market-pending";
import MarketTime from "@/components/market-time";
import { MarketProgress } from "@/components/market-progress";
import { MultiOptionProgress } from "@/components/multi-option-progress";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MarketSharesDisplay } from "@/components/market-shares-display";

import { UrlPreview } from "@/components/url-preview";
import { MarketContext } from "@/components/market-context";
import { MarketChart } from "@/components/market-chart";
import { CommentSystem } from "@/components/CommentSystem";
import { MarketV2, MarketOption, MarketCategory } from "@/types/types";
import { useV3UserRoles } from "@/hooks/useV3UserRoles";
import { FreeTokenClaimButton } from "@/components/FreeTokenClaimButton";
import { useReadContract } from "wagmi";
import { PolicastViews, PolicastViewsAbi } from "@/constants/contract";

interface Market {
  question: string;
  // V1 Binary options
  optionA?: string;
  optionB?: string;
  totalOptionAShares?: bigint;
  totalOptionBShares?: bigint;
  // V2 Multi-options
  options?: string[];
  optionShares?: bigint[];
  description?: string;
  category?: number | MarketCategory;
  disputed?: boolean;
  creator?: string;
  winningOptionId?: number;
  optionCount?: number;
  // Common properties
  endTime: bigint;
  outcome: number;
  resolved: boolean;
  version?: "v1" | "v2";
  // Event-based market support
  earlyResolutionAllowed?: boolean;
  // Market type for free markets
  marketType?: number;
}

interface MarketDetailsClientProps {
  marketId: string;
  market: Market;
}

const TOKEN_DECIMALS = 18;

// Helper function to convert numeric category to MarketCategory enum
const convertToMarketCategory = (
  category: number | MarketCategory | undefined
): MarketCategory => {
  if (typeof category === "number") {
    // Convert numeric category to enum
    switch (category) {
      case 0:
        return MarketCategory.POLITICS;
      case 1:
        return MarketCategory.SPORTS;
      case 2:
        return MarketCategory.ENTERTAINMENT;
      case 3:
        return MarketCategory.TECHNOLOGY;
      case 4:
        return MarketCategory.ECONOMICS;
      case 5:
        return MarketCategory.SCIENCE;
      case 6:
        return MarketCategory.WEATHER;
      case 7:
        return MarketCategory.OTHER;
      default:
        return MarketCategory.OTHER;
    }
  }
  return category || MarketCategory.OTHER;
};

const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <div className="space-y-2">
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <UrlPreview key={index} url={part} className="block" />
        ) : (
          <span key={index} className="text-gray-100">
            {part}
          </span>
        )
      )}
    </div>
  );
};

export function MarketDetailsClient({
  marketId,
  market,
}: MarketDetailsClientProps) {
  // Debug logging for market data
  console.log(`[MarketDetailsClient] Loading market ${marketId}:`, market);
  console.log(
    `[MarketDetailsClient] Market version: ${market.version}, marketType: ${market.marketType}`
  );

  // Normalize options so components always receive either string labels
  // or well-formed MarketOption objects. Some fetchers return `options` as
  // string[] while newer fetch paths return MarketOption[]; guard both.
  const optionLabels: string[] = (market.options || []).map((opt, idx) =>
    typeof opt === "string"
      ? opt
      : opt && typeof opt === "object"
      ? String((opt as any).name ?? `Option ${idx + 1}`)
      : `Option ${idx + 1}`
  );

  const normalizedOptionObjects: MarketOption[] = (market.options || []).map(
    (opt, idx) => {
      if (opt && typeof opt === "object") {
        const o = opt as any;
        return {
          name: String(o.name ?? optionLabels[idx] ?? `Option ${idx + 1}`),
          description: String(o.description ?? ""),
          totalShares: BigInt(
            o.totalShares ?? market.optionShares?.[idx] ?? 0n
          ),
          totalVolume: BigInt(o.totalVolume ?? 0n),
          currentPrice: BigInt(o.currentPrice ?? 0n),
          isActive:
            typeof o.isActive !== "undefined"
              ? Boolean(o.isActive)
              : !market.resolved,
        } as MarketOption;
      }

      // opt is a label string
      return {
        name: optionLabels[idx] ?? `Option ${idx + 1}`,
        description: "",
        totalShares: BigInt(market.optionShares?.[idx] ?? 0n),
        totalVolume: 0n,
        currentPrice: 0n,
        isActive: !market.resolved,
      } as MarketOption;
    }
  );

  const { isCreator, isLP, isFeeCollector, checkCreatorStatus, checkLPStatus } =
    useV3UserRoles();
  const [userRoles, setUserRoles] = useState({
    isCreator: false,
    isLP: false,
    isFeeCollector: false,
  });
  const [rolesChecked, setRolesChecked] = useState(false);

  // Fetch market odds for V2 markets to display accurate probabilities
  const { data: marketOddsRaw } = useReadContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "getMarketOdds",
    args: [BigInt(marketId)],
    query: {
      enabled: market.version === "v2",
      refetchInterval: 5000, // Refresh every 5 seconds
    },
  });

  // Calculate probabilities from odds (convert from 0-1e18 range to percentage)
  const probabilities =
    market.version === "v2" && marketOddsRaw
      ? (marketOddsRaw as readonly bigint[]).map(
          (odd) => Number(odd) / 1e16 // Convert to percentage (0-100)
        )
      : [];

  // Reset roles check when marketId changes
  useEffect(() => {
    setRolesChecked(false);
    setUserRoles({
      isCreator: false,
      isLP: false,
      isFeeCollector: false,
    });
  }, [marketId]);

  // Check user roles for this specific market
  useEffect(() => {
    const checkRoles = async () => {
      if (market.version === "v2" && !rolesChecked) {
        try {
          const [creatorStatus, lpStatus] = await Promise.all([
            checkCreatorStatus(Number(marketId)),
            checkLPStatus(Number(marketId)),
          ]);

          setUserRoles({
            isCreator: creatorStatus,
            isLP: lpStatus,
            isFeeCollector,
          });
          setRolesChecked(true);
        } catch (error) {
          console.error("Error checking user roles:", error);
          setRolesChecked(true); // Still mark as checked to prevent infinite retries
        }
      }
    };

    checkRoles();
  }, [marketId, market.version, rolesChecked]); // Removed function dependencies

  useEffect(() => {
    const signalReady = async () => {
      await sdk.actions.ready();
      (async () => {
        await sdk.actions.addFrame();
      })();
      console.log("MarketDetailsClient: Mini App signaled ready.");
    };
    signalReady();
  }, []);
  const totalSharesInUnits =
    market.version === "v2" && market.optionShares
      ? market.optionShares.reduce((sum, shares) => sum + shares, 0n)
      : (market.totalOptionAShares || 0n) + (market.totalOptionBShares || 0n);

  const totalSharesDisplay = Number(totalSharesInUnits) / 10 ** TOKEN_DECIMALS;

  // Calculate percentages based on market version
  let optionAPercentage = 50;
  let optionBPercentage = 50;

  if (market.version === "v1") {
    optionAPercentage =
      totalSharesInUnits > 0n
        ? Math.round(
            (Number(market.totalOptionAShares || 0n) /
              Number(totalSharesInUnits)) *
              100
          )
        : 50;
    optionBPercentage =
      totalSharesInUnits > 0n
        ? Math.round(
            (Number(market.totalOptionBShares || 0n) /
              Number(totalSharesInUnits)) *
              100
          )
        : 50;
  }

  const now = Date.now();
  const endTimeMs = Number(market.endTime) * 1000;
  const isEnded = now > endTimeMs;

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <Navbar />
      <main className="flex-grow container mx-auto px-3 pt-3 pb-20 md:px-4 md:pt-4 md:pb-24">
        <div className="flex items-center text-sm text-gray-400 mb-3 md:mb-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mr-2 text-xs md:text-sm border-[#544863] text-gray-300 hover:bg-[#544863]/50"
          >
            <Link href="/">Home</Link>
          </Button>
          <Link href="/" className="hover:text-purple-400 text-xs md:text-sm">
            Markets
          </Link>
          <span className="mx-2">/</span>
          <span className="text-xs md:text-sm text-gray-400">
            Market #{marketId}
          </span>
        </div>

        <div className="bg-[#433952]/50 backdrop-blur-sm border border-[#544863] rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 md:mb-4">
            <h1 className="text-base md:text-xl font-bold text-gray-100 mb-2 md:mb-0">
              <LinkifiedText text={market.question} />
            </h1>
          </div>

          {/* Market Context - show if there are URLs in the question */}
          <MarketContext question={market.question} className="mb-3 md:mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
            <div className="flex items-center">
              <Clock className="text-gray-400 w-4 h-4 md:w-5 md:h-5 mr-2" />
              <div>
                <MarketTime
                  endTime={market.endTime}
                  earlyResolutionAllowed={market.earlyResolutionAllowed}
                />
              </div>
            </div>

            <div className="flex items-center">
              <Users className="text-gray-400 w-4 h-4 md:w-5 md:h-5 mr-2" />
              <div>
                <div className="text-xs md:text-sm text-gray-400">
                  Reward pool
                </div>
                <div className="text-xs md:text-sm text-gray-300">
                  {totalSharesDisplay.toLocaleString()} POLITICS
                </div>
              </div>
            </div>

            {market.earlyResolutionAllowed && (
              <div className="flex items-center">
                <svg
                  className="text-orange-400 w-4 h-4 md:w-5 md:h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <div className="text-xs md:text-sm text-gray-400">
                    Market Type
                  </div>
                  <div className="text-xs md:text-sm text-orange-400 font-medium">
                    Event-Based
                  </div>
                </div>
              </div>
            )}

            {market.resolved && (
              <div className="flex items-center">
                <Award className="text-green-400 w-4 h-4 md:w-5 md:h-5 mr-2" />
                <div>
                  <div className="text-xs md:text-sm text-gray-400">
                    Winning Option
                  </div>
                  <div className="text-xs md:text-sm text-gray-300">
                    {market.version === "v2" && optionLabels.length > 0
                      ? optionLabels[
                          Number(market.winningOptionId ?? market.outcome ?? 0)
                        ] ??
                        `Option ${
                          Number(
                            market.winningOptionId ?? market.outcome ?? 0
                          ) + 1
                        }`
                      : market.outcome === 1
                      ? market.optionA
                      : market.optionB}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Free Token Claim Button - Show for V2 free markets */}
        {market.version === "v2" && market.marketType === 1 && (
          <div className="bg-[#433952]/50 backdrop-blur-sm border border-[#544863] rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex items-center justify-center">
              <FreeTokenClaimButton marketId={Number(marketId)} />
            </div>
          </div>
        )}

        <div className="bg-[#433952]/50 backdrop-blur-sm border border-[#544863] rounded-lg shadow-md p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            {isEnded ? (
              market.resolved ? (
                // Normalize outcome prop: V2 uses 0-based winningOptionId; other areas add +1
                <MarketResolved
                  marketId={Number(marketId)}
                  outcome={
                    market.version === "v2"
                      ? Number(market.winningOptionId ?? market.outcome ?? 0)
                      : Math.max(0, Number(market.outcome) - 1)
                  }
                  options={
                    market.version === "v2"
                      ? optionLabels
                      : [
                          market.optionA || "Option A",
                          market.optionB || "Option B",
                        ]
                  }
                />
              ) : (
                <MarketPending />
              )
            ) : market.version === "v2" ? (
              <MarketV2PositionManager
                marketId={Number(marketId)}
                market={
                  {
                    question: market.question,
                    description: market.description || market.question,
                    endTime: market.endTime,
                    category: convertToMarketCategory(market.category),
                    marketType: market.marketType || 0, // Use actual marketType from contract
                    optionCount: BigInt(
                      market.optionCount || market.options?.length || 2
                    ),
                    // Use normalized option objects so the PositionManager always
                    // receives a consistent MarketOption[] shape.
                    options: normalizedOptionObjects,
                    resolved: market.resolved,
                    disputed: market.disputed || false,
                    validated: true,
                    invalidated: false,
                    winningOptionId: BigInt(
                      market.resolved ? market.outcome ?? 0 : 0
                    ),
                    creator:
                      market.creator ||
                      "0x0000000000000000000000000000000000000000",
                    createdAt: 0n,
                    adminInitialLiquidity: 0n,
                    userLiquidity: totalSharesInUnits,
                    totalVolume: 0n,
                    platformFeesCollected: 0n,
                    ammFeesCollected: 0n,
                    adminLiquidityClaimed: false,
                    ammLiquidityPool: 0n,
                    payoutIndex: 0n,
                    earlyResolutionAllowed:
                      market.earlyResolutionAllowed || false,
                  } satisfies MarketV2
                }
              />
            ) : (
              <MarketBuyInterface
                marketId={Number(marketId)}
                market={{
                  question: market.question,
                  optionA: market.optionA || "Option A",
                  optionB: market.optionB || "Option B",
                  totalOptionAShares: market.totalOptionAShares || 0n,
                  totalOptionBShares: market.totalOptionBShares || 0n,
                }}
              />
            )}
          </div>

          {/* V3 Financial Manager - only show for resolved V2 markets */}
          {market.version === "v2" && market.resolved && (
            <div className="mt-6 md:mt-8 border-t border-[#544863] pt-4 md:pt-6">
              <V3FinancialManager
                marketId={Number(marketId)}
                isCreator={userRoles.isCreator}
                isLP={userRoles.isLP}
                isFeeCollector={userRoles.isFeeCollector}
              />
            </div>
          )}

          <div className="mt-6 md:mt-8 border-t border-[#544863] pt-4 md:pt-6">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-gray-100">
              Current Market Sentiment
            </h3>
            {market.version === "v2" &&
            market.options &&
            normalizedOptionObjects.length > 0 ? (
              <MultiOptionProgress
                marketId={Number(marketId)}
                options={normalizedOptionObjects}
                probabilities={probabilities}
                totalVolume={totalSharesInUnits}
              />
            ) : (
              <MarketProgress
                optionA={market.optionA}
                optionB={market.optionB}
                totalOptionAShares={market.totalOptionAShares}
                totalOptionBShares={market.totalOptionBShares}
                version="v1"
                tokenDecimals={TOKEN_DECIMALS}
              />
            )}
          </div>

          {/* Market Analytics Charts - Hidden on mobile */}
          <div className="hidden md:block mt-8 border-t border-[#544863] pt-6">
            <MarketChart
              marketId={marketId}
              market={{
                optionA: market.optionA,
                optionB: market.optionB,
                options: market.options,
                version: market.version,
              }}
            />
          </div>

          {/* Comment System */}
          <div className="mt-6 md:mt-8 border-t border-[#544863] pt-4 md:pt-6">
            <CommentSystem
              marketId={marketId}
              version={market.version || "v1"}
            />
          </div>
        </div>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
