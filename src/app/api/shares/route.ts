import { NextRequest, NextResponse } from "next/server";
import { getServerSiteUrl } from "@/lib/siteUrl";
import { getSubmission } from "@/lib/submissions";
import { createStoryShare } from "@/lib/storyShares";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let storyId: unknown;
  try {
    const body: unknown = await request.json();
    storyId = (body as { storyId?: unknown } | null)?.storyId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof storyId !== "number" ||
    !Number.isInteger(storyId) ||
    storyId < 1
  ) {
    return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
  }

  try {
    const story = await getSubmission(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const token = await createStoryShare(storyId);
    const origin = getServerSiteUrl(request.url);
    if (!origin) {
      return NextResponse.json(
        { error: "Share links are not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { token, url: `${origin}/s/${token}` },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to create story share:", error);
    return NextResponse.json(
      { error: "Could not create a share link" },
      { status: 500 }
    );
  }
}
