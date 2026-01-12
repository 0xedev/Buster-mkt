"use client";

import { useEffect, useState } from "react";
import { MarketV2Card } from "./market-v2-card";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketV2 } from "@/types/types";
import {
  contractAddress,
  contractAbi,
  publicClient,
} from "@/constants/contract";
import { Input } from "./ui/input";
import { Search, Filter, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { getTotalMarketCount, fetchMarketData } from "@/lib/market-migration";
import { CATEGORY_LABELS, MarketCategory } from "@/lib/constants";

interface ValidatedMarketListProps {
  filter: "active" | "pending" | "resolved";
  showOnlyValidated?: boolean;
}

interface MarketData {
  id: number;
  market: MarketV2;
  validated: boolean;
}

function getMarketStatus(market: MarketV2): "active" | "pending" | "resolved" {
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

// Cache for validation status to avoid repeated checks
const validationCache = new Map<
  number,
  { validated: boolean; timestamp: number }
>();
const VALIDATION_CACHE_TTL = 60000; // 60 seconds

// Check if a market is validated by attempting a purchase call
async function checkMarketValidation(marketId: number): Promise<boolean> {
  // Check cache first
  const cached = validationCache.get(marketId);
  if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL) {
    return cached.validated;
  }

  try {
    // We'll try to simulate a purchase to see if it throws MarketNotValidated
    // This is a workaround since there's no direct validation getter in the contract
    // We use estimateContractGas with a dummy call to check if the market is validated
    // Cast to `any` to avoid ABI-derived type errors
    await (publicClient.estimateContractGas as any)({
      address: contractAddress,
      abi: contractAbi,
      functionName: "buyShares" as any,
      args: [BigInt(marketId), BigInt(0), BigInt(1), BigInt(1000000)], // Try to buy 1 share of option 0 with max price 1000000
      account: "0x0000000000000000000000000000000000000001", // Dummy account
    });

    // Cache the result
    validationCache.set(marketId, { validated: true, timestamp: Date.now() });
    return true; // If no error, market is validated
  } catch (error: any) {
    // Check if the error is specifically MarketNotValidated
    const isNotValidated =
      error?.message?.includes("MarketNotValidated") ||
      error?.shortMessage?.includes("MarketNotValidated") ||
      error?.details?.includes("MarketNotValidated");

    // For other errors (like insufficient funds, invalid option, etc.), assume validated
    const validated = !isNotValidated;

    // Cache the result
    validationCache.set(marketId, { validated, timestamp: Date.now() });
    return validated;
  }
}

export function ValidatedMarketList({
  filter,
  showOnlyValidated = true,
}: ValidatedMarketListProps) {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        const counts = await getTotalMarketCount();
        console.log("Total market count:", counts.total);

        const allMarketData: MarketData[] = [];

        // Fetch markets in batches to avoid rate limiting
        const BATCH_SIZE = 10; // Process 10 markets at a time

        // Helper function to fetch a batch
        const fetchBatch = async (startIdx: number, endIdx: number) => {
          const promises = [];
          for (let i = startIdx; i < endIdx; i++) {
            promises.push(
              fetchMarketData(i)
                .then(async ({ market }) => {
                  const validated = await checkMarketValidation(i);

                  return {
                    id: i,
                    validated,
                    market: market as MarketV2,
                  };
                })
                .catch((err) => {
                  console.error(`Failed to fetch market ${i}:`, err);
                  return null;
                })
            );
          }

          const results = await Promise.allSettled(promises);
          return results
            .filter(
              (r): r is PromiseFulfilledResult<MarketData | null> =>
                r.status === "fulfilled" && r.value !== null
            )
            .map((r) => r.value as MarketData);
        };

        // Fetch all markets in batches
        for (let i = 0; i < counts.total; i += BATCH_SIZE) {
          const endIdx = Math.min(i + BATCH_SIZE, counts.total);
          const batchResults = await fetchBatch(i, endIdx);
          allMarketData.push(...batchResults);

          // Update UI progressively
          setMarkets([...allMarketData].sort((a, b) => b.id - a.id));
        }

        // Final sort
        allMarketData.sort((a, b) => b.id - a.id);
        setMarkets(allMarketData);
      } catch (err) {
        console.error("Error fetching markets:", err);
        setError("Failed to load markets");
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  // Filter and search markets
  const filteredMarkets = markets
    .filter(({ market, validated }) => {
      const status = getMarketStatus(market);
      const statusMatch = status === filter;
      const validationMatch = showOnlyValidated ? validated : true;

      // Search filter
      const searchMatch = searchQuery
        ? market.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          market.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const categoryMatch =
        categoryFilter === "all" ||
        market.category?.toString() === categoryFilter;

      return statusMatch && validationMatch && searchMatch && categoryMatch;
    })
    .sort((a, b) => {
      // Sorting logic
      switch (sortBy) {
        case "newest":
          return b.id - a.id;
        case "oldest":
          return a.id - b.id;
        case "ending-soon":
          const aEndTime =
            typeof a.market.endTime === "string"
              ? parseInt(a.market.endTime)
              : Number(a.market.endTime);
          const bEndTime =
            typeof b.market.endTime === "string"
              ? parseInt(b.market.endTime)
              : Number(b.market.endTime);
          return aEndTime - bEndTime;
        case "most-volume":
          const aVolume =
            "totalVolume" in a.market ? Number(a.market.totalVolume || 0) : 0;
          const bVolume =
            "totalVolume" in b.market ? Number(b.market.totalVolume || 0) : 0;
          return bVolume - aVolume;
        default:
          return b.id - a.id;
      }
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

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setSortBy("newest");
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 md:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto flex-nowrap">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm pl-8 md:pl-10 pr-8 md:pr-10 min-w-[160px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="block">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[120px] md:w-[180px] h-9 text-sm">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value={MarketCategory.POLITICS.toString()}>
                  {CATEGORY_LABELS[MarketCategory.POLITICS]}
                </SelectItem>
                <SelectItem value={MarketCategory.SPORTS.toString()}>
                  {CATEGORY_LABELS[MarketCategory.SPORTS]}
                </SelectItem>
                <SelectItem value={MarketCategory.ENTERTAINMENT.toString()}>
                  {CATEGORY_LABELS[MarketCategory.ENTERTAINMENT]}
                </SelectItem>
                <SelectItem value={MarketCategory.TECHNOLOGY.toString()}>
                  {CATEGORY_LABELS[MarketCategory.TECHNOLOGY]}
                </SelectItem>
                <SelectItem value={MarketCategory.ECONOMICS.toString()}>
                  {CATEGORY_LABELS[MarketCategory.ECONOMICS]}
                </SelectItem>
                <SelectItem value={MarketCategory.SCIENCE.toString()}>
                  {CATEGORY_LABELS[MarketCategory.SCIENCE]}
                </SelectItem>
                <SelectItem value={MarketCategory.WEATHER.toString()}>
                  {CATEGORY_LABELS[MarketCategory.WEATHER]}
                </SelectItem>
                <SelectItem value={MarketCategory.OTHER.toString()}>
                  {CATEGORY_LABELS[MarketCategory.OTHER]}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="block">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] md:w-[180px] h-9 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="most-volume">Most Volume</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="block">
            {(searchQuery ||
              categoryFilter !== "all" ||
              sortBy !== "newest") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="whitespace-nowrap h-9"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="hidden md:block mt-3 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredMarkets.length} of{" "}
          {
            markets.filter(({ market, validated }) => {
              const status = getMarketStatus(market);
              const validationMatch = showOnlyValidated ? validated : true;
              return status === filter && validationMatch;
            }).length
          }{" "}
          markets
        </div>
      </div>

      {/* Markets Grid */}
      {filteredMarkets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500">
            {searchQuery || categoryFilter !== "all"
              ? "No markets match your filters."
              : `No ${
                  showOnlyValidated ? "validated " : ""
                }${filter} markets found.`}
          </p>
          {showOnlyValidated && !searchQuery && categoryFilter === "all" && (
            <p className="text-sm text-gray-400 mt-2">
              Markets must be validated by an admin before appearing here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMarkets.map(({ id, market, validated }) => (
            <div key={`market-${id}`} className="relative">
              <MarketV2Card index={id} market={market as MarketV2} />
              {!validated && (
                <div className="absolute top-2 right-2 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">
                  Pending Validation
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
