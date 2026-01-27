import { useState, useEffect, useCallback } from "react";
import { MarketAnalytics } from "@/types/types";

interface UseMarketAnalyticsOptions {
  marketId: string;
  timeRange?: "24h" | "7d" | "30d" | "all";
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface UseMarketAnalyticsReturn {
  data: MarketAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useMarketAnalytics({
  marketId,
  timeRange = "7d",
  refreshInterval = 5 * 60 * 1000, // 5 minutes default
  enabled = true,
}: UseMarketAnalyticsOptions): UseMarketAnalyticsReturn {
  const [data, setData] = useState<MarketAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!enabled || !marketId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        marketId,
        timeRange,
      });

      const response = await fetch(`/api/market/analytics?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle both direct data and wrapped responses
      const analytics: MarketAnalytics = result.data || result;

      // Validate the response structure
      if (!analytics || typeof analytics !== "object") {
        throw new Error("Invalid analytics data received");
      }

      setData(analytics);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching market analytics:", err);

      // Set fallback data on error to prevent crashes
      setData({
        priceHistory: [],
        volumeHistory: [],
        totalVolume: 0,
        totalTrades: 0,
        priceChange24h: 0,
        volumeChange24h: 0,
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [marketId, timeRange, enabled]);

  const refresh = useCallback(async () => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshInterval, enabled]);

  // Refetch when time range changes
  useEffect(() => {
    if (data) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]); // Only depend on timeRange, not fetchAnalytics to avoid infinite loop

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated,
  };
}

// Hook for invalidating analytics cache
export function useInvalidateMarketAnalytics() {
  const invalidateCache = useCallback(async (marketId: string) => {
    try {
      const response = await fetch("/api/market/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ marketId }),
      });

      if (!response.ok) {
        throw new Error("Failed to invalidate cache");
      }

      return true;
    } catch (err) {
      console.error("Error invalidating analytics cache:", err);
      return false;
    }
  }, []);

  return { invalidateCache };
}

// Hook for real-time price updates (using WebSocket or SSE)
export function useRealTimeMarketUpdates(marketId: string) {
  const [realtimeData, setRealtimeData] = useState<{
    currentPriceA: number;
    currentPriceB: number;
    lastTrade: {
      timestamp: number;
      option: "A" | "B";
      amount: number;
      price: number;
    } | null;
  } | null>(null);

  useEffect(() => {
    // In a real implementation, you would connect to a WebSocket here
    // For now, we'll simulate real-time updates with polling

    const pollInterval = setInterval(async () => {
      try {
        // This could be a separate lightweight endpoint for current prices
        const response = await fetch(
          `/api/market/current-price?marketId=${marketId}`,
        );
        if (response.ok) {
          const result = await response.json();
          // Handle both direct data and wrapped responses
          const data = result.data || result;
          if (data && typeof data === "object") {
            setRealtimeData(data);
          }
        }
      } catch (err) {
        console.error("Error fetching real-time data:", err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [marketId]);

  return realtimeData;
}
