"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Address } from "viem";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";
import {
  publicClient,
  contractAddress,
  contractAbi,
  tokenAddress as defaultTokenAddress,
  tokenAbi as defaultTokenAbi,
} from "@/constants/contract";

const CACHE_KEY = "vote_history_cache_v5";
const CACHE_TTL = 60 * 60; // 1 hour in seconds
const PAGE_SIZE = 50; // Votes per contract call

interface Vote {
  marketId: number;
  isOptionA: boolean;
  amount: bigint;
  timestamp: bigint;
}

interface DisplayVote {
  marketId: number;
  option: string;
  amount: bigint;
  marketName: string;
  timestamp: bigint;
}

interface MarketInfo {
  marketId: number;
  question: string;
  optionA: string;
  optionB: string;
}

interface CacheData {
  votes: DisplayVote[];
  marketInfo: Record<number, MarketInfo>;
  timestamp: number;
}

type SortKey = "marketId" | "marketName" | "option" | "amount" | "timestamp";
type SortDirection = "asc" | "desc";

export function VoteHistory() {
  const { address: accountAddress, isConnected } = useAccount();
  const { toast } = useToast();
  const [votes, setVotes] = useState<DisplayVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenSymbol, setTokenSymbol] = useState<string>("BSTR");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fetch betting token address
  const { data: bettingTokenAddr } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "bettingToken",
  });

  const tokenAddress = (bettingTokenAddr as Address) || defaultTokenAddress;

  // Fetch token metadata
  const { data: symbolData } = useReadContract({
    address: tokenAddress,
    abi: defaultTokenAbi,
    functionName: "symbol",
    query: { enabled: !!tokenAddress },
  });

  const { data: decimalsData } = useReadContract({
    address: tokenAddress,
    abi: defaultTokenAbi,
    functionName: "decimals",
    query: { enabled: !!tokenAddress },
  });

  useEffect(() => {
    if (symbolData) setTokenSymbol(symbolData as string);
    if (decimalsData) setTokenDecimals(Number(decimalsData));
  }, [symbolData, decimalsData]);

  // Load cache
  const loadCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached
        ? JSON.parse(cached)
        : { votes: [], marketInfo: {}, timestamp: 0 };
    } catch {
      return { votes: [], marketInfo: {}, timestamp: 0 };
    }
  }, []);

  // Save cache
  const saveCache = useCallback((data: CacheData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Cache save error:", error);
    }
  }, []);

  // Fetch votes
  const fetchVotes = useCallback(
    async (address: Address | undefined) => {
      if (!address) {
        setVotes([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const cache = loadCache();
        const now = Math.floor(Date.now() / 1000);

        // Use cache if fresh
        if (cache.votes.length > 0 && now - cache.timestamp < CACHE_TTL) {
          setVotes(cache.votes);
          setIsLoading(false);
          return;
        }

        // Check vote count
        const voteCount = (await publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: "getVoteHistoryCount",
          args: [address],
        })) as bigint;

        if (voteCount === 0n) {
          setVotes([]);
          saveCache({
            votes: [],
            marketInfo: cache.marketInfo,
            timestamp: now,
          });
          setIsLoading(false);
          return;
        }

        const allVotes: Vote[] = [];
        let start = 0;

        // Paginate vote history
        while (start < Number(voteCount)) {
          const voteBatch = (await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getVoteHistory",
            args: [address, BigInt(start), BigInt(PAGE_SIZE)],
          })) as unknown as Vote[];

          if (voteBatch.length === 0) break;
          allVotes.push(...voteBatch);
          start += PAGE_SIZE;
        }

        // Fetch market info
        const marketIds = [...new Set(allVotes.map((v) => Number(v.marketId)))];
        const marketInfoCache = { ...cache.marketInfo };
        const uncachedMarketIds = marketIds.filter(
          (id) => !marketInfoCache[id]
        );

        if (uncachedMarketIds.length > 0) {
          const marketInfos = (await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getMarketInfoBatch",
            args: [uncachedMarketIds.map(BigInt)],
          })) as [
            string[],
            string[],
            string[],
            bigint[],
            number[],
            bigint[],
            bigint[],
            boolean[]
          ];

          const [questions, optionAs, optionBs] = marketInfos;
          uncachedMarketIds.forEach((id, i) => {
            marketInfoCache[id] = {
              marketId: id,
              question: questions[i],
              optionA: optionAs[i],
              optionB: optionBs[i],
            };
          });
        }

        // Map votes
        const displayVotes = allVotes.map((vote) => ({
          marketId: Number(vote.marketId),
          option: vote.isOptionA
            ? marketInfoCache[Number(vote.marketId)].optionA
            : marketInfoCache[Number(vote.marketId)].optionB,
          amount: vote.amount,
          marketName: marketInfoCache[Number(vote.marketId)].question,
          timestamp: vote.timestamp,
        }));

        // Update cache
        const newCache = {
          votes: displayVotes,
          marketInfo: marketInfoCache,
          timestamp: now,
        };
        saveCache(newCache);
        setVotes(displayVotes);
      } catch (error) {
        console.error("Vote history error:", error);
        toast({
          title: "Error",
          description: "Failed to load vote history.",
          variant: "destructive",
        });
        setVotes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [loadCache, saveCache, toast]
  );

  useEffect(() => {
    fetchVotes(accountAddress);
  }, [accountAddress, fetchVotes]);

  // Handle sorting
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getAriaSort = (key: SortKey): "none" | "ascending" | "descending" => {
    if (key !== sortKey) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  // Sort and filter votes
  const filteredVotes = votes
    .filter(
      (vote) =>
        vote.marketName.toLowerCase().includes(search.toLowerCase()) ||
        vote.option.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      switch (sortKey) {
        case "marketId":
          return (a.marketId - b.marketId) * multiplier;
        case "marketName":
          return a.marketName.localeCompare(b.marketName) * multiplier;
        case "option":
          return a.option.localeCompare(b.option) * multiplier;
        case "amount":
          return Number(a.amount - b.amount) * multiplier;
        case "timestamp":
          return Number(a.timestamp - b.timestamp) * multiplier;
        default:
          return 0;
      }
    });

  if (!isConnected || !accountAddress) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
        <div className="text-gray-500 font-medium">
          Your market history will appear here
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-gray-50 p-3 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-200 rounded w-2/3"></div>
                <div className="h-5 bg-gray-200 rounded w-1/5"></div>
              </div>
              <div className="mt-2 h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Your Vote History</h3>
        <Input
          placeholder="Search by market or option"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2"
          aria-label="Search vote history"
        />
      </div>

      {filteredVotes.length > 0 ? (
        <div className="divide-y divide-gray-200">
          <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-700">
            <button
              role="columnheader"
              onClick={() => handleSort("marketId")}
              className="flex items-center gap-1 hover:text-gray-900"
              aria-sort={getAriaSort("marketId")}
              aria-label="Sort by Market ID"
            >
              Market ID
              <ArrowUpDown className="h-4 w-4" />
            </button>
            <button
              role="columnheader"
              onClick={() => handleSort("marketName")}
              className="flex items-center gap-1 hover:text-gray-900"
              aria-sort={getAriaSort("marketName")}
              aria-label="Sort by Market Name"
            >
              Market Name
              <ArrowUpDown className="h-4 w-4" />
            </button>
            <button
              role="columnheader"
              onClick={() => handleSort("option")}
              className="flex items-center gap-1 hover:text-gray-900"
              aria-sort={getAriaSort("option")}
              aria-label="Sort by Option"
            >
              Option
              <ArrowUpDown className="h-4 w-4" />
            </button>
            <button
              role="columnheader"
              onClick={() => handleSort("amount")}
              className="flex items-center gap-1 hover:text-gray-900 text-right"
              aria-sort={getAriaSort("amount")}
              aria-label="Sort by Amount"
            >
              Amount
              <ArrowUpDown className="h-4 w-4" />
            </button>
            <button
              role="columnheader"
              onClick={() => handleSort("timestamp")}
              className="flex items-center gap-1 hover:text-gray-900 text-right"
              aria-sort={getAriaSort("timestamp")}
              aria-label="Sort by Date"
            >
              Date
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
          {filteredVotes.map((vote, idx) => (
            <div
              key={idx}
              className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              role="button"
              tabIndex={0}
              aria-label={`Vote on ${vote.marketName} for ${vote.option}`}
            >
              <div className="text-sm text-gray-900">
                <Link
                  href={`/market/${vote.marketId}`}
                  className="hover:underline"
                >
                  #{vote.marketId}
                </Link>
              </div>
              <div className="text-sm text-gray-900 truncate">
                <Link
                  href={`/market/${vote.marketId}`}
                  className="hover:underline"
                >
                  {vote.marketName}
                </Link>
              </div>
              <div className="text-sm">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {vote.option}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-900 text-right">
                {(
                  Number(vote.amount) / Math.pow(10, tokenDecimals)
                ).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                {tokenSymbol}
              </div>
              <div className="text-sm text-gray-500 text-right">
                {new Date(Number(vote.timestamp) * 1000).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-500">
            {search ? "No matching votes found" : "No votes submitted yet"}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Your voting history will appear here
          </p>
        </div>
      )}
    </div>
  );
}
