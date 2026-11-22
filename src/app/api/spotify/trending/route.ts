import { getPhilippinesTopTracks } from "@/lib/spotify";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tracks = await getPhilippinesTopTracks(5);
    return NextResponse.json(tracks, {
      headers: { "Cache-Control": "public, max-age=900" },
    });
  } catch (error) {
    console.error("Philippines top tracks failed:", error);
    return NextResponse.json(
      { error: "Failed to load top tracks" },
      { status: 502 }
    );
  }
}
