"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import { Clock, Award, Users, AlertTriangle, TrendingUp, Eye, Zap } from "lucide-react";
import { MarketBuyInterface } from "@/components/market-buy-interface";
import { MarketResolved } from "@/components/market-resolved";
import { MarketPending } from "@/components/market-pending";
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MarketSharesDisplay } from "@/components/market-shares-display";

interface Market {
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

interface MarketDetailsClientProps {
  marketId: string;
  market: Market;
}

const TOKEN_DECIMALS = 18; // Assuming 18 decimals for your shares/tokens

export function MarketDetailsClient({
  marketId,
  market,
}: MarketDetailsClientProps) {
  useEffect(() => {
    const signalReady = async () => {
      await sdk.actions.ready();
      console.log("MarketDetailsClient: Mini App signaled ready.");
    };
    signalReady();
  }, []);

  const totalSharesInUnits =
    market.totalOptionAShares + market.totalOptionBShares;
  const totalSharesDisplay = Number(totalSharesInUnits) / 10 ** TOKEN_DECIMALS;
  const optionAPercentage =
    totalSharesInUnits > 0n
      ? Math.round(
          (Number(market.totalOptionAShares) / Number(totalSharesInUnits)) * 100
        )
      : 50;
  const optionBPercentage =
    totalSharesInUnits > 0n
      ? Math.round(
          (Number(market.totalOptionBShares) / Number(totalSharesInUnits)) * 100
        )
      : 50;

  const endTimeDate = new Date(Number(market.endTime) * 1000);
  const formattedEndTime = endTimeDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const now = Date.now();
  const endTimeMs = Number(market.endTime) * 1000;
  const isEnded = now > endTimeMs;

  let timeRemaining = "";
  if (!isEnded) {
    const diffMs = endTimeMs - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      timeRemaining = `${diffDays}d ${diffHours}h remaining`;
    } else if (diffHours > 0) {
      timeRemaining = `${diffHours}h ${diffMinutes}m remaining`;
    } else {
      timeRemaining = `${diffMinutes}m remaining`;
    }
  }

  let statusBadge;
  if (market.resolved) {
    statusBadge = (
      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 animate-pulse">
        <Award className="w-4 h-4 mr-2 animate-bounce" />
        Resolved
      </div>
    );
  } else if (isEnded) {
    statusBadge = (
      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25">
        <AlertTriangle className="w-4 h-4 mr-2 animate-pulse" />
        Awaiting Resolution
      </div>
    );
  } else {
    statusBadge = (
      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        <Zap className="w-4 h-4 mr-2 animate-pulse relative z-10" />
        <span className="relative z-10">Live Trading</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      <Navbar />
      
      <main className="relative z-10 container mx-auto px-4 pt-8 pb-24 md:p-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm mb-8">
          <Button asChild variant="outline" size="sm" className="mr-3 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:shadow-md transition-all duration-200">
            <Link href="/" className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              All Markets
            </Link>
          </Button>
          <div className="flex items-center text-slate-600">
            <span className="hover:text-blue-600 transition-colors cursor-pointer">Markets</span>
            <span className="mx-2 text-slate-400">/</span>
            <span className="font-semibold text-slate-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Market #{marketId}
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8 overflow-hidden group hover:shadow-3xl transition-all duration-500">
          {/* Animated border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
          <div className="absolute inset-[1px] bg-white/70 backdrop-blur-xl rounded-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-6">
              <div className="flex-1 mb-4 lg:mb-0 lg:pr-8">
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 mb-4 leading-tight">
                  <span className="bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                    {market.question}
                  </span>
                </h1>
              </div>
              <div className="flex-shrink-0">
                {statusBadge}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200/50 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-500 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-200">
                    <Clock className="text-white w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">End Time</div>
                </div>
                <div className="font-bold text-slate-900 text-lg mb-1">{formattedEndTime}</div>
                {!isEnded && !market.resolved && (
                  <div className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full inline-block animate-pulse">
                    ⏰ {timeRemaining}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200/50 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-500 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-200">
                    <Users className="text-white w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Total Volume</div>
                </div>
                <div className="font-bold text-slate-900 text-2xl">
                  {totalSharesDisplay.toLocaleString()}
                </div>
                <div className="text-sm text-purple-600 font-medium">shares traded</div>
              </div>

              {market.resolved && (
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-200/50 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-emerald-500 rounded-xl mr-3 group-hover:scale-110 transition-transform duration-200">
                      <Award className="text-white w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Winner</div>
                  </div>
                  <div className="font-bold text-slate-900 text-lg">
                    {market.outcome === 1 ? market.optionA : market.optionB}
                  </div>
                  <div className="text-sm text-emerald-600 font-medium">Market resolved</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Trading Interface */}
          <div className="p-8 border-b border-slate-200/50">
            {isEnded ? (
              market.resolved ? (
                <MarketResolved
                  marketId={Number(marketId)}
                  outcome={market.outcome}
                  optionA={market.optionA}
                  optionB={market.optionB}
                />
              ) : (
                <MarketPending />
              )
            ) : (
              <MarketBuyInterface marketId={Number(marketId)} market={market} />
            )}
          </div>

          {/* Market Sentiment */}
          <div className="p-8">
            <div className="flex items-center mb-8">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mr-4">
                <TrendingUp className="text-white w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Live Market Sentiment</h3>
            </div>
            
            <div className="space-y-8">
              {/* Option A */}
              <div className="group">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-3 shadow-lg"></div>
                    <span className="font-bold text-lg text-slate-900">{market.optionA}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{optionAPercentage}%</div>
                    <div className="text-sm text-slate-600">
                      {(Number(market.totalOptionAShares) / 10 ** TOKEN_DECIMALS).toLocaleString()} shares
                    </div>
                  </div>
                </div>
                <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg transition-all duration-1000 ease-out"
                    style={{ width: `${optionAPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Option B */}
              <div className="group">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mr-3 shadow-lg"></div>
                    <span className="font-bold text-lg text-slate-900">{market.optionB}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{optionBPercentage}%</div>
                    <div className="text-sm text-slate-600">
                      {(Number(market.totalOptionBShares) / 10 ** TOKEN_DECIMALS).toLocaleString()} shares
                    </div>
                  </div>
                </div>
                <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg transition-all duration-1000 ease-out"
                    style={{ width: `${optionBPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Stats Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200/50">
              <div className="flex items-center justify-center text-sm text-slate-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Market data updates in real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <Toaster />
    </div>
  );
}