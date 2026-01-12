"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useV3PlatformData } from "@/hooks/useV3PlatformData";
import { CreateMarketV2 } from "./CreateMarketV2";
import { MarketResolver } from "./MarketResolver";
import { AdminRoleManager } from "./AdminRoleManager";
import { MarketValidationManager } from "./MarketValidationManager";
import { MarketInvalidationManager } from "./MarketInvalidationManager";
import { AdminWithdrawalsSection } from "./AdminWithdrawalsSection";
import { useUserRoles } from "@/hooks/useUserRoles";
import { V2contractAddress, V2contractAbi } from "@/constants/contract";
import {
  Settings,
  Plus,
  Gavel,
  DollarSign,
  Users,
  Shield,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Wallet,
  TrendingUp,
  Award,
  Activity,
  Loader2,
} from "lucide-react";

export function ModernAdminDashboard() {
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const {
    hasCreatorAccess,
    hasResolverAccess,
    hasValidatorAccess,
    isAdmin,
    isOwner,
  } = useUserRoles();

  // Settings tab state
  const [newFeeRate, setNewFeeRate] = useState("200");
  const [newFeeCollector, setNewFeeCollector] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // V3 Platform data for settings
  const { globalStats, currentFeeRate, refreshAllData } = useV3PlatformData();

  // Contract interactions for settings
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

  // Set default tab based on user permissions - prioritize withdrawals for admin users
  const getDefaultTab = () => {
    if (hasCreatorAccess) return "create";
    if (isOwner || isAdmin) return "withdrawals";
    if (hasValidatorAccess) return "validate";
    if (hasResolverAccess) return "resolve";
    return "create";
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // Get some basic stats using V3 contract
  const { data: marketCount } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "marketCount",
    query: { enabled: isConnected },
  });

  const { data: platformFeeRate } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "platformFeeRate",
    query: { enabled: isConnected },
  });

  const { data: totalPlatformFeesCollected } = useReadContract({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "totalPlatformFeesCollected",
    query: { enabled: isConnected },
  });

  const hasAnyAccess =
    hasCreatorAccess || hasResolverAccess || hasValidatorAccess || isAdmin;

  // Settings handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
      toast({
        title: "Data Refreshed",
        description: "Platform data has been updated.",
      });
    } catch (error) {
      // console.error("Failed to refresh data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh platform data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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
      //  console.error("Error withdrawing platform fees:", error);
      toast({
        title: "Transaction Failed",
        description: error?.shortMessage || "Failed to withdraw platform fees.",
        variant: "destructive",
      });
    }
  };

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
      // console.error("Error setting fee rate:", error);
      toast({
        title: "Transaction Failed",
        description: error?.shortMessage || "Failed to set fee rate.",
        variant: "destructive",
      });
    }
  };

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
      // console.error("Error setting fee collector:", error);
      toast({
        title: "Transaction Failed",
        description: error?.shortMessage || "Failed to set fee collector.",
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: bigint | null | undefined) => {
    if (!amount) return "0.00";
    const value = Number(amount) / 10 ** 18;
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6 text-center">
          <Shield className="h-12 w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-sm md:text-base text-gray-600">
            Please connect your wallet to access admin functions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyAccess) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6 text-center">
          <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-red-400 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2">
            Access Denied
          </h3>
          <p className="text-sm md:text-base text-gray-600">
            You don&apos;t have permission to access admin functions. Contact
            the contract owner to request access.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatFeeRate = (rate: bigint | null | undefined) => {
    if (!rate) return "N/A";
    return `${(Number(rate) / 100).toFixed(2)}%`;
  };

  const formatTokenAmount = (amount: bigint | undefined) => {
    if (!amount) return "0";
    return (Number(amount) / 1e18).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 mb-16 md:mb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
            Manage Policast prediction markets and platform settings
          </p>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          {isOwner && (
            <Badge
              variant="default"
              className="text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1"
            >
              Owner
            </Badge>
          )}
          {isAdmin && !isOwner && (
            <Badge
              variant="secondary"
              className="text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1"
            >
              Admin
            </Badge>
          )}
          {hasCreatorAccess && !isAdmin && (
            <Badge
              variant="outline"
              className="text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1"
            >
              Creator
            </Badge>
          )}
          {hasResolverAccess && !isAdmin && (
            <Badge
              variant="outline"
              className="text-xs md:text-sm px-2 py-0.5 md:px-3 md:py-1"
            >
              Resolver
            </Badge>
          )}
        </div>
      </div>

      {/* Platform Stats - LMSR Focused */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Markets
                </p>
                <p className="text-lg md:text-2xl font-bold">
                  {marketCount ? Number(marketCount) : "0"}
                </p>
              </div>
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Platform Fee Rate
                </p>
                <p className="text-lg md:text-2xl font-bold">
                  {formatFeeRate(platformFeeRate)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Total Fees Collected
                </p>
                <p className="text-lg md:text-2xl font-bold">
                  {formatTokenAmount(totalPlatformFeesCollected)} $Politics
                </p>
              </div>
              <Award className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                  Market System
                </p>
                <p className="text-lg md:text-2xl font-bold">Policast</p>
              </div>
              <Activity className="h-6 w-6 md:h-8 md:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 md:grid md:grid-cols-6 bg-muted">
          {hasCreatorAccess && (
            <TabsTrigger
              value="create"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
          )}
          {hasValidatorAccess && (
            <TabsTrigger
              value="validate"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Validate</span>
            </TabsTrigger>
          )}
          {hasValidatorAccess && (
            <TabsTrigger
              value="invalidate"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Invalidate</span>
            </TabsTrigger>
          )}
          {hasResolverAccess && (
            <TabsTrigger
              value="resolve"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Gavel className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Resolve</span>
            </TabsTrigger>
          )}
          {(isOwner || isAdmin) && (
            <TabsTrigger
              value="withdrawals"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Wallet className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Withdrawals</span>
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger
              value="roles"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger
              value="settings"
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
            >
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Create Markets Tab */}
        {hasCreatorAccess && (
          <TabsContent
            value="create"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <CreateMarketV2 />
          </TabsContent>
        )}

        {/* Validate Markets Tab */}
        {hasValidatorAccess && (
          <TabsContent
            value="validate"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <MarketValidationManager />
          </TabsContent>
        )}

        {/* Invalidate Markets Tab */}
        {hasValidatorAccess && (
          <TabsContent
            value="invalidate"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <MarketInvalidationManager />
          </TabsContent>
        )}

        {/* Resolve Markets Tab */}
        {hasResolverAccess && (
          <TabsContent
            value="resolve"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <MarketResolver />
          </TabsContent>
        )}

        {/* Admin Withdrawals Tab - LMSR Compatible */}
        {(isOwner || isAdmin) && (
          <TabsContent
            value="withdrawals"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                    <div>
                      <h2 className="text-xl font-semibold">
                        Admin Withdrawals
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Manage platform fees and admin liquidity from resolved
                        markets
                      </p>
                    </div>
                  </div>
                  <AdminWithdrawalsSection />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Role Management Tab */}
        {isOwner && (
          <TabsContent
            value="roles"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <AdminRoleManager />
          </TabsContent>
        )}

        {/* Settings Tab */}
        {isOwner && (
          <TabsContent
            value="settings"
            className="space-y-4 md:space-y-6 mt-3 md:mt-6"
          >
            <Tabs defaultValue="fees" className="space-y-3 md:space-y-4 w-full">
              <TabsList className="w-full h-auto p-1 grid grid-cols-1 md:grid-cols-2 gap-1">
                <TabsTrigger
                  value="fees"
                  className="text-xs md:text-sm px-2 py-2 md:px-3"
                >
                  Fee Management
                </TabsTrigger>
                <TabsTrigger
                  value="platform"
                  className="text-xs md:text-sm px-2 py-2 md:px-3"
                >
                  Platform Settings
                </TabsTrigger>
              </TabsList>

              {/* Fee Management Sub-tab */}
              <TabsContent value="fees" className="space-y-3 md:space-y-4">
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
                          {formatAmount(globalStats?.totalFeesCollected)}{" "}
                          Politics
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

              {/* Platform Settings Sub-tab */}
              <TabsContent value="platform" className="space-y-3 md:space-y-4">
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
                        <Label
                          htmlFor="feeRate"
                          className="text-sm md:text-base"
                        >
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
            </Tabs>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
