"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPortfolioV2 } from "@/components/UserPortfolioV2";
import { MarketAnalyticsV2 } from "@/components/MarketAnalyticsV2";
// import { PriceHistoryV2 } from "@/components/PriceHistoryV2";

import { MultiOptionPositions } from "@/components/MultiOptionPositions";
import {
  BarChart3,
  // TrendingUp,
  // PieChart,
  // Activity,
  User,
  Target,
} from "lucide-react";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";

function AnalyticsContentInner() {
  const { isConnected } = useAccount();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("portfolio");

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "portfolio";
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without full page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("tab", value);
    window.history.replaceState(null, "", newUrl.toString());
  };

  return (
    <div className="flex-grow container mx-auto p-4 md:p-6 max-w-7xl mb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Advanced analytics for Policast markets
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Policast
          </Badge>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 md:grid md:grid-cols-5 bg-muted mb-8">
          <TabsTrigger
            value="portfolio"
            className="flex items-center gap-2 flex-1 min-w-[100px] md:min-w-0"
          >
            <User className="h-4 w-4" />
            <span>Portfolio</span>
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className="flex items-center gap-2 flex-1 min-w-[100px] md:min-w-0"
          >
            <Target className="h-4 w-4" />
            <span>Positions</span>
          </TabsTrigger>
          <TabsTrigger
            value="markets"
            className="flex items-center gap-2 flex-1 min-w-[100px] md:min-w-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Markets</span>
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Analytics */}
        <TabsContent value="portfolio" className="space-y-6">
          {isConnected ? (
            <UserPortfolioV2 />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Portfolio Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Connect Your Wallet
                  </h3>
                  <p className="text-muted-foreground">
                    Connect your wallet to view your portfolio analytics,
                    positions, and trading history.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Multi-Option Positions */}
        <TabsContent value="positions" className="space-y-6">
          <MultiOptionPositions />
        </TabsContent>

        {/* Market Analytics */}
        <TabsContent value="markets" className="space-y-6">
          <MarketAnalyticsV2 />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component that needs Suspense for useSearchParams
function AnalyticsContentWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex-grow container mx-auto p-4 md:p-6 max-w-7xl">
          <div className="space-y-6">
            <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AnalyticsContentInner />
    </Suspense>
  );
}

// Export with dynamic import and no SSR
export const AnalyticsContent = dynamic(
  () => Promise.resolve(AnalyticsContentWithSuspense),
  {
    ssr: false,
  }
);
