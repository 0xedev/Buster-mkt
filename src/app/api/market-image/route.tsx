import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "node:path";
import { format } from "date-fns";

const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const contract = getContract({
  client,
  chain: base,
  address: contractAddress,
});

interface MarketImageData {
  question: string;
  optionA: string;
  optionB: string;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  endTime: bigint;
  resolved: boolean;
  outcome: number;
}

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

async function fetchMarketData(marketId: string): Promise<MarketImageData> {
  console.log(`Market Image API: Fetching info for marketId ${marketId}...`);
  try {
    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfoContractReturn;

    console.log(
      `Market Image API: Raw data received for marketId ${marketId}:`,
      marketData
    );

    if (!marketData || !Array.isArray(marketData) || marketData.length < 8) {
      console.error(
        `Market Image API: Invalid or incomplete data received from contract for marketId ${marketId}`,
        marketData
      );
      throw new Error("Incomplete data received from contract");
    }

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
    console.error(
      `Market Image API: Failed to fetch or parse market ${marketId}:`,
      error
    );
    throw error;
  }
}

function formatTimeStatus(endTimeSeconds: bigint): {
  text: string;
  isEnded: boolean;
} {
  try {
    const endTimeMs = Number(endTimeSeconds) * 1000;
    const now = Date.now();
    const isEnded = now > endTimeMs;

    if (isEnded) {
      return {
        text: `Ended ${format(new Date(endTimeMs), "MMM d, yyyy")}`,
        isEnded,
      };
    }

    const diffMs = endTimeMs - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    // Format time display
    if (diffDays > 0) {
      return {
        text: `${diffDays}d ${diffHours}h remaining`,
        isEnded,
      };
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        text: `${diffHours}h ${diffMinutes}m remaining`,
        isEnded,
      };
    }
  } catch (e) {
    console.error("Error calculating time status:", e);
    return { text: "Unknown time", isEnded: false };
  }
}

const regularFontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Inter",
  "static",
  "Inter_18pt-Regular.ttf"
);
const boldFontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Inter",
  "static",
  "Inter_18pt-Bold.ttf"
);
const mediumFontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Inter",
  "static",
  "Inter_18pt-Medium.ttf"
);

console.log("Attempting to load fonts from:", regularFontPath, boldFontPath);

const regularFontDataPromise = fs.readFile(regularFontPath);
const boldFontDataPromise = fs.readFile(boldFontPath);
const mediumFontDataPromise = fs.readFile(mediumFontPath).catch(() => null);

