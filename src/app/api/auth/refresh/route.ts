import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth";
import { refreshAccessToken } from "@/lib/tiktok";
import type { SessionData } from "@/lib/types";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const newTokens = await refreshAccessToken(session.refreshToken);

    const updatedSession: SessionData = {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      openId: newTokens.open_id,
      expiresAt: Date.now() + newTokens.expires_in * 1000,
      scope: newTokens.scope,
    };

    await setSession(updatedSession);

    return NextResponse.json({ success: true, expiresAt: updatedSession.expiresAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
