import { NextRequest, NextResponse } from "next/server";
import { listPopularTags } from "@/lib/tags";

// GET /api/tags?limit=8&q=cs — groups ranked by real usage, optionally searched.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const limit = Math.min(
    20,
    Math.max(1, parseInt(params.get("limit") ?? "8", 10) || 8)
  );
  const query = (params.get("q") ?? "").trim().slice(0, 60);

  try {
    return NextResponse.json({ tags: await listPopularTags(limit, query) });
  } catch (err) {
    console.error("Failed to load groups:", err);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}
