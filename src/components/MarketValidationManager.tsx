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
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600">
            Please connect your wallet to manage market validation.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasValidationAccess) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Access Denied</h3>
          <p className="text-gray-600">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Market Validation
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Review and validate pending markets before they go live
          </p>
        </div>
        <Button
          onClick={() => handleRefresh()}
          disabled={isLoadingCount || isLoadingMarkets}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isLoadingCount || isLoadingMarkets ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Validation
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {pendingMarkets.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingCount || isLoadingMarkets
                    ? "Loading..."
                    : "Active markets"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Validated Markets
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {validatedMarkets.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingCount || isLoadingMarkets
                    ? "Loading..."
                    : "Resolved markets"}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Markets
                </p>
                <p className="text-2xl font-bold">{marketCount || "0"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingCount || isLoadingMarkets
                    ? "Loading..."
                    : "From contract"}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-4 border-b">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "pending"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Pending Validation ({pendingMarkets.length})
        </button>
        <button
          onClick={() => setActiveTab("validated")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === "validated"
              ? "border-green-500 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Validated Markets ({validatedMarkets.length})
        </button>
      </div>

      {/* Markets List */}
      <div className="space-y-4">
        {isLoadingCount || isLoadingMarkets ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <>
                {pendingMarkets.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        All Caught Up!
                      </h3>
                      <p className="text-gray-600">
                        No markets are currently pending validation.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[600px] overflow-y-auto">
                    <div className="space-y-4 pr-4">
                      {pendingMarkets.map((market) => (
                        <Card
                          key={market.marketId}
                          className="border-orange-200"
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="text-orange-600 border-orange-600"
                                  >
                                    <Hash className="h-3 w-3 mr-1" />
                                    {market.marketId}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {MARKET_CATEGORIES[market.category]}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-orange-600"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                </div>
                                <h3 className="font-semibold text-lg mb-2">
                                  {market.question}
                                </h3>
                                {market.description && (
                                  <p className="text-gray-600 mb-3 line-clamp-2">
                                    {market.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-gray-500 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Creator:
                                </span>
                                <p className="font-mono text-xs">
                                  {market.creator.slice(0, 6)}...
                                  {market.creator.slice(-4)}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  Market ID:
                                </span>
                                <p className="font-medium">
                                  #{market.marketId}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">End Date:</span>
                                <p className="font-medium">
                                  {formatEndTime(market.endTime)}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Options:</span>
                                <p className="font-medium">
                                  {Number(market.optionCount)}
                                </p>
                              </div>
                            </div>

                            {/* Market Info */}
                            <div className="mb-4">
                              <p className="text-sm text-gray-500 mb-2">
                                Market Details:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {Number(market.optionCount)} options
                                </Badge>
                                <Badge variant="outline">
                                  Volume: {Number(market.totalVolume) / 1e18}{" "}
                                  tokens
                                </Badge>
                                {market.disputed && (
                                  <Badge variant="destructive">Disputed</Badge>
                                )}
                                {market.earlyResolutionAllowed && (
                                  <Badge variant="outline">
                                    Early Resolution
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() =>
                                  handleValidateMarket(market.marketId)
                                }
                                disabled={isPending || isConfirming}
                                className="flex items-center gap-2"
                              >
                                {isPending || isConfirming ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Validate Market
                              </Button>

                              <Link href={`/market/${market.marketId}`}>
                                <Button
                                  variant="outline"
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
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
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        No Validated Markets
                      </h3>
                      <p className="text-gray-600">
                        No markets have been validated yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[600px] overflow-y-auto">
                    <div className="space-y-4 pr-4">
                      {validatedMarkets.map((market) => (
                        <Card
                          key={market.marketId}
                          className="border-green-200"
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">
                                    <Hash className="h-3 w-3 mr-1" />
                                    {market.marketId}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {MARKET_CATEGORIES[market.category]}
                                  </Badge>
                                  <Badge className="bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Validated
                                  </Badge>
                                  {market.resolved && (
                                    <Badge
                                      variant="outline"
                                      className="text-blue-600"
                                    >
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-semibold text-lg mb-2">
                                  {market.question}
                                </h3>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-gray-500">Creator:</span>
                                <p className="font-mono text-xs">
                                  {market.creator.slice(0, 6)}...
                                  {market.creator.slice(-4)}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Market ID:
                                </span>
                                <p className="font-medium">
                                  #{market.marketId}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <p className="font-medium">
                                  {market.resolved ? "Resolved" : "Active"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Options:</span>
                                <p className="font-medium">
                                  {Number(market.optionCount)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link href={`/market/${market.marketId}`}>
                                <Button
                                  variant="outline"
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Market
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">Error: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
