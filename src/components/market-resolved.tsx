import { useActiveAccount, useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";

interface MarketResolvedProps {
  marketId: number;
  outcome: number;
  optionA: string;
  optionB: string;
}

export function MarketResolved({
  marketId,
  outcome,
  optionA,
  optionB,
}: MarketResolvedProps) {
  const account = useActiveAccount();

  // Only fetch claimed status if account is connected
  const { data: claimedStatus, isLoading } = useReadContract({
    contract,
    method:
      "function getUserClaimedStatus(uint256 _marketId, address _user) view returns (bool)",
    params: [BigInt(marketId), account?.address || "0x0"],
    queryOptions: { enabled: !!account }, // Disabled query if no account
  });

  // Determine distribution message
  const distributionMessage = !account
    ? "Connect wallet to view reward status"
    : isLoading
    ? "Checking reward status..."
    : claimedStatus
    ? "Rewards distributed"
    : "Verifying results";

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-green-200 p-2 rounded-md text-center text-xs">
        Resolved: {outcome === 1 ? optionA : optionB}
      </div>
      <p className="text-xs text-gray-500 text-center">{distributionMessage}</p>
    </div>
  );
}
