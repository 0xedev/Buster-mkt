import { NextRequest, NextResponse } from "next/server";
import { contract, contractAbi, publicClient } from "@/constants/contract";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "node:path";
import { format } from "date-fns";

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
    if (!process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL) {
      throw new Error("NEXT_PUBLIC_ALCHEMY_RPC_URL is not set");
    }

    const marketData = (await publicClient.readContract({
      address: contract.address,
      abi: contractAbi,
      functionName: "getMarketInfo",
      args: [BigInt(marketId)],
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
  cardBg: "#f9fafb",
  primary: "#2563eb",
  secondary: "#7c3aed",
  success: "#059669",
  danger: "#dc2626",
  text: {
    primary: "#111827",
    secondary: "#4b5563",
    light: "#9ca3af",
  },
  border: "#e5e7eb",
  gradient: {
    primary: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
    header: "linear-gradient(90deg, #1e40af 0%, #7e22ce 100%)",
    footer:
      "linear-gradient(90deg, rgba(37, 99, 235, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)",
  },
  shadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
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
          width: "1170px",
          height: "680px",
          backgroundColor: colors.background,
          color: colors.text.primary,
          fontFamily: '"Inter"',
          padding: "0px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.05) 0%, transparent 30%), radial-gradient(circle at 90% 80%, rgba(124, 58, 237, 0.05) 0%, transparent 30%)",
            zIndex: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "180px",
            backgroundImage: colors.gradient.header,
            zIndex: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            margin: "50px",
            padding: "40px",
            backgroundColor: colors.cardBg,
            borderRadius: "28px",
            boxShadow: colors.shadow,
            flexDirection: "column",
            height: "536px",
            zIndex: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "8px",
              backgroundImage: colors.gradient.primary,
              zIndex: 2,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "31px",
                  fontWeight: 800,
                  color: colors.primary,
                  letterSpacing: "-0.5px",
                }}
              >
                POLICAST
              </div>
              <div
                style={{
                  display: "flex",
                  backgroundColor: statusColor,
                  color: "white",
                  padding: "8px 20px",
                  borderRadius: "18px",
                  fontSize: "18px",
                  fontWeight: 600,
                  boxShadow: `0 2px 4px ${statusColor}80`,
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
                padding: "8px 20px",
                borderRadius: "18px",
                fontSize: "18px",
                fontWeight: 600,
                boxShadow: `0 2px 4px ${
                  !timeStatus.isEnded && !market.resolved
                    ? `${colors.primary}80`
                    : `${colors.text.light}80`
                }`,
              }}
            >
              {timeStatus.text}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              color: colors.text.light,
              marginBottom: "30px",
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
              padding: "0 25px",
            }}
          >
            <h1
              style={{
                display: "flex",
                fontSize: "52px",
                fontWeight: 800,
                textAlign: "center",
                marginBottom: "50px",
                lineHeight: 1.2,
                color: colors.text.primary,
                letterSpacing: "-0.03em",
              }}
            >
              {market.question}
            </h1>
            <div
              style={{
                display: "flex",
                width: "95%",
                flexDirection: "column",
                gap: "26px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
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
                      fontSize: "26px",
                      fontWeight: 700,
                      color: optionAColor,
                    }}
                  >
                    {market.optionA}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "26px",
                      fontWeight: 700,
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
                    height: "14px",
                    backgroundColor: `${colors.border}`,
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${optionAPercentNum}%`,
                      height: "100%",
                      backgroundImage:
                        market.resolved && market.outcome === 1
                          ? "linear-gradient(90deg, #059669 0%, #10b981 100%)"
                          : "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  />
                </div>
                {market.resolved && market.outcome === 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: colors.success,
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z"
                        fill="#059669"
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
                  gap: "12px",
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
                      fontSize: "26px",
                      fontWeight: 700,
                      color: optionBColor,
                    }}
                  >
                    {market.optionB}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "26px",
                      fontWeight: 700,
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
                    height: "14px",
                    backgroundColor: `${colors.border}`,
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${optionBPercentNum}%`,
                      height: "100%",
                      backgroundImage:
                        market.resolved && market.outcome === 2
                          ? "linear-gradient(90deg, #059669 0%, #10b981 100%)"
                          : "linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  />
                </div>
                {market.resolved && market.outcome === 2 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: colors.success,
                      fontSize: "18px",
                      fontWeight: 600,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z"
                        fill="#059669"
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
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: `1px solid ${colors.border}`,
              backgroundImage: colors.gradient.footer,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "21px",
                color: colors.text.secondary,
                alignItems: "center",
                gap: "14px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="#4b5563"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 6V12L16 14"
                  stroke="#4b5563"
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
        width: 1170,
        height: 680,
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

    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toBuffer();

    console.log(
      `Market Image API: Successfully generated PNG for marketId ${marketId}`
    );

    return new NextResponse(new Blob([new Uint8Array(pngBuffer)]), {
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
