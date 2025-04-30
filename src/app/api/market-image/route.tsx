import { NextRequest, NextResponse } from "next/server"; // Use NextRequest
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "node:path";
import { format } from "date-fns";

// Define contract (ensure this is the correct address and chain)
const contractAddress =
  process.env.CONTRACT_ADDRESS || "0xc703856dc56576800F9bc7DfD6ac15e92Ac2d7D6";
const contract = getContract({
  client,
  chain: base, // Make sure this matches your deployment (base or baseSepolia)
  address: contractAddress,
});

// Interface for the data needed by the image generator
interface MarketImageData {
  question: string;
  optionA: string;
  optionB: string;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  endTime: bigint;
  resolved: boolean;
  // Add other fields if needed by the image (endTime, resolved, etc.)
}

// --- CORRECTED: Type matching the ACTUAL contract return order ---
type MarketInfoContractReturn = readonly [
  string, // question (index 0)
  string, // optionA (index 1)
  string, // optionB (index 2)
  bigint, // endTime (index 3)
  number, // outcome (index 4 - uint8)
  bigint, // totalOptionAShares (index 5)
  bigint, // totalOptionBShares (index 6)
  boolean // resolved (index 7)
];
// --- END CORRECTION ---

async function fetchMarketData(marketId: string): Promise<MarketImageData> {
  console.log(`Market Image API: Fetching info for marketId ${marketId}...`);
  try {
    // --- CORRECTED: Method signature matching the contract ---
    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfoContractReturn; // Use the corrected type
    // --- END CORRECTION ---

    console.log(
      `Market Image API: Raw data received for marketId ${marketId}:`,
      marketData
    );

    // Basic validation
    if (!marketData || !Array.isArray(marketData) || marketData.length < 8) {
      console.error(
        `Market Image API: Invalid or incomplete data received from contract for marketId ${marketId}`,
        marketData
      );
      throw new Error("Incomplete data received from contract");
    }

    // --- CORRECTED: Access data using correct indices ---
    return {
      question: marketData[0], // Correct index
      optionA: marketData[1], // Correct index
      optionB: marketData[2], // Correct index
      endTime: marketData[3],
      totalOptionAShares: marketData[5], // Correct index
      totalOptionBShares: marketData[6], // Correct index
      resolved: marketData[7],
    };
    // --- END CORRECTION ---
  } catch (error) {
    // Log the specific error during fetch
    console.error(
      `Market Image API: Failed to fetch or parse market ${marketId}:`,
      error
    );
    // Re-throw to be caught by the main handler
    throw error;
  }
}

function formatEndTime(endTimeSeconds: bigint): string {
  try {
    const endDate = new Date(Number(endTimeSeconds) * 1000);
    // Example format: "Ends May 1, 2024 @ 10:30 PM UTC"
    // Adjust format string as needed (see date-fns docs)
    return `Ends ${format(endDate, "MMM d, yyyy '@' h:mm a 'UTC'")}`;
  } catch (e) {
    console.error("Error formatting time:", e);
    return "Ends: Invalid Date";
  }
}

// --- Load font data outside the handler for efficiency ---
const regularFontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Inter",
  "static",
  "Inter_18pt-Regular.ttf" // Assuming you have Regular too
);
const boldFontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Inter",
  "static",
  "Inter_18pt-Bold.ttf" // Path to Bold font
);

console.log("Attempting to load fonts from:", regularFontPath, boldFontPath);

// Read both files
const regularFontDataPromise = fs.readFile(regularFontPath);
const boldFontDataPromise = fs.readFile(boldFontPath);

// const fontDataPromise = fs.readFile(fontPath);
// ---

export async function GET(request: NextRequest) {
  // Use NextRequest
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
    const market = await fetchMarketData(marketId); // Fetch data using corrected function

    // --- Use BigInt for calculations before converting to Number for display ---
    const total = market.totalOptionAShares + market.totalOptionBShares;
    const yesPercentNum =
      total > 0n
        ? Number((market.totalOptionAShares * 10000n) / total) / 100
        : 0;
    const noPercentNum =
      total > 0n
        ? Number((market.totalOptionBShares * 10000n) / total) / 100
        : 0;
    // --- END BigInt Calculation ---

    // Format for display
    const yesPercentDisplay = yesPercentNum.toFixed(1);
    const noPercentDisplay = noPercentNum.toFixed(1);

    // Format the end time
    const formattedTime = formatEndTime(market.endTime);

    console.log(
      `Market Image API: Generating image for marketId ${marketId} with percentages: ${yesPercentDisplay}% / ${noPercentDisplay}%`
    );

    // Wait for font data to be loaded
    const [regularFontData, boldFontData] = await Promise.all([
      regularFontDataPromise,
      boldFontDataPromise,
    ]);

    // Generate SVG with satori
    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch", // Stretch children width
          justifyContent: "space-between", // Space out header, content, footer (if any)
          width: "1200px",
          height: "630px",
          backgroundColor: "#f8f9fa", // Lighter gray background
          color: "#212529", // Darker text
          fontFamily: '"Inter"',
          padding: "40px 50px", // Adjust padding
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            fontSize: "24px",
            color: "#6c757d" /* Gray text */,
          }}
        >
          <span>Buster Market</span>
          <span>{formattedTime}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          {/* Question */}
          <h1
            style={{
              fontSize: "52px", // Slightly larger
              fontWeight: 700, // Use bold weight
              textAlign: "center",
              marginBottom: "40px", // Space below question
              maxWidth: "1000px",
              lineHeight: 1.3,
            }}
          >
            {market.question}
          </h1>

          {/* Progress Bar Area */}
          <div
            style={{
              width: "80%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Bar */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "24px",
                backgroundColor: "#e9ecef",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "15px",
              }}
            >
              <div
                style={{
                  width: `${yesPercentNum}%`,
                  backgroundColor: "#28a745" /* Green */,
                }}
              ></div>
              <div
                style={{
                  width: `${noPercentNum}%`,
                  backgroundColor: "#dc3545" /* Red */,
                }}
              ></div>
            </div>
            {/* Labels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                fontSize: "28px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  color: "#28a745",
                }}
              >
                <span style={{ fontSize: "24px", color: "#495057" }}>
                  {market.optionA}
                </span>
                <span style={{ fontWeight: 700 }}>{yesPercentDisplay}%</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  color: "#dc3545",
                }}
              >
                <span style={{ fontSize: "24px", color: "#495057" }}>
                  {market.optionB}
                </span>
                <span style={{ fontWeight: 700 }}>{noPercentDisplay}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Optional) */}
        <div
          style={{
            width: "100%",
            textAlign: "center",
            fontSize: "18px",
            color: "#adb5bd",
          }}
        >
          Market ID: {marketId}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        // --- UPDATED: Include both fonts ---
        fonts: [
          {
            name: "Inter",
            data: regularFontData,
            weight: 400, // Regular
            style: "normal",
          },
          {
            name: "Inter",
            data: boldFontData,
            weight: 700, // Bold
            style: "normal",
          },
        ],
        // --- END UPDATE ---
      }
    );

    // Convert SVG to PNG with sharp
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    console.log(
      `Market Image API: Successfully generated PNG for marketId ${marketId}`
    );

    // Return PNG response
    return new NextResponse(pngBuffer, {
      status: 200, // Explicitly set status 200
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60", // Shorter cache during debugging
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    // Log the error that occurred anywhere in the process
    console.error(
      `Market Image API: Overall failure for marketId ${marketId}:`,
      error
    );
    // Return a generic 500 error response
    return new NextResponse("Failed to generate image", { status: 500 });
  }
}
