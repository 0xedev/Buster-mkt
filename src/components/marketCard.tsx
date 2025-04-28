import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
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

// Interface for shares balance
interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

// Props for the MarketCard component
interface MarketCardProps {
  index: number;
  filter: "active" | "pending" | "resolved";
  market?: Market;
  cachedMarkets?: Map<number, Market>;
  isLoading?: boolean;
}

export function MarketCard({
  index,
  filter,
  market,
  cachedMarkets,
  isLoading,
}: MarketCardProps) {
  const account = useActiveAccount();

  // Use cached market data if available, otherwise fallback to prop
  const marketData = market || cachedMarkets?.get(index);

  // Fetch shares balance
  const { data: sharesBalanceData } = useReadContract({
    contract,
    method:
      "function getShareBalance(uint256 _marketId, address _user) view returns (uint256 optionAShares, uint256 optionBShares)",
    params: [BigInt(index), account?.address as string],
  });

  const sharesBalance: SharesBalance | undefined = sharesBalanceData
    ? {
        optionAShares: sharesBalanceData[0],
        optionBShares: sharesBalanceData[1],
      }
    : undefined;

  // Check if market is expired
  const isExpired =
    marketData && new Date(Number(marketData.endTime) * 1000) < new Date();
  const isResolved = marketData?.resolved;

  // Determine if market should be shown
  const shouldShow = () => {
    if (!marketData) return false;
    switch (filter) {
      case "active":
        return !isExpired;
      case "pending":
        return isExpired && !isResolved;
      case "resolved":
        return isExpired && isResolved;
      default:
        return true;
    }
  };

  if (!shouldShow()) {
    return null;
  }

  return (
    <Card key={index} className="flex flex-col">
      {isLoading || !marketData ? (
        <MarketCardSkeleton />
      ) : (
        <>
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
          <CardFooter>
            {sharesBalance && (
              <MarketSharesDisplay
                market={marketData}
                sharesBalance={sharesBalance}
              />
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
