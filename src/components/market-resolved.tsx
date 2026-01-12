import { useAccount, useReadContract } from "wagmi";
import { contractAddress, contractAbi } from "@/constants/contract";

interface MarketResolvedProps {
  marketId: number;
  outcome: number | bigint;
  options?: string[]; // Policast options array
}

export function MarketResolved({
  marketId,
  outcome,
  options,
}: MarketResolvedProps) {
  const { address: accountAddress, isConnected } = useAccount();

  // Fetch claimed status from Policast
  const { data: claimedStatus, isLoading } = useReadContract({
    abi: contractAbi,
    address: contractAddress,
    functionName: "getUserClaimStatus",
    args: [
      BigInt(marketId),
      accountAddress || "0x0000000000000000000000000000000000000000",
    ],
    query: {
      enabled: isConnected && !!accountAddress,
    },
  });

  // Determine the winning option text
  const getWinningOptionText = () => {
    if (!options || options.length === 0) {
      return `Option ${Number(outcome) + 1}`;
    }

    const idx = Number(outcome);
    if (!Number.isFinite(idx)) return options[0] ?? "Unknown option";

    return options[idx] ?? `Option ${idx + 1}`;
  };

  // Determine distribution message
  const [claimedWinnings] = Array.isArray(claimedStatus)
    ? (claimedStatus as readonly [boolean, boolean])
    : [false, false];

  const distributionMessage = !isConnected
    ? "Connect wallet to view reward status"
    : isLoading
    ? "Checking reward status..."
    : claimedWinnings
    ? "Rewards distributed"
    : "Rewards available to claim";

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 p-2 rounded-md text-center text-xs text-green-300">
        Resolved: {getWinningOptionText()}
      </div>

      {/* Show distribution message for all markets */}
      <p className="text-xs text-gray-300 text-center">{distributionMessage}</p>
    </div>
  );
}
