import { NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import satori from "satori";
import sharp from "sharp";

// Define contract
const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const contract = getContract({
  client,
  chain: base,
  address: contractAddress,
});

interface Market {
  question: string;
  optionA: string;
  optionB: string;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
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
    };
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("marketId");

    if (!marketId || isNaN(Number(marketId))) {
      return new NextResponse("Invalid marketId", { status: 400 });
    }

    const market = await fetchMarketData(marketId);
    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercent =
      total > 0
        ? ((Number(market.totalOptionAShares) / Number(total)) * 100).toFixed(1)
        : "0";
    const noPercent =
      total > 0
        ? ((Number(market.totalOptionBShares) / Number(total)) * 100).toFixed(1)
        : "0";

    // Generate SVG with satori (3:2 ratio, 1200x800)
    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "800px",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "Inter",
          textAlign: "center",
          padding: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            marginBottom: "60px",
            maxWidth: "1000px",
          }}
        >
          {market.question.length > 60
            ? market.question.slice(0, 57) + "..."
            : market.question}
        </h1>
        <div style={{ fontSize: "30px", marginBottom: "30px" }}>
          {market.optionA}: {yesPercent}%
        </div>
        <div style={{ fontSize: "30px", marginBottom: "60px" }}>
          {market.optionB}: {noPercent}%
        </div>
        <div style={{ fontSize: "24px", color: "#888888" }}>Buster Market</div>
      </div>,
      {
        width: 1200,
        height: 800,
        fonts: [
          {
            name: "Inter",
            data: await fetch(
              "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2"
            ).then((res) => res.arrayBuffer()),
            weight: 700,
            style: "normal",
          },
        ],
      }
    );

    // Convert SVG to PNG with sharp
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to generate market image:", error);
    return new NextResponse("Failed to generate image", { status: 500 });
  }
}
