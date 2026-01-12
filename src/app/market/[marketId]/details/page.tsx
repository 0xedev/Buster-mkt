import { createPublicClient, http } from "viem";
import {
  contractAddress,
  contractAbi,
  PolicastViews,
  PolicastViewsAbi,
} from "@/constants/contract";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import { MarketDetailsClient } from "@/components/MarketDetailsClient";
import { fetchMarketData as fetchMarketDataFromMigration } from "@/lib/market-migration";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MarketSharesDisplay } from "@/components/market-shares-display";
import { customBase } from "@/constants/chains";

// Policast Market Info Contract Return
type MarketInfoContractReturn = readonly [
  string, // question
  string, // description
  bigint, // endTime
  number, // category
  bigint, // optionCount
  boolean, // resolved
  number, // marketType
  boolean, // invalidated
  bigint // totalVolume
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

  try {
    const publicClient = createPublicClient({
      chain: customBase,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
    });

    // Use the same migration fetch logic as the page for consistency
    const marketResult = await fetchMarketDataFromMigration(Number(marketId));

    // Policast-only - migration always returns v2 format
    const market = marketResult.market as any;

    // Create a description with options
    const optionNames =
      market.options?.map((opt: any) =>
        typeof opt === "string" ? opt : opt.name
      ) || [];
    const optionsDesc = `Options: ${optionNames.join(", ")}`;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
    const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}`;

    const marketUrl = `${baseUrl}/market/${marketId}/details`;

    const description = `View market: ${market.question} - ${market.optionCount} options available`;

    const miniAppEmbed = {
      version: "1" as const,
      imageUrl: imageUrl,
      button: {
        title: "View Market Details",
        action: {
          type: "launch_miniapp" as const,
          name: "Policast",
          url: marketUrl,
          iconUrl: "https://buster-mkt.vercel.app/icon.png",
          splashImageUrl: "https://buster-mkt.vercel.app/icon.jpg",
          splashBackgroundColor: "#131E2A",
        },
      },
    };

    const resolvedParent = await parent;
    const otherParentData = resolvedParent.other || {};

    // Ensure fc:miniapp is explicitly a string key
    const fcFrameKey = "fc:miniapp" as string;
    return {
      title: market.question,
      description,
      other: {
        ...otherParentData, // Spread parent's other metadata first
        [fcFrameKey]: JSON.stringify(miniAppEmbed),
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
    console.error("generateMetadata: Error processing market metadata:", error);
    return {
      title: "Market Not Found",
      description: "Unable to load market data for metadata",
    };
  }
}

export default async function MarketDetailsPage({ params }: Props) {
  const { marketId } = await params;

  if (!marketId || isNaN(Number(marketId))) {
    notFound();
  }

  try {
    const publicClient = createPublicClient({
      chain: customBase,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL),
    });

    // Use the shared migration fetch which already implements consistent market fetching
    const marketResult = await fetchMarketDataFromMigration(Number(marketId));

    // The migration fetcher may return either a raw contract tuple or a pre-parsed Market object.
    const raw = marketResult.market as any;

    let market: any;
    // If it's already parsed by migration (has options array), use it directly
    if (raw && Array.isArray(raw.options)) {
      // Defensive normalization: ensure optionShares exists and marketType is a safe number
      market = {
        question: raw.question,
        description: raw.description,
        endTime: raw.endTime,
        category: raw.category,
        optionCount: Number(raw.optionCount ?? raw.options.length ?? 0),
        resolved: Boolean(raw.resolved),
        disputed: Boolean(raw.disputed),
        winningOptionId: Number(raw.winningOptionId ?? raw.winningOption ?? 0),
        creator: raw.creator,
        earlyResolutionAllowed: Boolean(raw.earlyResolutionAllowed ?? false),
        version: "v2",
        options: raw.options,
        optionShares: Array.isArray(raw.optionShares) ? raw.optionShares : [],
        marketType:
          Number((marketResult as any).marketType ?? raw.marketType ?? 0) || 0,
      };
    } else {
      // Otherwise treat it as the raw contract tuple and fetch options ourselves
      const marketData = raw as MarketInfoContractReturn;

      // Fetch all options for this market
      const optionCount = Number(marketData[4]);
      const options: string[] = [];
      const optionShares: bigint[] = [];

      for (let i = 0; i < optionCount; i++) {
        try {
          const optionData = await publicClient.readContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: "getMarketOption",
            args: [BigInt(marketId), BigInt(i)],
          });

          const [name, , totalShares] = optionData as [
            string,
            string,
            bigint,
            bigint,
            bigint,
            boolean
          ];
          options.push(name);
          optionShares.push(totalShares);
        } catch (error) {
          console.error(`Error fetching option ${i}:`, error);
          options.push(`Option ${i + 1}`);
          optionShares.push(0n);
        }
      }

      market = {
        question: marketData[0],
        description: marketData[1],
        endTime: marketData[2],
        category: marketData[3],
        optionCount: optionCount,
        resolved: marketData[5],
        disputed: false, // Policast doesn't expose disputed in basic info
        winningOptionId: 0, // Will be fetched separately if resolved
        creator: "", // Will be fetched separately
        earlyResolutionAllowed: false, // Will be fetched separately
        version: "v2",
        options,
        optionShares,
        marketType: Number(marketData[6]) || 0,
      };
    }

    // Use the market object built above, which already selects V2 if active
    return <MarketDetailsClient marketId={marketId} market={market} />;
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    notFound();
  }
}
