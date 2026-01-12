"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import {
  publicClient,
  V2contractAddress,
  V2contractAbi,
  tokenAddress as defaultTokenAddress,
  tokenAbi as defaultTokenAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Clock,
  Trophy,
  AlertTriangle,
  RefreshCw,
  Target,
  PieChart,
  Activity,
} from "lucide-react";
import Link from "next/link";

interface OptionPosition {
  optionId: number;
  optionName: string;
  shares: bigint;
  currentPrice: bigint;
  marketValue: bigint;
  percentageHeld: number;
  isWinning?: boolean;
}
//
interface MarketPosition {
  marketId: number;
  marketName: string;
  description: string;
  category: number;
  endTime: bigint;
  resolved: boolean;
  disputed: boolean;
  winningOptionId?: number;
  options: OptionPosition[];
  totalInvested: bigint;
  currentValue: bigint;
  pnl: bigint;
  pnlPercentage: number;
  timeRemaining?: number;
  status: "active" | "ending_soon" | "ended" | "resolved";
}

interface PortfolioSummary {
  totalPositions: number;
  activePositions: number;
  resolvedPositions: number;
  totalInvested: bigint;
  totalCurrentValue: bigint;
  totalPnL: bigint;
  totalPnLPercentage: number;
  winningPositions: number;
  losingPositions: number;
  winRate: number;
}

const CACHE_KEY = "multi_option_positions_cache";
const CACHE_TTL = 300; // 5 minutes

