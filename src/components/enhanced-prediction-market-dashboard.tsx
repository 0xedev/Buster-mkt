"use client";

import { useReadContract, useActiveAccount } from "thirdweb/react"; // Added useActiveAccount
import { contract } from "@/constants/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketCard, Market } from "./marketCard"; // Import Market interface
import { Navbar } from "./navbar";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { Footer } from "./footer";
import { useEffect, useState, useRef, useMemo } from "react"; // Added useMemo
import { sdk } from "@farcaster/frame-sdk";
import { VoteHistory } from "./VoteHistory";

type LeaderboardEntry = {
  username: string;
  fid: number | string;
  pfp_url: string | null;
  winnings: number;
  address: string;
};

export function EnhancedPredictionMarketDashboard() {
  const account = useActiveAccount(); // Get active account for VoteHistory check

  const { data: marketCount, isLoading: isLoadingMarketCount } =
    useReadContract({
      contract,
      method: "function getMarketCount() view returns (uint256)", // Use specific getter
      params: [],
    });

  // Fetch all market info to compute status counts
  const { data: marketInfos, isLoading: isLoadingMarketInfos } =
    useReadContract({
      contract,
      method:
        "function getMarketInfoBatch(uint256[] _marketIds) view returns (string[] questions, string[] optionAs, string[] optionBs, uint256[] endTimes, uint8[] outcomes, uint256[] totalOptionASharesArray, uint256[] totalOptionBSharesArray, bool[] resolvedArray)",
      params: [
        Array.from({ length: Number(marketCount || 0) }, (_, i) => BigInt(i)),
      ],
      // Enable only when marketCount is loaded and greater than 0
      queryOptions: { enabled: !!marketCount && marketCount > 0n },
    });

  // --- NEW: Process batch data into an array of Market objects ---
  const processedMarkets = useMemo(() => {
    if (!marketInfos || marketCount === undefined || marketCount === 0n) {
      return [];
    }

    const marketsArray: Market[] = [];
    const count = Number(marketCount); // Convert BigInt once

    // Deconstruct the marketInfos array for easier access
    const [
      questions,
      optionAs,
      optionBs,
      endTimes,
      outcomes, // Note: Solidity enum maps to number in JS/TS
      totalOptionASharesArray,
      totalOptionBSharesArray,
      resolvedArray,
    ] = marketInfos;

    for (let i = 0; i < count; i++) {
      // Check if all arrays have data for this index to prevent errors
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
          // index: i, // Add index if needed within MarketCard later
          question: questions[i],
          optionA: optionAs[i],
          optionB: optionBs[i],
          endTime: endTimes[i],
          outcome: outcomes[i], // Keep as number (0, 1, or 2)
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
  // --- END NEW ---

  // --- REVISED: Compute market status counts from processedMarkets ---
  const { activeMarkets, pendingMarkets, resolvedMarkets } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const active: Market[] = [];
    const pending: Market[] = [];
    const resolved: Market[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    processedMarkets.forEach((market, index) => {
      // Add index here if needed later
      const isExpired = Number(market.endTime) < now;
      const isResolved = market.resolved;

      if (isResolved) {
        // Optionally add index: resolved.push({ ...market, index });
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
  // --- END REVISED ---

  // Leaderboard state and fetching (keep as is)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const hasFetchedInitially = useRef(false);

  const fetchLeaderboardData = (setLoading = false) => {
    if (setLoading) setIsLoadingLeaderboard(true);
    console.log("Fetching leaderboard data...");
    fetch("/api/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Leaderboard data received:", data);
        if (Array.isArray(data)) {
          setLeaderboard(data as LeaderboardEntry[]);
        } else {
          console.error("Received non-array data for leaderboard:", data);
          setLeaderboard([]);
        }
      })
      .catch((err) => {
        console.error("Leaderboard fetch error:", err);
        setLeaderboard([]);
      })
      .finally(() => {
        if (setLoading) setIsLoadingLeaderboard(false);
      });
  };

  useEffect(() => {
    if (!hasFetchedInitially.current) {
      fetchLeaderboardData(true);
      hasFetchedInitially.current = true;
    }
  }, []);

  useEffect(() => {
    const refreshInterval = 5 * 60 * 1000;
    console.log(
      `Setting up leaderboard refresh interval: ${refreshInterval}ms`
    );
    const intervalId = setInterval(() => {
      console.log("Triggering background leaderboard refresh...");
      fetchLeaderboardData(false);
    }, refreshInterval);
    return () => {
      console.log("Clearing leaderboard refresh interval.");
      clearInterval(intervalId);
    };
  }, []);

  // Signal readiness (keep as is)
  useEffect(() => {
    if (!isLoadingMarketCount) sdk.actions.ready();
  }, [isLoadingMarketCount]);

  // Skeleton and Empty State (keep as is)
  const skeletonCards = Array.from({ length: 6 }, (_, i) => (
    <MarketCardSkeleton key={`skeleton-${i}`} />
  ));

  const emptyState = (title: string, subtitle: string) => (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {/* SVG icon */}
      <svg /* ... */></svg>
      <p className="mt-2 text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
    </div>
  );

  // Determine if VoteHistory should be shown
  const showVoteHistory = !!account; // Show if user is connected

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow container mx-auto p-4">
        <Navbar />
        <div className="mb-4">
          <img
            src="banner2.avif"
            alt="Buster Banner"
            className="w-full h-auto rounded-lg"
          />
        </div>
        <Tabs defaultValue="active" className="w-full">
          {/* --- REVISED: Conditionally render My Votes Tab --- */}
          <TabsList
            className={`grid w-full ${
              showVoteHistory ? "grid-cols-4" : "grid-cols-3"
            } overflow-x-auto whitespace-nowrap`}
          >
            <TabsTrigger value="active" className="text-xs px-2">
              Active
            </TabsTrigger>
            <TabsTrigger value="ended" className="text-xs px-2">
              Ended
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs px-2">
              Top
            </TabsTrigger>
            {showVoteHistory && (
              <TabsTrigger value="myvotes" className="text-xs px-2">
                Votes
              </TabsTrigger>
            )}
          </TabsList>
          {/* --- END REVISED --- */}

          {/* --- Show Skeletons while initial data loads --- */}
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
              {/* --- REVISED: Render Active Markets --- */}
              <TabsContent value="active" className="mt-6">
                {activeCount > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeMarkets.map((market, index) => (
                      <MarketCard
                        // Use a stable key, index within the filtered array is okay here
                        // Or use a unique ID from the market if available
                        key={`active-${index}`}
                        // Pass the original index if MarketCard needs it internally
                        // index={market.originalIndex} // If you added originalIndex during processing
                        index={processedMarkets.findIndex(
                          (m) =>
                            m.question === market.question &&
                            m.endTime === market.endTime
                        )} // Find original index
                        market={market}
                        // filter prop is no longer needed by MarketCard
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

              {/* --- REVISED: Render Ended Markets (Pending/Resolved) --- */}
              <TabsContent value="ended" className="mt-6">
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending" className="text-xs px-2">
                      Pending ({pendingCount}) {/* Optional: Show count */}
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="text-xs px-2">
                      Results ({resolvedCount}) {/* Optional: Show count */}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="mt-4">
                    {" "}
                    {/* Added mt-4 */}
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
                    {" "}
                    {/* Added mt-4 */}
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

              {/* Leaderboard Tab (keep as is, check loading/empty states) */}
              <TabsContent value="leaderboard" className="mt-6">
                {/* ... existing leaderboard rendering logic ... */}
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
                              {/* Simplified avatar placeholder */}
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

              {/* --- REVISED: Conditionally render My Votes Tab Content --- */}
              {showVoteHistory && (
                <TabsContent value="myvotes" className="mt-6">
                  <VoteHistory />
                </TabsContent>
              )}
              {/* --- END REVISED --- */}
            </>
          )}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
