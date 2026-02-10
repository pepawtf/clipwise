import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/auth";
import { revokeToken } from "@/lib/tiktok";

export async function POST() {
  const session = await getSession();

  if (session) {
    try {
      await revokeToken(session.accessToken);
    } catch {
      // Best effort revocation - continue with logout even if revoke fails
    }
  }

  await clearSession();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return NextResponse.json({ success: true, redirectUrl: baseUrl });
}
