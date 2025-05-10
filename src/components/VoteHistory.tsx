"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveAccount } from "thirdweb/react";
import { ethers } from "ethers";
import { debounce } from "lodash";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";
import { contract } from "@/constants/contract";

// Cache keys for local storage
const CACHE_KEY = "vote_history_cache";
const LAST_BLOCK_KEY = "last_fetched_block";

// RPC URL
const ALCHEMY_RPC_URL =
  "https://base-mainnet.g.alchemy.com/v2/4tJqy59Y_Axu4yjgRuVf1ejipJKPbuh2";

// Initialize ethers provider
const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);

// Contract ABI (minimal for required functions and events)
const CONTRACT_ABI = [
  "event SharesPurchased(uint256 indexed marketId, address indexed buyer, bool isOptionA, uint256 amount)",
  "function bettingToken() view returns (address)",
  "function getMarketInfoBatch(uint256[] _marketIds) view returns (string[] questions, string[] optionAs, string[] optionBs, uint256[] endTimes, uint8[] outcomes, uint256[] totalOptionASharesArray, uint256[] totalOptionBSharesArray, bool[] resolvedArray)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// Initialize contract instance
const contractInstance = new ethers.Contract(
  contract.address,
  CONTRACT_ABI,
  provider
);

interface SharesPurchasedEvent {
  args: {
    marketId: bigint;
    buyer: string;
    isOptionA: boolean;
    amount: bigint;
  };
  blockNumber: bigint;
}

interface Vote {
  marketId: number;
  option: string;
  amount: bigint;
  marketName: string;
}

interface MarketInfo {
  marketId: number;
  question: string;
  optionA: string;
  optionB: string;
}

interface CacheData {
  votes: Vote[];
  marketInfo: Record<number, MarketInfo>;
  [LAST_BLOCK_KEY]: string;
}

type SortKey = "marketId" | "marketName" | "option" | "amount";
type SortDirection = "asc" | "desc";

export function VoteHistory() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenSymbol, setTokenSymbol] = useState<string>("BSTR");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("marketId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fetch token metadata
  useEffect(() => {
    const fetchTokenMetadata = async () => {
      try {
        const bettingTokenAddress = await contractInstance.bettingToken();
        const tokenContract = new ethers.Contract(
          bettingTokenAddress,
          CONTRACT_ABI,
          provider
        );
        const [symbol, decimals] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
        ]);
        setTokenSymbol(symbol);
        setTokenDecimals(Number(decimals));
      } catch (err) {
        console.error("Failed to fetch token metadata:", err);
      }
    };
    fetchTokenMetadata();
  }, []);

  // Load cache from local storage
  const loadCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached
        ? JSON.parse(cached)
        : { votes: [], marketInfo: {}, [LAST_BLOCK_KEY]: "0" };
    } catch {
      return { votes: [], marketInfo: {}, [LAST_BLOCK_KEY]: "0" };
    }
  }, []);

  // Save cache to local storage
  const saveCache = useCallback((data: CacheData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Cache save error:", error);
    }
  }, []);

  // Fetch votes
  const fetchVotes = useCallback(
    (accountAddress: string) => {
      const debouncedFetch = debounce(async () => {
        if (!accountAddress) {
          setVotes([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          // Load cache
          const cache = loadCache();
          let newVotes = [...cache.votes];
          const marketInfoCache = { ...cache.marketInfo };
          let fromBlock = BigInt(cache[LAST_BLOCK_KEY] || "29490017"); // Deployment block

          // Fetch latest block number using Alchemy RPC
          const latestBlock = BigInt(await provider.getBlockNumber());

          // Fetch events incrementally
          const blockRange = BigInt(10000);
          const allEvents: SharesPurchasedEvent[] = [];
          const eventFilter = contractInstance.filters.SharesPurchased(
            null,
            accountAddress
          );

          while (fromBlock <= latestBlock) {
            const toBlock =
              fromBlock + blockRange > latestBlock
                ? latestBlock
                : fromBlock + blockRange;
            const events = await contractInstance.queryFilter(
              eventFilter,
              Number(fromBlock),
              Number(toBlock)
            );
            // Assert that these are EventLogs for a named event, as we are filtering for 'SharesPurchased'
            const typedEvents = events as ethers.EventLog[];

            const formattedEventsInBatch = typedEvents.map(
              (event: ethers.EventLog) => ({
                // Now 'event' is known to be EventLog
                args: {
                  // event.args is of type ethers.Result which allows named access.
                  // Values from Result are 'any' by default with human-readable ABI, so cast them to expected types.
                  marketId: event.args.marketId as bigint,
                  buyer: event.args.buyer as string,
                  isOptionA: event.args.isOptionA as boolean,
                  amount: event.args.amount as bigint,
                },
                blockNumber: BigInt(event.blockNumber!), // blockNumber should not be null for historical events
              })
            );
            allEvents.push(...formattedEventsInBatch);
            fromBlock = toBlock + BigInt(1);
          }

          // Filter user events (already filtered by the event filter, but ensuring)
          const userEvents = allEvents.filter(
            (e) => e.args.buyer.toLowerCase() === accountAddress.toLowerCase()
          );

          // Get unique market IDs
          const marketIds = [
            ...new Set(userEvents.map((e) => Number(e.args.marketId))),
          ];
          const uncachedMarketIds = marketIds.filter(
            (id) => !marketInfoCache[id]
          );

          // Fetch market info in batch
          if (uncachedMarketIds.length > 0) {
            const marketInfos = await contractInstance.getMarketInfoBatch(
              uncachedMarketIds.map(BigInt)
            );

            // Update market info cache
            uncachedMarketIds.forEach((marketId, i) => {
              marketInfoCache[marketId] = {
                marketId,
                question: marketInfos[0][i],
                optionA: marketInfos[1][i],
                optionB: marketInfos[2][i],
              };
            });
          }

          // Map events to votes
          const newUserVotes = userEvents
            .map((e) => {
              const market = marketInfoCache[Number(e.args.marketId)];
              if (!market) return null;
              return {
                marketId: Number(e.args.marketId),
                option: e.args.isOptionA ? market.optionA : market.optionB,
                amount: e.args.amount,
                marketName: market.question,
              };
            })
            .filter((vote): vote is Vote => vote !== null);

          // Merge new votes with cached votes, avoiding duplicates
          const voteMap = new Map<number, Vote>();
          [...cache.votes, ...newUserVotes].forEach((vote, i) => {
            voteMap.set(i, vote);
          });
          newVotes = Array.from(voteMap.values());

          // Update cache
          saveCache({
            votes: newVotes,
            marketInfo: marketInfoCache,
            [LAST_BLOCK_KEY]: latestBlock.toString(),
          });

          setVotes(newVotes);
        } catch (error) {
          console.error("Vote history error:", error);
          toast({
            title: "Error",
            description: "Failed to load vote history. Please try again.",
            variant: "destructive",
          });
          setVotes([]);
        } finally {
          setIsLoading(false);
        }
      }, 500);

      debouncedFetch();
      return debouncedFetch.cancel;
    },
    [loadCache, saveCache, toast]
  );

  useEffect(() => {
    const cancel = fetchVotes(account?.address || "");
    return () => cancel();
  }, [account, fetchVotes]);

  // Handle sorting
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Map SortDirection to aria-sort values
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
        default:
          return 0;
      }
    });

  if (!account) {
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
          <div className="grid grid-cols-4 gap-4 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-700">
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
          </div>
          {filteredVotes.map((vote, idx) => (
            <div
              key={idx}
              className="grid grid-cols-4 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
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
              <div
                className="text-sm text-gray-900 truncate"
                title={vote.marketName}
              >
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
