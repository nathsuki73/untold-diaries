import { getTrackById } from "@/lib/spotify";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("id");

  if (!trackId)
    return NextResponse.json({ error: "Missing track ID" }, { status: 400 });

  try {
    const track = await getTrackById(trackId);
    return NextResponse.json(track);
  } catch (error) {
    console.error("Failed to fetch track:", error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 }
    );
  }
}
