import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initVideoPost } from "@/lib/tiktok";
import type { PostVideoOptions, PrivacyLevel } from "@/lib/types";

const VALID_PRIVACY_LEVELS: PrivacyLevel[] = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
];

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.privacy_level || !VALID_PRIVACY_LEVELS.includes(body.privacy_level)) {
      return NextResponse.json(
        { error: "privacy_level is required and must be one of: " + VALID_PRIVACY_LEVELS.join(", ") },
        { status: 400 }
      );
    }

    const options: PostVideoOptions = {
      title: body.title || "",
      privacyLevel: body.privacy_level as PrivacyLevel,
      disableDuet: body.disable_duet ?? false,
      disableStitch: body.disable_stitch ?? false,
      disableComment: body.disable_comment ?? false,
      brandContentToggle: body.brand_content_toggle ?? false,
      brandOrganicToggle: body.brand_organic_toggle ?? false,
    };

    const videoSize = body.video_size;
    if (!videoSize || typeof videoSize !== "number") {
      return NextResponse.json(
        { error: "video_size is required and must be a number" },
        { status: 400 }
      );
    }

    const result = await initVideoPost(
      session.accessToken,
      options,
      videoSize
    );

    if (result.error?.code && result.error.code !== "ok") {
      return NextResponse.json(
        { error: result.error.message || "Failed to initialize post" },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
