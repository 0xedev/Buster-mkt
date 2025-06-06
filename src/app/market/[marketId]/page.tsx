import { contract, contractAbi, publicClient } from "@/constants/contract";
import { Metadata, ResolvingMetadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function fetchMarketData(marketId: string) {
  if (!process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL) {
    throw new Error("NEXT_PUBLIC_ALCHEMY_RPC_URL is not set");
  }

  const marketData = await publicClient.readContract({
    address: contract.address,
    abi: contractAbi,
    functionName: "getMarketInfo",
    args: [BigInt(marketId)],
  });
  return marketData;
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

    const marketData = await fetchMarketData(marketId);

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
    const postUrl = `${baseUrl}/api/frame-action`;
    const marketUrl = `${baseUrl}/market/${marketId}/details`;

    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0n
        ? (Number((market.totalOptionAShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";

    return {
      title: market.question,
      description: `View market: ${market.question} - ${market.optionA}: ${yesPercent}%`,
      other: {
        "fc:frame": "vNext",
        "fc:frame:image": imageUrl,
        "fc:frame:post_url": postUrl,
        "fc:frame:button:1": "View",
        "fc:frame:button:1:action": "post",
        "fc:frame:state": Buffer.from(JSON.stringify({ marketId })).toString(
          "base64"
        ),
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
