import { NextRequest, NextResponse } from "next/server";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "node:path";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const username = searchParams.get("username") || "Anonymous Trader";
  const fid = searchParams.get("fid") || "239396";

  if (!address) {
    return new NextResponse("Missing address parameter", { status: 400 });
  }

  try {
    const [regularFontData, boldFontData] = await Promise.all([
      regularFontDataPromise,
      boldFontDataPromise,
    ]);

    const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    const jsx = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "900px",
          height: "600px",
          backgroundColor: "#ffffff",
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
            background: "linear-gradient(90deg, #1e40af 0%, #7e22ce 100%)",
            borderRadius: "16px",
            color: "white",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{ display: "flex", fontSize: "28px", fontWeight: "bold" }}
            >
              {username}
            </div>
            <div style={{ display: "flex", fontSize: "16px", opacity: 0.8 }}>
              {displayAddress}
            </div>
          </div>
          <div
            style={{ display: "flex", fontSize: "20px", fontWeight: "bold" }}
          >
            🎯 Policast Stats
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: "24px",
          }}
        >
          {/* Win Rate Circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              borderRadius: "20px",
              padding: "32px",
              border: "2px solid #e5e7eb",
              flex: "0 0 280px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "48px",
                fontWeight: "bold",
                color: "#059669",
                marginBottom: "8px",
              }}
            >
              65.4%
            </div>
            <div
              style={{ display: "flex", fontSize: "16px", color: "#6b7280" }}
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
                  padding: "24px",
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
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Wins
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#059669",
                    }}
                  >
                    23
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
                  padding: "24px",
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
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Losses
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#dc2626",
                    }}
                  >
                    12
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
                padding: "24px",
                border: "2px solid #93c5fd",
              }}
            >
              <span style={{ fontSize: "32px" }}>💰</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    color: "#6b7280",
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
                    color: "#2563eb",
                  }}
                >
                  1,234.56 buster
                </div>
              </div>
            </div>

            {/* Net Winnings */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                backgroundColor: "#dcfce7",
                borderRadius: "16px",
                padding: "24px",
                border: "2px solid #bbf7d0",
              }}
            >
              <span style={{ fontSize: "32px" }}>📈</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: "14px",
                    color: "#6b7280",
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
                    color: "#059669",
                  }}
                >
                  +456.78 buster
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            marginTop: "24px",
            padding: "24px",
            backgroundColor: "rgba(37, 99, 235, 0.05)",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#2563eb",
                marginBottom: "4px",
              }}
            >
              35
            </div>
            <div
              style={{ display: "flex", fontSize: "14px", color: "#6b7280" }}
            >
              Total Bets
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#7c3aed",
                marginBottom: "4px",
              }}
            >
              35
            </div>
            <div
              style={{ display: "flex", fontSize: "14px", color: "#6b7280" }}
            >
              Avg Bet
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                fontWeight: "bold",
                color: "#2563eb",
                marginBottom: "4px",
              }}
            >
              FID: {fid}
            </div>
            <div
              style={{ display: "flex", fontSize: "14px", color: "#6b7280" }}
            >
              Farcaster ID
            </div>
          </div>
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

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error(
      `Simple User Stats Image API: Error generating image for address ${address}:`,
      error
    );
    return new NextResponse("Error generating image", { status: 500 });
  }
}
