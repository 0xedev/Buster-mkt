"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import {
  V2contractAddress,
  V2contractAbi,
  publicClient,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Shield,
  Loader2,
  RefreshCw,
  FileText,
  User,
  Calendar,
  Hash,
} from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  mapMarketInfo,
  MarketBasicInfoTuple,
  MarketExtendedMetaTuple,
} from "@/types/market";
import Link from "next/link";

interface PendingMarket {
  marketId: number;
  question: string;
  description: string;
  creator: string;
  createdAt: bigint;
  endTime: bigint;
  optionCount: bigint;
  category: number;
  validated: boolean;
  invalidated: boolean;
  resolved: boolean;
  disputed: boolean;
  totalVolume: bigint;
  earlyResolutionAllowed: boolean;
}

const MARKET_CATEGORIES = [
  "Politics",
  "Sports",
  "Entertainment",
  "Technology",
  "Economics",
  "Science",
  "Weather",
  "Other",
];

export function MarketValidationManager() {
  const { isConnected } = useAccount();
  const { hasValidatorAccess, isAdmin, isOwner } = useUserRoles();
  const { toast } = useToast();

  const [pendingMarkets, setPendingMarkets] = useState<PendingMarket[]>([]);
  const [validatedMarkets, setValidatedMarkets] = useState<PendingMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "validated">(
    "pending"
  );
  const [selectedMarket, setSelectedMarket] = useState<PendingMarket | null>(
    null
  );

  // Load markets from V2 contract directly
  const {
    data: marketCount,
    isLoading: isLoadingCount,
    refetch: refetchCount,
  } = useQuery({
    queryKey: ["marketCount"],
    queryFn: async () => {
      const count = await publicClient.readContract({
        address: V2contractAddress as `0x${string}`,
        abi: V2contractAbi,
        functionName: "marketCount",
      });
      return Number(count);
    },
    enabled: isConnected,
    refetchInterval: 30000,
  });

  // Fetch market details from contract
  const {
    data: marketsData,
    isLoading: isLoadingMarkets,
    refetch: refetchMarkets,
  } = useQuery({
    queryKey: ["contractMarkets", marketCount],
    queryFn: async () => {
      if (!marketCount || marketCount === 0) return [];

      const markets: PendingMarket[] = [];

      // Fetch markets in batches to avoid RPC limits
      const batchSize = 20;
      for (let i = 0; i < marketCount; i += batchSize) {
        const promises = [];
        const endIndex = Math.min(i + batchSize, marketCount);

        for (let j = i; j < endIndex; j++) {
          // For each market, fetch basic info and extended meta in parallel
          promises.push(
            Promise.all([
              publicClient.readContract({
                address: V2contractAddress,
                abi: V2contractAbi,
                functionName: "getMarketBasicInfo",
                args: [BigInt(j)],
              }),
              publicClient.readContract({
                address: V2contractAddress,
                abi: V2contractAbi,
                functionName: "getMarketExtendedMeta",
                args: [BigInt(j)],
              }),
            ]).then(([basic, extended]) => ({ basic, extended, marketId: j }))
          );
        }

        const batchResults = await Promise.all(
          promises as Promise<{
            marketId: number;
            basic: MarketBasicInfoTuple;
            extended: MarketExtendedMetaTuple;
          }>[]
        );

        batchResults.forEach(({ basic, extended, marketId }) => {
          markets.push(mapMarketInfo(marketId, basic, extended));
        });
      }

      return markets;
    },
    enabled: isConnected && typeof marketCount === "number" && marketCount > 0,
    refetchInterval: 30000,
  });

  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Debug logging for markets data
  useEffect(() => {
    // console.log("🔍 Contract markets data:", {
    //   marketCount,
    //   marketsData,
    //   isLoadingCount,
    //   isLoadingMarkets,
    //   isConnected,
    //   dataLength: marketsData?.length || 0,
    // });
  }, [marketCount, marketsData, isLoadingCount, isLoadingMarkets, isConnected]);

  // Map contract markets to pending/validated lists
  useEffect(() => {
    const mapAndSet = (items?: PendingMarket[]) => {
      if (!items) return;
      setIsLoading(true);
      try {
        // Filter markets based on actual contract validation status
        const pending = items.filter(
          (m) => !m.validated && !m.invalidated && !m.resolved
        );

        const validated = items.filter((m) => m.validated || m.resolved);

        // Sort by market ID (newer markets have higher IDs)
        pending.sort((a, b) => b.marketId - a.marketId);
        validated.sort((a, b) => b.marketId - a.marketId);

        setPendingMarkets(pending);
        setValidatedMarkets(validated);

        // console.log("📊 Market validation data from contract:", {
        //   total: items.length,
        //   pending: pending.length,
        //   validated: validated.length,
        //   firstFewPending: pending.slice(0, 3).map((p) => ({
        //     id: p.marketId,
        //     question: p.question,
        //     validated: p.validated,
        //     invalidated: p.invalidated,
        //     resolved: p.resolved,
        //   })),
        // });
      } catch (err) {
        console.error("Error mapping contract markets:", err);
        toast({
          title: "Error",
          description: "Failed to load markets from contract.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    mapAndSet(marketsData);
  }, [marketsData, toast]);

  // We no longer fetch details on-chain per-market here; we get all details directly from getMarketInfo

  const handleRefresh = () => {
    refetchCount();
    refetchMarkets();
  };

  const handleValidateMarket = async (marketId: number) => {
    if (!hasValidatorAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to validate markets.",
        variant: "destructive",
      });
      return;
    }

    try {
      await writeContract({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "validateMarket",
        args: [BigInt(marketId)],
      });

      toast({
        title: "Validation Submitted",
        description: "Market validation transaction has been submitted.",
      });
    } catch (error) {
      console.error("Error validating market:", error);
      toast({
        title: "Validation Failed",
        description: "Failed to validate market. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isConnected) {
      refetchCount();
      refetchMarkets();
    }
  }, [isConnected, refetchCount, refetchMarkets]);

  useEffect(() => {
    if (isConfirmed) {
      // Refresh markets after successful validation
      setTimeout(() => handleRefresh(), 2000);
      setSelectedMarket(null);
    }
  }, [isConfirmed]);

  const formatEndTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const hasValidationAccess = hasValidatorAccess || isAdmin || isOwner;

  if (!isConnected) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 md:h-16 md:w-16 mx-auto text-white/20 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Connect Your Wallet
          </h3>
          <p className="text-sm md:text-base text-white/50">
            Please connect your wallet to manage market validation.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasValidationAccess) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-red-400/50 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Access Denied
          </h3>
          <p className="text-sm md:text-base text-white/50">
            You need validator, admin, or owner permissions to manage market
            validation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Market Validation</h2>
          <p className="text-sm text-white/50">
            Review and validate pending markets before they go live
          </p>
        </div>
        <Button
          onClick={() => handleRefresh()}
          disabled={isLoadingCount || isLoadingMarkets}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-white/5 border-white/10 text-white/70 hover:text-white"
        >
          <RefreshCw
            className={`h-3 w-3 ${
              isLoadingCount || isLoadingMarkets ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/50">
                  Pending Validation
                </p>
                <p className="text-xl font-bold text-orange-400">
                  {pendingMarkets.length}
                </p>
                <p className="text-[10px] text-white/30 mt-1">
                  {isLoadingCount || isLoadingMarkets
                    ? "Loading..."
                    : "Active markets"}
                </p>
              </div>
              <Clock className="h-6 w-6 text-orange-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/50">
                  Validated Markets
                </p>
                <p className="text-xl font-bold text-green-400">
                  {validatedMarkets.length}
                </p>
                <p className="text-[10px] text-white/30 mt-1">
                  {isLoadingCount || isLoadingMarkets
                    ? "Loading..."
                    : "Resolved markets"}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/50">
                  Total Markets
                </p>
                <p className="text-xl font-bold text-blue-400">
                  {marketCount || "0"}
                </p>
                <p className="text-[10px] text-white/30 mt-1">
                  {isLoadingCount || isLoadingMarkets
                    ? "Loading..."
                    : "From contract"}
                </p>
              </div>
              <FileText className="h-6 w-6 text-blue-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-4 border-b border-white/5">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-2 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors ${
            activeTab === "pending"
              ? "border-orange-500 text-orange-400"
              : "border-transparent text-white/50 hover:text-white/70"
          }`}
        >
          Pending ({pendingMarkets.length})
        </button>
        <button
          onClick={() => setActiveTab("validated")}
          className={`pb-2 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors ${
            activeTab === "validated"
              ? "border-green-500 text-green-400"
              : "border-transparent text-white/50 hover:text-white/70"
          }`}
        >
          Validated ({validatedMarkets.length})
        </button>
      </div>

      {/* Markets List */}
      <div className="space-y-4">
        {isLoadingCount || isLoadingMarkets ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-white/5 border-white/5">
                <CardContent className="p-6">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-white/10 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <>
                {pendingMarkets.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-400/50 mb-4" />
                      <h3 className="text-base font-medium mb-2 text-white">
                        All Caught Up!
                      </h3>
                      <p className="text-sm text-white/50">
                        No markets are currently pending validation.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                    <div className="space-y-3">
                      {pendingMarkets.map((market) => (
                        <Card
                          key={market.marketId}
                          className="border-orange-500/20 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-orange-400 border-orange-500/30"
                                  >
                                    <Hash className="h-3 w-3 mr-1" />
                                    {market.marketId}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-white/60 border-white/10 bg-white/5"
                                  >
                                    {MARKET_CATEGORIES[market.category]}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-orange-400 border-orange-500/30 bg-orange-500/5"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                </div>
                                <h3 className="font-medium text-base text-white/90 mb-1">
                                  {market.question}
                                </h3>
                                {market.description && (
                                  <p className="text-xs text-white/50 mb-2 line-clamp-2">
                                    {market.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                              <div>
                                <span className="text-white/40 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Creator:
                                </span>
                                <p className="font-mono text-white/70">
                                  {market.creator.slice(0, 6)}...
                                  {market.creator.slice(-4)}
                                </p>
                              </div>
                              <div>
                                <span className="text-white/40 flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  ID:
                                </span>
                                <p className="font-medium text-white/70">
                                  #{market.marketId}
                                </p>
                              </div>
                              <div>
                                <span className="text-white/40">End Date:</span>
                                <p className="font-medium text-white/70">
                                  {formatEndTime(market.endTime)}
                                </p>
                              </div>
                              <div>
                                <span className="text-white/40">Options:</span>
                                <p className="font-medium text-white/70">
                                  {Number(market.optionCount)}
                                </p>
                              </div>
                            </div>

                            {/* Market Info */}
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-white/10 text-white/40"
                                >
                                  {Number(market.optionCount)} options
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-white/10 text-white/40"
                                >
                                  Vol: {Number(market.totalVolume) / 1e18}{" "}
                                  tokens
                                </Badge>
                                {market.disputed && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                  >
                                    Disputed
                                  </Badge>
                                )}
                                {market.earlyResolutionAllowed && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-blue-500/30 text-blue-400"
                                  >
                                    Early Res
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <Separator className="my-3 bg-white/5" />

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleValidateMarket(market.marketId)
                                }
                                disabled={isPending || isConfirming}
                                className="h-8 text-xs flex items-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/30"
                              >
                                {isPending || isConfirming ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                                Validate
                              </Button>

                              <Link href={`/market/${market.marketId}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/5"
                                >
                                  <Eye className="h-3 w-3" />
                                  Preview
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "validated" && (
              <>
                {validatedMarkets.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-8 text-center">
                      <Shield className="h-12 w-12 mx-auto text-white/20 mb-4" />
                      <h3 className="text-base font-medium mb-2 text-white">
                        No Validated Markets
                      </h3>
                      <p className="text-sm text-white/50">
                        No markets have been validated yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                    <div className="space-y-3">
                      {validatedMarkets.map((market) => (
                        <Card
                          key={market.marketId}
                          className="border-green-500/20 bg-white/5"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-white/40 border-white/10"
                                  >
                                    <Hash className="h-3 w-3 mr-1" />
                                    {market.marketId}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-white/40 border-white/10 bg-white/5"
                                  >
                                    {MARKET_CATEGORIES[market.category]}
                                  </Badge>
                                  <Badge className="text-[10px] bg-green-500/20 text-green-300 pointer-events-none hover:bg-green-500/20">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Validated
                                  </Badge>
                                  {market.resolved && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] text-blue-400 border-blue-500/30"
                                    >
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-medium text-base text-white/90 mb-1">
                                  {market.question}
                                </h3>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                              <div>
                                <span className="text-white/40">Creator:</span>
                                <p className="font-mono text-white/70">
                                  {market.creator.slice(0, 6)}...
                                  {market.creator.slice(-4)}
                                </p>
                              </div>
                              <div>
                                <span className="text-white/40">ID:</span>
                                <p className="font-medium text-white/70">
                                  #{market.marketId}
                                </p>
                              </div>
                              <div>
                                <span className="text-white/40">Status:</span>
                                <p className="font-medium text-white/70">
                                  {market.resolved ? "Resolved" : "Active"}
                                </p>
                              </div>
                              <div>
                                <span className="text-white/40">Options:</span>
                                <p className="font-medium text-white/70">
                                  {Number(market.optionCount)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link href={`/market/${market.marketId}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/5"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">Error: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
