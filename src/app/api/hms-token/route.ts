import { SDK as HMS_SDK } from "@100mslive/server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_ROLE = "host";

function sanitizeUserId(identity: string): string {
  const slug = identity.replace(/[^\w.-]/g, "_").slice(0, 48);
  return slug || "guest";
}

/**
 * POC-only: resolves/creates a 100ms room and mints an auth token.
 * Production: NestJS auth + RBAC + tenant-scoped rooms.
 */
export async function GET(req: NextRequest) {
  const identity = req.nextUrl.searchParams.get("identity")?.trim();
  const roomName = req.nextUrl.searchParams.get("room")?.trim();
  const role = req.nextUrl.searchParams.get("role")?.trim() || process.env.HMS_DEFAULT_ROLE || DEFAULT_ROLE;

  if (!identity || !roomName) {
    return NextResponse.json(
      { error: "Query params `identity` and `room` are required." },
      { status: 400 },
    );
  }

  if (identity.length > 64 || roomName.length > 64 || role.length > 32) {
    return NextResponse.json({ error: "Invalid parameter length." }, { status: 400 });
  }

  const accessKey = process.env.HMS_ACCESS_KEY;
  const secret = process.env.HMS_SECRET;

  if (!accessKey || !secret) {
    return NextResponse.json(
      { error: "100ms is not configured. Set HMS_ACCESS_KEY and HMS_SECRET." },
      { status: 500 },
    );
  }

  try {
    const hms = new HMS_SDK(accessKey, secret);
    const room = await hms.rooms.create({
      name: roomName,
      description: `MESSE·V POC · ${roomName}`,
    });

    const { token } = await hms.auth.getAuthToken({
      roomId: room.id,
      role,
      userId: sanitizeUserId(identity),
      validForSeconds: 60 * 60 * 2,
    });

    return NextResponse.json({
      token,
      roomId: room.id,
      roomName: room.name,
      role,
    });
  } catch (err) {
    console.error("[hms-token]", err);
    return NextResponse.json(
      {
        error:
          "Could not create a 100ms token. Check HMS credentials, template roles, and dashboard setup.",
      },
      { status: 500 },
    );
  }
}
