"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  type BaseError,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { tokenAddress, tokenAbi } from "@/constants/contract";

interface ClaimTokensButtonProps {
  onClaimComplete?: () => void;
}

export function ClaimTokensButton({ onClaimComplete }: ClaimTokensButtonProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const {
    data: hash,
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isTxConfirmed,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  const [hasClaimed, setHasClaimed] = useState(false);

  const handleClaimTokens = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    try {
      await writeContractAsync({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "claim",
        args: [],
      });
    } catch (error: unknown) {
      console.error("Claim error:", error);
      toast({
        title: "Claim Failed",
        description:
          error instanceof Error
            ? (error as BaseError)?.shortMessage || error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isTxConfirmed) {
      toast({
        title: "Tokens Claimed!",
        description: "You've claimed 5000 BSTR tokens.",
      });
      setHasClaimed(true);
      onClaimComplete?.();
    }
    if (txError || writeError) {
      const errorToShow = txError || writeError;
      let message =
        (errorToShow as BaseError)?.shortMessage || "Transaction failed.";
      if (
        message.toLowerCase().includes("already claimed") ||
        message.toLowerCase().includes("limit reached")
      ) {
        message = "Already claimed or claim limit reached.";
      }
      toast({
        title: "Claim Failed",
        description: message,
        variant: "destructive",
      });
      // Potentially setHasClaimed(true) if the error indicates already claimed,
      // depending on desired UX. For now, just show error.
    }
  }, [isTxConfirmed, txError, writeError, toast, onClaimComplete]);

  if (!address || hasClaimed) {
    return null;
  }

  return (
    <Button
      onClick={handleClaimTokens}
      disabled={isWritePending || isConfirming}
      className="bg-gray-800 text-white hover:bg-gray-900 px-3 py-1 text-sm"
    >
      {isWritePending || isConfirming ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Claiming...
        </>
      ) : (
        "Claim 5000 BSTR"
      )}
    </Button>
  );
}
