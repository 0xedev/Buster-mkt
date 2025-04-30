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

function generateFrameHtml(
  imageUrl: string,
  postUrl: string,
  marketUrl: string,
  marketId: string,
  optionA: string,
  optionB: string,
  message?: string,
  inputTextPlaceholder: string = "Enter amount in $BSTR"
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="og:title" content="Buster Market Frame">
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${imageUrl}" />
      <meta property="fc:frame:post_url" content="${postUrl}" />
      <meta property="fc:frame:input:text" content="${inputTextPlaceholder}" />
      <meta property="fc:frame:button:1" content="Bet ${optionA}" />
      <meta property="fc:frame:button:1:action" content="post" />
      <meta property="fc:frame:button:2" content="Bet ${optionB}" />
      <meta property="fc:frame:button:2:action" content="post" />
      <meta property="fc:frame:button:3" content="View Market" />
      <meta property="fc:frame:button:3:action" content="post" />
      <meta property="fc:frame:state" content="${encodeURIComponent(
        JSON.stringify({ marketId })
      )}" />
      ${
        message ? `<meta property="og:description" content="${message}" />` : ""
      }
    </head>
    <body>
      ${message ? `<p>${message}</p>` : ""}
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  let marketId: string | undefined;
  try {
    const body = await req.json();
    const buttonIndex = body.untrustedData?.buttonIndex;
    const inputText = body.untrustedData?.inputText;
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

    const optionA = marketData[1];
    const optionB = marketData[2];

    let responseMessage: string | undefined;
    let responseInputPlaceholder = "Enter amount in $BSTR";

    if (buttonIndex === 3) {
      const htmlResponse = generateFrameHtml(
        imageUrl,
        postUrl,
        marketUrl,
        marketId,
        optionA,
        optionB,
        "Opening market in Mini App"
      );
      return new NextResponse(htmlResponse, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "X-Farcaster-Redirect": marketUrl,
        },
      });
    }

    if (buttonIndex === 1 || buttonIndex === 2) {
      if (!inputText || isNaN(Number(inputText)) || Number(inputText) <= 0) {
        responseMessage = "Please enter a valid positive amount.";
        responseInputPlaceholder = "Enter VALID amount in $BSTR";
      } else {
        const amount = Number(inputText);
        if (amount > 500) {
          responseMessage =
            "Max bet is 500 $BSTR. Please enter a lower amount.";
          responseInputPlaceholder = "Enter amount (MAX 500)";
        } else {
          responseMessage = `Bet ${amount} $BSTR on ${
            buttonIndex === 1 ? optionA : optionB
          }. Complete in Mini App.`;
          const htmlResponse = generateFrameHtml(
            imageUrl,
            postUrl,
            marketUrl,
            marketId,
            optionA,
            optionB,
            responseMessage,
            ""
          );
          return new NextResponse(htmlResponse, {
            status: 200,
            headers: {
              "Content-Type": "text/html",
              "X-Farcaster-Redirect": `${marketUrl}?amount=${amount}&option=${
                buttonIndex === 1 ? "A" : "B"
              }`,
            },
          });
        }
      }
    }

    const htmlResponse = generateFrameHtml(
      imageUrl,
      postUrl,
      marketUrl,
      marketId,
      optionA,
      optionB,
      responseMessage,
      responseInputPlaceholder
    );

    return new NextResponse(htmlResponse, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: unknown) {
    console.error(
      `Frame action error (MarketId: ${marketId ?? "unknown"}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    const fallbackMarketId = marketId ?? "error";
    const fallbackImageUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/market-image?marketId=${fallbackMarketId}&error=true`;
    const fallbackPostUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/api/frame-action`;
    const fallbackMarketUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app"
    }/market/${fallbackMarketId}`;

    const errorHtml = generateFrameHtml(
      fallbackImageUrl,
      fallbackPostUrl,
      fallbackMarketUrl,
      fallbackMarketId,
      "Option A",
      "Option B",
      `Error: ${errorMessage.substring(0, 100)}`
    );

    return new NextResponse(errorHtml, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
