import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { initPhotoPost } from "@/lib/tiktok";
import type { PostPhotoOptions, PrivacyLevel } from "@/lib/types";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const photoImages: string[] = body.photo_images;
    if (!photoImages || photoImages.length < 2) {
      return NextResponse.json(
        { error: "At least 2 images are required for a carousel" },
        { status: 400 }
      );
    }

    if (photoImages.length > 35) {
      return NextResponse.json(
        { error: "Maximum 35 images allowed" },
        { status: 400 }
      );
    }

    const postMode = body.post_mode === "MEDIA_UPLOAD" ? "MEDIA_UPLOAD" : "DIRECT_POST";

    const options: PostPhotoOptions = {
      title: body.title || undefined,
      description: body.description || undefined,
      privacyLevel: (body.privacy_level as PrivacyLevel) || "SELF_ONLY",
      disableComment: body.disable_comment ?? false,
      autoAddMusic: body.auto_add_music ?? true,
      brandContentToggle: body.brand_content_toggle ?? false,
      brandOrganicToggle: body.brand_organic_toggle ?? false,
      photoCoverIndex: body.photo_cover_index ?? 0,
      photoImages,
      postMode,
    };

    const result = await initPhotoPost(session.accessToken, options);

    if (result.error?.code && result.error.code !== "ok") {
      return NextResponse.json(
        { error: result.error.message || "Failed to initialize carousel post" },
        { status: 400 }
      );
    }

    // Clean up blob images in the background (TikTok pulls them, we don't need them anymore)
    // Give TikTok some time to pull the images before deleting
    setTimeout(async () => {
      try {
        await del(photoImages);
      } catch {
        // Blob cleanup is best-effort
      }
    }, 60_000); // 1 minute delay

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize carousel post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
