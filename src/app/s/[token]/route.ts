import { NextRequest, NextResponse } from "next/server";
import { getSubmission } from "@/lib/submissions";
import {
  getStoryShareStoryId,
  isValidShareToken,
  recordStoryShareClick,
} from "@/lib/storyShares";

export const runtime = "nodejs";

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
};

function page(title: string, body: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Untold Diaries</title></head><body style="font-family:system-ui,sans-serif;background:#0b0d14;color:#f5f4f8;margin:0;display:grid;place-items:center;min-height:100dvh;padding:2rem;text-align:center"><main><h1 style="font-family:Georgia,serif;font-weight:400">${title}</h1><p style="opacity:.7;line-height:1.6">${body}</p><a href="/" style="color:#c9b6ff">Go to Untold Diaries</a></main></body></html>`,
    { status, headers: HTML_HEADERS }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isValidShareToken(token)) {
    return page("Invalid link", "This share link is not valid.", 400);
  }

  try {
    const storyId = await getStoryShareStoryId(token);
    if (!storyId) {
      return page("Link not found", "This share link does not exist.", 404);
    }

    const story = await getSubmission(storyId);
    if (!story) {
      return page(
        "Story unavailable",
        "The story this link pointed to is no longer available.",
        410
      );
    }

    // Analytics must never block the reader from reaching the story.
    try {
      await recordStoryShareClick(token);
    } catch (error) {
      console.error("Failed to record story share click:", error);
    }

    return NextResponse.redirect(new URL(`/view?id=${storyId}`, request.url), {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to resolve story share:", error);
    return page(
      "Something went wrong",
      "We couldn’t open this link. Please try again.",
      500
    );
  }
}
