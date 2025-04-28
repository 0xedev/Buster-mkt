import { Metadata } from "next";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import { MarketCard } from "@/components/marketCard";

// Define contract
const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const contract = getContract({
  client,
  chain: base,
  address: contractAddress,
});

// Interface for market data
interface Market {
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

type MarketInfo = readonly [
  string,
  bigint,
  bigint,
  string,
  string,
  bigint,
  number,
  boolean
];

interface Props {
  params: { marketId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const marketId = params.marketId;
    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 marketId) view returns (string question, uint256 totalOptionAShares, uint256 totalOptionBShares, string optionA, string optionB, uint256 endTime, uint8 outcome, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfo;

    const market: Market = {
      question: marketData[0],
      totalOptionAShares: marketData[1],
      totalOptionBShares: marketData[2],
      optionA: marketData[3],
      optionB: marketData[4],
      endTime: marketData[5],
      outcome: marketData[6],
      resolved: marketData[7],
    };

    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0
        ? ((Number(market.totalOptionAShares) / Number(total)) * 100).toFixed(1)
        : "0";

    return {
      title: market.question,
      description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
      other: {
        "fc:frame": "next",
        "fc:frame:image": `https://buster-mkt.vercel.app/api/market-image?marketId=${marketId}`,
        "fc:frame:button:1": `Bet on ${market.question.slice(0, 20)}...`,
        "fc:frame:button:1:action": "launch_frame",
        "fc:frame:button:1:url": `https://buster-mkt.vercel.app/market/${marketId}`,
        "fc:frame:button:1:name": "Buster Market",
      },
    };
  } catch (error) {
    console.error(
      `Metadata generation failed for market ${params.marketId}:`,
      error
    );
    return {
      title: "Market Not Found",
      description: "Unable to load market data",
    };
  }
}

export default async function MarketPage({ params }: Props) {
  const marketId = params.marketId;
  try {
    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 marketId) view returns (string question, uint256 totalOptionAShares, uint256 totalOptionBShares, string optionA, string optionB, uint256 endTime, uint8 outcome, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfo;

    const market: Market = {
      question: marketData[0],
      totalOptionAShares: marketData[1],
      totalOptionBShares: marketData[2],
      optionA: marketData[3],
      optionB: marketData[4],
      endTime: marketData[5],
      outcome: marketData[6],
      resolved: marketData[7],
    };

    return (
      <div className="container mx-auto p-4">
        <MarketCard
          index={Number(marketId)}
          market={market}
          filter={
            market.resolved
              ? "resolved"
              : market.endTime < BigInt(Date.now() / 1000)
              ? "pending"
              : "active"
          }
        />
      </div>
    );
  } catch (error) {
    console.error(`Failed to load market ${marketId}:`, error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Market Not Found</h1>
        <p>Unable to load market data. Please try again.</p>
      </div>
    );
  }
}
