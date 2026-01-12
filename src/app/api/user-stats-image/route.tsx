import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  contractAddress,
  contractAbi,
} from "@/constants/contract";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "node:path";
import { type Address } from "viem";

interface UserStatsData {
  totalTrades: number;
  totalInvested: bigint;
  netWinnings: bigint;
  winRate: number;
  wins: number;
  losses: number;
  v2Portfolio?: {
    totalInvested: bigint;
    totalWinnings: bigint;
    unrealizedPnL: bigint;
    realizedPnL: bigint;
    tradeCount: number;
  };
}

async function fetchUserStats(address: Address): Promise<UserStatsData> {
  try {
    type V2PortfolioTuple = readonly [bigint, bigint, bigint, bigint, bigint];
    const v2PortfolioTuple = (await publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "userPortfolios",
      args: [address],
    })) as V2PortfolioTuple;

    const v2TradeCount = Number(v2PortfolioTuple[4]);
    const totalInvested = v2PortfolioTuple[0];
    const netWinnings = v2PortfolioTuple[1];

    return {
      totalTrades: v2TradeCount,
      totalInvested,
      netWinnings,
      winRate: 0,
      wins: 0,
      losses: 0,
      v2Portfolio: {
        totalInvested: v2PortfolioTuple[0],
        totalWinnings: v2PortfolioTuple[1],
        unrealizedPnL: v2PortfolioTuple[2],
        realizedPnL: v2PortfolioTuple[3],
        tradeCount: Number(v2PortfolioTuple[4]),
      },
    };
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    throw error;
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

const regularFontDataPromise = fs.readFile(regularFontPath);
const boldFontDataPromise = fs.readFile(boldFontPath);

