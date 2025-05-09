"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import { Clock, Award, Users, AlertTriangle } from "lucide-react";
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
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <Award className="w-4 h-4 mr-1" />
        Resolved
      </div>
    );
  } else if (isEnded) {
    statusBadge = (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <AlertTriangle className="w-4 h-4 mr-1" />
        Ended (Unresolved)
      </div>
    );
  } else {
    statusBadge = (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        <Clock className="w-4 h-4 mr-1" />
        Active
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen mt-6 bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 md:p-6">
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <Button asChild variant="outline" size="sm" className="mr-2">
            <Link href="/">Home</Link>
          </Button>
          <Link href="/" className="hover:text-blue-600">
            Markets
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-gray-900">Market #{marketId}</span>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-0">
              {market.question}
            </h1>
            {statusBadge}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center">
              <Clock className="text-gray-500 w-5 h-5 mr-2" />
              <div>
                <div className="text-sm text-gray-600">End Time</div>
                <div className="font-medium">{formattedEndTime}</div>
                {!isEnded && !market.resolved && (
                  <div className="text-sm text-blue-600 font-medium mt-1">
                    {timeRemaining}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <Users className="text-gray-500 w-5 h-5 mr-2" />
              <div>
                <div className="text-sm text-gray-600">Total Participation</div>
                <div className="font-medium">
                  {totalSharesDisplay.toLocaleString()} shares
                </div>
              </div>
            </div>

            {market.resolved && (
              <div className="flex items-center">
                <Award className="text-green-600 w-5 h-5 mr-2" />
                <div>
                  <div className="text-sm text-gray-600">Winning Option</div>
                  <div className="font-medium">
                    {market.outcome === 1 ? market.optionA : market.optionB}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
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

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">
              Current Market Sentiment
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{market.optionA}</span>
                  <span>{optionAPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${optionAPercentage}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {(
                    Number(market.totalOptionAShares) /
                    10 ** TOKEN_DECIMALS
                  ).toLocaleString()}{" "}
                  shares
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{market.optionB}</span>
                  <span>{optionBPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full"
                    style={{ width: `${optionBPercentage}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {(
                    Number(market.totalOptionBShares) /
                    10 ** TOKEN_DECIMALS
                  ).toLocaleString()}{" "}
                  shares
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
