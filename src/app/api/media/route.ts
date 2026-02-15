import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const blobUrl = request.nextUrl.searchParams.get("url");

  if (!blobUrl) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow Vercel Blob Storage URLs
  try {
    const parsed = new URL(blobUrl);
    if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(blobUrl);

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 });
  }
}
