import { createPublicClient, http } from "viem";
import { contract, contractAbi } from "@/constants/contract";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import { MarketDetailsClient } from "@/components/MarketDetailsClient";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MarketSharesDisplay } from "@/components/market-shares-display";
import { customBase } from "@/constants/chains";

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

interface Props {
  params: Promise<{ marketId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ marketId: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { marketId } = await params;

  if (!marketId || isNaN(Number(marketId))) {
    console.error("generateMetadata: Invalid marketId", marketId);
    return {
      title: "Market Not Found",
      description: "Unable to load market data for metadata",
    };
  }

  const publicClient = createPublicClient({
    chain: customBase,
    transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
  });

  const marketData = (await publicClient.readContract({
    address: contract.address,
    abi: contractAbi,
    functionName: "getMarketInfo",
    args: [BigInt(marketId)],
  })) as MarketInfoContractReturn;

  const market = {
    question: marketData[0],
    optionA: marketData[1],
    optionB: marketData[2],
    endTime: marketData[3],
    outcome: marketData[4],
    totalOptionAShares: marketData[5],
    totalOptionBShares: marketData[6],
    resolved: marketData[7],
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
  const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}`;

  const marketUrl = `${baseUrl}/market/${marketId}/details`;

  const total = market.totalOptionAShares + market.totalOptionBShares;
  const yesPercent =
    total > 0n
      ? (Number((market.totalOptionAShares * 1000n) / total) / 10).toFixed(1)
      : "0.0";

  const miniAppEmbed = {
    version: "next" as const,
    imageUrl: imageUrl,
    button: {
      title: "View Market Details",
      action: {
        type: "launch_frame" as const,
        name: market.question.substring(0, 30),
        url: marketUrl,
        iconUrl: "https://buster-mkt.vercel.app/icon.png",
        splashImageUrl: "https://buster-mkt.vercel.app/icon.jpg",
        splashBackgroundColor: "#ffffff",
      },
    },
  };

  const resolvedParent = await parent;
  const otherParentData = resolvedParent.other || {};

  // Ensure fc:frame is explicitly a string key
  const fcFrameKey = "fc:frame" as string;
  return {
    title: market.question,
    description: `View market: ${market.question} - ${market.optionA}: ${yesPercent}%`,
    other: {
      ...otherParentData, // Spread parent's other metadata first
      [fcFrameKey]: JSON.stringify(miniAppEmbed),
    },
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: market.question,
      description: `View market: ${market.question} - ${market.optionA}: ${yesPercent}%`,
      images: [
        { url: imageUrl, width: 1200, height: 630, alt: market.question },
      ],
      url: marketUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: market.question,
      description: `View market: ${market.question} - ${market.optionA}: ${yesPercent}%`,
      images: [imageUrl],
    },
  };
}

export default async function MarketDetailsPage({ params }: Props) {
  const { marketId } = await params;

  if (!marketId || isNaN(Number(marketId))) {
    notFound();
  }

  let marketData: MarketInfoContractReturn;
  try {
    const publicClient = createPublicClient({
      chain: customBase,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
    });

    marketData = (await publicClient.readContract({
      address: contract.address,
      abi: contractAbi,
      functionName: "getMarketInfo",
      args: [BigInt(marketId)],
    })) as MarketInfoContractReturn;
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    notFound();
  }

  const market = {
    question: marketData[0],
    optionA: marketData[1],
    optionB: marketData[2],
    endTime: marketData[3],
    outcome: marketData[4],
    totalOptionAShares: marketData[5],
    totalOptionBShares: marketData[6],
    resolved: marketData[7],
  };

  return <MarketDetailsClient marketId={marketId} market={market} />;
}
