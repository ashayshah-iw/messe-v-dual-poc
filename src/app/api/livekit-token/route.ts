import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POC-only: mints a short-lived LiveKit room token.
 * Production must move this behind NestJS auth + RBAC.
 */
export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room")?.trim();
  const identity = req.nextUrl.searchParams.get("identity")?.trim();

  if (!room || !identity) {
    return NextResponse.json(
      { error: "Query params `room` and `identity` are required." },
      { status: 400 },
    );
  }

  if (room.length > 64 || identity.length > 64) {
    return NextResponse.json(
      { error: "Room and identity must be 64 characters or fewer." },
      { status: 400 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      {
        error:
          "LiveKit is not configured. Set NEXT_PUBLIC_LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
      },
      { status: 500 },
    );
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: identity,
      ttl: "2h",
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token, url: wsUrl });
  } catch (err) {
    console.error("[livekit-token]", err);
    return NextResponse.json(
      { error: "Could not create a room token. Check LiveKit credentials." },
      { status: 500 },
    );
  }
}
