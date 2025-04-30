import { NextRequest, NextResponse } from "next/server"; // Use NextRequest
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/app/client";
import satori from "satori";
import sharp from "sharp";
import { promises as fs } from "fs";

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
      totalOptionAShares: marketData[5], // Correct index
      totalOptionBShares: marketData[6], // Correct index
      // Add other fields if needed:
      // endTime: marketData[3],
      // resolved: marketData[7],
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

// --- Load font data outside the handler for efficiency ---
const fontDataPromise = fs.readFile(
  "./public/fonts/Inter/static/Inter_18pt-Regular.ttf"
);
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
    const yesPercent =
      total > 0n // Use BigInt comparison
        ? (Number((market.totalOptionAShares * 1000n) / total) / 10).toFixed(1) // BigInt math for precision
        : "0.0";
    const noPercent =
      total > 0n // Use BigInt comparison
        ? (Number((market.totalOptionBShares * 1000n) / total) / 10).toFixed(1) // BigInt math for precision
        : "0.0";
    // --- END BigInt Calculation ---

    console.log(
      `Market Image API: Generating image for marketId ${marketId} with percentages: ${yesPercent}% / ${noPercent}%`
    );

    // Wait for font data to be loaded
    const fontData = await fontDataPromise;

    // Generate SVG with satori
    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px", // Consider frame spec (1.91:1 ratio often preferred, e.g., 1200x630)
          height: "630px", // Adjusted height for 1.91:1 ratio
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: '"Inter"', // Ensure font name matches the one loaded
          textAlign: "center",
          padding: "40px",
          border: "1px solid #e0e0e0", // Optional border
          borderRadius: "8px", // Optional rounded corners
        }}
      >
        <div
          style={{ fontSize: "24px", color: "#888888", marginBottom: "30px" }}
        >
          Buster Market
        </div>
        <h1
          style={{
            fontSize: "48px", // Slightly larger font
            fontWeight: "bold",
            marginBottom: "50px",
            maxWidth: "1000px",
            lineHeight: 1.3, // Adjust line height for wrapping
          }}
        >
          {/* Simple length check is okay, but consider better text wrapping libraries if needed */}
          {market.question}
        </h1>
        {/* Use flexbox for side-by-side percentages */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "80%",
            fontSize: "36px",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span>{market.optionA}</span>
            <span style={{ marginTop: "10px", color: "#4CAF50" }}>
              {yesPercent}%
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span>{market.optionB}</span>
            <span style={{ marginTop: "10px", color: "#F44336" }}>
              {noPercent}%
            </span>
          </div>
        </div>
      </div>,
      {
        width: 1200, // Match container width
        height: 630, // Match container height
        fonts: [
          {
            name: "Inter", // Match font family name used in style
            data: fontData,
            weight: 400, // Ensure weight matches usage
            style: "normal",
          },
          // Add other weights/styles if needed
        ],
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
