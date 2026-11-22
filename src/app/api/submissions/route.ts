import { NextRequest, NextResponse } from "next/server";
import { createSubmission, listSubmissions } from "@/lib/submissions";
import { resolveTag, TagStorageUnavailableError } from "@/lib/tags";
import { normalizeTag, tagKey } from "@/lib/tagUtils";
import { verifyTurnstile } from "@/lib/turnstile";
import { isValidTrackId } from "@/lib/spotify";

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 5000;

// GET /api/submissions?page=1&page_size=12&tag=LSPU — newest first, one page
// at a time, optionally limited to one group.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(params.get("page_size") ?? "12", 10) || 12)
  );
  const rawTag = params.get("tag");
  const tag = rawTag ? normalizeTag(rawTag) : null;
  if (rawTag && !tag)
    return NextResponse.json({ error: "Invalid group tag" }, { status: 400 });

  try {
    return NextResponse.json(await listSubmissions(page, pageSize, tag));
  } catch (err) {
    console.error("Failed to list submissions:", err);
    return NextResponse.json({ error: "Failed to load stories" }, { status: 500 });
  }
}

// POST /api/submissions — saves a new story after checking the captcha.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const name = text(body.name);
  const message = text(body.message);
  const from = text(body.from);
  const track = text(body.track);
  const captcha = text(body.captcha);
  const tag = normalizeTag(body.tag);

  if (!name || !message)
    return NextResponse.json(
      { error: "Please fill in the recipient and the message." },
      { status: 400 }
    );
  if (!tag)
    return NextResponse.json(
      { error: "Choose one group or tag for this story." },
      { status: 400 }
    );
  if (name.length > MAX_NAME_LENGTH || from.length > MAX_NAME_LENGTH)
    return NextResponse.json(
      { error: `Names can be at most ${MAX_NAME_LENGTH} characters.` },
      { status: 400 }
    );
  if (message.length > MAX_MESSAGE_LENGTH)
    return NextResponse.json(
      { error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 }
    );
  if (track && !isValidTrackId(track))
    return NextResponse.json({ error: "Invalid song." }, { status: 400 });
  if (!captcha || !(await verifyTurnstile(captcha)))
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 403 }
    );

  try {
    const resolved = await resolveTag(tag, tagKey(tag));
    const id = await createSubmission({
      name,
      message,
      from: from || null,
      track: track || null,
      tag: resolved.tag,
      tagKey: resolved.key,
    });
    return NextResponse.json({ id, tag: resolved.tag });
  } catch (err) {
    console.error("Failed to save submission:", err);
    if (err instanceof TagStorageUnavailableError)
      return NextResponse.json(
        { error: "Group tags aren’t available yet. Please try again later." },
        { status: 503 }
      );
    return NextResponse.json(
      { error: "Couldn't save your story. Please try again." },
      { status: 500 }
    );
  }
}
