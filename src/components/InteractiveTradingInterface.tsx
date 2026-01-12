"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MarketOption, MarketV2 } from "@/types/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Check } from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSendCalls,
  useWaitForCallsStatus,
} from "wagmi";
import {
  V2contractAddress,
  V2contractAbi,
  tokenAddress,
  tokenAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { encodeFunctionData } from "viem";
import { useToast } from "@/components/ui/use-toast";

const MAX_SHARES = 10000;

// Helper functions
function sharesToWei(amount: string): bigint {
  if (!amount) return 0n;
  const parts = amount.split(".");
  const integer = parts[0] || "0";
  const fraction = (parts[1] || "").padEnd(18, "0").slice(0, 18);
  return BigInt(integer + fraction);
}

function formatPrice(amount: bigint, decimals = 18): string {
  const negative = amount < 0n;
  const x = negative ? -amount : amount;
  const s = x.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals);
  const fracRaw = s.slice(-decimals);
  // Limit to 2 decimal places, remove trailing zeros
  const frac = fracRaw.slice(0, 2).replace(/0+$/, "");
  return `${negative ? "-" : ""}${frac ? `${int}.${frac}` : int}`;
}

// Color palette for options
const optionColors = [
  { bg: "bg-blue-400", border: "border-blue-400", ring: "ring-blue-400" },
  { bg: "bg-green-400", border: "border-green-400", ring: "ring-green-400" },
  { bg: "bg-purple-400", border: "border-purple-400", ring: "ring-purple-400" },
  { bg: "bg-orange-400", border: "border-orange-400", ring: "ring-orange-400" },
  { bg: "bg-red-400", border: "border-red-400", ring: "ring-red-400" },
  { bg: "bg-teal-400", border: "border-teal-400", ring: "ring-teal-400" },
  { bg: "bg-pink-400", border: "border-pink-400", ring: "ring-pink-400" },
  { bg: "bg-indigo-400", border: "border-indigo-400", ring: "ring-indigo-400" },
  { bg: "bg-yellow-400", border: "border-yellow-400", ring: "ring-yellow-400" },
  { bg: "bg-gray-400", border: "border-gray-400", ring: "ring-gray-400" },
];

interface InteractiveTradingInterfaceProps {
  marketId: number;
  market: MarketV2;
  options: MarketOption[];
  probabilities: number[];
  totalVolume: bigint;
  userShares?: readonly bigint[];
  onTradeComplete?: () => void;
}

type BuyingStep = "initial" | "amount" | "allowance" | "confirm" | "success";