export function MultiOptionPositions() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const [positions, setPositions] = useState<MarketPosition[]>([]);
  const [portfolioSummary, setPortfolioSummary] =
    useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "resolved">(
    "all"
  );
  const [tokenSymbol, setTokenSymbol] = useState<string>("BSTR");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  // Get betting token info
  const { data: bettingTokenAddr } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "bettingToken",
  });

  const tokenAddress = (bettingTokenAddr as any) || defaultTokenAddress;

  // Get token metadata
  const { data: symbolData } = useReadContract({
    address: tokenAddress,
    abi: defaultTokenAbi,
    functionName: "symbol",
    query: { enabled: !!tokenAddress },
  });

  const { data: decimalsData } = useReadContract({
    address: tokenAddress,
    abi: defaultTokenAbi,
    functionName: "decimals",
    query: { enabled: !!tokenAddress },
  });

  // Get market count
  const { data: marketCount } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "marketCount",
  });

  useEffect(() => {
    if (symbolData) setTokenSymbol(symbolData as string);
    if (decimalsData) setTokenDecimals(Number(decimalsData));
  }, [symbolData, decimalsData]);

  const fetchPositions = async () => {
    if (!address || !marketCount) return;

    setIsLoading(true);
    try {
      // Check cache
      const cacheKey = `${CACHE_KEY}_${address}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_TTL * 1000) {
          setPositions(data.positions);
          setPortfolioSummary(data.portfolioSummary);
          setIsLoading(false);
          return;
        }
      }

      const count = Number(marketCount);
      const marketPositions: MarketPosition[] = [];

      let totalInvested = 0n;
      let totalCurrentValue = 0n;
      let winningPositions = 0;
      let losingPositions = 0;

      // console.log(
      //   `🚀 Fetching positions for ${count} markets using optimized multicall...`
      // );

      // ==================== STEP 1: BATCH FETCH ALL MARKET INFO + USER SHARES ====================
      const BATCH_SIZE = 20; // Process markets in batches of 20
      const allMarketData: Array<{
        marketId: number;
        marketInfo: any;
        userShares: readonly bigint[];
      }> = [];

      for (let batchStart = 0; batchStart < count; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
        const batchSize = batchEnd - batchStart;

        // Create multicall contracts for this batch
        const marketInfoContracts = Array.from(
          { length: batchSize },
          (_, i) => ({
            address: PolicastViews as `0x${string}`,
            abi: PolicastViewsAbi,
            functionName: "getMarketInfo" as const,
            args: [BigInt(batchStart + i)],
          })
        );

        const userSharesContracts = Array.from(
          { length: batchSize },
          (_, i) => ({
            address: PolicastViews as `0x${string}`,
            abi: PolicastViewsAbi,
            functionName: "getUserShares" as const,
            args: [BigInt(batchStart + i), address as `0x${string}`],
          })
        );

        // Execute both multicalls in parallel
        const [marketInfoResults, userSharesResults] = await Promise.all([
          publicClient.multicall({
            contracts: marketInfoContracts,
            allowFailure: true,
          }),
          publicClient.multicall({
            contracts: userSharesContracts,
            allowFailure: true,
          }),
        ]);

        // Process results
        for (let i = 0; i < batchSize; i++) {
          const marketId = batchStart + i;
          const marketInfoResult = marketInfoResults[i];
          const userSharesResult = userSharesResults[i];

          if (
            marketInfoResult.status === "success" &&
            userSharesResult.status === "success" &&
            marketInfoResult.result &&
            userSharesResult.result
          ) {
            const userShares = userSharesResult.result as readonly bigint[];
            const hasShares = userShares.some((shares) => shares > 0n);

            // Only store data for markets where user has positions
            if (hasShares) {
              allMarketData.push({
                marketId,
                marketInfo: marketInfoResult.result,
                userShares,
              });
            }
          }
        }
      }

      // console.log(
      //   `✅ Found ${allMarketData.length} markets with user positions`
      // );

      // ==================== STEP 2: BATCH FETCH OPTION DETAILS ====================
      for (const { marketId, marketInfo, userShares } of allMarketData) {
        try {
          const [
            question,
            description,
            endTime,
            category,
            optionCount,
            resolved,
            disputed,
            marketType,
            invalidated,
            winningOptionId,
            creator,
          ] = marketInfo as any;

          // Get indices of options where user has shares
          const optionIndices = userShares
            .map((shares, idx) => (shares > 0n ? idx : -1))
            .filter((idx) => idx !== -1);

          if (optionIndices.length === 0) continue;

          // Batch fetch option info for all options where user has shares
          const optionInfoContracts = optionIndices.map((optionId) => ({
            address: PolicastViews as `0x${string}`,
            abi: PolicastViewsAbi,
            functionName: "getMarketOption" as const,
            args: [BigInt(marketId), BigInt(optionId)],
          }));

          const optionInfoResults = await publicClient.multicall({
            contracts: optionInfoContracts,
            allowFailure: true,
          });

          // Process options
          const options: OptionPosition[] = [];
          let marketTotalInvested = 0n;
          let marketCurrentValue = 0n;

          optionInfoResults.forEach((result, idx) => {
            if (result.status === "success" && result.result) {
              const optionId = optionIndices[idx];
              const shares = userShares[optionId] || 0n;
              const [optionName, , totalShares, , currentPrice] =
                result.result as any;

              // Calculate position metrics
              const marketValue =
                (shares * currentPrice) / 10n ** BigInt(tokenDecimals);
              const percentageHeld =
                totalShares > 0n ? Number((shares * 100n) / totalShares) : 0;

              // Estimate invested amount
              const estimatedInvested =
                (shares * currentPrice) / 10n ** BigInt(tokenDecimals);

              options.push({
                optionId,
                optionName,
                shares,
                currentPrice,
                marketValue,
                percentageHeld,
                isWinning: resolved
                  ? optionId === Number(winningOptionId)
                  : undefined,
              });

              marketTotalInvested += estimatedInvested;
              marketCurrentValue += marketValue;
            }
          });

          if (options.length === 0) continue;

          // Calculate market P&L
          const marketPnL = marketCurrentValue - marketTotalInvested;
          const marketPnLPercentage =
            marketTotalInvested > 0n
              ? Number((marketPnL * 100n) / marketTotalInvested)
              : 0;

          // Determine market status
          const now = Date.now() / 1000;
          const endTimeNumber = Number(endTime);
          const timeRemaining = endTimeNumber - now;

          let status: MarketPosition["status"];
          if (resolved) {
            status = "resolved";
          } else if (timeRemaining <= 0) {
            status = "ended";
          } else if (timeRemaining <= 24 * 60 * 60) {
            // 24 hours
            status = "ending_soon";
          } else {
            status = "active";
          }

          marketPositions.push({
            marketId,
            marketName: question,
            description,
            category,
            endTime,
            resolved,
            disputed,
            winningOptionId: resolved ? Number(winningOptionId) : undefined,
            options,
            totalInvested: marketTotalInvested,
            currentValue: marketCurrentValue,
            pnl: marketPnL,
            pnlPercentage: marketPnLPercentage,
            timeRemaining: timeRemaining > 0 ? timeRemaining : undefined,
            status,
          });

          totalInvested += marketTotalInvested;
          totalCurrentValue += marketCurrentValue;

          if (resolved) {
            if (marketPnL > 0n) {
              winningPositions++;
            } else {
              losingPositions++;
            }
          }
        } catch (error) {
          console.error(
            `Error fetching position for market ${marketId}:`,
            error
          );
        }
      }

      // Calculate portfolio summary
      const totalPnL = totalCurrentValue - totalInvested;
      const totalPnLPercentage =
        totalInvested > 0n ? Number((totalPnL * 100n) / totalInvested) : 0;

      const activePositions = marketPositions.filter((p) => !p.resolved).length;
      const resolvedPositions = marketPositions.filter(
        (p) => p.resolved
      ).length;
      const winRate =
        resolvedPositions > 0
          ? (winningPositions / resolvedPositions) * 100
          : 0;

      const summary: PortfolioSummary = {
        totalPositions: marketPositions.length,
        activePositions,
        resolvedPositions,
        totalInvested,
        totalCurrentValue,
        totalPnL,
        totalPnLPercentage,
        winningPositions,
        losingPositions,
        winRate,
      };

      setPositions(marketPositions);
      setPortfolioSummary(summary);

      // Cache the data
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          positions: marketPositions,
          portfolioSummary: summary,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast({
        title: "Error",
        description: "Failed to load positions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address && marketCount) {
      fetchPositions();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address, marketCount]);

  const formatCurrency = (amount: bigint) => {
    const value = Number(amount) / 10 ** tokenDecimals;
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${tokenSymbol}`;
  };

  const formatPercentage = (pct: number) => {
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };

  const getStatusColor = (status: MarketPosition["status"]) => {
    switch (status) {
      case "active":
        return "text-blue-600 bg-blue-100";
      case "ending_soon":
        return "text-orange-600 bg-orange-100";
      case "ended":
        return "text-gray-600 bg-gray-100";
      case "resolved":
        return "text-green-600 bg-green-100";
    }
  };

  const getStatusLabel = (status: MarketPosition["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "ending_soon":
        return "Ending Soon";
      case "ended":
        return "Ended";
      case "resolved":
        return "Resolved";
    }
  };

  const getPnLColor = (pnl: bigint) => {
    if (pnl > 0n) return "text-green-600";
    if (pnl < 0n) return "text-red-600";
    return "text-gray-600";
  };

  const filteredPositions = positions.filter((position) => {
    switch (selectedTab) {
      case "active":
        return !position.resolved;
      case "resolved":
        return position.resolved;
      default:
        return true;
    }
  });

  if (!isConnected) {
    return (
      <Card className="bg-[#433952]/50 backdrop-blur-sm border-[#544863]">
        <CardContent className="p-6 text-center">
          <Target className="h-16 w-16 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-gray-100">
            Connect Your Wallet
          </h3>
          <p className="text-gray-400">
            Connect your wallet to view your multi-option positions and
            portfolio performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      {portfolioSummary && (
        <Card className="bg-[#433952]/50 backdrop-blur-sm border-[#544863]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-100">
              <PieChart className="h-5 w-5" />
              Portfolio Summary
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPositions}
              className="flex items-center gap-2 border-[#544863] text-gray-300 hover:bg-[#544863]/50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {portfolioSummary.totalPositions}
                </div>
                <div className="text-sm text-gray-400">Total Positions</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {portfolioSummary.activePositions}
                </div>
                <div className="text-sm text-gray-400">Active</div>
              </div>

              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${getPnLColor(
                    portfolioSummary.totalPnL
                  )}`}
                >
                  {formatCurrency(portfolioSummary.totalPnL)}
                </div>
                <div className="text-sm text-gray-400">Total P&L</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {portfolioSummary.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Total Invested</span>
                  <span className="font-medium text-gray-200">
                    {formatCurrency(portfolioSummary.totalInvested)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Current Value</span>
                  <span className="font-medium text-gray-200">
                    {formatCurrency(portfolioSummary.totalCurrentValue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">P&L Percentage</span>
                  <span
                    className={`font-medium ${getPnLColor(
                      portfolioSummary.totalPnL
                    )}`}
                  >
                    {formatPercentage(portfolioSummary.totalPnLPercentage)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Winning Positions</span>
                  <span className="font-medium text-green-400">
                    {portfolioSummary.winningPositions}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Losing Positions</span>
                  <span className="font-medium text-red-400">
                    {portfolioSummary.losingPositions}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Resolved Markets</span>
                  <span className="font-medium text-gray-200">
                    {portfolioSummary.resolvedPositions}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Position List */}
      <Card className="bg-[#433952]/50 backdrop-blur-sm border-[#544863]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <BarChart3 className="h-5 w-5" />
            Your Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedTab}
            onValueChange={(value: any) => setSelectedTab(value)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({positions.length})</TabsTrigger>
              <TabsTrigger value="active">
                Active ({positions.filter((p) => !p.resolved).length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({positions.filter((p) => p.resolved).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {filteredPositions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2 text-gray-100">
                    No Positions Found
                  </h3>
                  <p className="text-gray-400">
                    {selectedTab === "all"
                      ? "You don't have any positions in V2 markets yet."
                      : `You don't have any ${selectedTab} positions.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPositions.map((position) => (
                    <Card
                      key={position.marketId}
                      className="border border-[#544863] bg-[#352c3f]/80"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <Link href={`/market/${position.marketId}`}>
                              <h3 className="font-medium text-lg hover:text-blue-400 transition-colors line-clamp-2 text-gray-100">
                                {position.marketName}
                              </h3>
                            </Link>
                            {position.description && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                                {position.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge className={getStatusColor(position.status)}>
                              {getStatusLabel(position.status)}
                            </Badge>
                            {position.disputed && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Disputed
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Position Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-[#433952]/30 rounded-lg border border-[#544863]">
                          <div>
                            <div className="text-sm text-gray-400">
                              Invested
                            </div>
                            <div className="font-medium text-gray-200">
                              {formatCurrency(position.totalInvested)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400">
                              Current Value
                            </div>
                            <div className="font-medium text-gray-200">
                              {formatCurrency(position.currentValue)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400">P&L</div>
                            <div
                              className={`font-medium ${getPnLColor(
                                position.pnl
                              )}`}
                            >
                              {formatCurrency(position.pnl)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400">P&L %</div>
                            <div
                              className={`font-medium ${getPnLColor(
                                position.pnl
                              )}`}
                            >
                              {formatPercentage(position.pnlPercentage)}
                            </div>
                          </div>
                        </div>

                        {/* Options Breakdown */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-gray-200">
                            Option Positions:
                          </h4>
                          {position.options.map((option) => (
                            <div
                              key={option.optionId}
                              className="flex items-center justify-between p-3 border border-[#544863] rounded-lg bg-[#433952]/30"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-200">
                                    {option.optionName}
                                  </span>
                                  {option.isWinning === true && (
                                    <Badge className="text-green-600 bg-green-100">
                                      <Trophy className="h-3 w-3 mr-1" />
                                      Winner
                                    </Badge>
                                  )}
                                  {option.isWinning === false && (
                                    <Badge
                                      variant="outline"
                                      className="text-gray-600"
                                    >
                                      Lost
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">
                                  {Number(option.shares).toLocaleString()}{" "}
                                  shares ({option.percentageHeld.toFixed(2)}% of
                                  supply)
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-gray-200">
                                  {formatCurrency(option.marketValue)}
                                </div>
                                <div className="text-sm text-gray-400">
                                  @ {formatCurrency(option.currentPrice)}/share
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Time Remaining */}
                        {position.timeRemaining &&
                          position.timeRemaining > 0 && (
                            <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                              <div className="flex items-center gap-2 text-blue-300">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {position.timeRemaining < 60 * 60
                                    ? `${Math.floor(
                                        position.timeRemaining / 60
                                      )} minutes remaining`
                                    : position.timeRemaining < 24 * 60 * 60
                                    ? `${Math.floor(
                                        position.timeRemaining / (60 * 60)
                                      )} hours remaining`
                                    : `${Math.floor(
                                        position.timeRemaining / (24 * 60 * 60)
                                      )} days remaining`}
                                </span>
                              </div>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
