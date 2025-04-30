import { Metadata, ResolvingMetadata } from "next";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import { MarketCard, Market } from "@/components/marketCard";
import { MiniAppClient } from "@/components/MiniAppClient";

// Contract definition
const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const contract = getContract({
  client,
  chain: base,
  address: contractAddress,
});

// Interface for market data
type MarketInfoContractReturn = readonly [
  string,
  string,
  string,
  bigint,
  number,
  bigint,
  bigint,
  boolean
];

async function fetchMarketData(marketId: string): Promise<Market> {
  try {
    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfoContractReturn;

    return {
      question: marketData[0],
      optionA: marketData[1],
      optionB: marketData[2],
      endTime: marketData[3],
      outcome: marketData[4],
      totalOptionAShares: marketData[5],
      totalOptionBShares: marketData[6],
      resolved: marketData[7],
    };
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    throw error;
  }
}

// generateMetadata: Handle params as Promise
export async function generateMetadata(
  { params }: { params: Promise<{ marketId: string }> },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    const { marketId } = await params; // Await params
    const market = await fetchMarketData(marketId);

    const imageUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/market-image?marketId=${marketId}`;
    const postUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/frame-action`;
    const marketUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/market/${marketId}`;

    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0n
        ? (Number((market.totalOptionAShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";

    return {
      title: market.question,
      description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
      other: {
        "fc:frame": "vNext",
        "fc:frame:image": imageUrl,
        "fc:frame:post_url": postUrl,
        "fc:frame:button:1": `Bet on ${market.optionA}`,
        "fc:frame:button:1:action": "post",
        "fc:frame:button:2": `Bet on ${market.optionB}`,
        "fc:frame:button:2:action": "post",
        "fc:frame:button:3": "View Market",
        "fc:frame:button:3:action": "post",
        "fc:frame:input:text": "Enter amount in $BSTR",
        "fc:frame:state": JSON.stringify({ marketId }),
      },
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
      ),
      openGraph: {
        title: market.question,
        description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
        images: [
          { url: imageUrl, width: 1200, height: 630, alt: market.question },
        ],
        url: marketUrl,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: market.question,
        description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Market Not Found",
      description: "Unable to load market data for metadata",
    };
  }
}

// Page Component: Handle params as Promise
export default async function Page({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  try {
    const { marketId } = await params; // Await params
    const market = await fetchMarketData(marketId);
    console.log(`Market ${marketId}:`, market); // Debug log
    return (
      <div className="container mx-auto p-4">
        <MiniAppClient />
        <MarketCard index={Number(marketId)} market={market} />
      </div>
    );
  } catch (error) {
    console.error("Error rendering market page:", error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-600">Market Not Found</h1>
        <p>
          There was an error loading the market data. Please try again later.
        </p>
      </div>
    );
  }
}
