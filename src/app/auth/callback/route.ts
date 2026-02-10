import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken } from "@/lib/tiktok";
import { setSession } from "@/lib/auth";
import type { SessionData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Handle authorization errors
  if (error) {
    const errorMsg = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${baseUrl}/login?error=${errorMsg}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent("Missing authorization code or state")}`
    );
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("tiktok_oauth_state")?.value;
  cookieStore.delete("tiktok_oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent("Invalid state parameter. Please try again.")}`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code);

    // Store session
    const session: SessionData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      openId: tokens.open_id,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope,
    };

    await setSession(session);

    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(message)}`
    );
  }
}
