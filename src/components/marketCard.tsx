"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { MarketProgress } from "./market-progress";
import MarketTime from "./market-time";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";

// Interface for market data
export interface Market {
  // index?: number; // Optional: if you need the original index inside the card
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number; // Solidity enum maps to number
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

// Interface for shares balance
interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

// Props for the MarketCard component
interface MarketCardProps {
  index: number; // Keep index for contract calls like getShareBalance
  market: Market; // Receive the processed market data directly
}

export function MarketCard({ index, market }: MarketCardProps) {
  const account = useActiveAccount();

  // --- Use the market data passed via props ---
  const marketData = market;
  // --- END ---

  // Fetch shares balance (keep as is, uses index)
  const { data: sharesBalanceData } = useReadContract({
    contract,
    method:
      "function getShareBalance(uint256 _marketId, address _user) view returns (uint256 optionAShares, uint256 optionBShares)",
    params: [BigInt(index), account?.address as string],
    queryOptions: { enabled: !!account?.address && !!marketData }, // Also check marketData exists
  });

  const sharesBalance: SharesBalance | undefined = sharesBalanceData
    ? {
        optionAShares: sharesBalanceData[0],
        optionBShares: sharesBalanceData[1],
      }
    : undefined;

  // Calculate status based on the marketData prop
  // These are now used for *internal* display logic within the card
  const isExpired = new Date(Number(marketData.endTime) * 1000) < new Date();
  const isResolved = marketData.resolved;

  // Construct Warpcast share URL
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
  const marketPageUrl = `${appUrl}/market/${index}`;
  const warpcastShareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
    `Check out this market on Buster Market: ${
      marketData?.question || `Market ${index}`
    }`
  )}&embeds[]=${encodeURIComponent(marketPageUrl)}`;

  return (
    <Card key={index} className="flex flex-col">
      <CardHeader>
        <MarketTime endTime={marketData.endTime} />
        <CardTitle>{marketData.question}</CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <MarketProgress
          optionA={marketData.optionA}
          optionB={marketData.optionB}
          totalOptionAShares={marketData.totalOptionAShares}
          totalOptionBShares={marketData.totalOptionBShares}
        />
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
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4">
        {sharesBalance &&
        (sharesBalance.optionAShares > 0n ||
          sharesBalance.optionBShares > 0n) ? (
          <MarketSharesDisplay
            market={marketData}
            sharesBalance={sharesBalance}
          />
        ) : (
          <div />
        )}
        <Button asChild variant="outline" size="sm">
          <a href={warpcastShareUrl} target="_blank" rel="noopener noreferrer">
            Share
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
