import { NextRequest, NextResponse } from "next/server";
import { searchSubmissions } from "@/lib/submissions";
import { normalizeTag } from "@/lib/tagUtils";

// GET /api/submissions/search?q=name&tag=LSPU&page=1&page_size=12 —
// matching stories, paged at the database so tag and recipient filters stay
// consistent across infinite scrolling.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const rawTag = params.get("tag");
  const tag = rawTag ? normalizeTag(rawTag) : null;
  if (!query && !tag)
    return NextResponse.json(
      { error: "Missing search query or group tag" },
      { status: 400 }
    );
  if (rawTag && !tag)
    return NextResponse.json({ error: "Invalid group tag" }, { status: 400 });

  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(params.get("page_size") ?? "12", 10) || 12)
  );

  try {
    return NextResponse.json(
      await searchSubmissions(query, page, pageSize, tag)
    );
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