export function InteractiveTradingInterface({
  marketId,
  options,
  probabilities,
  totalVolume,
  userShares,
  onTradeComplete,
}: InteractiveTradingInterfaceProps) {
  const { address: accountAddress, connector } = useAccount();
  const { data: hash, writeContractAsync } = useWriteContract();
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash });
  const { toast } = useToast();

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [buyingStep, setBuyingStep] = useState<BuyingStep>("initial");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedHash, setLastProcessedHash] = useState<string | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const processedStatusRef = useRef<Set<string>>(new Set());

  // Token information
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "symbol",
  });

  const { data: tokenDecimals } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "decimals",
  });

  const { data: userBalance } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [accountAddress as `0x${string}`],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 5000,
    },
  });

  const { data: userAllowance } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "allowance",
    args: [accountAddress as `0x${string}`, V2contractAddress],
    query: {
      enabled: !!accountAddress,
      refetchInterval: 5000,
    },
  });

  // Get quote for selected option
  const sharesInWei = useMemo(() => sharesToWei(amount), [amount]);
  const quoteBuyArgs = useMemo(
    () =>
      selectedOptionId !== null
        ? ([BigInt(marketId), BigInt(selectedOptionId), sharesInWei] as const)
        : undefined,
    [marketId, selectedOptionId, sharesInWei]
  );

  const { data: buyQuote } = useReadContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "quoteBuy",
    args: quoteBuyArgs,
    query: {
      enabled: selectedOptionId !== null && sharesInWei > 0n,
      refetchInterval: 2000,
    },
  });

  const estimatedCost = useMemo(() => {
    if (!buyQuote) return 0n;
    const [, , totalCost] = buyQuote as readonly [
      bigint,
      bigint,
      bigint,
      bigint
    ];
    return totalCost;
  }, [buyQuote]);

  // Check if wallet supports batch transactions
  const supportsBatchTransactions =
    !!connector &&
    !connector?.name?.includes("Ledger") &&
    !connector?.id?.includes("ledger");

  // Batch calls
  const { sendCalls, data: callsData } = useSendCalls({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Transaction Submitted",
          description: "Processing your purchase...",
        });
      },
      onError: (err) => {
        console.error("Batch transaction failed:", err);
        handleSequentialPurchase();
      },
    },
  });

  const { data: callsStatusData } = useWaitForCallsStatus({
    id:
      callsData && typeof callsData === "object" && "id" in callsData
        ? (callsData.id as `0x${string}`)
        : undefined,
    query: {
      enabled: !!(
        callsData &&
        typeof callsData === "object" &&
        "id" in callsData
      ),
      refetchInterval: 1000,
    },
  });

  const calculateMaxPrice = useCallback((currentPrice: bigint): bigint => {
    return (currentPrice * 110n) / 100n; // 10% slippage
  }, []);

  const resetInterface = useCallback(() => {
    setSelectedOptionId(null);
    setAmount("");
    setBuyingStep("initial");
    setIsProcessing(false);
    setError(null);
  }, []);

  const dispatchMarketUpdate = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("market-updated", {
        detail: { marketId },
      })
    );
  }, [marketId]);

  const handleSequentialPurchase = useCallback(async () => {
    if (
      !accountAddress ||
      selectedOptionId === null ||
      !amount ||
      !tokenDecimals
    )
      return;

    try {
      setIsProcessing(true);
      const amountInUnits = sharesToWei(amount);
      const requiredBalance = estimatedCost;
      const needsApproval = requiredBalance > (userAllowance || 0n);

      if (needsApproval) {
        setBuyingStep("allowance");
        await writeContractAsync({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "approve",
          args: [V2contractAddress, requiredBalance],
        });
      }

      setBuyingStep("confirm");
      const avgPricePerShare = estimatedCost
        ? (estimatedCost * BigInt(1e18)) / amountInUnits
        : options[selectedOptionId].currentPrice;
      const maxPricePerShare = calculateMaxPrice(avgPricePerShare);
      const maxTotalCost = requiredBalance
        ? (requiredBalance * 102n) / 100n
        : requiredBalance;

      await writeContractAsync({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "buyShares",
        args: [
          BigInt(marketId),
          BigInt(selectedOptionId),
          amountInUnits,
          maxPricePerShare,
          maxTotalCost,
        ],
      });
    } catch (error: unknown) {
      console.error("Sequential purchase failed:", error);
      let errorMessage = "Transaction failed. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
        }
      }
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setBuyingStep("initial");
    } finally {
      setIsProcessing(false);
    }
  }, [
    accountAddress,
    selectedOptionId,
    amount,
    tokenDecimals,
    estimatedCost,
    userAllowance,
    options,
    calculateMaxPrice,
    marketId,
    writeContractAsync,
    toast,
  ]);

  const handleBatchPurchase = useCallback(async () => {
    if (
      !accountAddress ||
      selectedOptionId === null ||
      !amount ||
      !tokenDecimals
    )
      return;

    try {
      setIsProcessing(true);
      const amountInUnits = sharesToWei(amount);
      const requiredBalance = estimatedCost;
      const avgPricePerShare = estimatedCost
        ? (estimatedCost * BigInt(1e18)) / amountInUnits
        : options[selectedOptionId].currentPrice;
      const maxPricePerShare = calculateMaxPrice(avgPricePerShare);

      const batchCalls = [
        {
          to: tokenAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: tokenAbi,
            functionName: "approve",
            args: [V2contractAddress, requiredBalance],
          }),
        },
        {
          to: V2contractAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: V2contractAbi,
            functionName: "buyShares",
            args: [
              BigInt(marketId),
              BigInt(selectedOptionId),
              amountInUnits,
              maxPricePerShare,
              requiredBalance,
            ],
          }),
        },
      ];

      await sendCalls({ calls: batchCalls });
    } catch (err) {
      console.error("Batch purchase failed:", err);
      handleSequentialPurchase();
    } finally {
      setIsProcessing(false);
    }
  }, [
    accountAddress,
    selectedOptionId,
    amount,
    tokenDecimals,
    estimatedCost,
    options,
    calculateMaxPrice,
    marketId,
    sendCalls,
    handleSequentialPurchase,
  ]);

  const handleConfirmPurchase = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    processedStatusRef.current.clear();

    if (parseFloat(amount) > MAX_SHARES) {
      setError(`Maximum ${MAX_SHARES} shares per purchase`);
      return;
    }

    if (!userBalance || !tokenDecimals) {
      setError("Unable to fetch balance");
      return;
    }

    if (estimatedCost && estimatedCost > userBalance) {
      setError(
        `Insufficient balance. Need: ${formatPrice(
          estimatedCost,
          tokenDecimals
        )} ${tokenSymbol}`
      );
      return;
    }

    setBuyingStep("confirm");

    if (supportsBatchTransactions) {
      handleBatchPurchase();
    } else {
      handleSequentialPurchase();
    }
  }, [
    amount,
    userBalance,
    tokenDecimals,
    estimatedCost,
    tokenSymbol,
    supportsBatchTransactions,
    handleBatchPurchase,
    handleSequentialPurchase,
  ]);

  // Monitor batch status
  useEffect(() => {
    if (!callsStatusData) return;

    const stringifyWithBigInt = (value: unknown) =>
      JSON.stringify(value, (_, nestedValue) =>
        typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue
      );

    const statusKey = (() => {
      const receiptsKey = stringifyWithBigInt(callsStatusData.receipts ?? []);
      const statusLabel = callsStatusData.status ?? "unknown";
      const base = `${statusLabel}-${receiptsKey}`;
      if (callsData && typeof callsData === "object" && "id" in callsData) {
        return `${String(callsData.id)}-${base}`;
      }
      return base;
    })();

    if (processedStatusRef.current.has(statusKey)) {
      return;
    }

    processedStatusRef.current.add(statusKey);

    const successStatuses = new Set([
      "success",
      "completed",
      "complete",
      "confirmed",
      "finalized",
    ]);

    const statusValue = callsStatusData.status ?? "";

    if (successStatuses.has(statusValue)) {
      setBuyingStep("success");
      toast({
        title: "Purchase Successful!",
        description: `Bought shares in ${options[selectedOptionId || 0]?.name}`,
      });
      setAmount("");
      setIsProcessing(false);
      dispatchMarketUpdate();
      onTradeComplete?.();
      return;
    }

    if (statusValue === "failure") {
      toast({
        title: "Purchase Failed",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
      setBuyingStep("initial");
      setIsProcessing(false);
    }
  }, [
    callsStatusData,
    callsData,
    options,
    selectedOptionId,
    toast,
    dispatchMarketUpdate,
    onTradeComplete,
  ]);

  // Monitor regular transactions
  useEffect(() => {
    if (isTxConfirmed && hash && hash !== lastProcessedHash) {
      setLastProcessedHash(hash);
      if (buyingStep === "allowance") {
        setBuyingStep("confirm");
        // Continue with purchase after approval
      } else {
        setBuyingStep("success");
        toast({
          title: "Purchase Successful!",
          description: `Bought shares in ${options[selectedOptionId!]?.name}`,
        });
        setAmount("");
        setIsProcessing(false);
        dispatchMarketUpdate();
        onTradeComplete?.();
      }
    }
  }, [
    isTxConfirmed,
    hash,
    lastProcessedHash,
    buyingStep,
    options,
    selectedOptionId,
    toast,
    dispatchMarketUpdate,
    onTradeComplete,
  ]);

  // Focus input when entering amount step
  useEffect(() => {
    if (buyingStep === "amount" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [buyingStep]);

  // Normalize probabilities
  const totalProbability = probabilities.reduce((sum, prob) => sum + prob, 0);
  const normalizationFactor = totalProbability > 0 ? 100 / totalProbability : 0;

  //   if (!isConnected) {
  //     return (
  //       <div className="text-center py-6 bg-[#352c3f]/80 backdrop-blur-sm rounded-lg border border-[#544863]">
  //         <p className="text-gray-300 text-sm">Connect your wallet to trade</p>
  //       </div>
  //     );
  //   }

  return (
    <div className="space-y-3">
      {/* Interactive Option Cards */}
      <div className="space-y-2">
        {options.map((option, index) => {
          const probability = probabilities[index] || 0;
          const normalizedProbability = probability * normalizationFactor;
          const displayOdds =
            normalizedProbability > 0 ? 100 / normalizedProbability : 0;
          const isSelected = selectedOptionId === index;
          const colorScheme = optionColors[index] || optionColors[0];
          const hasShares = userShares && userShares[index] > 0n;

          return (
            <div key={index}>
              <button
                onClick={() => {
                  if (buyingStep === "initial" || buyingStep === "success") {
                    setSelectedOptionId(index);
                    setBuyingStep("amount");
                    setError(null);
                  }
                }}
                disabled={
                  buyingStep === "confirm" || buyingStep === "allowance"
                }
                className={cn(
                  "w-full text-left transition-all duration-200 rounded-lg overflow-hidden",
                  "focus:outline-none focus:ring-2",
                  isSelected
                    ? `ring-2 ${colorScheme.ring}`
                    : "hover:bg-[#544863]/30",
                  buyingStep === "confirm" || buyingStep === "allowance"
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                )}
              >
                <div className="bg-[#352c3f]/80 backdrop-blur-sm border border-[#544863] rounded-lg p-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full flex-shrink-0",
                          colorScheme.bg
                        )}
                      />
                      <p className="text-sm font-medium text-gray-100 truncate">
                        {option.name}
                      </p>
                      {isSelected && (
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      )}
                      {hasShares && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-400/30 flex-shrink-0">
                          {formatPrice(userShares[index])} owned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-100">
                        {normalizedProbability.toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        {displayOdds.toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#544863]/30 rounded-full h-2 mb-2 overflow-hidden border border-[#544863]">
                    <div
                      className={cn(
                        colorScheme.bg,
                        "h-full transition-all duration-300"
                      )}
                      style={{ width: `${normalizedProbability}%` }}
                    />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {formatPrice(option.currentPrice * 100n)}% • Vol:{" "}
                      {formatPrice(option.totalVolume)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded Buy Interface */}
              {isSelected && buyingStep !== "initial" && (
                <div className="mt-2 p-3 bg-[#433952]/50 backdrop-blur-sm rounded-lg border border-[#544863] space-y-3">
                  {buyingStep === "amount" && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Number of shares
                        </label>
                        <Input
                          ref={inputRef}
                          type="number"
                          inputMode="decimal"
                          placeholder={`Enter amount (max ${MAX_SHARES})`}
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              setAmount("");
                              setError(null);
                              return;
                            }
                            const numValue = parseFloat(value);
                            if (numValue > MAX_SHARES) {
                              setError(
                                `Maximum ${MAX_SHARES} shares per purchase`
                              );
                            } else {
                              setError(null);
                            }
                            setAmount(value);
                          }}
                          className="w-full h-9 text-sm bg-[#352c3f]/80 border-[#544863] text-gray-100"
                          style={{ fontSize: "16px" }}
                        />
                      </div>

                      {userBalance && tokenDecimals && (
                        <div className="bg-purple-500/20 backdrop-blur-sm rounded-md p-2 space-y-1 border border-purple-400/30">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">Your balance:</span>
                            <span className="font-medium text-gray-100">
                              {formatPrice(userBalance, tokenDecimals)}{" "}
                              {tokenSymbol}
                            </span>
                          </div>
                          {estimatedCost &&
                            amount &&
                            parseFloat(amount) > 0 && (
                              <div className="flex justify-between text-xs font-semibold border-t border-purple-400/30 pt-1">
                                <span className="text-gray-200">
                                  Total Cost:
                                </span>
                                <span className="text-gray-100">
                                  {formatPrice(estimatedCost)} {tokenSymbol}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {error && (
                        <div className="bg-red-500/20 border border-red-400/30 rounded-md p-2">
                          <p className="text-xs text-red-300">{error}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setBuyingStep("initial");
                            setSelectedOptionId(null);
                            setAmount("");
                            setError(null);
                          }}
                          variant="outline"
                          className="flex-1 h-9 text-xs border-[#544863] text-gray-300 hover:bg-[#544863]/50"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleConfirmPurchase}
                          disabled={
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            parseFloat(amount) > MAX_SHARES ||
                            !!error ||
                            isProcessing
                          }
                          className="flex-1 h-9 text-xs font-medium"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Processing...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {(buyingStep === "allowance" || buyingStep === "confirm") && (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-400 mb-2" />
                      <p className="text-sm font-medium text-gray-200">
                        {buyingStep === "allowance"
                          ? "Approving tokens..."
                          : "Processing purchase..."}
                      </p>
                      <p className="text-xs text-gray-300 mt-1">
                        {amount} shares
                      </p>
                    </div>
                  )}

                  {buyingStep === "success" && (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-400/30">
                        <Check className="w-6 h-6 text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-green-300 mb-3">
                        Purchase successful!
                      </p>
                      <Button
                        onClick={resetInterface}
                        className="w-full h-9 text-xs"
                        variant="default"
                      >
                        Buy More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Volume */}
      {totalVolume > 0n && (
        <div className="text-center text-sm text-gray-400 pt-2 border-t border-[#544863]">
          Total Volume: {formatPrice(totalVolume)} POLITICS
        </div>
      )}
    </div>
  );
}
