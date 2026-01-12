"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
  V2contractAddress,
  V2contractAbi,
  tokenAddress,
  tokenAbi,
  publicClient,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MarketV2SellInterface } from "./MarketV2SellInterface";
import { MarketV2BuyInterface } from "./market-v2-buy-interface";
import { MarketV2, MarketOption } from "@/types/types";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketV2PositionManagerProps {
  marketId: number;
  market: MarketV2;
  onPositionUpdate?: () => void;
}

interface UserPosition {
  optionId: number;
  optionName: string;
  shares: bigint;
  currentPrice: bigint;
  currentValue: bigint;
  unrealizedPnL: bigint;
  unrealizedPnLPercent: number;
}

// Format price with proper decimals//

function formatPrice(price: bigint, decimals: number = 18): string {
  const formatted = Number(price) / Math.pow(10, decimals);
  if (formatted === 0) return "0.0000";
  if (formatted < 0.0001) return formatted.toFixed(6);
  if (formatted < 0.01) return formatted.toFixed(4);
  if (formatted < 1) return formatted.toFixed(3);
  return formatted.toFixed(2);
}

// Format shares amount
function formatShares(shares: bigint): string {
  const formatted = Number(shares) / Math.pow(10, 18);
  if (formatted === 0) return "0.00";
  if (formatted < 0.001) return formatted.toFixed(6);
  if (formatted < 0.01) return formatted.toFixed(4);
  if (formatted < 1) return formatted.toFixed(3);
  return formatted.toFixed(2);
}

