"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { V2contractAddress, V2contractAbi } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Coins, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface UserWinnings {
  marketId: number;
  amount: bigint;
  hasWinnings: boolean;
  hasClaimed: boolean;
}

export function ClaimWinningsSection() {
  const { address, isConnected } = useAccount();
  const [userMarkets, setUserMarkets] = useState<number[]>([]);
  const [winningsData, setWinningsData] = useState<UserWinnings[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClaimed, setShowClaimed] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const fetchUserMarkets = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auto-discover-user-markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Auto-discovered markets response:", data);

        // Ensure winningsData exists and is an array
        if (!data.winningsData || !Array.isArray(data.winningsData)) {
          console.error("Invalid winningsData format:", data.winningsData);
          setWinningsData([]);
          setUserMarkets([]);
          return;
        }

        const winnings = data.winningsData.map((w: any) => {
          console.log("Processing winning entry:", w);
          return {
            marketId: w.marketId,
            amount: BigInt(w.amount || 0),
            hasWinnings: w.hasWinnings ?? false,
            hasClaimed: w.hasClaimed ?? false,
          };
        });

        console.log("Processed winnings:", winnings);
        setWinningsData(winnings);
        setUserMarkets(data.participatedMarkets || []);
      } else {
        console.error("Failed to auto-discover markets:", response.statusText);
        setWinningsData([]);
        setUserMarkets([]);
      }
    } catch (error) {
      console.error("Error auto-discovering markets:", error);
      setWinningsData([]);
      setUserMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserMarkets();
    }
  }, [isConnected, address, fetchUserMarkets]);

  const handleClaimWinnings = async (marketId: number) => {
    if (!address) return;

    try {
      writeContract({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: "claimWinnings",
        args: [BigInt(marketId)],
      });
    } catch (error) {
      console.error("Error claiming winnings:", error);
      toast.error("Failed to claim winnings");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Winnings claimed successfully!");
      fetchUserMarkets();
    }
  }, [isSuccess, fetchUserMarkets]);

  if (!isConnected) {
    return (
      <Card className="border-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:radial-gradient(white,transparent_85%)]" />
        <CardContent className="p-8 text-center relative">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 mb-1">
            Claim Winnings
          </h3>
          <p className="text-sm text-gray-600">
            Connect wallet to view rewards
          </p>
        </CardContent>
      </Card>
    );
  }

  const unclaimedWinnings = winningsData.filter((w) => !w.hasClaimed);
  const claimedWinnings = winningsData.filter((w) => w.hasClaimed);

  const totalWinnings = unclaimedWinnings.reduce(
    (sum, w) => sum + w.amount,
    0n
  );
  const totalWinningsEth = Number(totalWinnings) / 1e18;

  const totalClaimed = claimedWinnings.reduce((sum, w) => sum + w.amount, 0n);
  const totalClaimedEth = Number(totalClaimed) / 1e18;

  // Don't render anything if there are no winnings to claim and no claimed winnings
  if (
    !loading &&
    unclaimedWinnings.length === 0 &&
    claimedWinnings.length === 0
  ) {
    return null;
  }

  // Don't render if there are no unclaimed winnings and we're not showing claimed history
  if (!loading && unclaimedWinnings.length === 0 && !showClaimed) {
    return null;
  }

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-purple-500/[0.02] [mask-image:radial-gradient(white,transparent_85%)]" />

      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Winnings
              </CardTitle>
              {!loading && unclaimedWinnings.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {unclaimedWinnings.length} ready to claim
                </p>
              )}
            </div>
          </div>
          {claimedWinnings.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClaimed(!showClaimed)}
              className="h-8 px-3 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-100/50"
            >
              History
              <ChevronDown
                className={`w-3 h-3 ml-1 transition-transform ${
                  showClaimed ? "rotate-180" : ""
                }`}
              />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-7 h-7 animate-spin text-purple-500 mb-2" />
            <span className="text-xs text-gray-500">Checking rewards...</span>
          </div>
        ) : unclaimedWinnings.length === 0 && claimedWinnings.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex p-3 rounded-2xl bg-gray-100 mb-3">
              <Coins className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              No Winnings Yet
            </h3>
            <p className="text-xs text-gray-500">
              Check back after markets resolve
            </p>
          </div>
        ) : unclaimedWinnings.length === 0 && claimedWinnings.length > 0 ? (
          <div className="text-center py-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 mb-3">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              All Claimed!
            </h3>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-green-600">
                {totalClaimedEth.toFixed(4)} $POLITICS
              </span>{" "}
              collected
            </p>
          </div>
        ) : (
          <>
            {/* Compact Total Summary */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-4 shadow-lg">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-100 mb-0.5">
                    Available
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {totalWinningsEth.toFixed(4)}
                  </p>
                  <p className="text-xs text-purple-100 mt-0.5">$POLITICS</p>
                </div>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1 text-xs font-semibold">
                  {unclaimedWinnings.length} market
                  {unclaimedWinnings.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>

            {/* Compact Market List */}
            <div className="space-y-2">
              {unclaimedWinnings.map((winnings) => (
                <div
                  key={winnings.marketId}
                  className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 border-0 px-2 py-0.5 text-xs font-semibold"
                    >
                      #{winnings.marketId}
                    </Badge>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {(Number(winnings.amount) / 1e18).toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">$POLITICS</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleClaimWinnings(winnings.marketId)}
                    disabled={isPending || isConfirming}
                    size="sm"
                    className="h-8 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-md hover:shadow-lg transition-all text-xs font-semibold"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                        Claiming
                      </>
                    ) : (
                      "Claim"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Claimed History (Collapsible) */}
        {showClaimed && claimedWinnings.length > 0 && (
          <div className="pt-3 border-t border-purple-100 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Claimed History
            </p>
            {claimedWinnings.map((winnings) => (
              <div
                key={winnings.marketId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="border-gray-300 text-gray-600 px-2 py-0.5 text-xs font-medium"
                  >
                    #{winnings.marketId}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm text-gray-700">
                      {(Number(winnings.amount) / 1e18).toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500">$POLITICS</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">
                  ✓ Claimed
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
