"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useV3PlatformData } from "@/hooks/useV3PlatformData";
import { V2contractAddress, V2contractAbi } from "@/constants/contract";
// import { MarketInvalidationManager } from "./MarketInvalidationManager";
// import { LPRewardsManager } from "./LPRewardsManager";//

import {
  Loader2,
  DollarSign,
  Settings,
  Users,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export function V3AdminDashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newFeeRate, setNewFeeRate] = useState("200"); // 2%
  const [newFeeCollector, setNewFeeCollector] = useState("");
  const [adminLiquidityMarketId, setAdminLiquidityMarketId] = useState("");
  const [prizePoolMarketId, setPrizePoolMarketId] = useState("");

  // Use the custom hook for platform data
  const {
    globalStats,
    currentFeeRate,
    isOwner,
    isFeeCollector,
    isLoadingStats,
    refreshAllData,
  } = useV3PlatformData();

  // Contract interactions
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      handleRefresh();
      toast({
        title: "Transaction Successful",
        description: "Platform settings updated successfully.",
      });
    }
  }, [isConfirmed, hash]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
      toast({
        title: "Data Refreshed",
        description: "Platform data has been updated.",
      });
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh platform data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Withdraw platform fees
  const handleWithdrawPlatformFees = async () => {
    try {
      toast({
        title: "Transaction Submitted",
        description: "Withdrawing platform fees...",
      });

      await writeContract({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "withdrawPlatformFees",
        args: [],
      });
    } catch (error: any) {
      console.error("Error withdrawing platform fees:", error);
      toast({
        title: "Transaction Failed",
        description: error?.shortMessage || "Failed to withdraw platform fees.",
        variant: "destructive",
      });
    }
  };

  // Set platform fee rate
  const handleSetFeeRate = async () => {
    try {
      const feeRateValue = parseInt(newFeeRate);
      if (feeRateValue < 0 || feeRateValue > 1000) {
        toast({
          title: "Invalid Fee Rate",
          description:
            "Fee rate must be between 0% and 10% (0-1000 basis points).",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Transaction Submitted",
        description: "Updating platform fee rate...",
      });

      await writeContract({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "setPlatformFeeRate",
        args: [BigInt(feeRateValue)],
      });
    } catch (error: any) {
      console.error("Error setting fee rate:", error);
      toast({
        title: "Transaction Failed",
        description: error?.shortMessage || "Failed to set fee rate.",
        variant: "destructive",
      });
    }
  };

  // Set fee collector
  const handleSetFeeCollector = async () => {
    try {
      if (!newFeeCollector || !newFeeCollector.startsWith("0x")) {
        toast({
          title: "Invalid Address",
          description: "Please enter a valid Ethereum address.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Transaction Submitted",
        description: "Updating fee collector address...",
      });

      await writeContract({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "setFeeCollector",
        args: [newFeeCollector as `0x${string}`],
      });
    } catch (error: any) {
      console.error("Error setting fee collector:", error);
      toast({
        title: "Transaction Failed",
        description: error?.shortMessage || "Failed to set fee collector.",
        variant: "destructive",
      });
    }
  };

  // Format amounts
  const formatAmount = (amount: bigint | null | undefined) => {
    if (!amount) return "0.00";
    const value = Number(amount) / 10 ** 18;
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format fee rate
  const formatFeeRate = (rate: bigint | null | undefined) => {
    if (!rate) return "0.00";
    return (Number(rate) / 100).toFixed(2);
  };

  if (!isConnected) {
    return (
      <Card className="mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Admin Dashboard</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Connect wallet to access admin functions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isOwner && !isFeeCollector) {
    return (
      <Card className="mx-4 md:mx-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            Access Denied
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            You need to be the contract owner or fee collector to access this
            dashboard.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="px-4 md:px-0 space-y-4 md:space-y-6 mb-16 md:mb-20 max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-3xl font-bold truncate">
            Admin settings
          </h1>
          <p className="text-sm md:text-base text-gray-500 truncate">
            Manage platform settings and collect fees
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={isOwner ? "default" : "secondary"}
            className="text-xs md:text-sm px-2 py-1"
          >
            {isOwner
              ? "Owner"
              : isFeeCollector
              ? "Fee Collector"
              : "Unauthorized"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 md:h-9 md:w-9 md:p-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="min-w-0">
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium truncate">
              Total Fees Collected
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {formatAmount(globalStats?.totalFeesCollected)} $POLITICS
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium truncate">
              Total Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {globalStats?.totalMarkets?.toString() || "0"}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium truncate">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {globalStats?.totalTrades?.toString() || "0"}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium truncate">
              Current Fee Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <div className="text-lg md:text-2xl font-bold truncate">
              {formatFeeRate(currentFeeRate)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fees" className="space-y-3 md:space-y-4 w-full">
        <TabsList className="w-full h-auto p-1 grid grid-cols-1 md:grid-cols-3 gap-1">
          <TabsTrigger
            value="fees"
            className="text-xs md:text-sm px-2 py-2 md:px-3"
          >
            Fee Management
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger
              value="settings"
              className="text-xs md:text-sm px-2 py-2 md:px-3"
            >
              Platform Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="fees" className="space-y-3 md:space-y-4">
          {/* Fee Collection */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                Platform Fee Collection
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                Withdraw accumulated platform fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-3 md:p-4 border rounded-lg gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm md:text-base">
                    Available for Withdrawal
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-green-600 truncate">
                    {formatAmount(globalStats?.totalFeesCollected)} Politics
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 truncate">
                    Fee Collector: {globalStats?.feeCollector}
                  </p>
                </div>
                <Button
                  onClick={handleWithdrawPlatformFees}
                  disabled={
                    isPending ||
                    isConfirming ||
                    !globalStats?.totalFeesCollected ||
                    globalStats.totalFeesCollected === 0n
                  }
                  className="flex items-center justify-center gap-2 w-full lg:w-auto h-9 md:h-10 text-sm md:text-base"
                >
                  {isPending || isConfirming ? (
                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span className="hidden sm:inline">Withdraw Fees</span>
                  <span className="sm:hidden">Withdraw</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isOwner && (
          <TabsContent value="settings" className="space-y-3 md:space-y-4">
            {/* Platform Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Settings className="h-4 w-4 md:h-5 md:w-5" />
                    Platform Fee Rate
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Set the platform fee rate (in basis points, 100 = 1%)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feeRate" className="text-sm md:text-base">
                      Fee Rate (basis points)
                    </Label>
                    <Input
                      id="feeRate"
                      type="number"
                      min="0"
                      max="1000"
                      value={newFeeRate}
                      onChange={(e) => setNewFeeRate(e.target.value)}
                      placeholder="200 (2%)"
                      className="h-9 md:h-10"
                    />
                    <p className="text-xs md:text-sm text-gray-500 truncate">
                      Current: {formatFeeRate(currentFeeRate)}% | New:{" "}
                      {(parseInt(newFeeRate) / 100).toFixed(2)}%
                    </p>
                  </div>
                  <Button
                    onClick={handleSetFeeRate}
                    disabled={isPending || isConfirming}
                    className="w-full h-9 md:h-10 text-sm md:text-base"
                  >
                    {isPending || isConfirming ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Settings className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    Update Fee Rate
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                    Fee Collector Address
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    Set the address that can withdraw platform fees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="feeCollector"
                      className="text-sm md:text-base"
                    >
                      Fee Collector Address
                    </Label>
                    <Input
                      id="feeCollector"
                      type="text"
                      value={newFeeCollector}
                      onChange={(e) => setNewFeeCollector(e.target.value)}
                      placeholder="0x..."
                      className="h-9 md:h-10"
                    />
                    <p className="text-xs md:text-sm text-gray-500 truncate">
                      Current: {globalStats?.feeCollector}
                    </p>
                  </div>
                  <Button
                    onClick={handleSetFeeCollector}
                    disabled={isPending || isConfirming || !newFeeCollector}
                    className="w-full h-9 md:h-10 text-sm md:text-base"
                  >
                    {isPending || isConfirming ? (
                      <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    ) : (
                      <Users className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    Update Fee Collector
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
