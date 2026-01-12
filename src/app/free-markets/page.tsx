"use client";

import { useState, useEffect } from "react";
import { MarketV2Card } from "@/components/market-v2-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, TrendingUp } from "lucide-react";
import { MarketV2 } from "@/types/types";
import { getTotalMarketCount, fetchMarketData } from "@/lib/market-migration";
import {
  V2contractAddress,
  V2contractAbi,
  publicClient,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";

export default function FreeMarketsPage() {
  const [markets, setMarkets] = useState<{ index: number; market: MarketV2 }[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFreeMarkets = async () => {
      try {
        const totalCount = await getTotalMarketCount();

        const freeMarkets: { index: number; market: MarketV2 }[] = [];

        // Check each market to see if it's a free market
        for (let i = 0; i < totalCount.total; i++) {
          try {
            // Get market info to check market type
            const marketInfo = await publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketInfo",
              args: [BigInt(i)],
            });

            // Check if market type is FREE_ENTRY (1)
            if (
              marketInfo &&
              marketInfo.length > 6 &&
              typeof marketInfo[6] === "bigint" &&
              marketInfo[6] === 1n
            ) {
              const marketData = await fetchMarketData(i);
              if (marketData && marketData.version === "v2") {
                freeMarkets.push({
                  index: i,
                  market: marketData.market as MarketV2,
                });
              }
            }
          } catch (error) {
            console.error(`Error checking market ${i}:`, error);
          }
        }

        setMarkets(freeMarkets);
      } catch (error) {
        console.error("Error fetching free markets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFreeMarkets();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Free Entry Markets
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join prediction markets for free! Get tokens to participate without
            any upfront cost.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Free Markets
              </CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{markets.length}</div>
              <p className="text-xs text-muted-foreground">
                Active free entry markets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Free Tokens Available
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">🎁</div>
              <p className="text-xs text-muted-foreground">
                Join markets and get tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                How It Works
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    1
                  </Badge>
                  <span className="text-xs">Find a free market</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    2
                  </Badge>
                  <span className="text-xs">
                    Click &quot;Claim&quot; button
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    3
                  </Badge>
                  <span className="text-xs">Start trading for free!</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Loading free markets...
            </p>
          </div>
        ) : markets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map(({ index, market }) => (
              <MarketV2Card key={index} index={index} market={market} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Free Markets Available
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                There are currently no free entry markets available. Check back
                later or create one!
              </p>
              <Badge className="bg-blue-100 text-blue-800">Coming Soon</Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