const colors = {
  background: "#ffffff",
  cardBg: "#f8fafc",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  danger: "#ef4444",
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
    light: "#94a3b8",
  },
  border: "#e2e8f0",
  gradient: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");

  console.log(
    `--- Market Image API: Received request for marketId: ${marketId} ---`
  );

  if (!marketId || isNaN(Number(marketId))) {
    console.error("Market Image API: Invalid or missing marketId");
    return new NextResponse("Invalid market ID", { status: 400 });
  }

  try {
    const market = await fetchMarketData(marketId);

    const total = market.totalOptionAShares + market.totalOptionBShares;
    const optionAPercentNum =
      total > 0n
        ? Number((market.totalOptionAShares * 10000n) / total) / 100
        : 50;
    const optionBPercentNum =
      total > 0n
        ? Number((market.totalOptionBShares * 10000n) / total) / 100
        : 50;

    const optionAPercentDisplay = optionAPercentNum.toFixed(1);
    const optionBPercentDisplay = optionBPercentNum.toFixed(1);

    const timeStatus = formatTimeStatus(market.endTime);

    console.log(
      `Market Image API: Generating image for marketId ${marketId} with percentages: ${optionAPercentDisplay}% / ${optionBPercentDisplay}%`
    );

    const [regularFontData, boldFontData, mediumFontData] = await Promise.all([
      regularFontDataPromise,
      boldFontDataPromise,
      mediumFontDataPromise,
    ]);

    let statusText = "Active";
    let statusColor = colors.primary;

    if (market.resolved) {
      statusText = "Resolved";
      statusColor = colors.success;
    } else if (timeStatus.isEnded) {
      statusText = "Unresolved";
      statusColor = colors.danger;
    }

    let optionAColor = colors.primary;
    let optionBColor = colors.secondary;

    if (market.resolved) {
      if (market.outcome === 1) {
        optionAColor = colors.success;
        optionBColor = colors.text.light;
      } else {
        optionAColor = colors.text.light;
        optionBColor = colors.success;
      }
    }

    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "600px", // Adjusted width for the main content box
          height: "360px", // Adjusted height for the main content box
          backgroundColor: colors.background,
          color: colors.text.primary,
          fontFamily: '"Inter"',
          padding: "0px",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "130px",
            backgroundImage: colors.gradient, // Use backgroundImage for gradients
            zIndex: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            margin: "40px",
            padding: "30px", // Slightly reduced padding
            backgroundColor: colors.cardBg,
            borderRadius: "24px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            flexDirection: "column",
            height: "280px", // Adjust height to fit within the new outer dimensions
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              marginBottom: "8px", // Reduced margin
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "24px", // Reduced font size
                  fontWeight: 700,
                  color: colors.primary,
                }}
              >
                POLICAST
              </div>
              <div
                style={{
                  display: "flex",
                  backgroundColor: statusColor,
                  color: "white",
                  padding: "6px 16px",
                  borderRadius: "16px",
                  fontSize: "14px", // Reduced font size
                  fontWeight: 500,
                }}
              >
                {statusText}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor:
                  !timeStatus.isEnded && !market.resolved
                    ? colors.primary
                    : colors.text.light,
                color: "white",
                padding: "6px 16px",
                borderRadius: "16px",
                fontSize: "14px", // Reduced font size
                fontWeight: 500,
              }}
            >
              {timeStatus.text}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "12px", // Reduced font size
              color: colors.text.light,
              marginBottom: "24px", // Reduced margin
              justifyContent: "flex-start",
            }}
          >
            ID: {marketId}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexGrow: 1,
              justifyContent: "center",
              padding: "0 20px", // Reduced padding
            }}
          >
            <h1
              style={{
                display: "flex",
                fontSize: "40px", // Reduced font size
                fontWeight: 700,
                textAlign: "center",
                marginBottom: "40px", // Reduced margin
                lineHeight: 1.3,
                color: colors.text.primary,
              }}
            >
              {market.question}
            </h1>
            <div
              style={{
                display: "flex",
                width: "90%",
                flexDirection: "column",
                gap: "20px", // Reduced gap
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: "20px", // Reduced font size
                      fontWeight: 600, // Slightly bolder for options
                      color: optionAColor,
                    }}
                  >
                    {market.optionA}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "20px", // Reduced font size
                      fontWeight: 600,
                      color: optionAColor,
                    }}
                  >
                    {optionAPercentDisplay}%
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: "10px", // Reduced bar height
                    backgroundColor: colors.border,
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${optionAPercentNum}%`,
                      height: "100%",
                      backgroundColor: optionAColor,
                    }}
                  />
                </div>
                {market.resolved && market.outcome === 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: colors.success,
                      fontSize: "14px", // Reduced font size
                      fontWeight: 500,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z"
                        fill="#10b981"
                      />
                    </svg>
                    Winner
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: "20px", // Reduced font size
                      fontWeight: 600,
                      color: optionBColor,
                    }}
                  >
                    {market.optionB}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "20px", // Reduced font size
                      fontWeight: 600,
                      color: optionBColor,
                    }}
                  >
                    {optionBPercentDisplay}%
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: "10px", // Reduced bar height
                    backgroundColor: colors.border,
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${optionBPercentNum}%`,
                      height: "100%",
                      backgroundColor: optionBColor,
                    }}
                  />
                </div>
                {market.resolved && market.outcome === 2 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: colors.success,
                      fontSize: "14px", // Reduced font size
                      fontWeight: 500,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z"
                        fill="#10b981"
                      />
                    </svg>
                    Winner
                  </div>
                )}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "24px", // Reduced margin
              paddingTop: "16px", // Reduced padding
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                color: colors.text.secondary, // Slightly darker for better readability
                alignItems: "center",
                gap: "12px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 6V12L16 14"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Last updated: {format(new Date(), "MMM d, yyyy")}
            </div>
          </div>
        </div>
      </div>,
      {
        width: 900, // Reduced overall image width
        height: 523, // Adjusted height for ~1.91:1 aspect ratio
        fonts: [
          {
            name: "Inter",
            data: regularFontData,
            weight: 400 as const,
            style: "normal" as const,
          },
          {
            name: "Inter",
            data: boldFontData,
            weight: 700 as const,
            style: "normal" as const,
          },
          ...(mediumFontData
            ? [
                {
                  name: "Inter",
                  data: mediumFontData,
                  weight: 500 as const,
                  style: "normal" as const,
                },
              ]
            : []),
        ],
      }
    );

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    console.log(
      `Market Image API: Successfully generated PNG for marketId ${marketId}`
    );

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error(
      `Market Image API: Overall failure for marketId ${marketId}:`,
      error
    );
    return new NextResponse("Failed to generate image", { status: 500 });
  }
}
