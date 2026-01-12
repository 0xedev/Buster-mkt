"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import {
  V2contractAddress,
  V2contractAbi,
  PolicastViews,
  PolicastViewsAbi,
  publicClient,
} from "@/constants/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gavel,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
} from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface MarketInfo {
  marketId: number;
  question: string;
  description: string;
  endTime: bigint;
  category: number;
  optionCount: bigint;
  resolved: boolean;
  disputed: boolean;
  winningOptionId: bigint;
  creator: string;
  options: string[];
  totalShares: bigint[];
  canResolve: boolean;
  earlyResolutionAllowed: boolean;
}

export function MarketResolver() {
  const { isConnected } = useAccount();
  const { hasResolverAccess } = useUserRoles();
  const { toast } = useToast();

  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<MarketInfo | null>(null);
  const [winningOptionId, setWinningOptionId] = useState<string>("");
  const [disputeReason, setDisputeReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<
    "all" | "ready" | "resolved" | "disputed"
  >("all"); // Changed default from "ready" to "all"

  // Get market count from contract
  const { data: marketCount } = useReadContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "getMarketCount",
    query: {
      enabled: isConnected,
    },
  });

  // Markets are loaded directly from the contract
  const {
    data: marketsData,
    isLoading: isLoadingMarkets,
    error: marketsError,
    refetch: refetchMarkets,
  } = useQuery({
    queryKey: ["marketsList", marketCount ? Number(marketCount) : 0],
    queryFn: async () => {
      if (!marketCount) return [];

      //  console.log("Fetching markets from contract...", Number(marketCount)); // Debug log

      const markets = [];
      const count = Number(marketCount);

      // Fetch markets in batches to avoid RPC limits
      for (let i = 0; i < count; i++) {
        try {
          const [
            marketInfo,
            marketStatusEnum,
            earlyResolutionAllowedRaw,
            optionCountRaw,
            totalVolumeRaw,
            winningOptionRaw,
          ] = await Promise.all([
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketInfo",
              args: [BigInt(i)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketStatus",
              args: [BigInt(i)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketEarlyResolutionAllowed",
              args: [BigInt(i)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketOptionCount",
              args: [BigInt(i)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketTotalVolume",
              args: [BigInt(i)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketResolvedOutcome",
              args: [BigInt(i)],
            }),
          ]);

          const question = marketInfo[0] as string;
          const description = marketInfo[1] as string;
          const endTime = Number(marketInfo[2]);
          const category = Number(marketInfo[3]);
          const marketType = Number(marketInfo[4]);
          const resolved = Boolean(marketInfo[5]);
          const invalidated = Boolean(marketInfo[6]);
          const creator = marketInfo[7] as string;

          const optionCount = Number(optionCountRaw);
          const totalVolume = Number(totalVolumeRaw);
          const winningOptionId = BigInt(winningOptionRaw);
          const nowTs = Math.floor(Date.now() / 1000);
          const timeRemaining = Math.max(0, endTime - nowTs);
          const isExpired = timeRemaining === 0;
          const statusEnum = Number(marketStatusEnum);
          const earlyResolutionAllowed = Boolean(earlyResolutionAllowedRaw);

          const isActive = statusEnum === 0 && !invalidated;
          const isResolvedStatus = statusEnum === 1 || resolved;
          const isDisputed = statusEnum === 3;
          const canTrade = isActive && !isExpired;
          const canResolve =
            !resolved &&
            !invalidated &&
            (timeRemaining === 0 ||
              (earlyResolutionAllowed && timeRemaining >= 3600 && !isDisputed));

          const serializedMarketInfo = [
            question,
            description,
            endTime,
            category,
            optionCount,
            resolved,
            resolved,
            marketType,
            invalidated,
            totalVolume,
          ];

          const serializedMarketStatus = [
            isActive,
            isResolvedStatus,
            isExpired,
            canTrade,
            canResolve,
            timeRemaining,
          ];

          markets.push({
            id: i,
            marketInfo: serializedMarketInfo,
            marketStatus: serializedMarketStatus,
            earlyResolutionAllowed,
            creator,
            disputed: isDisputed,
            winningOptionId,
          });
        } catch (error) {
          console.error(`Error fetching market ${i}:`, error);
        }
      }

      //  console.log("Contract response:", markets); // Debug log
      return markets;
    },
    enabled: isConnected && !!marketCount,
    refetchInterval: 30000,
  });

  const { writeContract, data: hash, error, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Map contract markets to local MarketInfo shape
  useEffect(() => {
    const mapMarkets = (items: any[] | undefined) => {
      //  console.log("Mapping markets from contract:", items); // Debug log
      if (!items) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);
        const mapped: MarketInfo[] = items.map((item) => {
          const {
            marketInfo,
            marketStatus,
            earlyResolutionAllowed,
            creator,
            disputed,
            winningOptionId,
          } = item;
          const [
            title,
            description,
            endTime,
            category,
            optionCount,
            resolved,
            resolvedOutcome,
            marketType,
            invalidated,
            totalVolume,
          ] = marketInfo;

          const [
            isActive,
            isResolved,
            isExpired,
            canTrade,
            canResolve,
            timeRemaining,
          ] = marketStatus;

          return {
            marketId: item.id,
            question: title,
            description: description || "",
            endTime: BigInt(endTime),
            category: category,
            optionCount: BigInt(optionCount),
            resolved: Boolean(resolved),
            disputed: Boolean(disputed),
            winningOptionId: winningOptionId ?? 0n,
            creator: creator || "",
            options: [], // Would need additional calls to get option names
            totalShares: Array(optionCount).fill(0n), // optionCount is already a number
            canResolve: Boolean(canResolve),
            earlyResolutionAllowed: Boolean(earlyResolutionAllowed), // Now using actual value
          } as MarketInfo;
        });

        //  console.log("Mapped markets:", mapped); // Debug log
        setMarkets(mapped);
      } catch (err) {
        console.error("Error mapping markets:", err);
      } finally {
        setIsLoading(false);
      }
    };

    mapMarkets((marketsData as any) || undefined);
  }, [marketsData]);

  // Details for a single selected market can be fetched from the contract when needed
  const { data: selectedMarketEntity, refetch: refetchSelectedMarket } =
    useQuery({
      queryKey: ["market", selectedMarket?.marketId ?? null],
      queryFn: async () => {
        if (!selectedMarket) return null;

        try {
          const [
            marketInfo,
            optionCountRaw,
            totalVolumeRaw,
            winningOptionRaw,
            earlyResolution,
          ] = await Promise.all([
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketInfo",
              args: [BigInt(selectedMarket.marketId)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketOptionCount",
              args: [BigInt(selectedMarket.marketId)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketTotalVolume",
              args: [BigInt(selectedMarket.marketId)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketResolvedOutcome",
              args: [BigInt(selectedMarket.marketId)],
            }),
            publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketEarlyResolutionAllowed",
              args: [BigInt(selectedMarket.marketId)],
            }),
          ]);

          const optionCount = Number(optionCountRaw);
          const options = [] as string[];
          for (let i = 0; i < optionCount; i++) {
            const optionData = await publicClient.readContract({
              address: PolicastViews,
              abi: PolicastViewsAbi,
              functionName: "getMarketOption",
              args: [BigInt(selectedMarket.marketId), BigInt(i)],
            });
            options.push(optionData[0]);
          }

          const serializedMarketInfo = [
            marketInfo[0],
            marketInfo[1],
            Number(marketInfo[2]),
            Number(marketInfo[3]),
            optionCount,
            marketInfo[5],
            marketInfo[5],
            Number(marketInfo[4]),
            marketInfo[6],
            Number(totalVolumeRaw),
          ];

          return {
            marketInfo: serializedMarketInfo,
            creator: (marketInfo[7] as string) || "",
            earlyResolution: Boolean(earlyResolution),
            options,
            winningOptionId: BigInt(winningOptionRaw),
          };
        } catch (error) {
          console.error("Error fetching selected market:", error);
          return null;
        }
      },
      enabled: !!selectedMarket,
    });

  useEffect(() => {
    if (!selectedMarketEntity) return;
    // merge details from the contract calls
    setSelectedMarket((prev) => {
      if (!prev) return prev;
      const { marketInfo, creator, earlyResolution, options, winningOptionId } =
        selectedMarketEntity;
      const resolved = Boolean(marketInfo[5]);

      return {
        ...prev,
        creator: creator || prev.creator,
        options: options || prev.options,
        resolved,
        totalShares: Array(options?.length || 0).fill(0n),
        earlyResolutionAllowed: Boolean(earlyResolution),
        winningOptionId:
          typeof winningOptionId === "bigint"
            ? winningOptionId
            : prev.winningOptionId,
      };
    });
  }, [selectedMarketEntity]);

  useEffect(() => {
    // markets are loaded via React Query; no on-chain count/fetch loop required
  }, [isConnected]);

  const handleResolveMarket = async () => {
    if (!selectedMarket || !winningOptionId || !hasResolverAccess) return;

    // Check early resolution constraints
    if (selectedMarket.earlyResolutionAllowed) {
      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(selectedMarket.endTime);
      const timeUntilEnd = endTime - now;
    }

    try {
      await (writeContract as any)({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "resolveMarket",
        args: [BigInt(selectedMarket.marketId), BigInt(winningOptionId)],
      });

      setSelectedMarket(null);
      setWinningOptionId("");
    } catch (error) {
      console.error("Error resolving market:", error);
      toast({
        title: "Error",
        description: "Failed to resolve market.",
        variant: "destructive",
      });
    }
  };

  const handleDisputeMarket = async () => {
    if (!selectedMarket || !disputeReason.trim() || !hasResolverAccess) return;

    try {
      await (writeContract as any)({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "disputeMarket",
        args: [BigInt(selectedMarket.marketId), disputeReason],
      });

      setSelectedMarket(null);
      setDisputeReason("");
    } catch (error) {
      console.error("Error disputing market:", error);
      toast({
        title: "Error",
        description: "Failed to dispute market.",
        variant: "destructive",
      });
    }
  };

  const filteredMarkets = markets.filter((market) => {
    const matchesSearch = market.question
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    switch (filter) {
      case "ready":
        return matchesSearch && market.canResolve;
      case "resolved":
        return matchesSearch && market.resolved && !market.disputed;
      case "disputed":
        return matchesSearch && market.disputed;
      default:
        return matchesSearch;
    }
  });

  const getStatusBadge = (market: MarketInfo) => {
    if (market.disputed) {
      return <Badge variant="destructive">Disputed</Badge>;
    }
    if (market.resolved) {
      return <Badge variant="default">Resolved</Badge>;
    }
    if (market.canResolve) {
      return <Badge variant="secondary">Ready to Resolve</Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  if (!isConnected) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardContent className="p-6 text-center">
          <Gavel className="h-16 w-16 mx-auto text-white/60 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">
            Connect Your Wallet
          </h3>
          <p className="text-white/80">
            Please connect your wallet to access market resolution functions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasResolverAccess) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-300 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">Access Denied</h3>
          <p className="text-white/80">
            You don&apos;t have permission to resolve markets. Only admins and
            users with resolver role can resolve markets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isConfirmed) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-300 mb-4" />
          <h3 className="text-lg font-medium mb-2 text-white">
            Action Completed Successfully!
          </h3>
          <p className="text-white/80 mb-4">The market has been updated.</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Gavel className="h-5 w-5" />
            Market Resolution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-white/80">
                Search Markets
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by question..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>
            </div>

            <div className="md:w-48">
              <Label htmlFor="filter" className="text-white/80">
                Filter by Status
              </Label>
              <Select
                value={filter}
                onValueChange={(value: any) => setFilter(value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  <SelectItem value="ready">Ready to Resolve</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Markets List */}
          {marketsError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-300 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">
                Error Loading Markets
              </h3>
              <p className="text-white/80 mb-4">
                Failed to load markets from contract: {marketsError.message}
              </p>
              <Button
                onClick={() => refetchMarkets()}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                Retry
              </Button>
            </div>
          ) : isLoading || isLoadingMarkets ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-white/60 mb-2" />
                <p className="text-white/80">Loading markets...</p>
              </div>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border border-white/20 rounded-lg p-4 animate-pulse bg-white/5"
                >
                  <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-white/20 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 mx-auto text-white/60 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">
                No Markets Found
              </h3>
              <p className="text-white/80 mb-4">
                No markets match your current filter criteria.
                {filter === "ready" &&
                  " Try changing the filter to 'All Markets' to see all available markets."}
              </p>
              <div className="text-xs text-white/60 mt-4">
                <p>Debug info:</p>
                <p>Total markets loaded: {markets.length}</p>
                <p>Current filter: {filter}</p>
                <p>Search term: &ldquo;{searchTerm}&ldquo;</p>
                <p>Connected: {isConnected ? "Yes" : "No"}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMarkets.map((market) => (
                <Card key={market.marketId} className="border-0 bg-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link href={`/market/${market.marketId}`}>
                          <h3 className="font-medium text-lg text-white hover:text-white/80 transition-colors line-clamp-2">
                            {market.question}
                          </h3>
                        </Link>
                        <p className="text-sm text-white/70 mt-1 line-clamp-2">
                          {market.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {getStatusBadge(market)}
                        {market.earlyResolutionAllowed && !market.resolved && (
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-200"
                          >
                            Er
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-white/60">Market ID:</span>
                        <p className="font-medium text-white">
                          #{market.marketId}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/60">End Date:</span>
                        <p className="font-medium text-white">
                          {formatDate(market.endTime)}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/60">Options:</span>
                        <p className="font-medium text-white">
                          {Number(market.optionCount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-white/60">
                          Total Participants:
                        </span>
                        <p className="font-medium text-white">
                          {market.totalShares.reduce(
                            (sum, shares) => sum + Number(formatPrice(shares)),
                            0
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Options Display */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 text-white">
                        Options:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {market.options.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white/10 rounded border border-white/20"
                          >
                            <span className="text-sm text-white">{option}</span>
                            <div className="text-xs text-white/70">
                              {formatPrice(market.totalShares[index])} shares
                              {market.resolved &&
                                Number(market.winningOptionId) === index && (
                                  <CheckCircle className="inline h-3 w-3 ml-1 text-green-300" />
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {(market.canResolve || market.earlyResolutionAllowed) &&
                        !market.resolved &&
                        !market.disputed && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedMarket(market)}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white"
                          >
                            <Gavel className="h-4 w-4" />
                            {market.earlyResolutionAllowed &&
                            Number(market.endTime) * 1000 > Date.now()
                              ? "Early Resolve"
                              : "Resolve Market"}
                          </Button>
                        )}

                      {market.resolved && !market.disputed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMarket(market)}
                          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Dispute Resolution
                        </Button>
                      )}

                      <Link href={`/market/${market.marketId}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/10"
                        >
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution Modal */}
      {selectedMarket && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#433952] to-[#544863]">
          <CardHeader>
            <CardTitle className="text-white">
              {selectedMarket.resolved ? "Dispute Market" : "Resolve Market"} #
              {selectedMarket.marketId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white/10 rounded-lg border border-white/20">
              <h3 className="font-medium mb-2 text-white">
                {selectedMarket.question}
              </h3>
              <p className="text-sm text-white/80">
                {selectedMarket.description}
              </p>
            </div>

            {!selectedMarket.resolved ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="winningOption" className="text-white/80">
                    Select Winning Option *
                  </Label>
                  <Select
                    value={winningOptionId}
                    onValueChange={setWinningOptionId}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Choose the winning option" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMarket.options.map((option, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {option} (
                          {formatPrice(selectedMarket.totalShares[index])}{" "}
                          shares)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleResolveMarket}
                    disabled={!winningOptionId || isPending || isConfirming}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white"
                  >
                    {isPending || isConfirming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gavel className="h-4 w-4" />
                    )}
                    Resolve Market
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMarket(null)}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="disputeReason" className="text-white/80">
                    Dispute Reason *
                  </Label>
                  <Textarea
                    id="disputeReason"
                    placeholder="Explain why this resolution should be disputed..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDisputeMarket}
                    disabled={
                      !disputeReason.trim() || isPending || isConfirming
                    }
                    className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white"
                  >
                    {isPending || isConfirming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    Submit Dispute
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMarket(null)}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-900/30 border border-red-400/30 rounded-lg">
                <p className="text-red-200 text-sm">Error: {error.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
