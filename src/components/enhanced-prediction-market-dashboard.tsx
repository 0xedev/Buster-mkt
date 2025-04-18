// src/components/enhanced-prediction-market-dashboard.tsx
"use client";

import { useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketCard } from "./marketCard";
import { Navbar } from "./navbar";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { Footer } from "./footer";
import { useEffect, useState } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { VoteHistory } from "./VoteHistory";

export function EnhancedPredictionMarketDashboard() {
  const { data: marketCount, isLoading: isLoadingMarketCount } =
    useReadContract({
      contract,
      method: "function marketCount() view returns (uint256)",
      params: [],
    });

  const [leaderboard, setLeaderboard] = useState<
    Array<{
      username: string;
      fid: number;
      winnings: number;
    }>
  >([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  useEffect(() => {
    setIsLoadingLeaderboard(true);
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Leaderboard fetch error:", err);
        setLeaderboard([]);
      })
      .finally(() => {
        setIsLoadingLeaderboard(false);
      });
  }, []);

  // Signal readiness to Farcaster client
  useEffect(() => {
    if (!isLoadingMarketCount && !isLoadingLeaderboard) {
      sdk.actions.ready();
    }
  }, [isLoadingMarketCount, isLoadingLeaderboard]);

  const skeletonCards = Array.from({ length: 6 }, (_, i) => (
    <MarketCardSkeleton key={`skeleton-${i}`} />
  ));

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
          <TabsList className="grid w-full grid-cols-4 overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="active" className="text-xs px-2">
              Active
            </TabsTrigger>
            <TabsTrigger value="ended" className="text-xs px-2">
              Ended
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs px-2">
              Top
            </TabsTrigger>
            <TabsTrigger value="myvotes" className="text-xs px-2">
              Votes
            </TabsTrigger>
          </TabsList>
          {isLoadingMarketCount ? (
            <TabsContent value="active" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {skeletonCards}
              </div>
            </TabsContent>
          ) : (
            <>
              <TabsContent value="active" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from(
                    { length: Number(marketCount) || 0 },
                    (_, index) => (
                      <MarketCard key={index} index={index} filter="active" />
                    )
                  )}
                </div>
              </TabsContent>
              <TabsContent value="ended" className="mt-6">
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending" className="text-xs px-2">
                      Pending
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="text-xs px-2">
                      Results
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending">
                    <p className="text-center text-gray-500 mb-4">
                      Pending markets are over but not yet resolved.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {Array.from(
                        { length: Number(marketCount) || 0 },
                        (_, index) => (
                          <MarketCard
                            key={index}
                            index={index}
                            filter="pending"
                          />
                        )
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="resolved">
                    <p className="text-center text-gray-500 mb-4">
                      Results show resolved markets with final outcomes.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {Array.from(
                        { length: Number(marketCount) || 0 },
                        (_, index) => (
                          <MarketCard
                            key={index}
                            index={index}
                            filter="resolved"
                          />
                        )
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
              <TabsContent value="leaderboard" className="mt-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">Top Predictors</h3>
                  </div>
                  
                  {isLoadingLeaderboard ? (
                    <div className="divide-y divide-gray-200">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 animate-pulse">
                          <div className="flex justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-gray-200 rounded-full mr-3"></div>
                              <div>
                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                <div className="mt-1 h-3 bg-gray-100 rounded w-16"></div>
                              </div>
                            </div>
                            <div className="h-5 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : leaderboard.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {/* Table header */}
                      <div className="grid grid-cols-12 px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-9">Predictor</div>
                        <div className="col-span-2 text-right">Winnings</div>
                      </div>
                      
                      {/* Table rows */}
                      {leaderboard.map((entry, idx) => (
                        <div 
                          key={entry.fid} 
                          className={`grid grid-cols-12 px-4 py-3 hover:bg-gray-50 transition-colors ${
                            idx < 3 ? "bg-gradient-to-r from-transparent to-blue-50" : ""
                          }`}
                        >
                          <div className="col-span-1 flex items-center justify-center">
                            {idx < 3 ? (
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full 
                                ${idx === 0 ? "bg-yellow-100 text-yellow-800" : 
                                  idx === 1 ? "bg-gray-100 text-gray-800" : 
                                  "bg-amber-100 text-amber-800"} 
                                text-xs font-bold`}
                              >
                                {idx + 1}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">{idx + 1}</span>
                            )}
                          </div>
                          
                          <div className="col-span-9">
                            <div className="flex items-center">
                              <div className="bg-purple-100 text-purple-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                                {entry.username.substring(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {entry.username}
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
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      <p className="mt-2 text-sm font-medium text-gray-500">No leaderboard data available</p>
                      <p className="mt-1 text-xs text-gray-400">Leaderboard will appear once predictions are resolved</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="myvotes" className="mt-6">
                <VoteHistory />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
