import { cookies } from "next/headers";
import { type SessionData } from "./types";
import { refreshAccessToken } from "./tiktok";
import crypto from "crypto";

const SESSION_COOKIE = "tiktok_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "default_secret_change_me_please_32ch";

function getKey(): Buffer {
  return crypto.scryptSync(SESSION_SECRET, "salt", 32);
}

/**
 * Encrypt session data for secure cookie storage
 */
function encrypt(data: string): string {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt session data from cookie
 */
function decrypt(data: string): string {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Save session data to an encrypted HTTP-only cookie
 */
export async function setSession(session: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encrypt(JSON.stringify(session));
  cookieStore.set(SESSION_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year (matches refresh token lifetime)
  });
}

/**
 * Get session data from cookie, auto-refreshing if token expired
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);

  if (!cookie?.value) return null;

  try {
    const session: SessionData = JSON.parse(decrypt(cookie.value));

    // Check if access token is expired (with 5 min buffer)
    if (Date.now() >= session.expiresAt - 5 * 60 * 1000) {
      try {
        const newTokens = await refreshAccessToken(session.refreshToken);
        const refreshedSession: SessionData = {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          openId: newTokens.open_id,
          expiresAt: Date.now() + newTokens.expires_in * 1000,
          scope: newTokens.scope,
        };
        await setSession(refreshedSession);
        return refreshedSession;
      } catch {
        // Refresh failed, clear session
        await clearSession();
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Clear the session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}
