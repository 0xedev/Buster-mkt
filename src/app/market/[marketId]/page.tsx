import {
  contractAddress,
  contractAbi,
  publicClient,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { Metadata, ResolvingMetadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Address } from "viem";

// Policast Market Info from PolicastViews.getMarketInfo
type MarketInfoContractReturn = readonly [
  string, // question
  string, // description
  bigint, // endTime
  number, // category
  number, // marketType
  boolean, // resolved
  boolean, // invalidated
  Address, // creator
  bigint // lmsrB
];

// Helper function to fetch market data from Policast
async function fetchMarketData(marketId: string) {
  if (!process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL) {
    throw new Error("NEXT_PUBLIC_ALCHEMY_RPC_URL is not set");
  }

  const marketIdBigInt = BigInt(marketId);

  // Fetch from PolicastViews
  const marketInfo = (await publicClient.readContract({
    address: PolicastViews,
    abi: PolicastViewsAbi,
    functionName: "getMarketInfo",
    args: [marketIdBigInt],
  })) as unknown as MarketInfoContractReturn;

  // Verify market exists (question should not be empty)
  if (!marketInfo[0]) {
    throw new Error(`Market ${marketId} not found`);
  }

  return marketInfo;
}

export async function generateMetadata(
  { params }: { params: Promise<{ marketId: string }> },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  parent: ResolvingMetadata
): Promise<Metadata> {
  try {
    const { marketId } = await params;

    if (!marketId || isNaN(Number(marketId))) {
      console.error("generateMetadata: Invalid marketId", marketId);
      throw new Error("Invalid marketId");
    }

    const marketInfo = await fetchMarketData(marketId);

    const market = {
      question: marketInfo[0],
      description: marketInfo[1],
      endTime: marketInfo[2],
      category: marketInfo[3],
      marketType: marketInfo[4],
      resolved: marketInfo[5],
      invalidated: marketInfo[6],
      creator: marketInfo[7],
      version: "v2",
    };

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
    const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}`;
    const postUrl = `${baseUrl}/api/frame-action`;
    const marketUrl = `${baseUrl}/market/${marketId}/details`;

    const description = `View market: ${market.question}`;

    return {
      title: market.question,
      description,
      other: {
        "fc:miniapp": "vNext",
        "fc:miniapp:image": imageUrl,
        "fc:miniapp:post_url": postUrl,
        "fc:miniapp:button:1": "View",
        "fc:miniapp:button:1:action": "post",
        "fc:miniapp:state": Buffer.from(JSON.stringify({ marketId })).toString(
          "base64"
        ),
      },
      metadataBase: new URL(baseUrl),
      openGraph: {
        title: market.question,
        description,
        images: [
          { url: imageUrl, width: 1200, height: 630, alt: market.question },
        ],
        url: marketUrl,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: market.question,
        description,
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

export default async function MarketPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;

  if (!marketId || isNaN(Number(marketId))) {
    notFound();
  }

  redirect(`/market/${marketId}/details`);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <p className="mb-4">Redirecting to market details...</p>
      <Button asChild variant="outline">
        <Link href="/">Home</Link>
      </Button>
    </div>
  );
}
