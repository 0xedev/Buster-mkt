"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Address } from "viem";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Search } from "lucide-react";
import {
  publicClient,
  V2contractAddress,
  V2contractAbi,
  contractAddress,
  contractAbi,
  tokenAddress as defaultTokenAddress,
  tokenAbi as defaultTokenAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";

const CACHE_KEY = "vote_history_cache_v6";
const CACHE_TTL = 60 * 60;
interface V2Trade {
  marketId: bigint;
  optionId: bigint;
  buyer: Address;
  seller: Address;
  price: bigint;
  quantity: bigint;
  timestamp: bigint;
}

type TransactionType = "vote" | "buy" | "sell" | "swap";

interface DisplayVote {
  marketId: number;
  option: string;
  amount: bigint;
  marketName: string;
  timestamp: bigint;
  type: TransactionType;
  version: "v2";
}

interface MarketInfo {
  marketId: number;
  question: string;
  options?: string[];
  version: "v2";
}

interface CacheData {
  votes: DisplayVote[];
  marketInfo: Record<string, MarketInfo>;
  timestamp: number;
}

type SortKey = "marketId" | "marketName" | "option" | "amount" | "timestamp";
type SortDirection = "asc" | "desc";

export function VoteHistory() {
  const { address: accountAddress, isConnected } = useAccount();
  const { toast } = useToast();
  const [votes, setVotes] = useState<DisplayVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setTokenSymbol] = useState<string>("POLITICS");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [search, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: bettingTokenAddr } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "bettingToken",
  });

  const tokenAddress = (bettingTokenAddr as Address) || defaultTokenAddress;

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

  const loadCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return { votes: [], marketInfo: {}, timestamp: 0 };
      }

      const parsed = JSON.parse(cached);

      // Convert string values back to BigInt for amount and timestamp
      if (parsed.votes && Array.isArray(parsed.votes)) {
        parsed.votes = parsed.votes.map((vote: any) => ({
          ...vote,
          amount: BigInt(vote.amount),
          timestamp: BigInt(vote.timestamp),
        }));
      }

      return parsed;
    } catch {
      return { votes: [], marketInfo: {}, timestamp: 0 };
    }
  }, []);

  const saveCache = useCallback((data: CacheData) => {
    try {
      // Convert BigInt values to strings before saving
      const serializedData = JSON.stringify(data, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );
      localStorage.setItem(CACHE_KEY, serializedData);
    } catch (error) {
      console.error("Cache save error:", error);
    }
  }, []);

  const fetchV2Trades = async (address: Address): Promise<V2Trade[]> => {
    try {
      const portfolioParams: any = {
        address: PolicastViews,
        abi: PolicastViewsAbi,
        functionName: "getUserPortfolio",
        args: [address],
      };

      const portfolio = (await (publicClient.readContract as any)(
        portfolioParams
      )) as {
        totalInvested: bigint;
        totalWinnings: bigint;
        unrealizedPnL: bigint;
        realizedPnL: bigint;
        tradeCount: bigint;
      };

      const tradeCount = Number(portfolio.tradeCount);

      if (tradeCount === 0) return [];

      const trades: V2Trade[] = [];
      for (let i = 0; i < tradeCount; i++) {
        try {
          const tradeParams: any = {
            address: V2contractAddress,
            abi: V2contractAbi,
            functionName: "userTradeHistory",
            args: [address, BigInt(i)],
          };

          const trade = (await (publicClient.readContract as any)(
            tradeParams
          )) as [bigint, bigint, string, string, bigint, bigint, bigint];

          trades.push({
            marketId: trade[0],
            optionId: trade[1],
            buyer: trade[2] as Address,
            seller: trade[3] as Address,
            price: trade[4],
            quantity: trade[5],
            timestamp: trade[6],
          });
        } catch (error) {
          console.error(`Failed to fetch trade ${i}:`, error);
          if (
            (error as any)?.message?.includes("reverted") ||
            (error as any)?.message?.includes("ContractFunctionRevertedError")
          ) {
            break;
          }
        }
      }

      return trades;
    } catch (error) {
      console.error("V2 trade history error:", error);
      return [];
    }
  };

  const fetchMarketInfo = async (v2MarketIds: number[], cache: any) => {
    const marketInfoCache: Record<string, MarketInfo> = {
      ...cache.marketInfo,
    };

    const uncachedV2Ids = v2MarketIds.filter(
      (id) => !marketInfoCache[`v2_${id}`]
    );
    if (uncachedV2Ids.length > 0) {
      for (const marketId of uncachedV2Ids) {
        try {
          const marketBasicInfo = (await publicClient.readContract({
            address: V2contractAddress,
            abi: V2contractAbi,
            functionName: "getMarketBasicInfo",
            args: [BigInt(marketId)],
          })) as [
            string,
            string,
            bigint,
            number,
            bigint,
            boolean,
            number,
            boolean,
            bigint
          ];

          const [question, , , , optionCount] = marketBasicInfo;

          const options: string[] = [];

          for (let optionId = 0; optionId < Number(optionCount); optionId++) {
            try {
              const optionInfo = (await publicClient.readContract({
                address: V2contractAddress,
                abi: V2contractAbi,
                functionName: "getMarketOption",
                args: [BigInt(marketId), BigInt(optionId)],
              })) as [string, string, bigint, bigint, bigint, boolean];

              options.push(optionInfo[0]);
            } catch (error) {
              console.error(`Failed to fetch option ${optionId}:`, error);
              options.push(`Option ${optionId + 1}`);
            }
          }

          marketInfoCache[`v2_${marketId}`] = {
            marketId,
            question,
            options,
            version: "v2" as const,
          };
        } catch (error) {
          console.error(`Failed to fetch V2 market ${marketId}:`, error);
        }
      }
    }

    return marketInfoCache;
  };

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

        if (cache.votes.length > 0 && now - cache.timestamp < CACHE_TTL) {
          setVotes(cache.votes);
          setIsLoading(false);
          return;
        }

        const v2Trades = await fetchV2Trades(address);
        const v2MarketIds = [
          ...new Set(v2Trades.map((t) => Number(t.marketId))),
        ];

        const marketInfoCache = await fetchMarketInfo(v2MarketIds, cache);

        const displayV2Trades: DisplayVote[] = v2Trades.map((trade) => {
          const marketInfo = marketInfoCache[`v2_${Number(trade.marketId)}`];
          const isBuy =
            trade.buyer && address
              ? trade.buyer.toLowerCase() === address.toLowerCase()
              : false;
          return {
            marketId: Number(trade.marketId),
            option:
              marketInfo?.options?.[Number(trade.optionId)] ||
              `Option ${Number(trade.optionId) + 1}`,
            amount: trade.quantity,
            marketName:
              marketInfo?.question || `Market ${Number(trade.marketId)}`,
            timestamp: trade.timestamp,
            type: isBuy ? "buy" : "sell",
            version: "v2" as const,
          };
        });

        const allTransactions = [...displayV2Trades].sort((a, b) =>
          Number(b.timestamp - a.timestamp)
        );

        const newCache = {
          votes: allTransactions,
          marketInfo: marketInfoCache,
          timestamp: now,
        };
        saveCache(newCache);
        setVotes(allTransactions);
      } catch (error) {
        console.error("Transaction history error:", error);
        toast({
          title: "Error",
          description: "Failed to load transaction history.",
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

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

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
      <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#433952] to-[#544863] rounded-xl border-0 shadow-lg">
        <div className="text-sm text-white/80 font-medium">
          Your market history will appear here
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-0 rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-[#433952]/10 to-[#544863]/10">
        <div className="bg-gradient-to-r from-[#433952]/20 to-[#544863]/20 p-3 border-b border-[#433952]/20">
          <div className="h-5 bg-white/20 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="divide-y divide-[#433952]/10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 animate-pulse">
              <div className="flex justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/20 rounded w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-white/20 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Search Bar */}
      <div className="bg-gradient-to-br from-[#433952] to-[#544863] rounded-xl shadow-md border-0 p-3">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search markets or options..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:bg-white/15"
              aria-label="Search vote history"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSort("timestamp")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                sortKey === "timestamp"
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              Date <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleSort("amount")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                sortKey === "amount"
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              Amount <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {filteredVotes.length > 0 ? (
        <div className="space-y-2">
          {filteredVotes.map((vote, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-[#433952] to-[#544863] rounded-xl shadow-md border-0 p-3 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <Link
                      href={`/market/${vote.marketId}`}
                      className="inline-flex items-center text-xs font-semibold text-white hover:text-white/90 bg-white/20 px-2 py-0.5 rounded-md"
                    >
                      #{vote.marketId}
                    </Link>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium ${
                        vote.type === "vote"
                          ? "bg-green-100 text-green-700"
                          : vote.type === "buy"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {vote.type === "vote"
                        ? "🗳️"
                        : vote.type === "buy"
                        ? "📈"
                        : "📉"}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-white/20 text-white/90">
                      {vote.version.toUpperCase()}
                    </span>
                    <span className="text-xs text-white/70">
                      {new Date(
                        Number(vote.timestamp) * 1000
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <Link
                    href={`/market/${vote.marketId}`}
                    className="block group mb-1.5"
                  >
                    <h3 className="text-sm font-medium text-white group-hover:text-white/90 transition-colors line-clamp-1">
                      {vote.marketName}
                    </h3>
                  </Link>

                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                    <span className="text-xs font-medium text-white">
                      {vote.option}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <div className="text-sm font-bold text-white">
                    {(
                      Number(vote.amount) / Math.pow(10, tokenDecimals)
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-white/70">shares</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#433952] to-[#544863] rounded-xl border-0 shadow-lg p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white/60"
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
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              {search ? "No matching transactions" : "No transactions yet"}
            </h3>
            <p className="text-xs text-white/70 max-w-sm">
              {search
                ? "Try different search terms"
                : "Start trading to see your history here"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
