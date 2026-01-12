import { NextRequest, NextResponse } from "next/server";

// V1 and V2 market info types for potential future use//
type MarketInfoV1ContractReturn = readonly [
  string,
  string,
  string,
  bigint,
  number,
  bigint,
  bigint,
  boolean
];

type MarketInfoV2ContractReturn = readonly [
  string, // question
  string[], // options
  bigint, // endTime
  number, // category
  bigint, // optionCount
  boolean, // resolved
  bigint, // resolutionTime
  bigint, // winningOptionId
  bigint // totalVolume
];

export async function POST(req: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
  let marketId: string | undefined;
  let rawState: string | undefined;
  let currentView: "overview" | "details" = "overview";

  try {
    const body = await req.json();
    rawState = body.untrustedData?.state;

    const decodedState = rawState
      ? (() => {
          try {
            if (rawState.match(/^[A-Za-z0-9+/=]+$/)) {
              const base64Decoded = atob(rawState);
              return JSON.parse(base64Decoded);
            }
            return JSON.parse(decodeURIComponent(rawState));
          } catch (e) {
            console.error("Frame Action: Failed to parse state:", e);
            return {};
          }
        })()
      : {};

    marketId = decodedState.marketId;
    currentView = decodedState.view === "details" ? "details" : "overview";

    if (!marketId || isNaN(Number(marketId))) {
      console.error("Frame Action: Invalid marketId", marketId);
      throw new Error("Invalid marketId in frame state");
    }

    const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}&t=${Date.now()}`;
    const postUrl = `${baseUrl}/api/frame-action`;

    let responseButtons: {
      label: string;
      action: "post" | "link";
      target?: string;
    }[];
    let responseState: {
      marketId: string;
      view: "overview" | "details";
    };

    if (currentView === "overview") {
      responseButtons = [
        { label: "Back to Markets", action: "link", target: `${baseUrl}/` },
      ];
      responseState = { marketId, view: "details" };
    } else {
      responseButtons = [{ label: "View", action: "post" }];
      responseState = { marketId, view: "overview" };
    }

    return NextResponse.json({
      frame: {
        version: "vNext",
        image: imageUrl,
        post_url: postUrl,
        buttons: responseButtons,
        state: Buffer.from(JSON.stringify(responseState)).toString("base64"),
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
        buttons: [{ label: "Try Again", action: "post" }],
        state: Buffer.from(
          JSON.stringify({ marketId: fallbackMarketId })
        ).toString("base64"),
      },
      message: `Error: ${errorMessage.substring(0, 100)}`,
    });
  }
}
