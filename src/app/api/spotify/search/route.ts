import { searchTracks } from "@/lib/spotify";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query)
    return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const results = await searchTracks(query);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
