import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — Vercel serverless body limit is 4.5MB
const TIKTOK_MAX_DIMENSION = 1080;
const TIKTOK_MIN_DIMENSION = 360;

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only JPEG and WEBP are allowed.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds 4MB limit` },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    let processed: Buffer;
    let outputContentType = "image/jpeg";
    try {
      const image = sharp(inputBuffer, { failOn: "error" }).rotate();
      const metadata = await image.metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;

      if (!width || !height) {
        return NextResponse.json(
          { error: "Unable to read image dimensions" },
          { status: 400 }
        );
      }

      if (Math.min(width, height) < TIKTOK_MIN_DIMENSION) {
        return NextResponse.json(
          {
            error: `Image is too small (${width}×${height}). TikTok requires at least ${TIKTOK_MIN_DIMENSION}px on each side.`,
          },
          { status: 400 }
        );
      }

      const needsResize = Math.max(width, height) > TIKTOK_MAX_DIMENSION;

      const pipeline = needsResize
        ? image.resize({
            width: TIKTOK_MAX_DIMENSION,
            height: TIKTOK_MAX_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
          })
        : image;

      processed = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      outputContentType = "image/jpeg";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process image";
      return NextResponse.json(
        { error: `Image processing failed: ${message}` },
        { status: 400 }
      );
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const blob = await put(`carousel/${baseName}.jpg`, processed, {
      access: "public",
      addRandomSuffix: true,
      contentType: outputContentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
