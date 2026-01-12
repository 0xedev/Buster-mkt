"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Address } from "viem";
import { useToast } from "@/components/ui/use-toast";
import {
  publicClient,
  contractAddress,
  contractAbi,
  V2contractAddress,
  V2contractAbi,
  tokenAddress as defaultTokenAddress,
  tokenAbi as defaultTokenAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFarcasterUser } from "@/hooks/useFarcasterUser";
import { Share2, TrendingUp, TrendingDown } from "lucide-react";
import { sdk } from "@farcaster/miniapp-sdk";
import { ClaimWinningsSection } from "@/components/ClaimWinningsButton";

interface UserStatsData {
  totalTrades: number;
  marketsParticipated: number;
  wins: number;
  losses: number;
  winRate: number;
  totalInvested: bigint;
  totalWinnings: bigint;
  netWinnings: bigint;
  v2TradeCount: number;
  v2Portfolio?: {
    totalInvested: bigint;
    totalWinnings: bigint;
    unrealizedPnL: bigint;
    realizedPnL: bigint;
    tradeCount: number;
  };
}

const CACHE_KEY_STATS = "user_stats_cache_v3";
const CACHE_TTL_STATS = 60 * 60;

export function UserStats() {
  const { address: accountAddress, isConnected } = useAccount();
  const { toast } = useToast();
  const farcasterUser = useFarcasterUser();
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenSymbol, setTokenSymbol] = useState<string>("POLITICS");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  const { data: bettingTokenAddr } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "bettingToken",
  });

  const tokenAddress = (bettingTokenAddr as Address) || defaultTokenAddress;

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

  useEffect(() => {
    if (symbolData) setTokenSymbol(symbolData as string);
    if (decimalsData) setTokenDecimals(Number(decimalsData));
  }, [symbolData, decimalsData]);

  type V2PortfolioTuple = readonly [bigint, bigint, bigint, bigint, bigint];
  const { data: v2PortfolioTuple } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "userPortfolios",
    args: [accountAddress!],
    query: { enabled: !!accountAddress },
  });

  const { data: calculatedUnrealizedPnL } = useReadContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "calculateUnrealizedPnL",
    args: [accountAddress!],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 30000,
    },
  });

  const fetchUserStats = useCallback(
    async (address: Address) => {
      setIsLoading(true);
      try {
        const cached = localStorage.getItem(`${CACHE_KEY_STATS}_${address}`);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_TTL_STATS * 1000) {
              const cachedStats = {
                ...data.stats,
                totalInvested: BigInt(data.stats.totalInvested ?? 0),
                totalWinnings: BigInt(data.stats.totalWinnings ?? 0),
                netWinnings: BigInt(data.stats.netWinnings ?? 0),
                wins: data.stats.wins || 0,
                losses: data.stats.losses || 0,
                v2TradeCount: data.stats.v2TradeCount || 0,
                v2Portfolio: data.stats.v2Portfolio
                  ? {
                      ...data.stats.v2Portfolio,
                      totalInvested: BigInt(
                        data.stats.v2Portfolio.totalInvested
                      ),
                      totalWinnings: BigInt(
                        data.stats.v2Portfolio.totalWinnings
                      ),
                      unrealizedPnL: BigInt(
                        data.stats.v2Portfolio.unrealizedPnL
                      ),
                      realizedPnL: BigInt(data.stats.v2Portfolio.realizedPnL),
                    }
                  : undefined,
              };
              setStats(cachedStats);
              setIsLoading(false);
              return;
            }
          } catch (parseError) {
            console.warn(
              "Failed to parse cached stats, fetching fresh data:",
              parseError
            );
            localStorage.removeItem(`${CACHE_KEY_STATS}_${address}`);
          }
        }

        const v2TradeCount = v2PortfolioTuple ? Number(v2PortfolioTuple[4]) : 0;
        const v2Trades: Array<{
          marketId: number;
          optionId: number;
          buyer: Address;
          seller: Address;
          quantity: bigint;
          timestamp: bigint;
        }> = [];
        try {
          if (v2PortfolioTuple) {
            const tradeCount = Number(v2PortfolioTuple[4]);

            if (tradeCount > 0) {
              for (let i = 0; i < tradeCount; i++) {
                try {
                  const trade = await publicClient.readContract({
                    address: V2contractAddress,
                    abi: V2contractAbi,
                    functionName: "userTradeHistory",
                    args: [address, BigInt(i)],
                  });

                  if (trade) {
                    v2Trades.push({
                      marketId: Number((trade as any).marketId),
                      optionId: Number((trade as any).optionId),
                      buyer: (trade as any).buyer as Address,
                      seller: (trade as any).seller as Address,
                      quantity: BigInt((trade as any).quantity || 0),
                      timestamp: BigInt((trade as any).timestamp || 0),
                    });
                  }
                } catch (innerError) {
                  console.error(`Failed to fetch V2 trade ${i}:`, innerError);
                  if (
                    (innerError as any)?.message?.includes("reverted") ||
                    (innerError as any)?.message?.includes(
                      "ContractFunctionRevertedError"
                    )
                  ) {
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn("V2 trade history error:", error);
        }
        const v2MarketIds = [...new Set(v2Trades.map((t) => t.marketId))];

        const v2MarketInfos: Record<
          number,
          { resolved: boolean; winningOptionId: number }
        > = {};

        if (v2MarketIds.length > 0) {
          try {
            for (const marketId of v2MarketIds) {
              const marketBasicInfo = (await publicClient.readContract({
                address: V2contractAddress,
                abi: V2contractAbi,
                functionName: "getMarketBasicInfo",
                args: [BigInt(marketId)],
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

              const marketExtendedMeta = (await publicClient.readContract({
                address: V2contractAddress,
                abi: V2contractAbi,
                functionName: "getMarketExtendedMeta",
                args: [BigInt(marketId)],
              })) as [bigint, boolean, boolean, string, boolean];

              v2MarketInfos[marketId] = {
                resolved: Boolean(marketBasicInfo[5]),
                winningOptionId: Number(marketExtendedMeta[0]),
              };
            }
          } catch (error) {
            console.warn("V2 market info not accessible:", error);
          }
        }

        let wins = 0;
        let losses = 0;

        const v2UserPositions: Record<number, Record<number, bigint>> = {};

        v2Trades.forEach((trade) => {
          if (!v2UserPositions[trade.marketId]) {
            v2UserPositions[trade.marketId] = {};
          }
          if (!v2UserPositions[trade.marketId][trade.optionId]) {
            v2UserPositions[trade.marketId][trade.optionId] = 0n;
          }

          if (
            trade.buyer &&
            address &&
            trade.buyer.toLowerCase() === address.toLowerCase()
          ) {
            v2UserPositions[trade.marketId][trade.optionId] += trade.quantity;
          } else if (
            trade.seller &&
            address &&
            trade.seller.toLowerCase() === address.toLowerCase()
          ) {
            v2UserPositions[trade.marketId][trade.optionId] -= trade.quantity;
          }
        });

        Object.entries(v2UserPositions).forEach(([marketIdStr, positions]) => {
          const marketId = Number(marketIdStr);
          const marketInfo = v2MarketInfos[marketId];

          if (marketInfo && marketInfo.resolved) {
            const winningOptionId = marketInfo.winningOptionId;
            let userWon = false;

            Object.entries(positions).forEach(([optionIdStr, quantity]) => {
              const optionId = Number(optionIdStr);
              if (optionId === winningOptionId && quantity > 0n) {
                userWon = true;
              }
            });

            if (userWon) {
              wins++;
            } else {
              const hadPosition = Object.values(positions).some((q) => q > 0n);
              if (hadPosition) {
                losses++;
              }
            }
          }
        });

        const resolvedOutcomes = wins + losses;
        const winRate =
          resolvedOutcomes > 0 ? (wins / resolvedOutcomes) * 100 : 0;

        const v2TotalInvested = v2PortfolioTuple ? v2PortfolioTuple[0] : 0n;
        const v2TotalWinningsAmount = v2PortfolioTuple
          ? v2PortfolioTuple[1]
          : 0n;

        const newStats: UserStatsData = {
          totalTrades: v2Trades.length,
          marketsParticipated: v2MarketIds.length,
          wins,
          losses,
          winRate,
          totalInvested: v2TotalInvested,
          totalWinnings: v2TotalWinningsAmount,
          netWinnings: v2TotalWinningsAmount,
          v2TradeCount: v2Trades.length,
          v2Portfolio: v2PortfolioTuple
            ? {
                totalInvested: v2PortfolioTuple[0],
                totalWinnings: v2PortfolioTuple[1],
                unrealizedPnL:
                  (calculatedUnrealizedPnL as bigint | undefined) ?? 0n,
                realizedPnL: v2PortfolioTuple[3],
                tradeCount: Number(v2PortfolioTuple[4]),
              }
            : undefined,
        };
        setStats(newStats);

        const statsForCache = {
          ...newStats,
          totalInvested: newStats.totalInvested.toString(),
          totalWinnings: newStats.totalWinnings.toString(),
          netWinnings: newStats.netWinnings.toString(),
          v2Portfolio: newStats.v2Portfolio
            ? {
                ...newStats.v2Portfolio,
                totalInvested: newStats.v2Portfolio.totalInvested.toString(),
                totalWinnings: newStats.v2Portfolio.totalWinnings.toString(),
                unrealizedPnL: newStats.v2Portfolio.unrealizedPnL.toString(),
                realizedPnL: newStats.v2Portfolio.realizedPnL.toString(),
              }
            : undefined,
        };

        try {
          localStorage.setItem(
            `${CACHE_KEY_STATS}_${address}`,
            JSON.stringify({ stats: statsForCache, timestamp: Date.now() })
          );
        } catch (error) {
          console.warn("Failed to cache user stats:", error);
        }
      } catch (error) {
        console.error("Failed to fetch user stats:", error);
        toast({
          title: "Error",
          description: "Could not load your performance statistics.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, v2PortfolioTuple, calculatedUnrealizedPnL]
  );

  useEffect(() => {
    if (isConnected && accountAddress) {
      fetchUserStats(accountAddress);
    } else {
      setIsLoading(false);
    }
  }, [isConnected, accountAddress, fetchUserStats]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please connect your wallet to view your performance.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <StatsSkeleton />;
  }

  if (!stats) {
    return null;
  }

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 10 ** tokenDecimals).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const formatSignedAmount = (amount: bigint) => {
    const num = Number(amount) / 10 ** tokenDecimals;
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      signDisplay: "always",
    });
  };

  const handleShare = async () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      address: accountAddress!,
      ...(farcasterUser?.username && { username: farcasterUser.username }),
      ...(farcasterUser?.pfpUrl && { pfpUrl: farcasterUser.pfpUrl }),
      ...(farcasterUser?.fid && { fid: farcasterUser.fid.toString() }),
    });

    const shareUrl = `${baseUrl}/profile/${accountAddress}?${params.toString()}`;

    try {
      await sdk.actions.composeCast({
        text: `Check out my prediction market stats on Policast! 🎯`,
        embeds: [shareUrl],
      });
    } catch (error) {
      console.error("Failed to compose cast:", error);
      toast({
        title: "Share Failed",
        description: "Could not share your stats. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Profile Header */}
      <div className="flex flex-col items-center gap-3 py-4">
        {/* Avatar Circle with Share Button Beside */}
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-full ring-4 ring-white/30 bg-gradient-to-br from-[#433952] to-[#544863] p-1 shadow-lg">
            <Avatar className="w-full h-full">
              <AvatarImage src={farcasterUser?.pfpUrl} alt="Profile" />
              <AvatarFallback className="bg-gradient-to-br from-[#433952] to-[#544863] text-white font-bold text-xl">
                {farcasterUser?.username
                  ? farcasterUser.username.charAt(0).toUpperCase()
                  : accountAddress
                  ? `${accountAddress.slice(0, 2)}${accountAddress.slice(-2)}`
                  : "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Share Button Beside Circle */}
          <Button
            onClick={handleShare}
            size="sm"
            className="h-10 w-10 p-0 rounded-full bg-gradient-to-br from-[#433952] to-[#544863] hover:from-[#544863] hover:to-[#433952] text-white border-0 shadow-lg ring-2 ring-white/30"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* User Info */}
        <div className="text-center">
          <h2 className="text-base font-bold text-white">
            {farcasterUser?.username
              ? `@${farcasterUser.username}`
              : "Anonymous Trader"}
          </h2>
          <p className="text-xs text-white/70 font-mono">
            {accountAddress
              ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
              : "Not connected"}
          </p>
        </div>
      </div>

      {/* Claim Winnings */}
      <ClaimWinningsSection />

      {/* Compact Performance Cards */}
      {stats.marketsParticipated > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-md bg-gradient-to-br from-[#433952] to-[#544863] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-white/80 mb-0.5">
                    Markets Joined
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.marketsParticipated}
                  </p>
                </div>
                <div className="p-2 bg-white/10 rounded-lg">
                  <span className="text-lg">📈</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 font-medium">Win Rate</span>
                  <span className="font-bold text-white">
                    {stats.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 font-medium">W/L</span>
                  <span className="font-medium text-white">
                    {stats.wins}/{stats.losses}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-[#544863] to-[#352c3f] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-white/80 mb-0.5">
                    Trades
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalTrades}
                  </p>
                </div>
                <div className="p-2 bg-white/10 rounded-lg">
                  <span className="text-lg">💹</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 font-medium">
                    Unique Markets
                  </span>
                  <span className="font-bold text-white">
                    {stats.marketsParticipated}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 font-medium">
                    Contract Trades
                  </span>
                  <span className="font-medium text-white">
                    {stats.v2TradeCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* V2 Portfolio Details */}
      {stats.v2Portfolio && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-[#433952] to-[#544863]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white">
              Portfolio Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-xs font-semibold text-white/80 mb-0.5">
                  Total Trades
                </p>
                <p className="text-lg font-bold text-white">
                  {stats.v2TradeCount}
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-xs font-semibold text-white/80 mb-0.5">
                  Contract Trades
                </p>
                <p className="text-lg font-bold text-white">
                  {stats.v2Portfolio.tradeCount}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-xs font-semibold text-white/80 mb-0.5">
                  Invested
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {formatAmount(stats.v2Portfolio.totalInvested)}
                </p>
                <p className="text-xs text-white/70 font-medium">
                  {tokenSymbol}
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-lg">
                <p className="text-xs font-semibold text-white/80 mb-0.5">
                  Winnings
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {formatAmount(stats.v2Portfolio.totalWinnings)}
                </p>
                <p className="text-xs text-white/70 font-medium">
                  {tokenSymbol}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-3 rounded-lg ${
                  Number(stats.v2Portfolio.realizedPnL) >= 0
                    ? "bg-emerald-50"
                    : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {Number(stats.v2Portfolio.realizedPnL) >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <p
                    className={`text-xs font-medium ${
                      Number(stats.v2Portfolio.realizedPnL) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    Realized P&L
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    Number(stats.v2Portfolio.realizedPnL) >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  } truncate`}
                >
                  {formatSignedAmount(stats.v2Portfolio.realizedPnL)}
                </p>
                <p className="text-xs text-gray-500">{tokenSymbol}</p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  Number(stats.v2Portfolio.unrealizedPnL) >= 0
                    ? "bg-emerald-50"
                    : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {Number(stats.v2Portfolio.unrealizedPnL) >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <p
                    className={`text-xs font-medium ${
                      Number(stats.v2Portfolio.unrealizedPnL) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    Unrealized P&L
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    Number(stats.v2Portfolio.unrealizedPnL) >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  } truncate`}
                >
                  {formatSignedAmount(stats.v2Portfolio.unrealizedPnL)}
                </p>
                <p className="text-xs text-gray-500">{tokenSymbol}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  fullWidth = false,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border border-gray-100 ${bgColor} ${
        fullWidth ? "col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 truncate">{label}</p>
          <p className={`text-base font-bold ${color} truncate`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-3">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
