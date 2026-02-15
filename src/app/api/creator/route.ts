import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCreatorInfo } from "@/lib/tiktok";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await getCreatorInfo(session.accessToken);

    if (result.error?.code && result.error.code !== "ok") {
      return NextResponse.json(
        { error: result.error.message || "Failed to fetch creator info" },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch creator info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
