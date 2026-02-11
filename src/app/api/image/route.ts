import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow TikTok CDN domains (includes regional variants like tiktokcdn-us.com)
  try {
    const parsed = new URL(url);
    const h = parsed.hostname;
    const isTikTok =
      h.endsWith(".tiktokcdn.com") ||
      h.endsWith(".tiktokv.com") ||
      h.endsWith(".tiktok.com") ||
      /\.tiktokcdn-\w+\.com$/.test(h);
    if (!isTikTok) {
      console.log("[image-proxy] Blocked domain:", h);
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.log("[image-proxy] Upstream error:", res.status, res.statusText, "for URL:", url);
      return NextResponse.json({ error: "Failed to fetch image" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/webp";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[image-proxy] Fetch error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 500 });
  }
}
