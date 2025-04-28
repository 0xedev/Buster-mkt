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
    throw error; // Re-throw to be caught by generateMetadata/Page
  }
}

// --- Updated generateMetadata for Next.js 15+ ---
export async function generateMetadata(
  // Accept the props object containing the Promise
  props: { params: Promise<{ marketId: string }> }
): Promise<Metadata> {
  try {
    // Await the params Promise to get the actual params object
    const params = await props.params;
    const market = await fetchMarketData(params.marketId);

    // --- Frame Metadata Update (Using standard fc:frame tags) ---
    const imageUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/market-image?marketId=${params.marketId}`;
    const postUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/frame-action`; // You'll need an API route to handle frame actions if using 'post' buttons
    const marketUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/market/${params.marketId}`;

    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0
        ? ((Number(market.totalOptionAShares) / Number(total)) * 100).toFixed(1)
        : "0";

    return {
      title: market.question,
      description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
      // Use standard fc:frame tags directly
      other: {
        "fc:frame": "vNext",
        "fc:frame:image": imageUrl,
        "fc:frame:post_url": postUrl, // Needed if you have post buttons
        "fc:frame:button:1": "View Market",
        "fc:frame:button:1:action": "link",
        "fc:frame:button:1:target": marketUrl,
        // Add more buttons if needed
      },
      // Open Graph metadata
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
      ),
      openGraph: {
        title: market.question,
        description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
        images: [
          {
            url: imageUrl,
            width: 1200, // Match your image dimensions (e.g., 1200x800)
            height: 800, // Match your image dimensions
            alt: market.question,
          },
        ],
        url: marketUrl,
        type: "website",
      },
      // Twitter card metadata
      twitter: {
        card: "summary_large_image",
        title: market.question,
        description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
        images: [imageUrl],
      },
    };
  } catch (error) {
    // Log the error for debugging on the server
    console.error("Error generating metadata:", error);
    return {
      title: "Market Not Found",
      description: "Unable to load market data for metadata",
    };
  }
}

// --- Updated Page Component for Next.js 15+ ---
export default async function Page(
  // Accept the props object containing the Promise
  props: { params: Promise<{ marketId: string }> }
) {
  try {
    // Await the params Promise to get the actual params object
    const params = await props.params;
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
  } catch (error) {
    // Log the error for debugging on the server
    console.error("Error rendering market page:", error);
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold">Market Not Found</h1>
        <p>Unable to load market data. Please try again.</p>
      </div>
    );
  }
}
