import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/frame-node";

interface WebhookEvent {
  event: string;
  data: {
    fid: string;
    url?: string;
    token?: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventData = (await parseWebhookEvent(
      body,
      verifyAppKeyWithNeynar
    )) as unknown as WebhookEvent;

    if (eventData.event === "frame_added") {
      const { fid, url, token } = eventData.data;
      if (url && token) {
        await kv.set(`notification:${fid}`, { url, token });
      }
    } else if (
      eventData.event === "frame_removed" ||
      eventData.event === "notifications_disabled"
    ) {
      const { fid } = eventData.data;
      await kv.del(`notification:${fid}`);
    } else if (eventData.event === "notifications_enabled") {
      const { fid, url, token } = eventData.data;
      if (url && token) {
        await kv.set(`notification:${fid}`, { url, token });
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
