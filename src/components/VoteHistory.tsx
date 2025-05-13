"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract as useWagmiReadContract } from "wagmi";
import { type Address } from "viem";
import { debounce } from "lodash";
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

// Cache keys for local storage
const CACHE_KEY = "vote_history_cache_v3";
const LAST_BLOCK_KEY = "last_fetched_block_v3";

const DEPLOYMENT_BLOCK = 29490017n;
const MAX_CONCURRENT_REQUESTS = 2; // Limit concurrent getLogs calls

interface SharesPurchasedEvent {
  args: {
    marketId: bigint;
    buyer: Address;
    isOptionA: boolean;
    amount: bigint;
  };
  marketId: bigint;
  buyer: Address;
  isOptionA: boolean;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

interface SharesPurchasedLogArgs {
  marketId: bigint;
  buyer: Address;
  isOptionA: boolean;
  amount: bigint;
}

interface Vote {
  marketId: number;
  option: string;
  amount: bigint;
  marketName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
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
  const { address: accountAddress, isConnected } = useAccount();
  const { toast } = useToast();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenSymbol, setTokenSymbol] = useState<string>("BSTR");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("marketId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const isFetchingRef = useRef(false);

  // Fetch betting token address
  const { data: bettingTokenAddrFromContract } = useWagmiReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "bettingToken",
    query: { refetchOnWindowFocus: false }, // Disable refetch on focus
  });

  const actualTokenAddress =
    (bettingTokenAddrFromContract as Address | undefined) ||
    defaultTokenAddress;

  // Fetch token metadata
  const { data: symbolData } = useWagmiReadContract({
    address: actualTokenAddress,
    abi: defaultTokenAbi,
    functionName: "symbol",
    query: { enabled: !!actualTokenAddress, refetchOnWindowFocus: false },
  });

  const { data: decimalsData } = useWagmiReadContract({
    address: actualTokenAddress,
    abi: defaultTokenAbi,
    functionName: "decimals",
    query: { enabled: !!actualTokenAddress, refetchOnWindowFocus: false },
  });

  useEffect(() => {
    if (symbolData) setTokenSymbol(symbolData as string);
    if (decimalsData) setTokenDecimals(Number(decimalsData));
  }, [symbolData, decimalsData]);

  // Load cache from local storage
  const loadCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached
        ? JSON.parse(cached)
        : {
            votes: [],
            marketInfo: {},
            [LAST_BLOCK_KEY]: DEPLOYMENT_BLOCK.toString(),
          };
    } catch {
      return {
        votes: [],
        marketInfo: {},
        [LAST_BLOCK_KEY]: DEPLOYMENT_BLOCK.toString(),
      };
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

  // Enhanced retry with 429 handling
  async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 1000
  ): Promise<T> {
    type RetryableError = Error & {
      status?: number;
      details?: { code?: number; message?: string };
    };

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: unknown) {
        if (i === retries - 1) throw error;
        let delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.warn(`Retry ${i + 1}/${retries} failed:`, error);

        // Handle 429 Too Many Requests
        if ((error as RetryableError)?.status === 429) {
          delay = Math.max(delay, 5000); // Wait longer for rate limit
          console.warn(`Rate limit hit, waiting ${delay}ms`);
        }
        // Handle Alchemy block range error
        else if (
          (error as RetryableError)?.details?.code === -32600 &&
          (error as RetryableError)?.details?.message?.includes(
            "up to a 500 block range"
          )
        ) {
          const match = (error as RetryableError).details!.message!.match(
            /\[0x([0-9a-f]+), 0x([0-9a-f]+)\]/
          );
          if (match) {
            const suggestedRange =
              parseInt(match[2], 16) - parseInt(match[1], 16) + 1;
            console.log(`Adjusting block range to ${suggestedRange}`);
            // Block range is already 500, so just retry
          }
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries reached");
  }

  // Throttle concurrent requests
  async function throttleRequests<T>(
    tasks: (() => Promise<T>)[],
    maxConcurrent: number
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(batch.map((task) => task()));
      results.push(...batchResults);
    }
    return results;
  }

  // Fetch votes
  const fetchVotes = useCallback(
    (currentAccountAddress: Address | undefined) => {
      const debouncedFetch = debounce(async () => {
        if (!currentAccountAddress || isFetchingRef.current) {
          setVotes([]);
          setIsLoading(false);
          return;
        }

        isFetchingRef.current = true;
        setIsLoading(true);
        try {
          // Load cache
          const cache = loadCache();
          let newVotes = [...cache.votes];
          const marketInfoCache = { ...cache.marketInfo };
          let fromBlock = BigInt(
            cache[LAST_BLOCK_KEY] || DEPLOYMENT_BLOCK.toString()
          );

          const latestBlock = await withRetry(() =>
            publicClient.getBlockNumber()
          );

          // Fetch events incrementally
          const blockRange = 500n; // Alchemy's limit
          const allEvents: SharesPurchasedEvent[] = [];
          const fetchTasks: (() => Promise<void>)[] = [];

          while (fromBlock <= latestBlock) {
            const toBlock =
              fromBlock + blockRange - 1n > latestBlock
                ? latestBlock
                : fromBlock + blockRange - 1n;

            if (toBlock < fromBlock) break;

            fetchTasks.push(async () => {
              try {
                const logs = await withRetry(() =>
                  publicClient.getLogs({
                    address: contractAddress,
                    event: {
                      type: "event",
                      name: "SharesPurchased",
                      inputs: [
                        { name: "marketId", type: "uint256", indexed: true },
                        { name: "buyer", type: "address", indexed: true },
                        { name: "isOptionA", type: "bool", indexed: false },
                        { name: "amount", type: "uint256", indexed: false },
                      ],
                    },
                    args: {
                      buyer: currentAccountAddress,
                    },
                    fromBlock,
                    toBlock,
                  })
                );

                const formattedEvents = logs.map((log) => ({
                  // Cast log.args to our defined interface
                  args: log.args as SharesPurchasedLogArgs,
                  // Access properties directly after casting
                  marketId: (log.args as SharesPurchasedLogArgs).marketId,
                  buyer: (log.args as SharesPurchasedLogArgs).buyer,
                  isOptionA: (log.args as SharesPurchasedLogArgs).isOptionA,
                  amount: (log.args as SharesPurchasedLogArgs).amount,
                  blockNumber: log.blockNumber as bigint,
                  transactionHash: log.transactionHash,
                  logIndex: log.logIndex,
                }));
                allEvents.push(...formattedEvents);
              } catch (batchError) {
                console.error(
                  `Error fetching logs from block ${fromBlock} to ${toBlock}:`,
                  batchError
                );
                // Skip this range to avoid infinite retries
              }
            });

            fromBlock = toBlock + 1n;
          }

          // Throttle requests to avoid rate limits
          await throttleRequests(
            fetchTasks.map((task) => async () => {
              await task();
            }),
            MAX_CONCURRENT_REQUESTS
          );

          // Get unique market IDs
          const marketIds = [
            ...new Set(allEvents.map((e) => Number(e.marketId))),
          ];
          const uncachedMarketIds = marketIds.filter(
            (id) => !marketInfoCache[id]
          );

          // Fetch market info in batch
          if (uncachedMarketIds.length > 0) {
            try {
              const marketInfosResult = (await withRetry(() =>
                publicClient.readContract({
                  address: contractAddress,
                  abi: contractAbi,
                  functionName: "getMarketInfoBatch",
                  args: [uncachedMarketIds.map(BigInt)],
                })
              )) as [
                string[],
                string[],
                string[],
                bigint[],
                number[],
                bigint[],
                bigint[],
                boolean[]
              ];

              const [
                questions,
                optionAs,
                optionBs /* endTimes, outcomes, totalAShares, totalBShares, resolved */,
              ] = marketInfosResult;

              uncachedMarketIds.forEach((marketId, i) => {
                marketInfoCache[marketId] = {
                  marketId,
                  question: questions[i],
                  optionA: optionAs[i],
                  optionB: optionBs[i],
                };
              });
            } catch (marketInfoError) {
              console.error(
                "Failed to fetch batch market info:",
                marketInfoError
              );
              toast({
                title: "Error",
                description: "Could not load details for some markets.",
                variant: "destructive",
              });
            }
          }

          // Map events to votes
          const newUserVotes = allEvents
            .map((e) => {
              const market = marketInfoCache[Number(e.marketId)];
              if (!market) return null;
              return {
                marketId: Number(e.args.marketId),
                option: e.args.isOptionA ? market.optionA : market.optionB,
                amount: e.args.amount,
                marketName: market.question,
                blockNumber: e.blockNumber,
                transactionHash: e.transactionHash,
                logIndex: e.logIndex,
              };
            })
            .filter((vote): vote is Vote => vote !== null);

          // Merge new votes with cached votes, avoiding duplicates
          const voteMap = new Map<string, Vote>();
          [...cache.votes, ...newUserVotes].forEach((vote) => {
            const key = `${vote.marketId}-${vote.transactionHash}-${vote.logIndex}`;
            voteMap.set(key, vote);
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
            description:
              "Failed to load vote history due to rate limits. Please try again later.",
            variant: "destructive",
          });
          setVotes([]);
        } finally {
          setIsLoading(false);
          isFetchingRef.current = false;
        }
      }, 500);

      debouncedFetch();
      return debouncedFetch.cancel;
    },
    [loadCache, saveCache, toast]
  );

  useEffect(() => {
    const cancel = fetchVotes(accountAddress);
    return () => cancel();
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
