"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
// import { Slot } from "@radix-ui/react-slot";
import { useAccount, useReadContract } from "wagmi";
import {
  V2contractAddress,
  V2contractAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { TrendingUp, TrendingDown, MessageCircle, Gift } from "lucide-react";
import MarketTime from "./market-time";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { InteractiveTradingInterface } from "./InteractiveTradingInterface";
import { MarketV2SellInterface } from "./MarketV2SellInterface";
import { MarketV2SharesDisplay } from "./market-v2-shares-display";
import { sdk } from "@farcaster/miniapp-sdk";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShareFromSquare,
  faUpRightAndDownLeftFromCenter,
} from "@fortawesome/free-solid-svg-icons";
import { MarketV2, MarketOption, MarketCategory } from "@/types/types";
import { FreeMarketClaimStatus } from "./FreeMarketClaimStatus";
import { FreeTokenClaimButton } from "./FreeTokenClaimButton";

// Simple in-memory cache for comment counts (shared across all instances)
const commentCountCache = new Map<
  string,
  { count: number; timestamp: number }
>();
const COMMENT_CACHE_TTL = 60000; // 1 minute cache

// Add LinkifiedText component for URL preview support//
const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <>
      {parts.map((part, index) =>
        urlRegex.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 hover:bg-blue-500/30 transition-colors text-xs"
            title={part}
          >
            <svg
              className="w-2.5 h-2.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                clipRule="evenodd"
              />
            </svg>
            {getDomainFromUrl(part)}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

// Category badge component
const CategoryBadge = ({ category }: { category: MarketCategory }) => {
  const categoryNames = {
    [MarketCategory.POLITICS]: "Politics",
    [MarketCategory.SPORTS]: "Sports",
    [MarketCategory.ENTERTAINMENT]: "Entertainment",
    [MarketCategory.TECHNOLOGY]: "Technology",
    [MarketCategory.ECONOMICS]: "Economics",
    [MarketCategory.SCIENCE]: "Science",
    [MarketCategory.WEATHER]: "Weather",
    [MarketCategory.OTHER]: "Other",
  };

  const categoryColors = {
    [MarketCategory.POLITICS]:
      "bg-red-500/10 text-red-200 border border-red-500/20",
    [MarketCategory.SPORTS]:
      "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20",
    [MarketCategory.ENTERTAINMENT]:
      "bg-purple-500/10 text-purple-200 border border-purple-500/20",
    [MarketCategory.TECHNOLOGY]:
      "bg-blue-500/10 text-blue-200 border border-blue-500/20",
    [MarketCategory.ECONOMICS]:
      "bg-yellow-500/10 text-yellow-200 border border-yellow-500/20",
    [MarketCategory.SCIENCE]:
      "bg-teal-500/10 text-teal-200 border border-teal-500/20",
    [MarketCategory.WEATHER]:
      "bg-sky-500/10 text-sky-200 border border-sky-500/20",
    [MarketCategory.OTHER]:
      "bg-gray-500/10 text-gray-200 border border-gray-500/20",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium ${categoryColors[category]}`}
    >
      {categoryNames[category]}
    </span>
  );
};

// Invalidation badge component
const InvalidatedBadge = () => {
  return (
    <span className="inline-block px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium bg-red-500/10 text-red-200 border border-red-500/20">
      Invalidated
    </span>
  );
};

// Free market badge component
const FreeMarketBadge = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
      <Gift className="h-3 w-3" />
      Free
    </span>
  );
};

// Event-based market badge component
const EventBasedBadge = () => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium bg-orange-500/10 text-orange-200 border border-orange-500/20">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
      ER
    </span>
  );
};

interface MarketV2CardProps {
  index: number;
  market: MarketV2;
}

export function MarketV2Card({ index, market }: MarketV2CardProps) {
  const { address } = useAccount();
  const [commentCount, setCommentCount] = useState<number>(0);
  const [options, setOptions] = useState<MarketOption[]>([]);
  const [totalVolume, setTotalVolume] = useState<bigint>(0n);
  const [activeInterface, setActiveInterface] = useState<"buy" | "sell">("buy");
  const [isRefetching, setIsRefetching] = useState(false);
  // Derived displayOptions: prefer detailed `options` (from /api) but fall back
  // to a lightweight representation built from the passed-in `market` so the
  // progress UI and other consumers can render immediately.
  const displayOptions: MarketOption[] = (() => {
    if (options && options.length > 0) return options;
    const count =
      Number(market.optionCount ?? market.options?.length ?? 0) || 0;
    if (count <= 0) return [];
    return Array.from({ length: count }).map((_, i) => {
      const raw = market.options ? market.options[i] : undefined;
      const name =
        typeof raw === "string"
          ? raw
          : raw && typeof raw === "object"
          ? String((raw as any).name ?? `Option ${i + 1}`)
          : `Option ${i + 1}`;
      const description =
        raw && typeof raw === "object"
          ? String((raw as any).description ?? "")
          : "";
      // MarketV2 type may not include on-chain optionShares in this shape.
      // Use a safe access via `any` so TS doesn't error and fall back to 0n.
      const maybeOptionShares = (market as any)?.optionShares;
      const totalShares =
        maybeOptionShares && typeof maybeOptionShares[i] !== "undefined"
          ? BigInt(maybeOptionShares[i])
          : 0n;
      return {
        name,
        description,
        totalShares,
        totalVolume: 0n,
        currentPrice: 0n,
        isActive: !market.resolved,
      } as MarketOption;
    });
  })();

  // Use marketType from prop if available, otherwise fetch from contract
  const { data: marketTypeData } = useReadContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "getMarketType",
    args: [BigInt(index)],
    query: {
      enabled: typeof market.marketType === "undefined", // Only fetch if not in props
    },
  });

  // Normalized marketType (0 = paid, 1 = free)
  const derivedMarketType: number | undefined = (() => {
    // First check if it's in the market prop
    if (typeof market.marketType === "number") return market.marketType;

    // Then check contract data
    if (typeof marketTypeData === "number") return marketTypeData;
    if (marketTypeData && typeof marketTypeData === "bigint")
      return Number(marketTypeData);

    return undefined;
  })();

  useEffect(() => {
    if (derivedMarketType !== undefined) {
      console.debug(
        `[MarketV2Card] market ${index} marketType detected: ${derivedMarketType}`
      );
    } else {
      console.debug(
        `[MarketV2Card] market ${index} marketType unresolved yet (waiting for contract reads)`
      );
    }
  }, [derivedMarketType, index]);

  // Determine if we should fetch user shares (only for active, non-expired, non-invalidated markets)
  const marketIsExpired = new Date(Number(market.endTime) * 1000) < new Date();
  const shouldFetchShares =
    !!address && !market.resolved && !market.invalidated && !marketIsExpired;

  // Fetch user shares for this market using getMarketOptionUserShares for each option
  // This matches the approach used in MarketV2PositionManager
  const userShares0Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 0n, address as `0x${string}`],
    query: {
      enabled: shouldFetchShares && (market.options?.length ?? 0) > 0,
      refetchInterval: 30000, // Reduced from 10s to 30s
      staleTime: 15000, // Cache for 15s
    },
  });

  const userShares1Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 1n, address as `0x${string}`],
    query: {
      enabled: shouldFetchShares && (market.options?.length ?? 0) > 1,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  const userShares2Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 2n, address as `0x${string}`],
    query: {
      enabled: shouldFetchShares && (market.options?.length ?? 0) > 2,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  const userShares3Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 3n, address as `0x${string}`],
    query: {
      enabled: shouldFetchShares && (market.options?.length ?? 0) > 3,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  const userShares4Query = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getMarketOptionUserShares",
    args: [BigInt(index), 4n, address as `0x${string}`],
    query: {
      enabled: shouldFetchShares && (market.options?.length ?? 0) > 4,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  });

  // Combine individual queries into an array
  const userSharesQueries = [
    userShares0Query,
    userShares1Query,
    userShares2Query,
    userShares3Query,
    userShares4Query,
  ];

  // Create userShares array from individual queries (matches PositionManager approach)
  const userShares = userSharesQueries.map((query) =>
    query?.data ? (query.data as bigint) : 0n
  );

  // Debug user shares (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && shouldFetchShares) {
      // console.log(
      //   `[MarketV2Card ${index}] User shares array:`,
      //   userShares.map((s, idx) => ({
      //     optionId: idx,
      //     shares: s.toString(),
      //     hasShares: s > 0n,
      //   })),
      //   `| address: ${address}`
      // );
    }
  }, [userShares, index, address, shouldFetchShares]);

  // Fetch options data: Use market.options prop data primarily, only fetch prices if needed
  useEffect(() => {
    let mounted = true;

    const fetchOptions = async () => {
      try {
        // Use options passed from parent (already contains all data from migration)
        if (market.options && market.options.length > 0) {
          const optionsData = market.options.map((opt, i) => ({
            name: typeof opt === "string" ? opt : opt.name || `Option ${i + 1}`,
            description: typeof opt === "string" ? "" : opt.description || "",
            totalShares: typeof opt === "string" ? 0n : opt.totalShares || 0n,
            totalVolume: typeof opt === "string" ? 0n : opt.totalVolume || 0n,
            currentPrice: typeof opt === "string" ? 0n : opt.currentPrice || 0n,
            isActive: typeof opt === "string" ? true : opt.isActive ?? true,
          }));

          const totalVol = optionsData.reduce(
            (sum, opt) => sum + opt.totalVolume,
            0n
          );

          if (mounted) {
            setOptions(optionsData);
            setTotalVolume(totalVol);
          }
          return;
        }

        // Fallback: only if market.options is not available
        const propCount = Number(market?.optionCount ?? 0) || 0;
        const optionCount = propCount;

        if (optionCount <= 0) {
          if (mounted) {
            setOptions([]);
            setTotalVolume(0n);
          }
          return;
        }

        // Only fetch from API if we don't have data from parent
        const optionsData: MarketOption[] = [];
        let totalVol = 0n;

        // Fetch all options in parallel from API only
        const fetchPromises = Array.from({ length: optionCount }).map(
          async (_, i) => {
            try {
              const apiRes = await fetch(
                `/api/market-option?marketId=${index}&optionId=${i}`
              );
              const apiJson = apiRes.ok ? await apiRes.json() : null;

              if (!apiJson) {
                return {
                  name: `Option ${i + 1}`,
                  description: "",
                  totalShares: 0n,
                  totalVolume: 0n,
                  currentPrice: 0n,
                  isActive: true,
                };
              }

              return {
                name: apiJson.name ?? `Option ${i + 1}`,
                description: apiJson.description ?? "",
                totalShares: apiJson.totalShares
                  ? BigInt(apiJson.totalShares)
                  : 0n,
                totalVolume: apiJson.totalVolume
                  ? BigInt(apiJson.totalVolume)
                  : 0n,
                currentPrice: apiJson.currentPrice
                  ? BigInt(apiJson.currentPrice)
                  : 0n,
                isActive: apiJson.isActive ?? true,
              };
            } catch (innerErr) {
              console.error(
                `Error loading option ${i} for market ${index}`,
                innerErr
              );
              return {
                name: `Option ${i + 1}`,
                description: "",
                totalShares: 0n,
                totalVolume: 0n,
                currentPrice: 0n,
                isActive: false,
              };
            }
          }
        );

        const results = await Promise.all(fetchPromises);
        results.forEach((opt) => {
          optionsData.push(opt);
          totalVol += opt.totalVolume;
        });

        if (mounted) {
          setOptions(optionsData);
          setTotalVolume(totalVol);
        }
      } catch (err) {
        console.error("fetchOptions failed", err);
        if (mounted) {
          setOptions([]);
          setTotalVolume(0n);
        }
      }
    };

    // initial fetch
    fetchOptions();

    // Listen for global market-updated events and refetch when this market changes
    const handler = (e: Event) => {
      try {
        const ev = e as CustomEvent;
        if (ev?.detail?.marketId === index) {
          fetchOptions();
        }
      } catch (err) {
        console.debug("market-updated handler error", err);
      }
    };
    window.addEventListener("market-updated", handler);

    return () => {
      mounted = false;
      window.removeEventListener("market-updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]); // Only depend on index, not market object to prevent infinite loops

  // Calculate probabilities from prices (pass to MultiOptionProgress)
  const probabilities = displayOptions.map((option) =>
    Math.max(0, Math.min(100, (Number(option.currentPrice) / 1e18) * 100))
  );

  // Fetch comment count with caching
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const cacheKey = `v2-${index}`;
        const cached = commentCountCache.get(cacheKey);

        // Use cache if valid
        if (cached && Date.now() - cached.timestamp < COMMENT_CACHE_TTL) {
          setCommentCount(cached.count);
          return;
        }

        const response = await fetch(
          `/api/comments?marketId=${index}&version=v2`
        );
        if (response.ok) {
          const data = await response.json();
          const count = data.total || 0;
          setCommentCount(count);

          // Update cache
          commentCountCache.set(cacheKey, { count, timestamp: Date.now() });
        }
      } catch (error) {
        console.error("Error fetching comment count:", error);
      }
    };

    fetchCommentCount();
  }, [index]);

  // Detect mobile viewport (used to conditionally hide the event-based badge
  // when category + free + event badges would otherwise all appear).
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Use a breakpoint of 767px (matches max-width: 767px -> mobile)
    const mq = window.matchMedia("(max-width: 767px)");
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    // Initialize
    setIsMobile(mq.matches);
    // Add listener (support both modern and legacy APIs)
    if ((mq as any).addEventListener) {
      (mq as any).addEventListener("change", handle);
    } else {
      mq.addListener(handle);
    }
    return () => {
      if ((mq as any).removeEventListener) {
        (mq as any).removeEventListener("change", handle);
      } else {
        mq.removeListener(handle);
      }
    };
  }, []);

  // Determine market status
  const isExpired = new Date(Number(market.endTime) * 1000) < new Date();
  const isResolved = market.resolved;
  const isInvalidated = market.invalidated;

  // Badge visibility helpers
  const hasCategoryBadge =
    typeof market.category !== "undefined" && market.category !== null;
  // When on mobile and all three badges (category, free, event) would appear,
  // prefer showing only category + type (hide event badge).
  const showEventBadge =
    market.earlyResolutionAllowed &&
    !(isMobile && hasCategoryBadge && derivedMarketType === 1);

  // If market is invalidated, show special message instead of normal UI
  if (isInvalidated) {
    return (
      <Card
        key={index}
        className="flex flex-col border-red-500/20 bg-red-500/5 backdrop-blur-md"
      >
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <MarketTime
              endTime={market.endTime}
              earlyResolutionAllowed={market.earlyResolutionAllowed}
            />
            <div className="flex items-center gap-2">
              <CategoryBadge category={market.category} />
              <InvalidatedBadge />
              {/* Show free market badge if marketType === 1 */}
              {derivedMarketType === 1 && <FreeMarketBadge />}
              {/* Show event-based badge if early resolution is allowed (respect mobile cond) */}
              {showEventBadge && <EventBasedBadge />}
            </div>
          </div>
          <CardTitle className="text-sm leading-relaxed text-white">
            <LinkifiedText text={market.question} />
          </CardTitle>
          {market.description && (
            <p className="text-xs text-white/50 mt-1">
              <LinkifiedText text={market.description} />
            </p>
          )}

          {/* Free Market Claim Status */}
          <FreeMarketClaimStatus
            marketId={index}
            className="mt-3"
            marketType={derivedMarketType}
          />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-full mb-3 border border-red-400/30">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-300 mb-2">
              Market Invalidated
            </h3>
            <p className="text-sm text-gray-300">
              This market has been invalidated due to issues with the question
              or resolution criteria. All participants have been automatically
              refunded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Share handling
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
  const marketPageUrl = `${appUrl}/market/${index}/details`;

  const handleShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: `Check out this market on Policast: ${market.question}`,
        embeds: [marketPageUrl],
      });
    } catch (error) {
      console.error("Failed to compose cast:", error);
    }
  };

  // Check if user has shares
  const typedUserShares = (userShares as unknown as readonly bigint[]) || [];
  const hasShares =
    typedUserShares && typedUserShares.some((shares) => shares > 0n);

  return (
    <Card
      key={index}
      className="flex flex-col bg-white/5 backdrop-blur-md border-white/10"
    >
      <CardHeader>
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex justify-between items-center">
            <MarketTime
              endTime={market.endTime}
              earlyResolutionAllowed={market.earlyResolutionAllowed}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <CategoryBadge category={market.category} />
            {isInvalidated && <InvalidatedBadge />}
            {/* Show free market badge if marketType === 1 */}
            {derivedMarketType === 1 && <FreeMarketBadge />}
            {/* Show event-based badge if early resolution is allowed (respect mobile cond) */}
            {showEventBadge && <EventBasedBadge />}
          </div>
        </div>
        <CardTitle className="text-sm leading-relaxed text-white font-medium">
          <LinkifiedText text={market.question} />
        </CardTitle>
        {market.description && (
          <p className="text-xs text-white/50 mt-1">
            <LinkifiedText text={market.description} />
          </p>
        )}

        {/* Free Market Claim Status */}
        <FreeMarketClaimStatus
          marketId={index}
          className="mt-3"
          marketType={derivedMarketType}
        />
      </CardHeader>

      <CardContent className="pb-0">
        {/* Free token claim button (full CTA) shown only for active, non-expired free markets */}
        {derivedMarketType === 1 &&
          !isResolved &&
          !isInvalidated &&
          !isExpired && (
            <div className="mb-4">
              <FreeTokenClaimButton
                marketId={index}
                marketTypeOverride={derivedMarketType}
                showWhenDisconnected={true}
              />
            </div>
          )}

        {isExpired ? (
          isResolved ? (
            <MarketResolved
              marketId={index}
              outcome={Number(market.winningOptionId ?? 0)}
              options={displayOptions.map((opt) => opt.name)}
            />
          ) : (
            <MarketPending />
          )
        ) : (
          <div className="space-y-3">
            {/* Tab-style Buy/Sell Toggle */}
            <div className="border-b border-white/10 -mx-1.5">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveInterface("buy")}
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeInterface === "buy"
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-white/50 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Buy
                </button>
                <button
                  onClick={() => setActiveInterface("sell")}
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeInterface === "sell"
                      ? "border-red-500 text-red-400"
                      : "border-transparent text-white/50 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" /> Sell
                </button>
              </nav>
            </div>

            {/* Conditional Interface */}
            {activeInterface === "buy" ? (
              <InteractiveTradingInterface
                marketId={index}
                market={market}
                options={displayOptions}
                probabilities={probabilities}
                totalVolume={totalVolume}
                userShares={userShares}
                onTradeComplete={() => {
                  if (isRefetching) return; // Prevent multiple simultaneous refetches
                  setIsRefetching(true);

                  // Debounce the refetch
                  setTimeout(() => {
                    // Trigger event to refresh market data
                    window.dispatchEvent(
                      new CustomEvent("market-updated", {
                        detail: { marketId: index },
                      })
                    );
                    // Refetch user shares
                    userSharesQueries.forEach((query) => query.refetch?.());
                    setIsRefetching(false);
                  }, 500);
                }}
              />
            ) : (
              <MarketV2SellInterface
                marketId={index}
                market={market}
                userShares={userShares}
                onSellComplete={() => {
                  if (isRefetching) return; // Prevent multiple simultaneous refetches
                  setIsRefetching(true);

                  // Debounce the refetch
                  setTimeout(() => {
                    // Trigger event to refresh market data
                    window.dispatchEvent(
                      new CustomEvent("market-updated", {
                        detail: { marketId: index },
                      })
                    );
                    // Refetch user shares
                    userSharesQueries.forEach((query) => query.refetch?.());
                    setIsRefetching(false);
                  }, 500);
                }}
              />
            )}

            {/* Dedicated Position Card */}
            {hasShares && activeInterface === "sell" && (
              <div className="mt-4 p-3 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
                <MarketV2SharesDisplay
                  market={market}
                  userShares={userShares || []}
                  options={displayOptions}
                />
                <Link href={`/market/${index}/details`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2 text-xs bg-white/10 hover:bg-white/20 text-white border-0"
                  >
                    Manage Position
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4 w-full">
          {/* Comments Button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center justify-center h-auto p-2 w-full hover:bg-white/5"
              asChild
            >
              <Link href={`/market/${index}/details#comments`}>
                <div className="flex items-center justify-center size-9 rounded-full bg-white/5 mb-1 border border-white/10 text-white/70">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-medium text-white/50">
                  {commentCount > 0 ? `${commentCount} comments` : "Comments"}
                </span>
              </Link>
            </Button>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex flex-col items-center justify-center h-auto p-2 w-full hover:bg-white/5"
            >
              <div className="flex items-center justify-center size-9 rounded-full bg-white/5 mb-1 border border-white/10 text-white/70">
                <FontAwesomeIcon
                  icon={faShareFromSquare}
                  className="h-4 w-4"
                />
              </div>
              <span className="text-[10px] font-medium text-white/50">Share</span>
            </Button>
          </div>

          {/* Details Button */}
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center justify-center h-auto p-2 w-full hover:bg-white/5"
              asChild
            >
              <Link href={`/market/${index}/details`}>
                <div className="flex items-center justify-center size-9 rounded-full bg-white/5 mb-1 border border-white/10 text-white/70">
                  <FontAwesomeIcon
                    icon={faUpRightAndDownLeftFromCenter}
                    className="h-4 w-4"
                  />
                </div>
                <span className="text-[10px] font-medium text-white/50">
                  Details
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
