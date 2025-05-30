"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  type BaseError,
} from "wagmi";
import {
  contractAddress,
  contractAbi,
  tokenAddress,
  tokenAbi,
} from "@/constants/contract";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface MarketBuyInterfaceProps {
  marketId: number;
  market: {
    question: string;
    optionA: string;
    optionB: string;
    totalOptionAShares: bigint;
    totalOptionBShares: bigint;
  };
}

type BuyingStep = "initial" | "amount" | "allowance" | "confirm";
type Option = "A" | "B" | null;

const MAX_BET = 500;

// Convert amount to token units (handles custom decimals)
function toUnits(amount: string, decimals: number): bigint {
  const [integer = "0", fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return (
    BigInt(integer + paddedFraction) *
    BigInt(10) ** BigInt(decimals - paddedFraction.length)
  );
}

export function MarketBuyInterface({
  marketId,
  market,
}: MarketBuyInterfaceProps) {
  const { address: accountAddress, isConnected } = useAccount();
  const {
    data: hash,
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const {
    isLoading: isConfirmingTx,
    isSuccess: isTxConfirmed,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
  });
  const { toast } = useToast();

  const [isBuying, setIsBuying] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [containerHeight, setContainerHeight] = useState("auto");
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedOption, setSelectedOption] = useState<Option>(null);
  const [amount, setAmount] = useState<string>("");
  const [buyingStep, setBuyingStep] = useState<BuyingStep>("initial");
  const [isApproving, setIsApproving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Wagmi hooks for reading token data
  const { data: tokenSymbolData, error: tokenSymbolError } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "symbol",
  });
  const tokenSymbol = (tokenSymbolData as string) || "TOKEN";

  const { data: tokenDecimalsData, error: tokenDecimalsError } =
    useReadContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "decimals",
    });
  const tokenDecimals = (tokenDecimalsData as number | undefined) ?? 18;

  const {
    data: balanceData,
    error: balanceError,
    refetch: refetchBalance,
  } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [accountAddress || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: isConnected && !!accountAddress,
    },
  });
  const balance = (balanceData as bigint | undefined) ?? 0n;

  const {
    data: allowanceData,
    error: allowanceError,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "allowance",
    args: [
      accountAddress || "0x0000000000000000000000000000000000000000",
      contractAddress,
    ],
    query: {
      enabled: isConnected && !!accountAddress,
    },
  });
  const userAllowance = (allowanceData as bigint | undefined) ?? 0n;

  useEffect(() => {
    if (
      tokenSymbolError ||
      tokenDecimalsError ||
      balanceError ||
      allowanceError
    ) {
      console.error("Failed to fetch token data:", {
        tokenSymbolError,
        tokenDecimalsError,
        balanceError,
        allowanceError,
      });
      toast({
        title: "Error",
        description: "Failed to fetch token information. Please refresh.",
        variant: "destructive",
      });
    }
  }, [
    tokenSymbolError,
    tokenDecimalsError,
    balanceError,
    allowanceError,
    toast,
  ]);

  // Update container height
  useEffect(() => {
    if (contentRef.current) {
      setContainerHeight(`${contentRef.current.offsetHeight}px`);
    }
  }, [isBuying, buyingStep, isVisible, error]);

  // Focus input on amount step
  useEffect(() => {
    if (buyingStep === "amount" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [buyingStep]);

  // Calculate implied odds
  // Calculate implied odds
  const totalShares = market.totalOptionAShares + market.totalOptionBShares;
  const yesProbability =
    totalShares > 0n
      ? Number(market.totalOptionAShares) / Number(totalShares)
      : 0.5; // Default to 50% if no shares
  const noProbability =
    totalShares > 0n
      ? Number(market.totalOptionBShares) / Number(totalShares)
      : 0.5; // Default to 50% if no shares
  const yesOdds = yesProbability > 0 ? 1 / yesProbability : Infinity; // Implied odds as multiplier
  const noOdds = noProbability > 0 ? 1 / noProbability : Infinity; // Implied odds as multiplier

  const handleBuy = (option: "A" | "B") => {
    setIsVisible(false);
    setTimeout(() => {
      setIsBuying(true);
      setSelectedOption(option);
      setBuyingStep("amount");
      setIsVisible(true);
    }, 200);
  };

  const handleCancel = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setIsBuying(false);
      setBuyingStep("initial");
      setSelectedOption(null);
      setAmount("");
      setError(null);
      setIsVisible(true);
    }, 200);
  }, [
    setIsVisible,
    setIsBuying,
    setBuyingStep,
    setSelectedOption,
    setAmount,
    setError,
  ]);

  const checkApproval = async () => {
    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (numAmount > MAX_BET) {
      toast({
        title: "Maximum Bet Exceeded",
        description: `Maximum shares you can buy is ${MAX_BET} ${tokenSymbol}`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (!isConnected || !accountAddress) {
        toast({
          title: "Wallet Connection Required",
          description: "Please connect your wallet to continue",
          variant: "destructive",
        });
        return;
      }

      const amountInUnits = toUnits(amount, tokenDecimals);
      if (amountInUnits > balance) {
        toast({
          title: "Insufficient Balance",
          description: `You have ${(
            Number(balance) / Math.pow(10, tokenDecimals)
          ).toFixed(2)} ${tokenSymbol}, need ${amount}`,
          variant: "destructive",
        });
        return;
      }

      // Proceed based on allowance
      setBuyingStep(amountInUnits > userAllowance ? "allowance" : "confirm");
      setError(null);
    } catch (error) {
      console.error("Allowance check error:", error);
      toast({
        title: "Error",
        description: "Failed to check token allowance",
        variant: "destructive",
      });
    }
  };

  const handleSetApproval = async () => {
    if (!isConnected || !accountAddress) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      });
      return;
    }

    setIsApproving(true);
    try {
      // Using prepareContractCall instead of the approve function
      // This is the ERC20 approval method
      await writeContractAsync({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "approve",
        args: [
          contractAddress,
          BigInt(
            "115792089237316195423570985008687907853269984665640564039457584007913129639935"
          ), // Max uint256
        ],
      });

      toast({
        title: "Approval Successful",
        description: `Approval transaction sent. Waiting for confirmation...`,
        duration: 3000,
      });
    } catch (error: unknown) {
      console.error("Approval error:", error);
      // More descriptive error message
      let errorMessage =
        "Failed to approve token spending. Please check your wallet.";

      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage =
            (error as BaseError)?.shortMessage || "Insufficient funds for gas";
        }
      }

      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedOption || !amount || Number(amount) <= 0) {
      setError("Must select an option and enter an amount greater than 0");
      return;
    }

    if (!isConnected || !accountAddress) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      });
      return;
    }

    const numAmount = Number(amount);
    if (numAmount > MAX_BET) {
      toast({
        title: "Maximum Bet Exceeded",
        description: `Maximum shares you can buy is ${MAX_BET} ${tokenSymbol}`,
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: contractAbi,
        functionName: "buyShares",
        args: [
          BigInt(marketId),
          selectedOption === "A",
          toUnits(amount, tokenDecimals),
        ],
      });

      toast({
        title: "Purchase Successful!",
        description: `You bought ${amount} ${
          selectedOption === "A" ? market.optionA : market.optionB
        } shares`,
        duration: 5000,
      });
    } catch (error: unknown) {
      console.error("Purchase error:", error);
      let errorMessage = "Failed to process purchase. Check your wallet.";
      if (error instanceof Error) {
        errorMessage = (error as BaseError)?.shortMessage || errorMessage;
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected in your wallet";
        } else if (error.message.includes("Market trading period has ended")) {
          errorMessage = "Market trading period has ended";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
        }
      }
      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };
  // Effect to handle transaction confirmation
  useEffect(() => {
    if (isTxConfirmed) {
      toast({
        title: "Transaction Confirmed!",
        description: `Your ${
          buyingStep === "allowance" ? "approval" : "purchase"
        } was successful.`,
        duration: 5000,
      });
      if (buyingStep === "allowance") {
        refetchAllowance(); // Refetch allowance after successful approval
        setBuyingStep("confirm");
      } else if (buyingStep === "confirm") {
        refetchBalance(); // Refetch balance after successful purchase
        handleCancel(); // Reset UI
      }
      setIsApproving(false);
      setIsConfirming(false);
    }
    if (txError || writeError) {
      const errorToShow = txError || writeError;
      toast({
        title: "Transaction Failed",
        description:
          (errorToShow as BaseError)?.shortMessage ||
          "An unknown error occurred.",
        variant: "destructive",
      });
      setIsApproving(false);
      setIsConfirming(false);
    }
  }, [
    isTxConfirmed,
    txError,
    writeError,
    buyingStep,
    toast,
    handleCancel,
    refetchAllowance,
    refetchBalance,
  ]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      setAmount("");
      setError(null);
      return;
    }
    if (!/^\d*\.?\d*$/.test(inputValue)) return; // Allow only valid numbers
    const parts = inputValue.split(".");
    if (parts[0].length > 15 || parts[1]?.length > tokenDecimals) return; // Limit size
    const numValue = Number(inputValue);
    if (numValue < 0) return; // Prevent negative
    setAmount(inputValue);
    setError(null);
  };

  const handleMaxBet = () => {
    const maxPossibleValue = Math.min(
      MAX_BET,
      Number(balance) / Math.pow(10, tokenDecimals)
    );
    const displayPrecision = Math.min(6, tokenDecimals);
    const formattedMaxAmount = maxPossibleValue.toFixed(displayPrecision);
    let finalAmountString = formattedMaxAmount;
    if (finalAmountString.includes(".")) {
      finalAmountString = finalAmountString.replace(/0+$/, "");
      if (finalAmountString.endsWith(".")) {
        finalAmountString = finalAmountString.slice(0, -1);
      }
    }
    setAmount(finalAmountString);
    setError(null);
  };

  return (
    <div
      className="relative transition-all duration-200 ease-in-out overflow-hidden"
      style={{ maxHeight: containerHeight }}
    >
      <div
        ref={contentRef}
        className={cn(
          "w-full transition-all duration-200 ease-in-out",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {!isBuying ? (
          <div className="flex flex-col gap-4 mb-4">
            {/* <h2 className="text-lg font-bold">{market.question}</h2> */}
            <div className="flex justify-between gap-4">
              <Button
                className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
                onClick={() => handleBuy("A")}
                aria-label={`Buy ${market.optionA} shares for "${market.question}"`}
                disabled={!isConnected}
              >
                {market.optionA} ({yesOdds.toFixed(2)}x)
              </Button>
              <Button
                className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700"
                onClick={() => handleBuy("B")}
                aria-label={`Buy ${market.optionB} shares for "${market.question}"`}
                disabled={!isConnected}
              >
                {market.optionB} ({noOdds.toFixed(2)}x)
              </Button>
            </div>
            {accountAddress && (
              <p className="text-xs text-gray-500 text-center">
                Available:{" "}
                {(Number(balance) / Math.pow(10, tokenDecimals)).toFixed(2)}{" "}
                {tokenSymbol}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col mb-4" aria-live="polite">
            {/* <h2 className="text-lg font-bold mb-2">{market.question}</h2> */}
            <p className="text-sm text-gray-500 mb-4">
              Selected:{" "}
              {selectedOption === "A" ? market.optionA : market.optionB} (
              {(selectedOption === "A" ? yesOdds : noOdds).toFixed(2)}x)
            </p>
            {buyingStep === "amount" ? (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">
                  Enter amount (Max: {MAX_BET} {tokenSymbol}, Available:{" "}
                  {(Number(balance) / Math.pow(10, tokenDecimals)).toFixed(2)}{" "}
                  {tokenSymbol})
                </span>
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-grow relative">
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={handleAmountChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") checkApproval();
                          if (e.key === "-" || e.key === "e" || e.key === "+")
                            e.preventDefault();
                        }}
                        className={cn(
                          "w-full",
                          error && "border-red-500 focus-visible:ring-red-500"
                        )}
                        aria-describedby={error ? "amount-error" : undefined}
                      />
                    </div>
                    <Button
                      onClick={handleMaxBet}
                      variant="outline"
                      className="px-3"
                      aria-label="Set maximum bet amount"
                    >
                      Max
                    </Button>
                    <span className="font-bold whitespace-nowrap">
                      {tokenSymbol}
                    </span>
                  </div>
                  <div className="min-h-[20px]">
                    {error && (
                      <span id="amount-error" className="text-sm text-red-500">
                        {error}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <Button
                    onClick={checkApproval}
                    className="flex-1 min-w-[120px]"
                    disabled={!amount}
                  >
                    Next
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1 min-w-[120px]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : buyingStep === "allowance" ? (
              <div className="flex flex-col border-2 border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-2">Approve Tokens</h3>
                <p className="mb-4 text-sm">
                  Approve unlimited {tokenSymbol} spending to buy shares without
                  future approvals.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSetApproval}
                    className="min-w-[120px]"
                    disabled={isApproving || isWritePending || isConfirmingTx}
                  >
                    {isApproving || isWritePending || isConfirmingTx ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "Approve"
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="min-w-[120px]"
                    disabled={isApproving || isWritePending || isConfirmingTx}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col border-2 border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-2">Confirm Purchase</h3>
                <p className="mb-4 text-sm">
                  Buy{" "}
                  <span className="font-bold">
                    {amount}{" "}
                    {selectedOption === "A" ? market.optionA : market.optionB}
                  </span>{" "}
                  shares for {amount} {tokenSymbol}.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleConfirm}
                    className="min-w-[120px]"
                    disabled={isConfirming || isWritePending || isConfirmingTx}
                  >
                    {isConfirming || isWritePending || isConfirmingTx ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="min-w-[120px]"
                    disabled={isConfirming || isWritePending || isConfirmingTx}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