const colors = {
  background: "#ffffff",
  cardBg: "#f8fafc",
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
    header: "linear-gradient(90deg, #1e40af 0%, #7e22ce 100%)",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const username = searchParams.get("username");
  const pfpUrl = searchParams.get("pfpUrl");
  const fid = searchParams.get("fid");

  console.log(`User Stats Image API: Received request for address: ${address}`);

  if (!address) {
    console.error("User Stats Image API: No address parameter provided");
    return new NextResponse("Missing address parameter", { status: 400 });
  }

  try {
    const [regularFontData, boldFontData] = await Promise.all([
      regularFontDataPromise,
      boldFontDataPromise,
    ]);

    const stats = await fetchUserStats(address as Address);

    // Format amounts for display (assuming 18 decimals)
    const formatAmount = (amount: bigint) => {
      return (Number(amount) / 10 ** 18).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
    };

    const displayUsername = username || "Anonymous Trader";
    const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    const jsx = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "900px",
          height: "600px",
          backgroundColor: colors.background,
          padding: "40px",
          fontFamily: "Inter",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
            padding: "24px",
            background: colors.gradient.header,
            borderRadius: "16px",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {pfpUrl && (
              <div
                style={{
                  display: "flex",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid rgba(255, 255, 255, 0.3)",
                }}
              >
                <img
                  src={pfpUrl}
                  alt="Profile"
                  width={50}
                  height={50}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: "28px",
                  fontWeight: "bold",
                }}
              >
                {displayUsername}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "16px",
                  opacity: 0.8,
                  fontFamily: "monospace",
                }}
              >
                {displayAddress}
              </div>
            </div>
          </div>
          <div
            style={{ display: "flex", fontSize: "20px", fontWeight: "bold" }}
          >
            🎯 Policast Portfolio
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            height: "320px",
            marginBottom: "8px",
          }}
        >
          {/* Win Rate Circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.cardBg,
              borderRadius: "20px",
              padding: "20px",
              border: `2px solid ${colors.border}`,
              flex: "0 0 280px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "40px",
                fontWeight: "bold",
                color: colors.success,
                marginBottom: "6px",
              }}
            >
              {stats.winRate.toFixed(1)}%
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "16px",
                color: colors.text.secondary,
              }}
            >
              Win Rate
            </div>
          </div>

          {/* Stats Cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "16px",
            }}
          >
            {/* Wins and Losses */}
            <div style={{ display: "flex", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  backgroundColor: "#dcfce7",
                  borderRadius: "16px",
                  padding: "16px",
                  flex: 1,
                  border: "2px solid #bbf7d0",
                }}
              >
                <span style={{ fontSize: "32px" }}>🎯</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "14px",
                      color: colors.text.secondary,
                      marginBottom: "4px",
                    }}
                  >
                    Wins
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: colors.success,
                    }}
                  >
                    {stats.wins}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  backgroundColor: "#fecaca",
                  borderRadius: "16px",
                  padding: "16px",
                  flex: 1,
                  border: "2px solid #fca5a5",
                }}
              >
                <span style={{ fontSize: "32px" }}>❌</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "14px",
                      color: colors.text.secondary,
                      marginBottom: "4px",
                    }}
                  >
                    Losses
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: colors.danger,
                    }}
                  >
                    {stats.losses}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Invested */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                backgroundColor: "#dbeafe",
                borderRadius: "16px",
                padding: "16px",
                border: "2px solid #93c5fd",
              }}
            >
              <span style={{ fontSize: "32px" }}>💰</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    color: colors.text.secondary,
                    marginBottom: "4px",
                  }}
                >
                  Total Invested
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: colors.primary,
                  }}
                >
                  {formatAmount(stats.totalInvested)} $POLITICS
                </div>
              </div>
            </div>

            {/* Net Winnings */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                backgroundColor:
                  Number(stats.netWinnings) >= 0 ? "#dcfce7" : "#fecaca",
                borderRadius: "16px",
                padding: "16px",
                border: `2px solid ${
                  Number(stats.netWinnings) >= 0 ? "#bbf7d0" : "#fca5a5"
                }`,
              }}
            >
              <span style={{ fontSize: "32px" }}>
                {Number(stats.netWinnings) >= 0 ? "📈" : "📉"}
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    color: colors.text.secondary,
                    marginBottom: "4px",
                  }}
                >
                  Net Winnings
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "24px",
                    fontWeight: "bold",
                    color:
                      Number(stats.netWinnings) >= 0
                        ? colors.success
                        : colors.danger,
                  }}
                >
                  {formatAmount(stats.netWinnings)} $POLITICS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          {/* Total Bets */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backgroundColor: "rgba(37, 99, 235, 0.05)",
              borderRadius: "12px",
              border: `1px solid ${colors.border}`,
              flex: "1",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: "bold",
                color: colors.primary,
                marginBottom: "4px",
              }}
            >
              {stats.totalTrades}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                color: colors.text.secondary,
              }}
            >
              Total Trades
            </div>
          </div>

          {/* Avg Bet Size */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              backgroundColor: "rgba(124, 58, 237, 0.05)",
              borderRadius: "12px",
              border: `1px solid ${colors.border}`,
              flex: "1",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: "bold",
                color: colors.secondary,
                marginBottom: "4px",
              }}
            >
              {stats.totalTrades > 0
                ? (
                    Number(stats.totalInvested) /
                    stats.totalTrades /
                    10 ** 18
                  ).toFixed(0)
                : 0}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "14px",
                color: colors.text.secondary,
              }}
            >
              Avg Trade Size
            </div>
          </div>

          {/* Farcaster ID */}
          {fid && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                backgroundColor: "rgba(37, 99, 235, 0.05)",
                borderRadius: "12px",
                border: `1px solid ${colors.border}`,
                flex: "1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: colors.primary,
                  marginBottom: "4px",
                }}
              >
                FID: {fid}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: colors.text.secondary,
                }}
              >
                Farcaster ID
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
      ],
    });

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    console.log(
      `User Stats Image API: Successfully generated image for address ${address}`
    );

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error(
      `User Stats Image API: Error generating image for address ${address}:`,
      error
    );
    return new NextResponse("Error generating image", { status: 500 });
  }
}
