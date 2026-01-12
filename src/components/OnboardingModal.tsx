"use client";

import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
// import { ClaimTokensButton } from "./ClaimTokensButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function OnboardingModal() {
  const [step, setStep] = useState<"add" | "buy" | "share" | "done">("add");
  const [isOpen, setIsOpen] = useState(false);
  // To track if the modal was opened by the onboarding logic in the current sessio
  const [onboardingTriggered, setOnboardingTriggered] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("hasCompletedOnboarding")) {
      setIsOpen(true);
      setOnboardingTriggered(true);
      sdk.actions.ready().catch((err) => {
        // console.error("SDK ready error:", err);
      });

      const checkAdded = async () => {
        const client = await (await sdk.context).client;
        if (client.added) {
          setStep("buy");
        }
      };
      checkAdded();

      const handleFrameAdded = () => {
        setStep("buy");
      };
      sdk.on("miniAppAdded", handleFrameAdded);
      return () => {
        sdk.removeListener("miniAppAdded", handleFrameAdded);
      };
    }
  }, []);

  const handleAddFrame = async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      // console.error("Failed to add frame:", error);
    }
  };

  // Replace with your actual token addresses
  const USDC_CAIP19 =
    "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const CAIP_ETH = "eip155:8453/native";
  const POLITICS_CAIP19 =
    "eip155:8453/erc20:0x43ad5adae56fa09127ba147d5b24c4bc34abdb07";

  const handleBuyPolitics = async (sellToken: string) => {
    try {
      await sdk.actions.swapToken({
        sellToken,
        buyToken: POLITICS_CAIP19,
        // Optionally, set sellAmount: "1000000" // 1 USDC (if you want to pre-fill)
      });
      setStep("share");
    } catch (error) {
      // console.error("Failed to open swap:", error);
      setStep("share");
    }
  };

  const handleShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: "Just joined Policast! Predict public sentiments and earn $POLITICS tokens!",
        embeds: ["https://policast.xyz"],
      });
      setStep("done");
      setIsOpen(false);
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch (error) {
      // console.error("Failed to compose cast:", error);
      setStep("done");
      setIsOpen(false);
      localStorage.setItem("hasCompletedOnboarding", "true");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasCompletedOnboarding", "true");
  };

  const handleDialogOpeChange = (open: boolean) => {
    setIsOpen(open);
    // If the dialog is being closed, and it was opened by the onboarding logic,
    // and the user hasn't explicitly completed/skipped (which would have already set localStorage),
    // then set the flag to prevent it from showing again.
    if (
      !open &&
      onboardingTriggered &&
      !localStorage.getItem("hasCompletedOnboarding")
    ) {
      localStorage.setItem("hasCompletedOnboarding", "true");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpeChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "add" && "Welcome to Policast!"}
            {step === "buy" && "Buy $POLITICS"}
            {step === "share" && "Share Policast"}
          </DialogTitle>
        </DialogHeader>
        {step === "add" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Add Policast to your Farcaster client to get notifications and
              start predicting!
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleAddFrame}
                className="bg-gray-800 text-white hover:bg-gray-900"
              >
                Add Policast
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Skip
              </Button>
            </div>
          </div>
        )}
        {step === "buy" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Great! Now buy your $POLITICS tokens to start playing.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleBuyPolitics(USDC_CAIP19)}
                className="bg-gray-800 text-white hover:bg-gray-900"
              >
                Buy with USDC
              </Button>
              <Button
                onClick={() => handleBuyPolitics(CAIP_ETH)}
                className="bg-gray-800 text-white hover:bg-gray-900"
              >
                Buy with ETH
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Skip
              </Button>
            </div>
          </div>
        )}
        {step === "share" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Awesome! Share Policast with your friends on Farcaster to spread
              the word.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleShare}
                className="bg-gray-800 text-white hover:bg-gray-900"
              >
                Share to Farcaster
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Skip
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
