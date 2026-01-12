import { NextRequest, NextResponse } from "next/server";
import {
  contractAddress,
  contractAbi,
  publicClient,
} from "@/constants/contract";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "node:path";
import { format } from "date-fns";
//
interface MarketImageDataV2 {
  question: string;
  description: string;
  endTime: bigint;
  category: number;
  optionCount: number;
  resolved: boolean;
  marketType: number;
  invalidated: boolean;
  winningOptionId: number;
  creator: string;
  version: "v2";
  options: Array<{
    name: string;
    totalShares: bigint;
    currentPrice: bigint;
  }>;
  totalVolume: bigint;
}

type MarketImageData = MarketImageDataV2;

async function fetchMarketData(marketId: string): Promise<MarketImageData> {
  console.log(`Market Image API: Fetching info for marketId ${marketId}...`);
  try {
    if (!process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL) {
      throw new Error("NEXT_PUBLIC_ALCHEMY_RPC_URL is not set");
    }

    const marketIdBigInt = BigInt(marketId);

    const basicInfo = (await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getMarketBasicInfo",
      args: [marketIdBigInt],
    })) as [
      string,
      string,
      bigint,
      number,
      bigint,
      boolean,
      number,
      boolean,
      bigint
    ];

    const extendedMeta = (await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getMarketExtendedMeta",
      args: [marketIdBigInt],
    })) as [bigint, boolean, boolean, string, boolean];

    const question = basicInfo[0];
    const description = basicInfo[1];
    const endTime = basicInfo[2];
    const category = Number(basicInfo[3]);
    const optionCount = Number(basicInfo[4]);
    const resolved = Boolean(basicInfo[5]);
    const marketType = Number(basicInfo[6]);
    const invalidated = Boolean(basicInfo[7]);
    const totalVolume = basicInfo[8];
    const winningOptionId = resolved ? Number(extendedMeta[0]) : 0;
    const creator = extendedMeta[3];

    const options: Array<{
      name: string;
      totalShares: bigint;
      currentPrice: bigint;
    }> = [];

    for (let i = 0; i < optionCount; i++) {
      try {
        const optionData = (await publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: "getMarketOption",
          args: [marketIdBigInt, BigInt(i)],
        })) as [string, string, bigint, bigint, bigint, boolean];

        const [name, , totalShares, optionVolume, currentPrice] = optionData;
        options.push({ name, totalShares, currentPrice });
      } catch (error) {
        console.error(
          `Error fetching option ${i} for market ${marketId}:`,
          error
        );
        options.push({
          name: `Option ${i + 1}`,
          totalShares: 0n,
          currentPrice: 0n,
        });
      }
    }

    return {
      question,
      description,
      endTime,
      category,
      optionCount,
      resolved,
      marketType,
      invalidated,
      winningOptionId,
      creator,
      version: "v2",
      options,
      totalVolume,
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
  console.log("Market Image API: Full URL:", request.url);
  console.log(
    "Market Image API: All search params:",
    Object.fromEntries(searchParams.entries())
  );

  // More robust validation
  if (!marketId) {
    console.error("Market Image API: No marketId parameter provided");
    return new NextResponse("Missing market ID parameter", { status: 400 });
  }

  // Clean the marketId string and validate
  const cleanMarketId = marketId.trim();
  const marketIdNumber = Number(cleanMarketId);

  if (
    isNaN(marketIdNumber) ||
    marketIdNumber < 0 ||
    !Number.isInteger(marketIdNumber)
  ) {
    console.error(
      `Market Image API: Invalid marketId: "${marketId}" (cleaned: "${cleanMarketId}")`
    );
    return new NextResponse("Invalid market ID format", { status: 400 });
  }

  try {
    const [regularFontData, boldFontData, mediumFontData] = await Promise.all([
      regularFontDataPromise,
      boldFontDataPromise,
      mediumFontDataPromise.catch(() => null),
    ]);

    console.log(
      `Market Image API: Successfully loaded fonts for marketId ${cleanMarketId}`
    );

    const market = await fetchMarketData(cleanMarketId);
    console.log(
      `Market Image API: Market data processed for marketId ${cleanMarketId}:`,
      market
    );

    // Truncate long questions and adjust font sizes
    const truncateText = (text: string, maxLength: number) => {
      return text.length > maxLength
        ? text.substring(0, maxLength) + "..."
        : text;
    };

    const optionColors = [
      "#2563eb", // blue
      "#7c3aed", // purple
      "#059669", // green
      "#dc2626", // red
      "#f59e0b", // amber
      "#06b6d4", // cyan
      "#ec4899", // pink
      "#8b5cf6", // violet
    ];

    const optionsData = market.options.map((opt, idx) => {
      // currentPrice is 1e18 probability; convert to percentage
      const probability = Math.max(
        0,
        Math.min(100, (Number(opt.currentPrice) / 1e18) * 100)
      );

      return {
        name: truncateText(opt.name, 25),
        percentage: probability,
        color: optionColors[idx % optionColors.length],
      };
    });

    const totalVolumeFormatted = (
      Number(market.totalVolume) /
      10 ** 18
    ).toLocaleString(undefined, { maximumFractionDigits: 0 });

    const timeStatus = formatTimeStatus(market.endTime);

    const questionText = truncateText(market.question, 120);

    // Dynamic font sizing based on question length
    const questionFontSize =
      market.question.length > 80 ? 26 : market.question.length > 50 ? 30 : 34;
    const optionFontSize = market.optionCount > 3 ? 14 : 16;

    const jsx = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "900px",
          height: "600px",
          backgroundColor: colors.background,
          padding: "30px",
          fontFamily: "Inter",
        }}
      >
        {/* Header with gradient */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "30px",
            padding: "20px 30px",
            background: colors.gradient.header,
            borderRadius: "16px",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            🎯 Policast
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                opacity: 0.8,
              }}
            >
              Market #{cleanMarketId}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Vol: {totalVolumeFormatted} $POLITICS
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            backgroundColor: colors.cardBg,
            borderRadius: "20px",
            padding: "35px",
            border: `2px solid ${colors.border}`,
            position: "relative",
          }}
        >
          {/* Question - with dynamic font size */}
          <div
            style={{
              display: "flex",
              fontSize: `${questionFontSize}px`,
              fontWeight: "bold",
              color: colors.text.primary,
              marginBottom: "25px",
              lineHeight: 1.3,
              wordWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {questionText}
          </div>

          {/* Status and time info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "30px",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                backgroundColor: market.resolved
                  ? "#dcfce7"
                  : timeStatus.isEnded
                  ? "#fef3c7"
                  : "#dbeafe",
                color: market.resolved
                  ? "#166534"
                  : timeStatus.isEnded
                  ? "#92400e"
                  : "#1e40af",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {market.resolved ? "🏆 Resolved" : timeStatus.text}
            </div>
          </div>

          {/* Options with progress bars */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: market.optionCount > 3 ? "12px" : "18px",
              flex: 1,
            }}
          >
            {optionsData.map((option, idx) => (
              <div
                key={idx}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: `${optionFontSize}px`,
                      fontWeight: "600",
                      color: colors.text.primary,
                    }}
                  >
                    {option.name}
                  </span>
                  <span
                    style={{
                      fontSize: market.optionCount > 3 ? "16px" : "18px",
                      fontWeight: "bold",
                      color: option.color,
                    }}
                  >
                    {option.percentage.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: market.optionCount > 3 ? "8px" : "10px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${option.percentage}%`,
                      height: "100%",
                      backgroundColor: option.color,
                      borderRadius: "6px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer - only show if resolved */}
          {market.resolved && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "20px",
                padding: "18px 24px",
                background: colors.gradient.footer,
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "13px",
                    color: colors.text.secondary,
                    marginBottom: "4px",
                  }}
                >
                  🏆 Winner
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: colors.success,
                  }}
                >
                  {truncateText(
                    optionsData[Number(market.winningOptionId)]?.name ||
                      `Option ${Number(market.winningOptionId) + 1}`,
                    30
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const svg = await satori(jsx, {
      width: 900,
      height: 600,
      fonts: [
        {
          name: "Inter",
          data: regularFontData,
          weight: 400 as const,
          style: "normal",
        },
        {
          name: "Inter",
          data: boldFontData,
          weight: 700 as const,
          style: "normal",
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
    });

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    console.log(
      `Market Image API: Successfully generated image for marketId ${cleanMarketId}`
    );

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error(
      `Market Image API: Error generating image for marketId ${cleanMarketId}:`,
      error
    );
    return new NextResponse("Error generating image", { status: 500 });
  }
}
