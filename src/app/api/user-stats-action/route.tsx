import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://buster-mkt.vercel.app";

  try {
    const body = await req.json();
    const rawState = body.untrustedData?.state;

    const decodedState = rawState
      ? (() => {
          try {
            if (rawState.match(/^[A-Za-z0-9+/=]+$/)) {
              const base64Decoded = atob(rawState);
              return JSON.parse(base64Decoded);
            }
            return JSON.parse(decodeURIComponent(rawState));
          } catch (e) {
            console.error("User Stats Frame Action: Failed to parse state:", e);
            return {};
          }
        })()
      : {};

    const address = decodedState.address;
    const username = decodedState.username;
    const pfpUrl = decodedState.pfpUrl;
    const fid = decodedState.fid;

    if (!address) {
      console.error("User Stats Frame Action: Invalid address", address);
      throw new Error("Invalid address in frame state");
    }

    // Build image URL with user data
    const imageParams = new URLSearchParams({
      address,
      ...(username && { username }),
      ...(pfpUrl && { pfpUrl }),
      ...(fid && { fid }),
    });

    const imageUrl = `${baseUrl}/api/user-stats-image?${imageParams.toString()}&t=${Date.now()}`;
    const postUrl = `${baseUrl}/api/user-stats-action`;
    const checkYoursUrl = `${baseUrl}/?tab=myvotes`;

    return NextResponse.json({
      frame: {
        version: "vNext",
        image: imageUrl,
        post_url: postUrl,
        buttons: [
          { label: "Check Yours", action: "link", target: checkYoursUrl },
          { label: "View Markets", action: "link", target: `${baseUrl}/` },
        ],
        state: Buffer.from(JSON.stringify(decodedState)).toString("base64"),
      },
    });
  } catch (error: unknown) {
    console.error("User Stats Frame action error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({
      frame: {
        version: "vNext",
        image: `${baseUrl}/api/user-stats-image?address=error&error=true`,
        post_url: `${baseUrl}/api/user-stats-action`,
        buttons: [{ label: "Try Again", action: "post" }],
        state: Buffer.from(JSON.stringify({ address: "error" })).toString(
          "base64"
        ),
      },
      message: `Error: ${errorMessage.substring(0, 100)}`,
    });
  }
}
