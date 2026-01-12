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
          <h1 className="text-lg md:text-xl font-medium text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs md:text-sm text-white/50 font-light">
            Manage Policast prediction markets & settings
          </p>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          {isOwner && (
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs px-2 py-0.5 border-amber-500/50 text-amber-200 bg-amber-500/10 font-normal"
            >
              Owner
            </Badge>
          )}
          {isAdmin && !isOwner && (
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs px-2 py-0.5 border-purple-500/50 text-purple-200 bg-purple-500/10 font-normal"
            >
              Admin
            </Badge>
          )}
          {hasCreatorAccess && !isAdmin && (
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs px-2 py-0.5 border-blue-500/50 text-blue-200 bg-blue-500/10 font-normal"
            >
              Creator
            </Badge>
          )}
          {hasResolverAccess && !isAdmin && (
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs px-2 py-0.5 border-green-500/50 text-green-200 bg-green-500/10 font-normal"
            >
              Resolver
            </Badge>
          )}
        </div>
      </div>

      {/* Platform Stats - Pristine Glass Theme */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-medium text-white/60">
                  Total Markets
                </p>
                <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-white/40" />
              </div>
              <p className="text-lg md:text-2xl font-light text-white">
                {marketCount ? Number(marketCount) : "0"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-medium text-white/60">
                  Fee Rate
                </p>
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white/40" />
              </div>
              <p className="text-lg md:text-2xl font-light text-white">
                {formatFeeRate(platformFeeRate)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-medium text-white/60">
                  Fees Collected
                </p>
                <Award className="h-3 w-3 md:h-4 md:w-4 text-white/40" />
              </div>
              <p className="text-lg md:text-2xl font-light text-white">
                {formatTokenAmount(totalPlatformFeesCollected)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs font-medium text-white/60">
                  System
                </p>
                <Activity className="h-3 w-3 md:h-4 md:w-4 text-white/40" />
              </div>
              <p className="text-lg md:text-2xl font-light text-white">
                Policast
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs - Minimalist */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 bg-white/5 border border-white/10 rounded-lg w-full overflow-x-auto">
          {hasCreatorAccess && (
            <TabsTrigger
              value="create"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
          )}
          {hasValidatorAccess && (
            <TabsTrigger
              value="validate"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Validate</span>
            </TabsTrigger>
          )}
          {hasValidatorAccess && (
            <TabsTrigger
              value="invalidate"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Invalidate</span>
            </TabsTrigger>
          )}
          {hasResolverAccess && (
            <TabsTrigger
              value="resolve"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <Gavel className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resolve</span>
            </TabsTrigger>
          )}
          {(isOwner || isAdmin) && (
            <TabsTrigger
              value="withdrawals"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Withdrawals</span>
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger
              value="roles"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none rounded-md transition-all hover:text-white/80"
            >
              <Settings className="h-3.5 w-3.5" />
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
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-300" />
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-white">
                        Admin Withdrawals
                      </h2>
                      <p className="text-white/50 text-xs">
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
            <Tabs defaultValue="fees" className="space-y-4 w-full">
              <TabsList className="w-full h-auto p-1 grid grid-cols-2 gap-1 bg-white/5 border border-white/10 rounded-lg">
                <TabsTrigger
                  value="fees"
                  className="text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md py-2"
                >
                  Fee Management
                </TabsTrigger>
                <TabsTrigger
                  value="platform"
                  className="text-xs font-medium text-white/50 data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-md py-2"
                >
                  Platform Settings
                </TabsTrigger>
              </TabsList>

              {/* Fee Management Sub-tab */}
              <TabsContent value="fees" className="space-y-4">
                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base text-white font-medium">
                      <DollarSign className="h-4 w-4" />
                      Platform Fee Collection
                    </CardTitle>
                    <CardDescription className="text-white/50 text-xs">
                      Withdraw accumulated platform fees
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-white/5 border border-white/10 rounded-lg gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white/80">
                          Available for Withdrawal
                        </p>
                        <p className="text-xl font-light text-green-400 truncate">
                          {formatAmount(globalStats?.totalFeesCollected)}{" "}
                          Politics
                        </p>
                        <p className="text-xs text-white/40 truncate mt-1">
                          Fee Collector:{" "}
                          {globalStats?.feeCollector || "Not set"}
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
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-200 border border-green-500/30 w-full lg:w-auto text-xs h-9"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <DollarSign className="h-3 w-3 mr-2" />
                        )}
                        <span>Withdraw Fees</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Platform Settings Sub-tab */}
              <TabsContent value="platform" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base text-white font-medium">
                        <Settings className="h-4 w-4" />
                        Platform Fee Rate
                      </CardTitle>
                      <CardDescription className="text-white/50 text-xs">
                        Set the platform fee rate (in basis points, 100 = 1%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="feeRate"
                          className="text-xs text-white/70"
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
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"
                        />
                        <p className="text-xs text-white/40 truncate">
                          Current: {formatFeeRate(currentFeeRate)}% | New:{" "}
                          {(parseInt(newFeeRate || "0") / 100).toFixed(2)}%
                        </p>
                      </div>
                      <Button
                        onClick={handleSetFeeRate}
                        disabled={isPending || isConfirming}
                        className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs h-9"
                        variant="outline"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <Settings className="h-3 w-3 mr-2" />
                        )}
                        Update Fee Rate
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base text-white font-medium">
                        <Users className="h-4 w-4" />
                        Fee Collector Address
                      </CardTitle>
                      <CardDescription className="text-white/50 text-xs">
                        Set the address that can withdraw platform fees
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="feeCollector"
                          className="text-xs text-white/70"
                        >
                          Fee Collector Address
                        </Label>
                        <Input
                          id="feeCollector"
                          type="text"
                          value={newFeeCollector}
                          onChange={(e) => setNewFeeCollector(e.target.value)}
                          placeholder="0x..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"
                        />
                        <p className="text-xs text-white/40 truncate">
                          Current: {globalStats?.feeCollector || "Not Set"}
                        </p>
                      </div>
                      <Button
                        onClick={handleSetFeeCollector}
                        disabled={isPending || isConfirming || !newFeeCollector}
                        className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs h-9"
                        variant="outline"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <Users className="h-3 w-3 mr-2" />
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
