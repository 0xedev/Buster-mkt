import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { V2contractAddress, V2contractAbi } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, Trophy, DollarSign, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";

interface AdminWithdrawal {
  marketId: number;
  amount: bigint;
  type: "adminLiquidity" | "prizePool" | "lpRewards";
  description: string;
}
//
interface GroupedWithdrawals {
  adminLiquidity: AdminWithdrawal[];
  prizePool: AdminWithdrawal[];
  lpRewards: AdminWithdrawal[];
}

interface Totals {
  adminLiquidity: bigint;
  prizePool: bigint;
  lpRewards: bigint;
  total: bigint;
}

export function AdminWithdrawalsSection() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<GroupedWithdrawals>({
    adminLiquidity: [],
    prizePool: [],
    lpRewards: [],
  });
  const [totals, setTotals] = useState<Totals>({
    adminLiquidity: 0n,
    prizePool: 0n,
    lpRewards: 0n,
    total: 0n,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract write for withdrawals
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-discover admin withdrawals
  const fetchAdminWithdrawals = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);
    try {
      // Add timeout to prevent indefinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/admin-auto-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        // Debug: Show more detailed information
        // console.log("DEBUG - Response details:", {
        //   totalCount: data.totalCount,
        //   withdrawalsKeys: Object.keys(data.withdrawals || {}),
        //   adminLiquidityCount: data.withdrawals?.adminLiquidity?.length || 0,
        //   prizePoolCount: data.withdrawals?.prizePool?.length || 0,
        //   lpRewardsCount: data.withdrawals?.lpRewards?.length || 0,
        //   totals: data.totals,
        // });

        // Convert string amounts back to BigInt for internal use
        const withdrawalsWithBigInt = {
          adminLiquidity: (data.withdrawals?.adminLiquidity || []).map(
            (w: any) => ({
              ...w,
              amount: BigInt(w.amount || "0"),
            })
          ),
          prizePool: (data.withdrawals?.prizePool || []).map((w: any) => ({
            ...w,
            amount: BigInt(w.amount || "0"),
          })),
          lpRewards: (data.withdrawals?.lpRewards || []).map((w: any) => ({
            ...w,
            amount: BigInt(w.amount || "0"),
          })),
        };

        const totalsWithBigInt = {
          adminLiquidity: BigInt(data.totals?.adminLiquidity || "0"),
          prizePool: BigInt(data.totals?.prizePool || "0"),
          lpRewards: BigInt(data.totals?.lpRewards || "0"),
          total: BigInt(data.totals?.total || "0"),
        };

        setWithdrawals(withdrawalsWithBigInt);
        setTotals(totalsWithBigInt);
      } else {
        console.error(
          "Failed to auto-discover admin withdrawals:",
          response.status,
          response.statusText
        );

        const errorMessage =
          response.status === 504
            ? "API service temporarily unavailable. Please try again in a few minutes."
            : `Server error (${response.status}). Please try again.`;

        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });

        // Reset to empty state
        setWithdrawals({ adminLiquidity: [], prizePool: [], lpRewards: [] });
        setTotals({
          adminLiquidity: 0n,
          prizePool: 0n,
          lpRewards: 0n,
          total: 0n,
        });
      }
    } catch (error: any) {
      console.error("Error auto-discovering admin withdrawals:", error);

      let errorMessage =
        "Failed to load withdrawal data. Please check your connection.";

      // Handle specific error types
      if (error.name === "AbortError") {
        errorMessage = "Request timed out. Please try again later.";
      } else if (
        error.message?.includes("504") ||
        error.message?.includes("Gateway Timeout")
      ) {
        errorMessage =
          "API service temporarily unavailable. Please try again in a few minutes.";
      } else if (error.message?.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Reset to empty state
      setWithdrawals({ adminLiquidity: [], prizePool: [], lpRewards: [] });
      setTotals({
        adminLiquidity: 0n,
        prizePool: 0n,
        lpRewards: 0n,
        total: 0n,
      });
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Auto-discover on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchAdminWithdrawals();
    }
  }, [isConnected, address, fetchAdminWithdrawals]);

  // Handle individual withdrawal
  const handleWithdrawal = async (
    marketId: number,
    type: string
  ): Promise<void> => {
    if (!address) return;

    try {
      let functionName: any;
      switch (type) {
        case "adminLiquidity":
          functionName = "withdrawAdminLiquidity";
          break;
        case "prizePool":
          functionName = "withdrawUnusedPrizePool";
          break;
        case "lpRewards":
          functionName = "claimLPRewards";
          break;
        default:
          throw new Error("Unknown withdrawal type");
      }

      // Submit transaction and wait for confirmation
      toast({
        title: "Info",
        description: "Submitting withdrawal transaction...",
      });
      await writeContractAsync({
        address: V2contractAddress,
        abi: V2contractAbi,
        functionName: functionName as any,
        args: [BigInt(marketId)],
      });

      // The writeContractAsync already waits for confirmation internally
      toast({
        title: "Success",
        description: "Withdrawal completed successfully!",
      });
      // Refresh data after successful withdrawal
      fetchAdminWithdrawals();
    } catch (error) {
      console.error("Error in withdrawal:", error);
      toast({
        title: "Error",
        description: "Withdrawal failed",
        variant: "destructive",
      });
      throw error; // Re-throw for batch handling
    }
  }; // Handle batch withdrawal for a type
  const handleBatchWithdrawal = async (type: keyof GroupedWithdrawals) => {
    if (!address || withdrawals[type].length === 0) return;

    try {
      // Process withdrawals sequentially to avoid gas issues
      for (const withdrawal of withdrawals[type]) {
        await handleWithdrawal(withdrawal.marketId, type);
        // Small delay between transactions
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Error in batch withdrawal:", error);
      toast({
        title: "Error",
        description: "Batch withdrawal failed",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardContent className="p-6 text-center">
          <Wallet className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-white/20" />
          <h3 className="font-medium text-base md:text-lg text-white mb-2">
            Admin Withdrawals
          </h3>
          <p className="text-sm md:text-base text-white/50">
            Connect your wallet to view available withdrawals
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalWithdrawals =
    withdrawals.adminLiquidity.length +
    withdrawals.prizePool.length +
    withdrawals.lpRewards.length;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Card */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="pb-3 md:pb-6 border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-white font-medium">
            <Coins className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
            Admin Withdrawals Available
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-4 md:py-8">
              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-white/40" />
              <span className="ml-2 text-xs md:text-sm text-white/50">
                Discovering available withdrawals...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-4 md:py-8">
              <div className="text-red-400/50 mb-3 md:mb-4">
                <svg
                  className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <p className="text-white/70 mb-2 text-sm md:text-base">
                Failed to load withdrawal data
              </p>
              <p className="text-xs md:text-sm text-white/40 mb-4">{error}</p>
              <Button
                onClick={() => {
                  setError(null);
                  fetchAdminWithdrawals();
                }}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Try Again
              </Button>
            </div>
          ) : totalWithdrawals === 0 ? (
            <div className="text-center py-6 md:py-8">
              <Coins className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-white/10" />
              <h3 className="text-base md:text-lg font-medium text-white mb-2">
                No withdrawals available
              </h3>
              <p className="text-xs md:text-sm text-white/50 mb-4 md:mb-6">
                Admin withdrawals will appear here after market resolution
              </p>

              {/* Help guide */}
              <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-lg p-4 text-left mb-4 md:mb-6">
                <h4 className="font-medium text-white/80 mb-2 text-xs md:text-sm">
                  💡 How to generate withdrawals:
                </h4>
                <ul className="text-xs md:text-sm text-white/50 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1 w-1 rounded-full bg-white/30" />
                    <span>
                      <strong>Create markets</strong> with initial liquidity
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1 w-1 rounded-full bg-white/30" />
                    <span>
                      <strong>Wait for resolution</strong> - admin liquidity
                      becomes claimable
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1 w-1 rounded-full bg-white/30" />
                    <span>
                      <strong>Create free markets</strong> - unused prize pools
                      become withdrawable
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 block h-1 w-1 rounded-full bg-white/30" />
                    <span>
                      <strong>Provide liquidity</strong> - earn LP rewards from
                      market fees
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => (window.location.href = "/admin?tab=create")}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs md:text-sm"
                  size="sm"
                >
                  Create Market
                </Button>
                <Button
                  onClick={() => {
                    setError(null);
                    fetchAdminWithdrawals();
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs md:text-sm"
                >
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Total Summary */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-emerald-300/80">
                      Total Available
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-emerald-400">
                      {formatPrice(totals.total)} $POLITICS
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  >
                    {totalWithdrawals} Withdrawal
                    {totalWithdrawals !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              {/* Individual Sections */}
              {withdrawals.adminLiquidity.length > 0 && (
                <WithdrawalSection
                  title="Admin Liquidity"
                  icon={<DollarSign className="w-4 h-4" />}
                  withdrawals={withdrawals.adminLiquidity}
                  total={totals.adminLiquidity}
                  onWithdraw={handleWithdrawal}
                  onBatchWithdraw={() =>
                    handleBatchWithdrawal("adminLiquidity")
                  }
                  isPending={isPending}
                  isConfirming={isConfirming}
                />
              )}

              {withdrawals.prizePool.length > 0 && (
                <WithdrawalSection
                  title="Prize Pool"
                  icon={<Trophy className="w-4 h-4" />}
                  withdrawals={withdrawals.prizePool}
                  total={totals.prizePool}
                  onWithdraw={handleWithdrawal}
                  onBatchWithdraw={() => handleBatchWithdrawal("prizePool")}
                  isPending={isPending}
                  isConfirming={isConfirming}
                />
              )}

              {withdrawals.lpRewards.length > 0 && (
                <WithdrawalSection
                  title="LP Rewards"
                  icon={<Coins className="w-4 h-4" />}
                  withdrawals={withdrawals.lpRewards}
                  total={totals.lpRewards}
                  onWithdraw={handleWithdrawal}
                  onBatchWithdraw={() => handleBatchWithdrawal("lpRewards")}
                  isPending={isPending}
                  isConfirming={isConfirming}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Individual withdrawal section component
function WithdrawalSection({
  title,
  icon,
  withdrawals,
  total,
  onWithdraw,
  onBatchWithdraw,
  isPending,
  isConfirming,
}: {
  title: string;
  icon: React.ReactNode;
  withdrawals: AdminWithdrawal[];
  total: bigint;
  onWithdraw: (marketId: number, type: string) => void;
  onBatchWithdraw: () => void;
  isPending: boolean;
  isConfirming: boolean;
}) {
  return (
    <div className="border border-white/10 bg-white/5 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white/60">{icon}</span>
          <h3 className="font-medium text-white">{title}</h3>
          <Badge
            variant="outline"
            className="text-white/50 border-white/10 bg-white/5"
          >
            {withdrawals.length}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50 mb-1">
            Total:{" "}
            <span className="text-green-400 font-medium">
              {formatPrice(total)} $POLITICS
            </span>
          </p>
          {withdrawals.length > 1 && (
            <Button
              onClick={onBatchWithdraw}
              disabled={isPending || isConfirming}
              size="sm"
              variant="outline"
              className="h-7 text-xs border-white/10 text-white/70 hover:text-white bg-transparent hover:bg-white/5"
            >
              Withdraw All
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {withdrawals.map((withdrawal) => (
          <div
            key={`${withdrawal.type}-${withdrawal.marketId}`}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-white/90">
                Market #{withdrawal.marketId}
              </p>
              <p className="text-xs text-white/50 mb-1">
                {withdrawal.description}
              </p>
              <p className="text-xs font-medium text-green-400">
                {formatPrice(withdrawal.amount)} $POLITICS
              </p>
            </div>
            <Button
              onClick={() => onWithdraw(withdrawal.marketId, withdrawal.type)}
              disabled={isPending || isConfirming}
              size="sm"
              className="h-8 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  Wait...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
