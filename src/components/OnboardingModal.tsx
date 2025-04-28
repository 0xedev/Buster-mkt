"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClaimTokensButton } from "@/components/ClaimTokensButton";
import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("hasSeenOnboarding")) {
      setIsOpen(true);
      sdk.actions.ready().catch((err) => console.error("Splash error:", err));
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Forecast</DialogTitle>
        </DialogHeader>
        <p className="py-4 text-sm text-muted-foreground">
          Bet BSTR tokens on outcomes like “Will it rain this afternoon?” on
          Base. Claim tokens to start!
        </p>
        <div className="flex gap-2">
          <ClaimTokensButton />
          <Button variant="outline" onClick={handleClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
