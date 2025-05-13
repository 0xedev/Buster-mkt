import { useAccount, useReadContract } from "wagmi";
import { contractAddress, contractAbi } from "@/constants/contract";

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
  const { address: accountAddress, isConnected } = useAccount();

  // Only fetch claimed status if account is connected
  const { data: claimedStatus, isLoading } = useReadContract({
    abi: contractAbi,
    address: contractAddress,
    functionName: "getUserClaimedStatus",
    args: [
      BigInt(marketId),
      accountAddress || "0x0000000000000000000000000000000000000000",
    ], // Use a zero address if not connected
    query: {
      enabled: isConnected && !!accountAddress, // Query only if connected and address is available
    },
  });

  // Determine distribution message
  const distributionMessage = !isConnected
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
