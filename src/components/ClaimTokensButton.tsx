"use client";

import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "@/app/client";
import { base } from "thirdweb/chains";

const contract = getContract({
  client,
  chain: base,
  address: "0x55b04F15A1878fa5091D5E35ebceBC06A5EC2F31",
});

interface ClaimTokensButtonProps {
  onClaimComplete?: () => void;
}

export function ClaimTokensButton({ onClaimComplete }: ClaimTokensButtonProps) {
  const account = useActiveAccount();
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [hasClaimed, setHasClaimed] = useState(false);

  const handleClaimTokens = async () => {
    if (!account) {
      toast({
        title: "Error",
        description: "Please connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsClaimLoading(true);
    try {
      const transaction = prepareContractCall({
        contract,
        method: "function claim() external",
        params: [],
      });

      await sendTransaction(transaction, {
        onSuccess: () => {
          toast({
            title: "Tokens Claimed!",
            description: "You've claimed 5000 BSTR tokens.",
          });
          setHasClaimed(true);
          onClaimComplete?.();
        },
        onError: (error) => {
          let message = "Transaction failed.";
          if (error.message.includes("revert"))
            message = "Already claimed or limit reached.";
          toast({
            title: "Claim Failed",
            description: message,
            variant: "destructive",
          });
        },
      });
    } catch (error: unknown) {
      console.error("Claim error:", error);
      toast({
        title: "Claim Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsClaimLoading(false);
    }
  };

  if (!account || hasClaimed) {
    return null;
  }

  return (
    <Button
      onClick={handleClaimTokens}
      disabled={isClaimLoading || isPending}
      className="bg-gray-800 text-white hover:bg-gray-900 px-3 py-1 text-sm"
    >
      {isClaimLoading || isPending ? (
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
