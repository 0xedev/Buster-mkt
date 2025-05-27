"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useAccount, useReadContract } from "wagmi";
import { contract, contractAbi } from "@/constants/contract";
import { MarketProgress } from "./market-progress";
import MarketTime from "./market-time";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";
import {
  Clock,
  Award,
  AlertTriangle,
  Share2,
  Eye,
  Zap,
  Users,
  ArrowRight,
} from "lucide-react";

export interface Market {
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

interface MarketCardProps {
  index: number;
  market: Market;
}

const TOKEN_DECIMALS = 18;

export function MarketCard({ index, market }: MarketCardProps) {
  const { address } = useAccount();

  const marketData = market;

  const { data: sharesBalanceData } = useReadContract({
    address: contract.address,
    abi: contractAbi,
    functionName: "getShareBalance",
    args: [BigInt(index), address as `0x${string}`],
    query: { enabled: !!address && !!marketData },
  });

  const sharesBalance: SharesBalance | undefined = sharesBalanceData
    ? {
        optionAShares: sharesBalanceData[0],
        optionBShares: sharesBalanceData[1],
      }
    : undefined;

  const isExpired = new Date(Number(marketData.endTime) * 1000) < new Date();
  const isResolved = marketData.resolved;

  // Calculate market stats
  const totalShares =
    marketData.totalOptionAShares + marketData.totalOptionBShares;
  const totalVolume = Number(totalShares) / 10 ** TOKEN_DECIMALS;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const optionAPercentage =
    totalShares > 0n
      ? Math.round(
          (Number(marketData.totalOptionAShares) / Number(totalShares)) * 100
        )
      : 50;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
  const marketPageUrl = `${appUrl}/market/${index}/details`;
  const warpcastShareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
    `Check out this market on Buster Market: ${
      marketData?.question || `Market ${index}`
    }`
  )}&embeds[]=${encodeURIComponent(marketPageUrl)}`;

  // Status badge component
  const StatusBadge = () => {
    if (isResolved) {
      return (
        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
          <Award className="w-3 h-3 mr-1.5" />
          RESOLVED
        </div>
      );
    } else if (isExpired) {
      return (
        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25">
          <AlertTriangle className="w-3 h-3 mr-1.5" />
          AWAITING
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 animate-pulse">
          <Zap className="w-3 h-3 mr-1.5" />
          LIVE
        </div>
      );
    }
  };

  return (
    <div className="group relative">
      {/* Animated background glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm"></div>

      <Card className="relative bg-white/80 backdrop-blur-xl border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden group-hover:bg-white/90 group-hover:border-white/50">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>

        <CardHeader className="pb-4 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg">
                <Clock className="w-4 h-4 text-slate-600" />
              </div>
              <MarketTime endTime={marketData.endTime} />
            </div>
            <StatusBadge />
          </div>

          <CardTitle className="text-lg font-bold leading-tight text-slate-800 group-hover:text-slate-900 transition-colors duration-200 line-clamp-2">
            {marketData.question}
          </CardTitle>

          {/* Market stats preview */}
          <div className="flex items-center text-sm text-slate-600 mt-3 pt-3 border-t border-slate-200/50">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span className="font-medium">{totalVolume.toFixed(1)}K</span>
              <span className="text-slate-500">volume</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 space-y-4">
          <div className="relative">
            <MarketProgress
              optionA={marketData.optionA}
              optionB={marketData.optionB}
              totalOptionAShares={marketData.totalOptionAShares}
              totalOptionBShares={marketData.totalOptionBShares}
            />
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200/50">
            {isExpired ? (
              isResolved ? (
                <MarketResolved
                  marketId={index}
                  outcome={marketData.outcome}
                  optionA={marketData.optionA}
                  optionB={marketData.optionB}
                />
              ) : (
                <MarketPending />
              )
            ) : (
              <MarketBuyInterface marketId={index} market={marketData} />
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-6">
          <div className="w-full space-y-4">
            {/* User shares display */}
            {sharesBalance &&
              (sharesBalance.optionAShares > 0n ||
                sharesBalance.optionBShares > 0n) && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/30">
                  <MarketSharesDisplay
                    market={marketData}
                    sharesBalance={sharesBalance}
                  />
                </div>
              )}

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 rounded-xl px-4 py-2 group/btn"
                >
                  <a
                    href={warpcastShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform duration-200" />
                    <span className="font-medium">Share</span>
                  </a>
                </Button>
              </div>

              <Button
                asChild
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 group/view relative overflow-hidden"
              >
                <Link
                  href={`/market/${index}/details`}
                  className="flex items-center space-x-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover/view:opacity-20 transition-opacity duration-200"></div>
                  <Eye className="w-4 h-4 relative z-10" />
                  <span className="font-semibold relative z-10">
                    View Details
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/view:translate-x-1 transition-transform duration-200 relative z-10" />
                </Link>
              </Button>
            </div>
          </div>
        </CardFooter>

        {/* Hover overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"></div>
      </Card>
    </div>
  );
}
