import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listVideos } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get("cursor");
  const maxCount = searchParams.get("max_count");

  try {
    const videos = await listVideos(
      session.accessToken,
      cursor ? parseInt(cursor, 10) : undefined,
      maxCount ? parseInt(maxCount, 10) : 20
    );

    if (videos.error?.code && videos.error.code !== "ok") {
      return NextResponse.json(
        { error: videos.error.message || "Failed to fetch videos" },
        { status: 400 }
      );
    }

    // Log video data for debugging thumbnail issues
    console.log("[videos] Response:", JSON.stringify(videos.data?.videos?.map((v: { id: string; cover_image_url?: string }) => ({
      id: v.id,
      cover_image_url: v.cover_image_url || "EMPTY",
    }))));

    return NextResponse.json(videos.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch videos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
