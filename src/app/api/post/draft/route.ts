import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initDraftVideoPost } from "@/lib/tiktok";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const videoSize = body.video_size;
    if (!videoSize || typeof videoSize !== "number") {
      return NextResponse.json(
        { error: "video_size is required and must be a number" },
        { status: 400 }
      );
    }

    const result = await initDraftVideoPost(session.accessToken, videoSize);

    if (result.error?.code && result.error.code !== "ok") {
      return NextResponse.json(
        { error: result.error.message || "Failed to initialize draft upload" },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize draft upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
