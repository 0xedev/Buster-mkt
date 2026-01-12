"use client";

import { useState, useEffect } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  LeaderboardEntry,
  LeaderboardType,
  TimeFrame,
} from "@/types/leaderboard";
import { useAccount } from "wagmi";

// UI display types
type UITimeFrame = "All-Time" | "Monthly" | "Weekly";

// Map UI-friendly names to API values
const timeframeMap: Record<UITimeFrame, TimeFrame> = {
  "All-Time": "all",
  Monthly: "monthly",
  Weekly: "weekly",
};

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  userRank: number | null;
}

interface LeaderboardProps {
  onTabChange?: (tab: string) => void;
}

export default function LeaderboardComponent({
  onTabChange,
}: LeaderboardProps) {
  const { address } = useAccount();
  const [timeFrame, setTimeFrame] = useState<UITimeFrame>("All-Time");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: "volume",
        timeframe: "all",
        page: currentPage.toString(),
        pageSize: "10",
      });

      if (address) {
        params.append("userAddress", address);
      }

      const response = await fetch(`/api/leaderboard?${params}`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");

      const result: LeaderboardResponse = await response.json();
      setData(result.data);
      setTotalPages(result.pagination.totalPages);
      setUserRank(result.userRank);
    } catch (err) {
      setError("Failed to load leaderboard");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, address]);

  // State management for filters

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10 bg-gray-900 min-h-screen">
        <svg
          className="animate-spin h-8 w-8 text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400 bg-gray-900 min-h-screen">
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-900 min-h-screen">
        <svg
          className="w-12 h-12 text-gray-500"
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
        <p className="mt-2 text-sm font-medium text-gray-400">
          No leaderboard data available
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Leaderboard will appear once predictions are resolved
        </p>
      </div>
    );
  }

  const isUserInTop10 = userRank !== null && userRank <= 10;
  const showUserBanner = address && userRank && !isUserInTop10;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gray-900">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 flex items-center bg-[#433952]/80 backdrop-blur-sm border-b border-[#544863] px-4 pt-4 pb-2">
        <h1 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-gray-100">
          Top Earners
        </h1>
      </div>

      {/* Chips for Timeframe - Commented out for now since we only have all-time
      <div className="flex gap-3 px-4 py-4 overflow-x-auto">
        {(["All-Time", "Monthly", "Weekly"] as const).map((time) => (
          <div
            key={time}
            onClick={() => setTimeFrame(time)}
            className={`flex h-8 shrink-0 cursor-pointer items-center justify-center gap-x-2 rounded-full transition-colors ${
              timeFrame === time
                ? "bg-[#544863] border border-[#544863]"
                : "bg-[#352c3f]/80 border border-[#544863]/50"
            } pl-4 pr-4`}
          >
            <p
              className={`text-sm font-medium leading-normal ${
                timeFrame === time ? "text-gray-100" : "text-gray-400"
              }`}
            >
              {time}
            </p>
          </div>
        ))}
      </div>
      */}

      {/* Podium Section - Only show on page 1 */}
      {currentPage === 1 && data.length >= 3 && (
        <div className="flex items-end justify-center gap-4 px-4 py-6">
          {/* Map through top 3 users in correct order for podium (2nd, 1st, 3rd) */}
          {data
            .slice(0, 3)
            .sort((a, b) => {
              const order = [2, 1, 3];
              return order.indexOf(a.rank) - order.indexOf(b.rank);
            })
            .map((entry) => (
              <div
                key={entry.rank}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <div
                    className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full ${
                      entry.rank === 1
                        ? "w-28 h-28 border-4 border-[#FFD700]"
                        : `w-20 h-20 border-2 ${
                            entry.rank === 2
                              ? "border-[#C0C0C0]"
                              : "border-[#CD7F32]"
                          }`
                    }`}
                    style={{
                      backgroundImage: `url("${
                        entry.pfp_url || "/default-avatar.png"
                      }")`,
                    }}
                  />
                  <div
                    className={`absolute -bottom-2 -right-2 flex ${
                      entry.rank === 1
                        ? "h-10 w-10 text-base"
                        : "h-8 w-8 text-sm"
                    } items-center justify-center rounded-full ${
                      entry.rank === 1
                        ? "bg-[#FFD700]"
                        : entry.rank === 2
                        ? "bg-[#C0C0C0]"
                        : "bg-[#CD7F32]"
                    } font-bold text-white shadow-md`}
                  >
                    {entry.rank}
                  </div>
                </div>
                <p
                  className={`text-gray-100 ${
                    entry.rank === 1
                      ? "text-base font-bold"
                      : "text-sm font-semibold"
                  }`}
                >
                  {entry.username}
                </p>
                <p
                  className={`${
                    entry.rank === 1
                      ? "text-blue-400 text-sm font-semibold"
                      : "text-gray-400 text-xs"
                  }`}
                >
                  {entry.winnings.toFixed(0)} POLITICS
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="flex flex-col gap-2 px-4 pb-24">
        {data.map((entry) => {
          const isCurrentUser =
            address && entry.address.toLowerCase() === address.toLowerCase();
          return (
            <div
              key={entry.rank}
              className={`flex items-center rounded-lg backdrop-blur-sm border p-3 gap-4 transition-colors ${
                isCurrentUser
                  ? "bg-blue-500/20 border-blue-400 ring-2 ring-blue-400"
                  : "bg-[#433952]/50 border-[#544863] hover:bg-[#433952]/70"
              }`}
            >
              <p className="w-6 text-center text-sm font-semibold text-gray-400">
                {entry.rank}
              </p>
              <img
                className="h-10 w-10 rounded-full object-cover border-2 border-[#544863]"
                src={entry.pfp_url || "/default-avatar.png"}
                alt={`${entry.username}'s avatar`}
              />
              <div className="flex-grow">
                <p className="font-semibold text-gray-100">
                  {entry.username}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-blue-400">(You)</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {entry.voteCount} predictions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-200">
                  {entry.winnings.toFixed(0)} POLITICS
                </p>
                {entry.trend !== "none" &&
                  (entry.trend === "up" ? (
                    <ArrowUpCircle className="text-green-400 size-5" />
                  ) : (
                    <ArrowDownCircle className="text-red-400 size-5" />
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4 px-4 pb-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#433952]/50 border border-[#544863] text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#433952]/70 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span className="text-gray-300 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#433952]/50 border border-[#544863] text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#433952]/70 transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sticky "My Rank" Banner - Only show if user is not in top 10 */}
      {showUserBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-[#433952]/90 backdrop-blur-md border-t border-[#544863]">
          <div className="flex items-center rounded-lg bg-[#544863]/50 backdrop-blur-sm p-3 gap-4 border border-[#544863]">
            <p className="w-6 text-center text-sm font-bold text-blue-400">
              #{userRank}
            </p>
            <div className="flex-grow">
              <p className="font-bold text-gray-100">Your Rank</p>
              <p className="text-xs text-gray-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <button
              onClick={() => {
                const userPage = Math.ceil(userRank / 10);
                setCurrentPage(userPage);
              }}
              className="px-3 py-1 text-sm rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
