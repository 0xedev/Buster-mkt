import { Progress } from "@/components/ui/progress";

// Utility to format bigint amounts based on token decimals
function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const integer = amount / divisor;
  const fractional = (amount % divisor)
    .toString()
    .padStart(decimals, "0")
    .slice(0, 4);
  return `${integer}.${fractional}`.replace(/\.?0+$/, ""); // Remove trailing zeros
}

interface MarketProgressProps {
  optionA: string;
  optionB: string;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  tokenDecimals?: number; // Optional, defaults to 18
}

export function MarketProgress({
  optionA,
  optionB,
  totalOptionAShares,
  totalOptionBShares,
  tokenDecimals = 18,
}: MarketProgressProps) {
  const totalShares = totalOptionAShares + totalOptionBShares;

  // Calculate percentages using bigint for precision
  const yesPercentage =
    totalShares > 0n
      ? Number((totalOptionAShares * 1000n) / totalShares) / 10 // One decimal place
      : 0;
  const noPercentage = totalShares > 0n ? 100 - yesPercentage : 0;

  // Calculate implied odds (total / winningShares)
  const yesOdds =
    totalShares > 0n && totalOptionAShares > 0n
      ? Number((totalShares * 100n) / totalOptionAShares) / 100
      : 0;
  const noOdds =
    totalShares > 0n && totalOptionBShares > 0n
      ? Number((totalShares * 100n) / totalOptionBShares) / 100
      : 0;

  // Format share amounts
  const yesShares = formatTokenAmount(totalOptionAShares, tokenDecimals);
  const noShares = formatTokenAmount(totalOptionBShares, tokenDecimals);

  return (
    <div className="mb-4">
      {totalShares === 0n ? (
        <div className="text-center text-gray-500 text-sm">No bets yet</div>
      ) : (
        <>
          <div className="flex justify-between mb-2">
            <span className="flex items-center gap-1">
              <span className="font-bold text-sm text-green-600">
                {optionA}: {yesShares}
              </span>
              <span className="text-xs text-gray-500">
                {yesPercentage.toFixed(1)}% ({yesOdds.toFixed(2)}x)
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-sm text-red-600">
                {optionB}: {noShares}
              </span>
              <span className="text-xs text-gray-500">
                {noPercentage.toFixed(1)}% ({noOdds.toFixed(2)}x)
              </span>
            </span>
          </div>
          <Progress
            value={yesPercentage}
            className="h-2 bg-red-100"
            style={{
              background: `linear-gradient(to right, #16a34a ${yesPercentage}%, #dc2626 ${yesPercentage}%)`,
            }}
          />
        </>
      )}
    </div>
  );
}
