import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserInfo } from "@/lib/tiktok";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(session.accessToken);

    if (userInfo.error?.code && userInfo.error.code !== "ok") {
      return NextResponse.json(
        { error: userInfo.error.message || "Failed to fetch user info" },
        { status: 400 }
      );
    }

    return NextResponse.json(userInfo.data.user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch user info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
