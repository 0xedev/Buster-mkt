"use client";

import { useState, useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { ClaimTokensButton } from "./ClaimTokensButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function OnboardingModal() {
  const [step, setStep] = useState<"add" | "claim" | "share" | "done">("add");
  const [isOpen, setIsOpen] = useState(false);
  // To track if the modal was opened by the onboarding logic in the current session
  const [onboardingTriggered, setOnboardingTriggered] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("hasCompletedOnboarding")) {
      setIsOpen(true);
      setOnboardingTriggered(true); // Mark that onboarding logic tried to open the modal
      sdk.actions
        .ready()
        .catch((err) => console.error("SDK ready error:", err));

      const checkAdded = async () => {
        const client = await (await sdk.context).client;
        if (client.added) {
          setStep("claim");
        }
      };
      checkAdded();

      const handleFrameAdded = () => {
        setStep("claim");
      };
      sdk.on("frameAdded", handleFrameAdded);
      return () => {
        sdk.removeListener("frameAdded", handleFrameAdded);
      };
    }
  }, []);

  const handleAddFrame = async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      console.error("Failed to add frame:", error);
    }
  };

  const handleClaimComplete = () => {
    setStep("share");
  };

  const handleShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: "Just joined Policast! Predict public sentiments and earn BSTR tokens! 🚩",
        embeds: ["https://buster-mkt.vercel.app"],
      });
      setStep("done");
      setIsOpen(false);
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch (error) {
      console.error("Failed to compose cast:", error);
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
            {step === "claim" && "Claim Your Tokens"}
            {step === "share" && "Share Policast"}
          </DialogTitle>
        </DialogHeader>
        {step === "add" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Add Policast to your Farcaster client to claim 5000 BSTR tokens
              and start predicting!
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
        {step === "claim" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Great! Now claim your 5000 BSTR tokens to start playing.
            </p>
            <ClaimTokensButton onClaimComplete={handleClaimComplete} />
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
