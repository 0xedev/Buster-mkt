import { NextRequest, NextResponse } from "next/server";
import { readContract } from "thirdweb";
import { contract } from "@/constants/contract";

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

export async function POST(req: NextRequest) {
  let marketId: string | undefined;
  try {
    const body = await req.json();
    const buttonIndex = body.untrustedData?.buttonIndex;
    const state = body.untrustedData?.state;
    const decodedState = state ? JSON.parse(decodeURIComponent(state)) : {};
    marketId = decodedState.marketId;

    if (!marketId || isNaN(Number(marketId))) {
      console.error("Frame Action: Invalid marketId", marketId);
      throw new Error("Invalid marketId in frame state");
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
    const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}&t=${Date.now()}`;
    const postUrl = `${baseUrl}/api/frame-action`;
    const marketUrl = `${baseUrl}/market/${marketId}`;

    const marketData = (await readContract({
      contract,
      method:
        "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)",
      params: [BigInt(marketId)],
    })) as MarketInfoContractReturn;

    if (!marketData || marketData.length < 8) {
      console.error(
        `Frame Action: Failed to fetch valid market data for ${marketId}`
      );
      throw new Error(`Failed to fetch market data for ${marketId}`);
    }
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const optionA = marketData[1];
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const optionB = marketData[2];
    const totalOptionAShares = marketData[5];
    const totalOptionBShares = marketData[6];
    const endTime = marketData[3];
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const resolved = marketData[7];

    const total = totalOptionAShares + totalOptionBShares;
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const yesPercent =
      total > 0n
        ? (Number((totalOptionAShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const noPercent =
      total > 0n
        ? (Number((totalOptionBShares * 1000n) / total) / 10).toFixed(1)
        : "0.0";
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const endDate = new Date(Number(endTime) * 1000).toLocaleDateString();

    if (buttonIndex === 1) {
      // "View Market" button - render a new frame with market details
      return NextResponse.json({
        frame: {
          version: "vNext",
          image: imageUrl,
          post_url: postUrl,
          buttons: [
            { label: "Back", action: "post" },
            { label: "Open in App", action: "link", target: marketUrl },
          ],
          state: JSON.stringify({ marketId, view: "details" }),
        },
        message: "Viewing market details",
      });
    }

    if (decodedState.view === "details" && buttonIndex === 1) {
      // "Back" button - return to initial frame
      return NextResponse.json({
        frame: {
          version: "vNext",
          image: imageUrl,
          post_url: postUrl,
          buttons: [{ label: "View Market", action: "post" }],
          state: JSON.stringify({ marketId }),
        },
        message: "Back to market overview",
      });
    }

    // Default frame (shouldn’t be reached after initial frame)
    return NextResponse.json({
      frame: {
        version: "vNext",
        image: imageUrl,
        post_url: postUrl,
        buttons: [{ label: "View Market", action: "post" }],
        state: JSON.stringify({ marketId }),
      },
    });
  } catch (error: unknown) {
    console.error(
      `Frame action error (MarketId: ${marketId ?? "unknown"}):`,
      error,
      error instanceof Error ? error.stack : undefined
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    const fallbackMarketId = marketId ?? "error";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
    return NextResponse.json({
      frame: {
        version: "vNext",
        image: `${baseUrl}/api/market-image?marketId=${fallbackMarketId}&error=true`,
        post_url: `${baseUrl}/api/frame-action`,
        buttons: [{ label: "View Market", action: "post" }],
        state: JSON.stringify({ marketId: fallbackMarketId }),
      },
      message: `Error: ${errorMessage.substring(0, 100)}`,
    });
  }
}
