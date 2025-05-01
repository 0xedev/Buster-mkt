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
  let marketId: string | undefined;
  let rawState: string | undefined;
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

    console.log("Frame Action: Extracted marketId:", marketId);

    if (!marketId || isNaN(Number(marketId))) {
      console.error("Frame Action: Invalid marketId", marketId);
      throw new Error("Invalid marketId in frame state");
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";
    const imageUrl = `${baseUrl}/api/market-image?marketId=${marketId}&t=${Date.now()}`;
    const postUrl = `${baseUrl}/api/frame-action`;
    const marketDetailsUrl = `${baseUrl}/market/${marketId}/details`;

    return NextResponse.json({
      frame: {
        version: "vNext",
        image: imageUrl,
        post_url: postUrl,
        buttons: [
          {
            label: "Buy shares📈📉",
            action: "launch_frame",
            target: marketDetailsUrl,
            name: "Buy shares📈📉",
            splashImageUrl: `${baseUrl}/img/icon.jpg`,
            splashBackgroundColor: "#ffffff",
          },
        ],
        state: Buffer.from(JSON.stringify({ marketId })).toString("base64"),
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
