import { NextRequest, NextResponse } from "next/server";

//eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
  let marketId: string | undefined;
  let rawState: string | undefined;
  let currentView: "overview" | "details" = "overview"; // Default view
  try {
    const body = await req.json();
    rawState = body.untrustedData?.state;

    console.log("Frame Action: Raw state received:", rawState);

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

    console.log("Frame Action: Extracted marketId:", marketId);

    if (!marketId || isNaN(Number(marketId))) {
      console.error("Frame Action: Invalid marketId", marketId);
      throw new Error("Invalid marketId in frame state");
    }

    // const baseUrl =
    //   process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
    const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}&t=${Date.now()}`;
    const postUrl = `${baseUrl}/api/frame-action`;
    // const marketDetailsUrl = `${baseUrl}/market/${marketId}/details`;

    let responseButtons: {
      label: string;
      action: "post" | "link";
      target?: string;
    }[];
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    let responseState: {
      marketId: string;
      view: "overview" | "details";
    };

    // Determine response based on the view we were just in
    if (currentView === "overview") {
      // We were in overview, user clicked "View Details", show details frame
      console.log(
        `Frame Action: Transitioning to details view for market ${marketId}`
      );
      responseButtons = [{ label: "Back", action: "post" }];
      responseState = { marketId, view: "details" }; // Set state for the next action
    } else {
      // We were in details, user clicked "Back", show overview frame
      console.log(
        `Frame Action: Transitioning back to overview for market ${marketId}`
      );
      responseButtons = [{ label: "View Details", action: "post" }];
      responseState = { marketId, view: "overview" }; // Set state for the next action
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
