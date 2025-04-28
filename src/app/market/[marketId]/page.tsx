import { Metadata } from "next";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import { MarketCard } from "@/components/marketCard";
import { MiniAppClient } from "@/components/MiniAppClient";

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

// Fetch market data
async function fetchMarketData(marketId: string): Promise<Market> {
  try {
    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 marketId) view returns (string question, uint256 totalOptionAShares, uint256 totalOptionBShares, string optionA, string optionB, uint256 endTime, uint8 outcome, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfo;

    return {
      question: marketData[0],
      totalOptionAShares: marketData[1],
      totalOptionBShares: marketData[2],
      optionA: marketData[3],
      optionB: marketData[4],
      endTime: marketData[5],
      outcome: marketData[6],
      resolved: marketData[7],
    };
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { marketId: string };
}): Promise<Metadata> {
  try {
    const market = await fetchMarketData(params.marketId);
    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0
        ? ((Number(market.totalOptionAShares) / Number(total)) * 100).toFixed(1)
        : "0";
    const frameEmbed = JSON.stringify({
      version: "next",
      imageUrl: `https://buster-mkt.vercel.app/api/market-image?marketId=${params.marketId}`,
      button: {
        title: "Bet Now",
        action: {
          type: "launch_frame",
          name: "Buster Market",
          url: `https://buster-mkt.vercel.app/market/${params.marketId}`,
          splashImageUrl: "https://buster-mkt.vercel.app/logo.png",
          splashBackgroundColor: "#ffffff",
        },
      },
    });

    return {
      title: market.question,
      description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
      other: {
        "fc:frame": frameEmbed,
      },
      openGraph: {
        title: market.question,
        description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
        images: [
          {
            url: `https://buster-mkt.vercel.app/api/market-image?marketId=${params.marketId}`,
            width: 1200,
            height: 630,
          },
        ],
      },
    };
  } catch {
    return {
      title: "Market Not Found",
      description: "Unable to load market data",
    };
  }
}

// Define the correct type for Next.js App Router page component
interface PageProps {
  params: { marketId: string };
  searchParams?: { [key: string]: string | string[] };
}

const MarketPage = async ({ params }: PageProps) => {
  try {
    const market = await fetchMarketData(params.marketId);
    return (
      <div className="container mx-auto p-4">
        <MiniAppClient />
        <MarketCard
          index={Number(params.marketId)}
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
  } catch {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Market Not Found</h1>
        <p>Unable to load market data. Please try again.</p>
      </div>
    );
  }
};

export default MarketPage;
