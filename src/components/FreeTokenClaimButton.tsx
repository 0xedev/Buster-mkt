"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  type BaseError,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Users, Share } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  PolicastViews,
  PolicastViewsAbi,
  V2contractAbi,
  V2contractAddress,
  publicClient,
} from "@/constants/contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

interface FreeTokenClaimButtonProps {
  marketId: number;
  onClaimComplete?: () => void;
  className?: string;
  /**
   * If true, component will render a disabled placeholder prompting the user to connect
   * instead of returning null when no wallet is connected.
   */
  showWhenDisconnected?: boolean;
  /** Optional pre-derived marketType to avoid an extra read (0=paid,1=free) */
  marketTypeOverride?: number;
}

export function FreeTokenClaimButton({
  marketId,
  onClaimComplete,
  className,
  showWhenDisconnected = true,
  marketTypeOverride,
}: FreeTokenClaimButtonProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";

  const {
    data: hash,
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
  } = (useWriteContract as any)();

  const {
    data: txReceipt,
    isLoading: isConfirming,
    isSuccess: isTxConfirmed,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  const [hasClaimed, setHasClaimed] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [handledHash, setHandledHash] = useState<string | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [showClaimedDetails, setShowClaimedDetails] = useState(false); // Toggle for showing claimed info

  // Check if user has already claimed free tokens
  const { data: claimStatus, refetch: refetchClaimStatus } = (
    useReadContract as any
  )({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "hasUserClaimedFreeTokens",
    args: [BigInt(marketId), address as `0x${string}`],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Parse claim status early so we can use it
  const _claimStatus = claimStatus as [boolean, bigint] | undefined;
  const hasUserClaimed = _claimStatus ? _claimStatus[0] : false;

  // Get user's claim status from main contract (includes both free tokens and winnings)
  const { data: fullClaimStatus } = (useReadContract as any)({
    address: V2contractAddress,
    abi: V2contractAbi,
    functionName: "getUserClaimStatus",
    args: [BigInt(marketId), address as `0x${string}`],
    query: {
      enabled: !!address && hasUserClaimed,
      refetchInterval: 10000,
    },
  });

  // Fetch free market info (expanded tuple per ABI: 6 values)
  // getFreeMarketInfo returns:
  // [0] maxFreeParticipants (uint256)
  // [1] tokensPerParticipant (uint256)
  // [2] currentFreeParticipants (uint256)
  // [3] totalPrizePool (uint256)
  // [4] remainingPrizePool (uint256)
  // [5] isActive (bool)
  const { data: freeMarketInfo } = (useReadContract as any)({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "getFreeMarketInfo",
    args: [BigInt(marketId)],
    query: {
      refetchInterval: 10000,
    },
  });

  // Fetch basic info to reliably determine marketType (avoid brittle indexing of legacy getMarketInfo)
  const skipBasicRead = typeof marketTypeOverride === "number";
  const { data: marketBasic } = (useReadContract as any)(
    skipBasicRead
      ? { enabled: false }
      : {
          address: V2contractAddress,
          abi: V2contractAbi,
          functionName: "getMarketBasicInfo",
          args: [BigInt(marketId)],
          query: {
            refetchInterval: 30000,
          },
        }
  );

  // Parse free market info with new shape
  type FreeMarketInfoTuple =
    | [
        bigint, // maxFreeParticipants
        bigint, // tokensPerParticipant
        bigint, // currentFreeParticipants
        bigint, // totalPrizePool
        bigint, // remainingPrizePool
        boolean // isActive
      ]
    | undefined;
  const _freeMarketInfo = freeMarketInfo as FreeMarketInfoTuple;
  const maxParticipants = _freeMarketInfo ? _freeMarketInfo[0] : 0n;
  const tokensPerParticipant = _freeMarketInfo ? _freeMarketInfo[1] : 0n;
  const currentParticipants = _freeMarketInfo ? _freeMarketInfo[2] : 0n;
  const totalPrizePool = _freeMarketInfo ? _freeMarketInfo[3] : 0n;
  const remainingPrizePool = _freeMarketInfo ? _freeMarketInfo[4] : 0n;
  const freeIsActive = _freeMarketInfo ? _freeMarketInfo[5] : false;
  const slotsRemaining = maxParticipants - currentParticipants;

  // getMarketBasicInfo returns tuple: (question, description, endTime, category, optionCount, resolved, marketType, invalidated, totalVolume)
  const _basic = marketBasic as
    | [string, string, bigint, number, bigint, boolean, number, boolean, bigint]
    | undefined;
  const marketType =
    typeof marketTypeOverride === "number"
      ? marketTypeOverride
      : _basic
      ? _basic[6]
      : undefined;
  const isFreeMarket = marketType === 1;

  const {
    data: marketOptions,
    isLoading: isOptionsLoading,
    error: optionsError,
  } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["free-market-options", marketId],
    enabled: isFreeMarket && Number.isFinite(marketId),
    staleTime: 30000,
    queryFn: async (): Promise<{ id: number; name: string }[]> => {
      const optionCountRaw = await publicClient.readContract({
        address: PolicastViews,
        abi: PolicastViewsAbi,
        functionName: "getMarketOptionCount",
        args: [BigInt(marketId)],
      });
      const optionCount = Number(optionCountRaw);
      if (Number.isNaN(optionCount) || optionCount <= 0) {
        return [];
      }

      const options: { id: number; name: string }[] = [];
      for (let optionIndex = 0; optionIndex < optionCount; optionIndex++) {
        const optionData = await publicClient.readContract({
          address: PolicastViews,
          abi: PolicastViewsAbi,
          functionName: "getMarketOption",
          args: [BigInt(marketId), BigInt(optionIndex)],
        });
        const name = optionData[0] as string;
        const isActive = optionData[3] as boolean;
        if (isActive) {
          options.push({ id: optionIndex, name });
        }
      }

      return options;
    },
  });

  const optionFetchError = (() => {
    if (!optionsError) return null;
    if (optionsError instanceof Error) return optionsError.message;
    return "Unable to load outcomes.";
  })();

  const noActiveOptions = (marketOptions?.length ?? 0) === 0;

  // Debug visibility reasoning
  useEffect(() => {
    console.debug("[FreeTokenClaimButton] state", {
      marketId,
      addressPresent: !!address,
      marketType,
      isFreeMarket,
      hasUserClaimed,
      freeIsActive,
      slotsRemaining: slotsRemaining.toString(),
      maxParticipants: maxParticipants.toString(),
      currentParticipants: currentParticipants.toString(),
      selectedOptionId,
    });
  }, [
    marketId,
    address,
    marketType,
    isFreeMarket,
    hasUserClaimed,
    freeIsActive,
    slotsRemaining,
    maxParticipants,
    currentParticipants,
    selectedOptionId,
  ]);

  useEffect(() => {
    if (!isFreeMarket) {
      setSelectedOptionId(null);
      return;
    }

    if (marketOptions && marketOptions.length > 0 && !selectedOptionId) {
      setSelectedOptionId(String(marketOptions[0].id));
    }
  }, [isFreeMarket, marketOptions, selectedOptionId]);

  const handleShareMarket = async () => {
    try {
      const marketPageUrl = `${appUrl}/market/${marketId}/details`;
      await sdk.actions.composeCast({
        text: `I just claimed free shares on this Policast market! Check it out:`,
        embeds: [marketPageUrl],
      });
    } catch (error) {
      console.error("Failed to share market:", error);
      toast({
        title: "Sharing Failed",
        description: "Could not share to Farcaster. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClaimFreeTokens = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    if (hasUserClaimed) {
      toast({
        title: "Already Claimed",
        description:
          "You have already claimed your free shares for this market.",
        variant: "destructive",
      });
      return;
    }

    if (slotsRemaining <= 0n) {
      toast({
        title: "No Slots Available",
        description: "All free token slots have been claimed for this market.",
        variant: "destructive",
      });
      return;
    }

    if (optionFetchError) {
      toast({
        title: "Outcomes unavailable",
        description: "Unable to load market outcomes. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    if (noActiveOptions) {
      toast({
        title: "No active outcomes",
        description: "This market has no active outcomes to back right now.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOptionId) {
      toast({
        title: "Select an outcome",
        description: "Choose the outcome you'd like your free shares to back.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLastErrorMessage(null);
      await writeContractAsync({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "claimFreeTokens",
        args: [BigInt(marketId), BigInt(selectedOptionId)],
      });
    } catch (error: unknown) {
      console.error("Free token claim error:", error);
      let errorMessage = "An unexpected error occurred.";

      if (error instanceof Error) {
        const baseError = error as BaseError;
        errorMessage = baseError?.shortMessage || error.message;

        // Handle specific contract errors
        if (errorMessage.includes("AlreadyClaimedFree")) {
          errorMessage =
            "You have already claimed free shares for this market.";
        } else if (errorMessage.includes("FreeSlotseFull")) {
          errorMessage = "All free token slots have been claimed.";
        } else if (errorMessage.includes("FreeEntryInactive")) {
          errorMessage = "Free token claiming is not active for this market.";
        } else if (errorMessage.includes("NotFreeMarket")) {
          errorMessage = "This is not a free entry market.";
        }
      }

      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!hash) return;
    if (handledHash === hash) return;

    if (isTxConfirmed && txReceipt) {
      setHandledHash(hash);

      if (txReceipt.status === "success") {
        toast({
          title: "🎉 Free shares Claimed Successfully!",
          description: (
            <div className="flex flex-col gap-2">
              <p>
                You&apos;ve claimed {formatPrice(tokensPerParticipant, 18)} free
                tokens for this market.
              </p>
              <Button
                onClick={handleShareMarket}
                variant="secondary"
                size="sm"
                className="flex items-center justify-center gap-2 w-full mt-1"
              >
                <Share className="h-4 w-4" />
                Share on Farcaster
              </Button>
            </div>
          ),
          duration: 10000, // Extended duration to give time to share
        });
        setHasClaimed(true);
        refetchClaimStatus();
        onClaimComplete?.();
      } else {
        toast({
          title: "Claim Failed",
          description: "Transaction reverted. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [
    hash,
    handledHash,
    isTxConfirmed,
    txReceipt,
    toast,
    onClaimComplete,
    tokensPerParticipant,
    refetchClaimStatus,
  ]);

  useEffect(() => {
    const errorToShow = txError || writeError;
    if (!errorToShow) return;

    const baseMessage =
      (errorToShow as BaseError)?.shortMessage ||
      (errorToShow as Error)?.message ||
      "Transaction failed.";

    if (lastErrorMessage === baseMessage) return;

    let message = baseMessage;
    if (message.toLowerCase().includes("already claimed")) {
      message = "Already claimed free shares for this market.";
      setHasClaimed(true);
    }

    toast({
      title: "Claim Failed",
      description: message,
      variant: "destructive",
    });

    setLastErrorMessage(baseMessage);
  }, [txError, writeError, toast, lastErrorMessage]);

  // Update local state when contract data changes
  useEffect(() => {
    setHasClaimed(hasUserClaimed);
  }, [hasUserClaimed]);

  // Base gating: Only skip entirely if not free market
  if (!isFreeMarket) return null;

  // If disconnected and we want to show placeholder
  if (!address && showWhenDisconnected) {
    return (
      <div
        className={`p-3 border rounded-lg bg-green-50 dark:bg-green-900/10 ${
          className || ""
        }`}
      >
        <div className="flex items-center gap-2 mb-1 text-green-700 dark:text-green-300">
          <Gift className="h-4 w-4" />
          <span className="text-sm font-medium">Free Entry Market</span>
        </div>
        <p className="text-xs text-green-700 dark:text-green-400 mb-2">
          Connect your wallet to claim free tokens.
        </p>
        <Button disabled variant="outline" className="w-full h-8 text-xs">
          Connect wallet to claim
        </Button>
      </div>
    );
  }

  // If still no address and not showing placeholder simply hide
  if (!address) return null;

  // Show "Already Claimed" state instead of hiding completely
  if (hasUserClaimed) {
    return (
      <div className="space-y-3">
        {/* Already Claimed Badge */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Free shares Claimed!
              </span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              ✓ Claimed
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
            <div className="flex justify-between">
              <span>Tokens Received:</span>
              <span className="font-medium">
                {(Number(tokensPerParticipant) / 1e18).toFixed(2)} $POLITICS
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">Successfully claimed</span>
            </div>
          </div>

          {/* Toggle Details Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClaimedDetails(!showClaimedDetails)}
            className="w-full mt-2 h-7 text-xs"
          >
            {showClaimedDetails ? "Hide Details" : "Show Market Details"}
          </Button>
        </div>

        {/* Expanded Details */}
        {showClaimedDetails && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border rounded-lg space-y-2">
            <div className="text-xs space-y-1">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total Prize Pool:</span>
                <span>
                  {(Number(totalPrizePool) / 1e18).toFixed(2)} $POLITICS
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Participants:</span>
                <span>
                  {currentParticipants.toString()} /{" "}
                  {maxParticipants.toString()}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Remaining Pool:</span>
                <span>
                  {(Number(remainingPrizePool) / 1e18).toFixed(2)} $POLITICS
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If market free entry inactive
  if (!freeIsActive) {
    return (
      <div
        className={`p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10 text-xs ${
          className || ""
        }`}
      >
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
          <Gift className="h-4 w-4" />
          Free token claim not active
        </div>
      </div>
    );
  }

  // Don't show if no slots remaining
  if (slotsRemaining <= 0n) {
    return (
      <div
        className={`text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border ${
          className || ""
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
          <Users className="h-4 w-4" />
          <span>All free token slots have been claimed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Free Market Info */}
      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            Free Entry Market
          </span>
        </div>
        <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
          <div className="flex justify-between">
            <span>Free shares per user:</span>
            <span className="font-medium">
              {formatPrice(tokensPerParticipant, 18)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Slots remaining:</span>
            <span className="font-medium">
              {slotsRemaining.toString()}/{maxParticipants.toString()}
            </span>
          </div>
        </div>
      </div>

      {/* Outcome Selector */}
      <div className="space-y-1">
        <span className="text-xs font-semibold text-green-700 dark:text-green-300">
          Choose Option
        </span>
        <Select
          value={selectedOptionId ?? undefined}
          onValueChange={(value) => setSelectedOptionId(value)}
          disabled={isOptionsLoading || noActiveOptions || !!optionFetchError}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue
              placeholder={
                isOptionsLoading
                  ? "Loading outcomes..."
                  : noActiveOptions
                  ? "No active outcomes available"
                  : "Select an outcome"
              }
            />
          </SelectTrigger>
          <SelectContent className="text-sm">
            {marketOptions?.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>
                {option.name || `Outcome ${option.id + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {optionFetchError ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            {optionFetchError}
          </p>
        ) : null}
      </div>

      {/* Claim Button */}
      <Button
        onClick={handleClaimFreeTokens}
        disabled={
          isOptionsLoading ||
          hasUserClaimed ||
          slotsRemaining <= 0n ||
          !selectedOptionId ||
          noActiveOptions ||
          !!optionFetchError ||
          isWritePending ||
          isConfirming
        }
        className={`w-full bg-green-600 hover:bg-green-700 text-white ${
          className || ""
        }`}
      >
        {isWritePending || isConfirming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Claiming...
          </>
        ) : (
          <>
            <Gift className="mr-2 h-4 w-4" />
            Claim {formatPrice(tokensPerParticipant, 18)} Free Market Shares
          </>
        )}
      </Button>
    </div>
  );
}