// Format percentage
function formatPercent(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

export function MarketV2PositionManager({
  marketId,
  market,
  onPositionUpdate,
}: MarketV2PositionManagerProps) {
  const { address: accountAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"buy" | "overview" | "sell">(
    "buy"
  );
  const [showZeroPositions, setShowZeroPositions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Token information
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "symbol",
  });

  // Fetch accurate unrealized PnL from contract
  const { data: contractUnrealizedPnL } = useReadContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "calculateUnrealizedPnL",
    args: [accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000,
    },
  });

  // Fetch user shares for each option in this market
  const userShares0Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(marketId), 0n, accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000,
    },
  });

  const userShares1Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(marketId), 1n, accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000,
    },
  });

  const userShares2Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(marketId), 2n, accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000,
    },
  });

  const userShares3Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(marketId), 3n, accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000,
    },
  });

  const userShares4Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(marketId), 4n, accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000,
    },
  });

  // Fetch user portfolio data
  const { data: userPortfolio, refetch: refetchPortfolio } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userPortfolios",
    args: [accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Fetch real-time option data for up to 10 options (should cover most cases)
  const option0Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOption",
    args: [BigInt(marketId), BigInt(0)],
    query: {
      enabled: !!accountAddress && market.options.length > 0,
      refetchInterval: 5000,
    },
  });

  const option1Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOption",
    args: [BigInt(marketId), BigInt(1)],
    query: {
      enabled: !!accountAddress && market.options.length > 1,
      refetchInterval: 5000,
    },
  });

  const option2Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOption",
    args: [BigInt(marketId), BigInt(2)],
    query: {
      enabled: !!accountAddress && market.options.length > 2,
      refetchInterval: 5000,
    },
  });

  const option3Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOption",
    args: [BigInt(marketId), BigInt(3)],
    query: {
      enabled: !!accountAddress && market.options.length > 3,
      refetchInterval: 5000,
    },
  });

  const option4Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOption",
    args: [BigInt(marketId), BigInt(4)],
    query: {
      enabled: !!accountAddress && market.options.length > 4,
      refetchInterval: 5000,
    },
  });

  // Fetch cost basis for each option
  const costBasis0Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userCostBasis",
    args: [accountAddress as `0x${string}`, BigInt(marketId), 0n],
    query: {
      enabled: !!accountAddress && market.options.length > 0,
      refetchInterval: 10000,
    },
  });

  const costBasis1Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userCostBasis",
    args: [accountAddress as `0x${string}`, BigInt(marketId), 1n],
    query: {
      enabled: !!accountAddress && market.options.length > 1,
      refetchInterval: 10000,
    },
  });

  const costBasis2Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userCostBasis",
    args: [accountAddress as `0x${string}`, BigInt(marketId), 2n],
    query: {
      enabled: !!accountAddress && market.options.length > 2,
      refetchInterval: 10000,
    },
  });

  const costBasis3Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userCostBasis",
    args: [accountAddress as `0x${string}`, BigInt(marketId), 3n],
    query: {
      enabled: !!accountAddress && market.options.length > 3,
      refetchInterval: 10000,
    },
  });

  const costBasis4Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userCostBasis",
    args: [accountAddress as `0x${string}`, BigInt(marketId), 4n],
    query: {
      enabled: !!accountAddress && market.options.length > 4,
      refetchInterval: 10000,
    },
  });

  // Array of user shares queries for easy access
  const userSharesQueries = [
    userShares0Query,
    userShares1Query,
    userShares2Query,
    userShares3Query,
    userShares4Query,
  ];

  // Array of option queries for easy access
  const optionQueries = [
    option0Query,
    option1Query,
    option2Query,
    option3Query,
    option4Query,
  ];

  // Array of cost basis queries for easy access
  const costBasisQueries = [
    costBasis0Query,
    costBasis1Query,
    costBasis2Query,
    costBasis3Query,
    costBasis4Query,
  ];

  // Convert user shares data to position objects with real-time prices
  const positions: UserPosition[] = market.options.map((option, optionId) => {
    // Get shares from individual queries
    const sharesQuery = userSharesQueries[optionId];
    const shares = sharesQuery?.data ? (sharesQuery.data as bigint) : 0n;

    // Get real-time price from individual queries
    const optionData = optionQueries[optionId]?.data as
      | readonly [string, string, bigint, bigint, bigint, boolean]
      | undefined;
    const currentPrice =
      optionData && optionData.length > 4
        ? optionData[4]
        : option.currentPrice || 0n;

    // Debug logging
    if (optionData) {
      //  console.log(`Option ${optionId} data:`, optionData);
      //  console.log(`Option ${optionId} current price:`, currentPrice.toString());
    }

    const currentValue =
      shares > 0n ? (shares * currentPrice * 100n) / BigInt(10 ** 18) : 0n;

    // Calculate P&L using cost basis from contract
    let unrealizedPnL = 0n;
    let unrealizedPnLPercent = 0;

    if (shares > 0n) {
      // Get cost basis from contract for this specific position
      const costBasisQuery = costBasisQueries[optionId];
      const costBasis = (costBasisQuery?.data as bigint) || 0n;

      if (currentPrice > 0n) {
        // For unresolved markets: mark-to-market using token price
        const PAYOUT_PER_SHARE = 100n * BigInt(10 ** 18);
        const marketValue =
          (shares * currentPrice * PAYOUT_PER_SHARE) /
          (BigInt(10 ** 18) * BigInt(10 ** 18));
        unrealizedPnL = BigInt(marketValue) - costBasis;
        unrealizedPnLPercent =
          costBasis > 0n
            ? Number((unrealizedPnL * 10000n) / costBasis) / 100
            : 0;
      }
    }

    return {
      optionId,
      optionName: option.name,
      shares,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent,
    };
  });

  // Filter positions based on showZeroPositions
  const filteredPositions = showZeroPositions
    ? positions
    : positions.filter((pos) => pos.shares > 0n);

  // Calculate totals from individual positions
  const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0n);
  const totalUnrealizedPnL = positions.reduce(
    (sum, pos) => sum + pos.unrealizedPnL,
    0n
  );
  const hasPositions = positions.some((pos) => pos.shares > 0n);

  // Convert shares array to object for interfaces
  const userSharesObject = userSharesQueries.map((query) =>
    query?.data ? (query.data as bigint) : 0n
  );

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh shares, portfolio data, option data, and cost basis
      const refreshPromises = [
        ...userSharesQueries.map((query: any) => query.refetch?.()),
        refetchPortfolio(),
        ...optionQueries.map((query: any) => query.refetch?.()),
        ...costBasisQueries.map((query: any) => query.refetch?.()),
      ].filter(Boolean);

      await Promise.all(refreshPromises);

      if (onPositionUpdate) {
        onPositionUpdate();
      }
    } catch (error) {
      console.error("Failed to refresh positions:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="w-full bg-[#433952]/50 backdrop-blur-sm border-[#544863]">
      <CardHeader className="pb-3 md:pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-gray-100">
            <Wallet className="h-4 w-4 md:h-5 md:w-5" />
            Your Positions
          </CardTitle>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 md:h-9 md:w-auto md:p-2 border-[#544863] text-gray-300 hover:bg-[#544863]/50"
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3 md:h-4 md:w-4",
                  isRefreshing && "animate-spin"
                )}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowZeroPositions(!showZeroPositions)}
              className="h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm border-[#544863] text-gray-300 hover:bg-[#544863]/50"
            >
              {showZeroPositions ? (
                <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Eye className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="hidden md:inline ml-1">
                {showZeroPositions ? "Hide Zero" : "Show All"}
              </span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!accountAddress ? (
          <div className="text-center py-6 md:py-8 text-gray-400 text-sm md:text-base">
            Connect your wallet to view positions
          </div>
        ) : !hasPositions ? (
          <div className="text-center py-6 md:py-8 text-gray-400 text-sm md:text-base">
            You don&apos;t have any positions in this market
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as any)}
          >
            <TabsList className="grid w-full grid-cols-3 h-9 md:h-10">
              <TabsTrigger value="buy" className="text-xs md:text-sm">
                Buy Shares
              </TabsTrigger>
              <TabsTrigger value="overview" className="text-xs md:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="sell" className="text-xs md:text-sm">
                Sell Shares
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="mt-3 md:mt-4">
              <MarketV2BuyInterface marketId={marketId} market={market} />
            </TabsContent>

            <TabsContent
              value="overview"
              className="mt-3 md:mt-4 space-y-3 md:space-y-4"
            >
              {/* Portfolio Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <Card className="bg-[#352c3f]/80 border-[#544863]">
                  <CardContent className="pt-3 md:pt-4 px-3 md:px-6">
                    <div className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                      Total Value
                      {optionQueries.some((q) => q.isRefetching) && (
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                      )}
                    </div>
                    <div className="text-base md:text-lg font-semibold text-gray-200">
                      {formatPrice(totalValue)} {tokenSymbol || "TOKENS"}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#352c3f]/80 border-[#544863]">
                  <CardContent className="pt-3 md:pt-4 px-3 md:px-6">
                    <div className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                      Unrealized P&L
                      {optionQueries.some((q) => q.isRefetching) && (
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-base md:text-lg font-semibold",
                        totalUnrealizedPnL >= 0n
                          ? "text-green-400"
                          : "text-red-400"
                      )}
                    >
                      {totalUnrealizedPnL >= 0n ? "+" : ""}
                      {formatPrice(totalUnrealizedPnL)}{" "}
                      {tokenSymbol || "TOKENS"}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#352c3f]/80 border-[#544863]">
                  <CardContent className="pt-3 md:pt-4 px-3 md:px-6">
                    <div className="text-xs md:text-sm text-gray-400">
                      Active Positions
                    </div>
                    <div className="text-base md:text-lg font-semibold text-gray-200">
                      {positions.filter((pos) => pos.shares > 0n).length} /{" "}
                      {positions.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Individual Positions */}
              <div className="space-y-2 md:space-y-3">
                <h3 className="font-medium text-gray-100 text-sm md:text-base">
                  Position Details
                </h3>
                {filteredPositions.map((position) => (
                  <Card
                    key={position.optionId}
                    className="border-l-4 border-l-blue-400 bg-[#352c3f]/80 border-[#544863]"
                  >
                    <CardContent className="pt-3 md:pt-4 px-3 md:px-6">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm md:text-base text-gray-100">
                            {position.optionName}
                          </h4>
                          <div className="text-xs md:text-sm text-gray-400">
                            {formatShares(position.shares)} shares
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm md:text-base text-gray-200">
                            {formatPrice(position.currentValue)}{" "}
                            {tokenSymbol || "TOKENS"}
                          </div>
                          <div className="text-xs md:text-sm text-gray-400">
                            @ {formatPrice(position.currentPrice * 100n)} per
                            share
                            {optionQueries[position.optionId]?.isRefetching && (
                              <RefreshCw className="inline ml-1 h-3 w-3 animate-spin text-blue-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {position.shares > 0n && (
                        <div className="flex items-center justify-between pt-2 border-t border-[#544863]">
                          <div className="flex items-center gap-1 md:gap-2">
                            {position.unrealizedPnL >= 0n ? (
                              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
                            ) : (
                              <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-400" />
                            )}
                            <span
                              className={cn(
                                "text-xs md:text-sm font-medium",
                                position.unrealizedPnL >= 0n
                                  ? "text-green-400"
                                  : "text-red-400"
                              )}
                            >
                              {formatPercent(position.unrealizedPnLPercent)}
                            </span>
                          </div>
                          <Badge
                            variant={
                              position.unrealizedPnL >= 0n
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs px-2 py-0.5 md:px-3 md:py-1"
                          >
                            {position.unrealizedPnL >= 0n ? "Profit" : "Loss"}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sell" className="mt-3 md:mt-4">
              <MarketV2SellInterface
                marketId={marketId}
                market={market}
                userShares={userSharesObject}
                onSellComplete={handleRefresh}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
