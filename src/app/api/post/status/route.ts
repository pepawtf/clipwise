import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPostStatus } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const publishId = request.nextUrl.searchParams.get("publish_id");

  if (!publishId) {
    return NextResponse.json(
      { error: "publish_id is required" },
      { status: 400 }
    );
  }

  try {
    const status = await getPostStatus(session.accessToken, publishId);

    if (status.error?.code && status.error.code !== "ok") {
      return NextResponse.json(
        { error: status.error.message || "Failed to fetch post status" },
        { status: 400 }
      );
    }

    return NextResponse.json(status.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch post status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
