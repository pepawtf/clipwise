import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB per image

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const files = form.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 35) {
      return NextResponse.json(
        { error: "Maximum 35 images allowed" },
        { status: 400 }
      );
    }

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Only JPEG and WEBP are allowed.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 4MB limit` },
          { status: 400 }
        );
      }

      const blob = await put(`carousel/${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      urls.push(blob.url);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload images";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
