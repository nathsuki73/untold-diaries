import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// "openrouter/free" routes to whichever free model is currently available;
// set OPENROUTER_MODEL to pin a specific one (e.g. "google/gemma-4-31b-it:free").
const DEFAULT_MODEL = "openrouter/free";
const MAX_INPUT_LENGTH = 1000;
const MAX_REPLY_LENGTH = 220;

const SYSTEM_PROMPT = `You are the "therapist cat" on Untold Diaries, an anonymous website where people write heartfelt messages they never sent to someone, paired with a song.
The user is in the middle of drafting their message. React to what they've written so far with ONE short reply (at most 25 words).
- Be warm, supportive and a little sassy, like a caring cat. Light cat puns are welcome. You may start with one cat emoji.
- Reply in the same language the user writes in (English, Filipino or Taglish).
- Don't repeat their text back, don't ask for personal details, and don't give long advice.
- If they mention self-harm or wanting to die, gently encourage them to reach out to someone they trust or a local crisis hotline.
Output only the reply itself.`;

// Used when OpenRouter is unavailable or the free daily limit is used up.
const FALLBACK_LINES = [
  "😺 I'm listening, hooman. Keep going, every word counts.",
  "😽 That sounds like it means a lot to you. Let it all out.",
  "🐾 Purr... I'm right here while you write this.",
  "😸 Brave paws! Saying the untold stuff takes courage.",
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

// Only free models are allowed: OpenRouter's free router, or a model ID ending
// in ":free". Anything else in OPENROUTER_MODEL is ignored so a typo or paid
// model ID can never be billed.
function isFreeModel(model: string) {
  return model === DEFAULT_MODEL || /^[\w.-]+\/[\w.:-]+:free$/.test(model);
}

// Returns the model fields for the request: a pinned free model with the free
// router as automatic backup, or just the free router.
function modelSelection(): { model: string; models?: string[] } {
  const pinned = (process.env.OPENROUTER_MODEL || "").trim();
  if (!pinned || pinned === DEFAULT_MODEL) return { model: DEFAULT_MODEL };
  if (!isFreeModel(pinned)) {
    console.warn(
      `OPENROUTER_MODEL "${pinned}" is not a free model (must end in ":free"); using ${DEFAULT_MODEL}`
    );
    return { model: DEFAULT_MODEL };
  }
  return { model: pinned, models: [pinned, DEFAULT_MODEL] };
}

function cleanReply(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "") // drop any leaked reasoning
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim()
    .slice(0, MAX_REPLY_LENGTH);
}

// POST /api/cat { text } → { catYap }
export async function POST(req: NextRequest) {
  let text = "";
  try {
    const body = await req.json();
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set");
    return NextResponse.json({ catYap: pick(FALLBACK_LINES), fallback: true });
  }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...modelSelection(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, MAX_INPUT_LENGTH) },
        ],
        max_tokens: 400,
        temperature: 0.9,
        reasoning: { exclude: true },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`OpenRouter returned ${res.status}: ${detail.slice(0, 300)}`);
      return NextResponse.json({ catYap: pick(FALLBACK_LINES), fallback: true });
    }

    const data = await res.json();
    const reply = cleanReply(data.choices?.[0]?.message?.content ?? "");
    if (!reply) {
      // Some free models spend the whole token budget on hidden reasoning and
      // return null content; log it so the fallback is easy to diagnose.
      console.error(
        `OpenRouter returned an empty reply (model: ${data.model ?? "unknown"}, ` +
          `finish: ${data.choices?.[0]?.finish_reason ?? "unknown"})`
      );
      return NextResponse.json({ catYap: pick(FALLBACK_LINES), fallback: true });
    }
    return NextResponse.json({ catYap: reply });
  } catch (err) {
    console.error("OpenRouter request failed:", err);
    return NextResponse.json({ catYap: pick(FALLBACK_LINES), fallback: true });
  }
}
