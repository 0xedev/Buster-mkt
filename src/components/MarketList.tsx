"use client";

import { useReadContract } from "wagmi";
import { contract, contractAbi } from "@/constants/contract";
import { MarketCard, Market } from "./marketCard";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { useMemo } from "react";

interface MarketListProps {
  filter: "active" | "pending" | "resolved";
}

function getMarketStatus(market: Market): "active" | "pending" | "resolved" {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = Number(market.endTime) < now;
  const isResolved = market.resolved;

  if (isResolved) {
    return "resolved";
  } else if (isExpired) {
    return "pending";
  } else {
    return "active";
  }
}

export function MarketList({ filter }: MarketListProps) {
  const { data: marketCount } = useReadContract({
    address: contract.address,
    abi: contractAbi,
    functionName: "getMarketCount",
    args: [],
  });

  const marketIds = useMemo(() => {
    if (marketCount === undefined || marketCount === null) return [];
    return Array.from({ length: Number(marketCount) }, (_, i) => BigInt(i));
  }, [marketCount]);

  const { data: marketsData, isLoading } = useReadContract({
    address: contract.address,
    abi: contractAbi,
    functionName: "getMarketInfoBatch",
    args: [marketIds],
    query: { enabled: marketIds.length > 0 },
  });

  const allParsedMarkets = useMemo(() => {
    if (!marketsData || marketIds.length === 0) return [];

    const [
      questions,
      optionAs,
      optionBs,
      endTimes,
      outcomes,
      totalOptionASharesArray,
      totalOptionBSharesArray,
      resolvedArray,
    ] = marketsData as [
      string[],
      string[],
      string[],
      bigint[],
      number[],
      bigint[],
      bigint[],
      boolean[]
    ];

    const parsedMarkets: (Market & { originalIndex: number })[] = [];
    for (let i = 0; i < marketIds.length; i++) {
      if (questions[i] !== undefined) {
        parsedMarkets.push({
          originalIndex: Number(marketIds[i]),
          question: questions[i],
          optionA: optionAs[i],
          optionB: optionBs[i],
          endTime: endTimes[i],
          outcome: outcomes[i],
          totalOptionAShares: totalOptionASharesArray[i],
          totalOptionBShares: totalOptionBSharesArray[i],
          resolved: resolvedArray[i],
        });
      }
    }
    return parsedMarkets;
  }, [marketsData, marketIds]);

  const filteredMarkets = useMemo(() => {
    return allParsedMarkets.filter(
      (market) => getMarketStatus(market) === filter
    );
  }, [allParsedMarkets, filter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <MarketCardSkeleton key={`skeleton-${i}`} />
        ))
      ) : filteredMarkets.length > 0 ? (
        filteredMarkets.map((market) => (
          <MarketCard
            key={market.originalIndex}
            index={market.originalIndex}
            market={market}
          />
        ))
      ) : (
        <div className="col-span-full text-center text-gray-500 py-10">
          No {filter} markets found.
        </div>
      )}
    </div>
  );
}
