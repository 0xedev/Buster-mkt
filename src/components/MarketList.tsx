"use client"; // Add "use client" if not already present at the top

import { useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { MarketCard, Market } from "./marketCard"; // Import Market interface
import { MarketCardSkeleton } from "./market-card-skeleton"; // Import Skeleton
import { useMemo } from "react";

// Interface MarketListProps (keep as is)
interface MarketListProps {
  filter: "active" | "pending" | "resolved";
}

// --- Helper function to determine market status ---
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
// --- End Helper ---

export function MarketList({ filter }: MarketListProps) {
  // --- REMOVED: cachedMarkets state is no longer needed ---
  // const [cachedMarkets, setCachedMarkets] = useState<Map<number, Market>>(new Map());

  // Fetch market count (keep as is)
  const { data: marketCount } = useReadContract({
    contract,
    method: "function getMarketCount() view returns (uint256)",
    params: [],
  });

  // Generate array of market IDs (keep as is)
  const marketIds = useMemo(() => {
    if (marketCount === undefined || marketCount === null) return []; // Handle undefined/null
    return Array.from({ length: Number(marketCount) }, (_, i) => BigInt(i));
  }, [marketCount]);

  // Fetch market data in batch (keep as is)
  const { data: marketsData, isLoading } = useReadContract({
    contract,
    method:
      "function getMarketInfoBatch(uint256[] _marketIds) view returns (string[] questions, string[] optionAs, string[] optionBs, uint256[] endTimes, uint8[] outcomes, uint256[] totalOptionASharesArray, uint256[] totalOptionBSharesArray, bool[] resolvedArray)",
    params: [marketIds],
    // Only run query if marketIds has elements
    queryOptions: { enabled: marketIds.length > 0 },
  });

  // --- REVISED: Parse market data and include original index ---
  const allParsedMarkets = useMemo(() => {
    if (!marketsData || marketIds.length === 0) return [];

    // Deconstruct for clarity
    const [
      questions,
      optionAs,
      optionBs,
      endTimes,
      outcomes,
      totalOptionASharesArray,
      totalOptionBSharesArray,
      resolvedArray,
    ] = marketsData;

    // Map raw data to Market objects, including the original index (marketId)
    const parsedMarkets: (Market & { originalIndex: number })[] = [];
    for (let i = 0; i < marketIds.length; i++) {
      // Basic check if data exists for this index
      if (questions[i] !== undefined) {
        parsedMarkets.push({
          originalIndex: Number(marketIds[i]), // Store the original market ID
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
  // --- END REVISED ---

  // --- NEW: Filter markets based on the filter prop ---
  const filteredMarkets = useMemo(() => {
    return allParsedMarkets.filter(
      (market) => getMarketStatus(market) === filter
    );
  }, [allParsedMarkets, filter]);
  // --- END NEW ---

  // --- REVISED: Render Skeletons or Filtered Markets ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {" "}
      {/* Added grid layout like dashboard */}
      {isLoading ? (
        // Render skeletons directly
        Array.from({ length: 3 }).map((_, i) => (
          <MarketCardSkeleton key={`skeleton-${i}`} />
        ))
      ) : filteredMarkets.length > 0 ? (
        // Render filtered markets, passing only index and market
        filteredMarkets.map((market) => (
          <MarketCard
            key={market.originalIndex} // Use original index as key
            index={market.originalIndex} // Pass original index
            market={market} // Pass the market data object
            // filter, isLoading, cachedMarkets props are removed
          />
        ))
      ) : (
        // Optional: Add an empty state message if no markets match the filter
        <div className="col-span-full text-center text-gray-500 py-10">
          {" "}
          {/* Span across grid columns */}
          No {filter} markets found.
        </div>
      )}
    </div>
  );
  // --- END REVISED ---
}
