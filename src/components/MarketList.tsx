import { useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { MarketCard } from "./marketCard";
import { useMemo, useState } from "react";

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

interface MarketListProps {
  filter: "active" | "pending" | "resolved";
}

export function MarketList({ filter }: MarketListProps) {
  // Cache for market data
  const [cachedMarkets, setCachedMarkets] = useState<Map<number, Market>>(
    new Map()
  );

  // Fetch market count
  const { data: marketCount } = useReadContract({
    contract,
    method: "function getMarketCount() view returns (uint256)",
    params: [],
  });

  // Generate array of market IDs
  const marketIds = useMemo(() => {
    if (!marketCount) return [];
    return Array.from({ length: Number(marketCount) }, (_, i) => BigInt(i));
  }, [marketCount]);

  // Fetch market data in batch
  const { data: marketsData, isLoading } = useReadContract({
    contract,
    method:
      "function getMarketInfoBatch(uint256[] _marketIds) view returns (string[] questions, string[] optionAs, string[] optionBs, uint256[] endTimes, uint8[] outcomes, uint256[] totalOptionASharesArray, uint256[] totalOptionBSharesArray, bool[] resolvedArray)",
    params: [marketIds],
  });

  // Parse and cache market data
  const markets = useMemo(() => {
    if (!marketsData) return [];

    const parsedMarkets: Market[] = marketsData[0].map((_, i) => ({
      question: marketsData[0][i],
      optionA: marketsData[1][i],
      optionB: marketsData[2][i],
      endTime: marketsData[3][i],
      outcome: marketsData[4][i],
      totalOptionAShares: marketsData[5][i],
      totalOptionBShares: marketsData[6][i],
      resolved: marketsData[7][i],
    }));

    // Update cache
    const newCache = new Map(cachedMarkets);
    parsedMarkets.forEach((market, i) => {
      newCache.set(Number(marketIds[i]), market);
    });
    setCachedMarkets(newCache);

    return parsedMarkets;
  }, [marketsData, marketIds]);

  return (
    <div className="grid gap-4">
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => (
            <MarketCard key={i} index={i} filter={filter} isLoading />
          ))
        : markets.map((market, i) => (
            <MarketCard
              key={i}
              index={i}
              filter={filter}
              market={market}
              cachedMarkets={cachedMarkets}
            />
          ))}
    </div>
  );
}
