import { Metadata, ResolvingMetadata } from "next"; // Import ResolvingMetadata
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import { MarketCard, Market } from "@/components/marketCard";
import { MiniAppClient } from "@/components/MiniAppClient";

// Define contract (keep as is)
const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const contract = getContract({
  client,
  chain: base,
  address: contractAddress,
});

// Type for contract return (keep as is)
type MarketInfoContractReturn = readonly [
  string, // question
  string, // optionA
  string, // optionB
  bigint, // endTime
  number, // outcome (uint8)
  bigint, // totalOptionAShares
  bigint, // totalOptionBShares
  boolean // resolved
];

// Fetch market data (keep as is)
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

// --- Define Props Interface for the Page and Metadata ---
interface MarketPageProps {
  params: { marketId: string };
  // searchParams?: { [key: string]: string | string[] | undefined }; // Add if needed
}
// --- END Props Interface ---

// --- generateMetadata function: Use standard signature ---
export async function generateMetadata(
  { params }: MarketPageProps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parent: ResolvingMetadata // Add parent parameter type
): Promise<Metadata> {
  try {
    // params is already destructured
    const market = await fetchMarketData(params.marketId);

    const imageUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/market-image?marketId=${params.marketId}`;
    const postUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/frame-action`;
    const marketUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/market/${params.marketId}`;

    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0n
        ? (Number((market.totalOptionAShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";

    // Optionally merge with parent metadata if needed
    // const previousImages = (await parent).openGraph?.images || []

    return {
      title: market.question,
      description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
      other: {
        "fc:frame": "vNext",
        "fc:frame:image": imageUrl,
        "fc:frame:post_url": postUrl,
        "fc:frame:button:1": `Bet on ${market.optionA}`,
        "fc:frame:button:1:action": "post",
        "fc:frame:button:2": "View Market",
        "fc:frame:button:2:action": "link",
        "fc:frame:button:2:target": marketUrl,
        // Add other necessary frame inputs if needed
        "fc:frame:input:text": "Enter amount in $BSTR",
      },
      metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
      ),
      openGraph: {
        title: market.question,
        description: `Bet on ${market.question} - ${market.optionA}: ${yesPercent}%`,
        images: [
          { url: imageUrl, width: 1200, height: 630, alt: market.question },
          // ...previousImages, // Example of using parent metadata
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
    // Return minimal metadata on error
    return {
      title: "Market Not Found",
      description: "Unable to load market data for metadata",
    };
  }
}
// --- END generateMetadata ---

// --- Page Component: Use standard signature ---
export default async function Page({ params }: MarketPageProps) {
  try {
    // params is already destructured
    const market = await fetchMarketData(params.marketId);

    return (
      <div className="container mx-auto p-4">
        <MiniAppClient />
        <MarketCard index={Number(params.marketId)} market={market} />
      </div>
    );
  } catch (error) {
    console.error("Error rendering market page:", error);
    // Render an error state
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-600">Market Not Found</h1>
        <p>
          There was an error loading the market data. Please try again later.
        </p>
        {/* Optionally display error details during development */}
        {/* process.env.NODE_ENV === 'development' && <pre>{error.message}</pre> */}
      </div>
    );
  }
}
// --- END Page Component ---
