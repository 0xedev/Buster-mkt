import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";

// Define contract using environment variable
const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const predictionMarketContract = getContract({
  client,
  chain: base,
  address: contractAddress,
});

// Define market info type based on contract's getMarketInfo
type MarketInfo = readonly [
  string, // question
  string, // optionA
  string, // optionB
  bigint, // endTime
  number, // outcome (enum MarketOutcome: 0=UNRESOLVED, 1=OPTION_A, 2=OPTION_B)
  bigint, // totalOptionAShares
  bigint, // totalOptionBShares
  boolean // resolved
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");

  if (!marketId) {
    return new Response("Missing market ID", { status: 400 });
  }

  try {
    const marketIdBigInt = BigInt(marketId);

    // Fetch data
    const marketData = (await readContract({
      contract: predictionMarketContract,
      method:
        "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
      params: [marketIdBigInt],
    })) as MarketInfo;

    const [
      question,
      optionA,
      optionB,
      ,
      ,
      totalOptionAShares,
      totalOptionBShares,
    ] = marketData;

    // Calculate percentages
    const total = totalOptionAShares + totalOptionBShares;
    const yesPercent =
      total > 0n
        ? (Number((totalOptionAShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";
    const noPercent =
      total > 0n
        ? (Number((totalOptionBShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "1200px",
            height: "800px",
            background: "#ffffff",
            padding: "40px",
            fontFamily: "Arial, sans-serif",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <h1
            style={{ fontSize: "48px", marginBottom: "40px", maxWidth: "90%" }}
          >
            {question}
          </h1>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              width: "80%",
            }}
          >
            <p style={{ fontSize: "36px" }}>
              {optionA}: {yesPercent}%
            </p>
            <p style={{ fontSize: "36px" }}>
              {optionB}: {noPercent}%
            </p>
          </div>
          <p
            style={{
              fontSize: "24px",
              color: "#666",
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            Bet on Buster Market - buster-mkt.vercel.app
          </p>
        </div>
      ),
      {
        width: 1200,
        height: 800,
        headers: { "Cache-Control": "public, max-age=300" },
      }
    );
  } catch (error) {
    console.error(`Failed to generate image for market ${marketId}:`, error);
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1200px",
            height: "800px",
            background: "#f0f0f0",
            color: "#333",
            fontSize: "32px",
          }}
        >
          Error generating market image.
        </div>
      ),
      { status: 500, width: 1200, height: 800 }
    );
  }
}

export const dynamic = "force-dynamic";
