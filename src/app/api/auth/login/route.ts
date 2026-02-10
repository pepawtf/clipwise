import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthorizationUrl } from "@/lib/tiktok";
import { generateState } from "@/lib/auth";

export async function GET() {
  const state = generateState();

  // Store state in a cookie for CSRF verification
  const cookieStore = await cookies();
  cookieStore.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const authUrl = getAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}
