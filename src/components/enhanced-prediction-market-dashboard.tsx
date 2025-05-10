"use client";

import { useReadContract, useActiveAccount } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketCard, Market } from "./marketCard";
import { Footer } from "./footer";
import { useEffect, useState, useRef, useMemo } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { VoteHistory } from "./VoteHistory";
import { useSearchParams } from "next/navigation";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { Navbar } from "./navbar";

type LeaderboardEntry = {
  username: string;
  fid: number | string;
  pfp_url: string | null;
  winnings: number;
  address: string;
};

export function EnhancedPredictionMarketDashboard() {
  const account = useActiveAccount();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "active";

  const { data: marketCount, isLoading: isLoadingMarketCount } =
    useReadContract({
      contract,
      method: "function getMarketCount() view returns (uint256)",
      params: [],
    });

  const { data: marketInfos, isLoading: isLoadingMarketInfos } =
    useReadContract({
      contract,
      method:
        "function getMarketInfoBatch(uint256[] _marketIds) view returns (string[] questions, string[] optionAs, string[] optionBs, uint256[] endTimes, uint8[] outcomes, uint256[] totalOptionASharesArray, uint256[] totalOptionBSharesArray, bool[] resolvedArray)",
      params: [
        Array.from({ length: Number(marketCount || 0) }, (_, i) => BigInt(i)),
      ],
      queryOptions: { enabled: !!marketCount && marketCount > 0n },
    });

  const processedMarkets = useMemo(() => {
    if (!marketInfos || marketCount === undefined || marketCount === 0n) {
      return [];
    }

    const marketsArray: Market[] = [];
    const count = Number(marketCount);

    const [
      questions,
      optionAs,
      optionBs,
      endTimes,
      outcomes,
      totalOptionASharesArray,
      totalOptionBSharesArray,
      resolvedArray,
    ] = marketInfos;

    for (let i = 0; i < count; i++) {
      if (
        questions[i] !== undefined &&
        optionAs[i] !== undefined &&
        optionBs[i] !== undefined &&
        endTimes[i] !== undefined &&
        outcomes[i] !== undefined &&
        totalOptionASharesArray[i] !== undefined &&
        totalOptionBSharesArray[i] !== undefined &&
        resolvedArray[i] !== undefined
      ) {
        marketsArray.push({
          question: questions[i],
          optionA: optionAs[i],
          optionB: optionBs[i],
          endTime: endTimes[i],
          outcome: outcomes[i],
          totalOptionAShares: totalOptionASharesArray[i],
          totalOptionBShares: totalOptionBSharesArray[i],
          resolved: resolvedArray[i],
        });
      } else {
        console.warn(`Incomplete data for market index ${i}. Skipping.`);
      }
    }
    return marketsArray;
  }, [marketInfos, marketCount]);

  const { activeMarkets, pendingMarkets, resolvedMarkets } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const active: Market[] = [];
    const pending: Market[] = [];
    const resolved: Market[] = [];

    processedMarkets.forEach((market) => {
      const isExpired = Number(market.endTime) < now;
      const isResolved = market.resolved;

      if (isResolved) {
        resolved.push(market);
      } else if (isExpired) {
        pending.push(market);
      } else {
        active.push(market);
      }
    });

    return {
      activeMarkets: active,
      pendingMarkets: pending,
      resolvedMarkets: resolved,
    };
  }, [processedMarkets]);

  const activeCount = activeMarkets.length;
  const pendingCount = pendingMarkets.length;
  const resolvedCount = resolvedMarkets.length;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const hasFetchedInitially = useRef(false);

  const fetchLeaderboardData = async (setLoading = false) => {
    if (setLoading) {
      setIsLoadingLeaderboard(true);
      setLeaderboardError(null);
    }
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || `HTTP error! status: ${res.status}`);
      }
      if (Array.isArray(data)) {
        setLeaderboard(data as LeaderboardEntry[]);
      } else {
        throw new Error("Received non-array data for leaderboard");
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setLeaderboardError(
        (err as Error).message.includes("NEYNAR_API_KEY")
          ? "Server configuration error. Please try again later."
          : (err as Error).message.includes("eth_getLogs")
          ? "Unable to fetch leaderboard data due to blockchain query limits. Please try again later."
          : "Failed to load leaderboard. Please try again later."
      );
      setLeaderboard([]);
    } finally {
      if (setLoading) {
        setIsLoadingLeaderboard(false);
      }
    }
  };

  useEffect(() => {
    if (!hasFetchedInitially.current) {
      fetchLeaderboardData(true);
      hasFetchedInitially.current = true;
    }
  }, []);

  useEffect(() => {
    const refreshInterval = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      fetchLeaderboardData(false);
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isLoadingMarketCount) sdk.actions.ready();
  }, [isLoadingMarketCount]);

  const skeletonCards = Array.from({ length: 6 }, (_, i) => (
    <MarketCardSkeleton key={`skeleton-${i}`} />
  ));

  const emptyState = (title: string, subtitle: string) => (
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
      <p className="mt-2 text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </div>
  );

  const showVoteHistory = !!account;

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <Navbar />
      <div className="flex-grow container mx-auto p-4">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList
            className={`grid w-full ${
              showVoteHistory ? "grid-cols-4" : "grid-cols-3"
            } overflow-x-auto whitespace-nowrap hidden md:grid`}
          >
            <TabsTrigger value="active" className="text-xs px-2">
              Active
            </TabsTrigger>
            <TabsTrigger value="ended" className="text-xs px-2">
              Ended
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs px-2">
              Leaderboard
            </TabsTrigger>
            {showVoteHistory && (
              <TabsTrigger value="myvotes" className="text-xs px-2">
                My Shares
              </TabsTrigger>
            )}
          </TabsList>

          {isLoadingMarketCount ||
          (marketCount !== undefined &&
            marketCount > 0n &&
            isLoadingMarketInfos) ? (
            <TabsContent value="active" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {skeletonCards}
              </div>
            </TabsContent>
          ) : (
            <>
              <TabsContent value="active" className="mt-6">
                {activeCount > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeMarkets.map((market, index) => (
                      <MarketCard
                        key={`active-${index}`}
                        index={processedMarkets.findIndex(
                          (m) =>
                            m.question === market.question &&
                            m.endTime === market.endTime
                        )}
                        market={market}
                      />
                    ))}
                  </div>
                ) : (
                  emptyState(
                    "No active markets available",
                    "New markets will appear here when created"
                  )
                )}
              </TabsContent>

              <TabsContent value="ended" className="mt-6">
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending" className="text-xs px-2">
                      Pending ({pendingCount})
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="text-xs px-2">
                      Results ({resolvedCount})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="mt-4">
                    {pendingCount > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pendingMarkets.map((market, index) => (
                          <MarketCard
                            key={`pending-${index}`}
                            index={processedMarkets.findIndex(
                              (m) =>
                                m.question === market.question &&
                                m.endTime === market.endTime
                            )}
                            market={market}
                          />
                        ))}
                      </div>
                    ) : (
                      emptyState(
                        "No pending markets",
                        "Markets awaiting resolution will appear here"
                      )
                    )}
                  </TabsContent>
                  <TabsContent value="resolved" className="mt-4">
                    {resolvedCount > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {resolvedMarkets.map((market, index) => (
                          <MarketCard
                            key={`resolved-${index}`}
                            index={processedMarkets.findIndex(
                              (m) =>
                                m.question === market.question &&
                                m.endTime === market.endTime
                            )}
                            market={market}
                          />
                        ))}
                      </div>
                    ) : (
                      emptyState(
                        "No resolved markets",
                        "Resolved markets will appear here"
                      )
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="leaderboard" className="mt-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">
                      Top Predictors
                    </h3>
                  </div>
                  {isLoadingLeaderboard ? (
                    <div className="divide-y divide-gray-200">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 animate-pulse">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-gray-200 rounded-full mr-3"></div>
                              <div>
                                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                                <div className="h-3 bg-gray-100 rounded w-16"></div>
                              </div>
                            </div>
                            <div className="h-5 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : leaderboardError ? (
                    <div className="p-4 text-center text-red-600">
                      {leaderboardError}
                    </div>
                  ) : leaderboard.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      <div className="grid grid-cols-12 px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-9">Predictor</div>
                        <div className="col-span-2 text-right">Winnings</div>
                      </div>
                      {leaderboard.map((entry, idx) => (
                        <div
                          key={entry.fid}
                          className={`grid grid-cols-12 px-4 py-3 hover:bg-gray-50 transition-colors ${
                            idx < 3
                              ? "bg-gradient-to-r from-transparent to-blue-50"
                              : ""
                          }`}
                        >
                          <div className="col-span-1 flex items-center justify-center">
                            {idx < 3 ? (
                              <div
                                className={`flex items-center justify-center w-6 h-6 rounded-full
                                ${
                                  idx === 0
                                    ? "bg-yellow-100 text-yellow-800"
                                    : idx === 1
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-amber-100 text-amber-800"
                                }
                                text-xs font-bold`}
                              >
                                {idx + 1}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                          <div className="col-span-9">
                            <div className="flex items-center">
                              <div className="bg-purple-100 text-purple-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                                {entry.username
                                  ?.substring(0, 1)
                                  .toUpperCase() || "?"}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {entry.username || `FID: ${entry.fid}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  FID: {entry.fid}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.winnings.toLocaleString()} $BSTR
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    emptyState(
                      "No leaderboard data available",
                      "Leaderboard will appear once predictions are resolved"
                    )
                  )}
                </div>
              </TabsContent>

              {showVoteHistory && (
                <TabsContent value="myvotes" className="mt-6">
                  <VoteHistory />
                </TabsContent>
              )}
            </>
          )}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
