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
      return (
        <Badge
          variant="outline"
          className="text-[10px] md:text-xs text-red-300 border-red-500/50 bg-red-500/10 font-normal px-2 py-0.5"
        >
          Disputed
        </Badge>
      );
    }
    if (market.resolved) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] md:text-xs text-green-300 border-green-500/50 bg-green-500/10 font-normal px-2 py-0.5"
        >
          Resolved
        </Badge>
      );
    }
    if (market.canResolve) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] md:text-xs text-blue-300 border-blue-500/50 bg-blue-500/10 font-normal px-2 py-0.5"
        >
          Ready
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-[10px] md:text-xs text-white/60 border-white/20 bg-white/5 font-normal px-2 py-0.5"
      >
        Active
      </Badge>
    );
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  if (!isConnected) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <Gavel className="h-12 w-12 md:h-16 md:w-16 mx-auto text-white/20 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Connect Your Wallet
          </h3>
          <p className="text-sm md:text-base text-white/50">
            Please connect your wallet to access market resolution functions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasResolverAccess) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-red-400/50 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Access Denied
          </h3>
          <p className="text-sm md:text-base text-white/50">
            You don&apos;t have permission to resolve markets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isConfirmed) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-green-400/50 mb-3 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium mb-2 text-white/90">
            Success!
          </h3>
          <p className="text-sm md:text-base text-white/50 mb-4">
            The market has been updated.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs md:text-sm px-4"
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-white font-medium">
            <Gavel className="h-4 w-4 md:h-5 md:w-5" />
            Market Resolution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-2 md:pt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search" className="text-xs text-white/60">
                Search Markets
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-3.5 w-3.5" />
                <Input
                  id="search"
                  placeholder="Search by question..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm focus:border-white/20 focus:ring-0"
                />
              </div>
            </div>

            <div className="md:w-48 space-y-1.5">
              <Label htmlFor="filter" className="text-xs text-white/60">
                Filter by Status
              </Label>
              <Select
                value={filter}
                onValueChange={(value: any) => setFilter(value)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2435] border-white/10 text-white">
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
            <div className="text-center py-6 md:py-8 border border-white/5 rounded-lg bg-white/5">
              <AlertTriangle className="h-8 w-8 md:h-12 md:w-12 mx-auto text-red-400/50 mb-2" />
              <h3 className="text-sm md:text-base font-medium mb-1 text-white">
                Error Loading Markets
              </h3>
              <p className="text-xs text-white/40 mb-3">
                {marketsError.message}
              </p>
              <Button
                size="sm"
                onClick={() => refetchMarkets()}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs"
              >
                Retry
              </Button>
            </div>
          ) : isLoading || isLoadingMarkets ? (
            <div className="space-y-3">
              <div className="text-center py-4">
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-white/40 mb-2" />
                <p className="text-xs text-white/40">Loading markets...</p>
              </div>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="text-center py-8 border border-white/5 rounded-lg bg-white/5">
              <Clock className="h-8 w-8 md:h-12 md:w-12 mx-auto text-white/20 mb-3" />
              <h3 className="text-sm md:text-base font-medium mb-1 text-white">
                No Markets Found
              </h3>
              <p className="text-xs text-white/40">
                No markets match your criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMarkets.map((market) => (
                <div
                  key={market.marketId}
                  className="group border border-white/10 bg-white/5 rounded-lg p-3 md:p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-4">
                      <Link href={`/market/${market.marketId}`}>
                        <h3 className="font-medium text-sm md:text-base text-white/90 group-hover:text-white transition-colors line-clamp-1">
                          {market.question}
                        </h3>
                      </Link>
                      <p className="text-xs text-white/50 mt-1 line-clamp-1">
                        {market.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(market)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-xs text-white/40">
                      ID:{" "}
                      <span className="text-white/70">#{market.marketId}</span>
                    </div>
                    <div className="text-xs text-white/40">
                      Ends:{" "}
                      <span className="text-white/70">
                        {formatDate(market.endTime)}
                      </span>
                    </div>
                  </div>

                  {/* Options List */}
                  {market.options.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {market.options.slice(0, 2).map((opt, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs px-2 py-1 bg-white/5 rounded"
                        >
                          <span className="text-white/70">{opt}</span>
                        </div>
                      ))}
                      {market.options.length > 2 && (
                        <div className="text-[10px] text-white/40 px-2">
                          +{market.options.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    {(market.canResolve || market.earlyResolutionAllowed) &&
                      !market.resolved &&
                      !market.disputed && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedMarket(market)}
                          className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        >
                          <Gavel className="h-3 w-3 mr-1.5" />
                          Resolve
                        </Button>
                      )}

                    {market.resolved && !market.disputed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMarket(market)}
                        className="h-7 text-xs text-white/70 border-white/10 hover:bg-white/10"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1.5" />
                        Dispute
                      </Button>
                    )}

                    <Link
                      href={`/market/${market.marketId}`}
                      className="ml-auto"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-white/50 hover:text-white hover:bg-white/5"
                      >
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution Modal */}
      {selectedMarket && (
        <Card className="border-white/10 bg-white/5 backdrop-blur-md sticky bottom-4 shadow-xl z-20">
          <CardHeader className="p-4 border-b border-white/10">
            <CardTitle className="text-base font-medium text-white flex justify-between items-center">
              <span>
                {selectedMarket.resolved ? "Dispute Market" : "Resolve Market"}{" "}
                #{selectedMarket.marketId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMarket(null)}
                className="h-6 w-6 p-0 hover:bg-white/10"
              >
                <span className="sr-only">Close</span>×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 bg-white/5 rounded border border-white/10">
              <h3 className="text-sm font-medium text-white/90 mb-1">
                {selectedMarket.question}
              </h3>
            </div>

            {!selectedMarket.resolved ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">
                    Winning Option
                  </Label>
                  <Select
                    value={winningOptionId}
                    onValueChange={setWinningOptionId}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                      <SelectValue placeholder="Select outcome..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2435] border-white/10 text-white">
                      {selectedMarket.options.map((option, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleResolveMarket}
                  disabled={!winningOptionId || isPending || isConfirming}
                  className="w-full h-9 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border border-blue-500/30"
                >
                  {isPending || isConfirming ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <Gavel className="h-3 w-3 mr-2" />
                  )}
                  Confirm Resolution
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/60">
                    Dispute Reason
                  </Label>
                  <Textarea
                    placeholder="Provide details..."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={2}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                  />
                </div>

                <Button
                  onClick={handleDisputeMarket}
                  disabled={!disputeReason.trim() || isPending || isConfirming}
                  className="w-full h-9 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-100 border border-red-500/30"
                >
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Submit Dispute
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
