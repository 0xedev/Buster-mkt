"use client";

import { useEffect, useState } from "react";
import { MarketCard, Market } from "./marketCard";
import { MarketV2Card } from "./market-v2-card";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketV2, Market as MarketV1Types } from "@/types/types";
import { getTotalMarketCount, fetchMarketData } from "@/lib/market-migration";

interface UnifiedMarketListProps {
  filter: "active" | "pending" | "resolved";
}

interface MarketWithVersion {
  id: number;
  version: "v1" | "v2";
  market: Market | MarketV2;
}

// Helper function to convert MarketV1Types to Market (for compatibility)//
function convertV1Market(market: MarketV1Types): Market {
  return {
    question: market.question,
    optionA: market.optionA,
    optionB: market.optionB,
    endTime: BigInt(market.endTime),
    outcome: parseInt(market.outcome),
    totalOptionAShares: BigInt(market.totalOptionAShares),
    totalOptionBShares: BigInt(market.totalOptionBShares),
    resolved: market.resolved,
  };
}

function getMarketStatus(
  market: Market | MarketV2
): "active" | "pending" | "resolved" {
  const now = Math.floor(Date.now() / 1000);
  // Handle both bigint and string endTime types
  const endTime =
    typeof market.endTime === "string"
      ? parseInt(market.endTime)
      : Number(market.endTime);
  const isExpired = endTime < now;
  const isResolved = market.resolved;

  if (isResolved) {
    return "resolved";
  } else if (isExpired) {
    return "pending";
  } else {
    return "active";
  }
}

export function UnifiedMarketList({ filter }: UnifiedMarketListProps) {
  const [markets, setMarkets] = useState<MarketWithVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get market counts from both contracts
        const counts = await getTotalMarketCount();
        console.log("Market counts:", counts);

        // For now, prioritize V2 markets and show some V1 markets
        const marketPromises: Promise<MarketWithVersion>[] = [];

        // Fetch V2 markets in parallel
        for (let i = 0; i < counts.v2Count; i++) {
          marketPromises.push(
            fetchMarketData(i).then(({ version, market }) => ({
              id: i,
              version,
              market:
                version === "v2"
                  ? (market as MarketV2)
                  : convertV1Market(market as MarketV1Types),
            }))
          );
        }

        // Fetch recent V1 markets (up to 20) in parallel
        const v1MarketsToFetch = Math.min(counts.v1Count, 20);
        for (
          let i = Math.max(0, counts.v1Count - v1MarketsToFetch);
          i < counts.v1Count;
          i++
        ) {
          marketPromises.push(
            fetchMarketData(i).then(({ version, market }) => ({
              id: i,
              version,
              market:
                version === "v2"
                  ? (market as MarketV2)
                  : convertV1Market(market as MarketV1Types),
            }))
          );
        }

        const allMarkets = await Promise.allSettled(marketPromises);

        const successfulMarkets = allMarkets
          .filter(
            (result): result is PromiseFulfilledResult<MarketWithVersion> =>
              result.status === "fulfilled"
          )
          .map((result) => result.value);

        // Sort by ID descending (newest first)
        successfulMarkets.sort((a, b) => b.id - a.id);

        setMarkets(successfulMarkets);
      } catch (err) {
        console.error("Error fetching markets:", err);
        setError("Failed to load markets");
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  // Filter markets based on status
  const filteredMarkets = markets.filter(({ market }) => {
    const status = getMarketStatus(market);
    return status === filter;
  });

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredMarkets.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No {filter} markets found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredMarkets.map(({ id, version, market }) => {
        if (version === "v2") {
          return (
            <MarketV2Card
              key={`v2-${id}`}
              index={id}
              market={market as MarketV2}
            />
          );
        } else {
          return (
            <MarketCard key={`v1-${id}`} index={id} market={market as Market} />
          );
        }
      })}
    </div>
  );
}
