export const STORY_TEMPLATE_WIDTH = 1080;
export const STORY_TEMPLATE_HEIGHT = 1920;

type RGB = [number, number, number];

export type StoryTemplateInput = {
  storyId: number;
  recipient: string;
  message: string;
  sender?: string | null;
  track?: string | null;
  destinationUrl: string;
};

export type StoryTemplateResult = {
  dataUrl: string;
  blob: Blob;
  filename: string;
};

type TrackDetails = {
  name: string;
  artist: string;
  image: string | null;
};

const FONT_SANS =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Removes control characters and caps length before anything reaches canvas. */
function sanitizeText(value: string | null | undefined, maxLength = 2000) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, maxLength);
}

function safeUrlLabel(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${host}${path}`;
  } catch {
    return "";
  }
}

/** Center-crops artwork so it never distorts inside the square thumbnail. */
function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (!sourceSize) return;

  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    x,
    y,
    width,
    height
  );
}

function rgbToHsl([red, green, blue]: RGB): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return [hue, saturation, lightness];
}

function hsl(hue: number, saturation: number, lightness: number, alpha = 1) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  return `hsla(${normalizedHue}, ${Math.round(clamp(saturation, 0, 1) * 100)}%, ${Math.round(clamp(lightness, 0, 1) * 100)}%, ${alpha})`;
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed) + 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Artwork could not be loaded"));
    image.src = src;
  });
}

async function loadTrackDetails(
  trackId: string | null | undefined
): Promise<TrackDetails | null> {
  if (!trackId) return null;

  try {
    const response = await fetch(
      `/api/spotify/get?id=${encodeURIComponent(trackId)}`,
      { cache: "force-cache" }
    );
    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return null;

    const track = data as {
      name?: unknown;
      artists?: unknown;
      image?: unknown;
    };

    const name = typeof track.name === "string" ? track.name : "";
    const artist = Array.isArray(track.artists)
      ? track.artists
          .map((entry) => {
            if (!entry || typeof entry !== "object") return "";
            const value = (entry as { name?: unknown }).name;
            return typeof value === "string" ? value : "";
          })
          .filter(Boolean)
          .join(", ")
      : "";
    const image =
      typeof track.image === "string" && track.image ? track.image : null;

    return { name, artist, image };
  } catch {
    return null;
  }
}

async function sampleDominantHue(
  artwork: HTMLImageElement | null,
  seed: string
): Promise<number> {
  const fallbackHue = hashSeed(seed) % 360;
  if (!artwork) return fallbackHue;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return fallbackHue;

    context.drawImage(artwork, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    ).data;
    const buckets = Array.from({ length: 24 }, () => ({
      weight: 0,
      red: 0,
      green: 0,
      blue: 0,
    }));

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      if (alpha < 0.5) continue;

      const rgb: RGB = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const [hue, saturation, lightness] = rgbToHsl(rgb);
      if (saturation < 0.14 || lightness < 0.1 || lightness > 0.94) continue;

      const weight =
        alpha * (0.25 + saturation) * (1 - Math.abs(lightness - 0.55) * 0.5);
      const bucket =
        buckets[Math.floor((hue / 360) * buckets.length) % buckets.length];
      bucket.weight += weight;
      bucket.red += rgb[0] * weight;
      bucket.green += rgb[1] * weight;
      bucket.blue += rgb[2] * weight;
    }

    const strongest = buckets.reduce((best, bucket) =>
      bucket.weight > best.weight ? bucket : best
    );
    if (strongest.weight === 0) return fallbackHue;

    const [hue, saturation] = rgbToHsl([
      strongest.red / strongest.weight,
      strongest.green / strongest.weight,
      strongest.blue / strongest.weight,
    ]);

    // Near-grey artwork reads better with the site's calm violet than mud.
    return saturation < 0.16 ? 258 : hue;
  } catch {
    return fallbackHue;
  }
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left"
) {
  const characters = Array.from(text);
  const width =
    characters.reduce(
      (total, character) => total + context.measureText(character).width,
      0
    ) +
    spacing * Math.max(0, characters.length - 1);

  let cursor =
    align === "center" ? x - width / 2 : align === "right" ? x - width : x;

  for (const character of characters) {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + spacing;
  }
}

function fitSingleLine(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  minSize: number,
  fontFor: (size: number) => string
) {
  let size = baseSize;
  while (size > minSize) {
    context.font = fontFor(size);
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  }

  context.font = fontFor(size);
  if (context.measureText(text).width <= maxWidth) {
    return { text, size };
  }

  let shortened = text;
  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return { text: `${shortened}…`, size };
}

function truncateLine(
  context: CanvasRenderingContext2D,
  line: string,
  maxWidth: number
) {
  if (context.measureText(line).width <= maxWidth) return line;

  let shortened = line;
  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

function wrapParagraph(
  context: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number
) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    lines.push(...wrapParagraph(context, paragraph.trim(), maxWidth));
  }

  return lines;
}

function layoutMessage(
  context: CanvasRenderingContext2D,
  rawMessage: string,
  maxWidth: number,
  maxHeight: number
) {
  const message =
    rawMessage.trim() || "Some things are easier written than said.";
  const sizes = [66, 62, 58, 54, 50, 46, 42, 38, 34];

  for (const size of sizes) {
    context.font = `${size}px ${FONT_SERIF}`;
    const lineHeight = Math.round(size * 1.34);
    const lines = wrapText(context, message, maxWidth);
    if (lines.length * lineHeight <= maxHeight) {
      return { size, lineHeight, lines };
    }
  }

  const size = sizes[sizes.length - 1];
  context.font = `${size}px ${FONT_SERIF}`;
  const lineHeight = Math.round(size * 1.34);
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  const allLines = wrapText(context, message, maxWidth);
  const lines = allLines.slice(0, maxLines);

  if (allLines.length > maxLines) {
    lines[maxLines - 1] = truncateLine(
      context,
      `${lines[maxLines - 1].replace(/…$/, "")}…`,
      maxWidth
    );
  }

  return { size, lineHeight, lines };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawBackground(context: CanvasRenderingContext2D, hue: number) {
  const base = context.createLinearGradient(0, 0, STORY_TEMPLATE_WIDTH, STORY_TEMPLATE_HEIGHT);
  base.addColorStop(0, hsl(hue, 0.48, 0.1));
  base.addColorStop(0.55, "#0B0D14");
  base.addColorStop(1, hsl(hue + 18, 0.42, 0.08));
  context.fillStyle = base;
  context.fillRect(0, 0, STORY_TEMPLATE_WIDTH, STORY_TEMPLATE_HEIGHT);

  const firstGlow = context.createRadialGradient(150, 210, 30, 150, 210, 820);
  firstGlow.addColorStop(0, hsl(hue, 0.86, 0.58, 0.42));
  firstGlow.addColorStop(0.48, hsl(hue + 18, 0.72, 0.5, 0.15));
  firstGlow.addColorStop(1, hsl(hue, 0.7, 0.4, 0));
  context.fillStyle = firstGlow;
  context.fillRect(0, 0, STORY_TEMPLATE_WIDTH, STORY_TEMPLATE_HEIGHT);

  const secondGlow = context.createRadialGradient(
    920,
    1450,
    40,
    920,
    1450,
    900
  );
  secondGlow.addColorStop(0, hsl(hue + 42, 0.74, 0.54, 0.28));
  secondGlow.addColorStop(0.5, hsl(hue - 26, 0.66, 0.46, 0.12));
  secondGlow.addColorStop(1, hsl(hue + 42, 0.7, 0.4, 0));
  context.fillStyle = secondGlow;
  context.fillRect(0, 0, STORY_TEMPLATE_WIDTH, STORY_TEMPLATE_HEIGHT);

  const scrim = context.createLinearGradient(
    0,
    STORY_TEMPLATE_HEIGHT * 0.55,
    0,
    STORY_TEMPLATE_HEIGHT
  );
  scrim.addColorStop(0, "rgba(7, 8, 13, 0)");
  scrim.addColorStop(1, "rgba(7, 8, 13, 0.82)");
  context.fillStyle = scrim;
  context.fillRect(
    0,
    STORY_TEMPLATE_HEIGHT * 0.55,
    STORY_TEMPLATE_WIDTH,
    STORY_TEMPLATE_HEIGHT * 0.45
  );
}

function drawGrain(context: CanvasRenderingContext2D, seed: string) {
  const random = seededRandom(seed);
  context.save();
  for (let index = 0; index < 420; index += 1) {
    const x = random() * STORY_TEMPLATE_WIDTH;
    const y = random() * STORY_TEMPLATE_HEIGHT;
    const size = random() * 2 + 0.5;
    context.fillStyle = `rgba(255, 255, 255, ${0.012 + random() * 0.02})`;
    context.fillRect(x, y, size, size);
  }
  context.restore();
}

export async function generateStoryTemplate(
  input: StoryTemplateInput
): Promise<StoryTemplateResult> {
  const seed = `${input.storyId}|${input.track ?? ""}`;
  const trackDetails = await loadTrackDetails(input.track);

  let artwork: HTMLImageElement | null = null;
  if (trackDetails?.image) {
    try {
      artwork = await loadImage(trackDetails.image);
    } catch {
      artwork = null;
    }
  }

  const hue = await sampleDominantHue(artwork, seed);
  const accent = hsl(hue, 0.78, 0.68);

  const canvas = document.createElement("canvas");
  canvas.width = STORY_TEMPLATE_WIDTH;
  canvas.height = STORY_TEMPLATE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.textBaseline = "alphabetic";
  drawBackground(context, hue);
  drawGrain(context, seed);

  // Branding
  context.fillStyle = accent;
  context.beginPath();
  context.arc(96, 158, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.font = `600 22px ${FONT_SANS}`;
  drawTrackedText(context, "UNTOLD DIARIES", 118, 166, 5);

  // Recipient
  context.fillStyle = accent;
  context.font = `600 22px ${FONT_SANS}`;
  drawTrackedText(context, "TO", 96, 300, 6);

  const recipient = sanitizeText(input.recipient, 80).trim() || "Someone";
  const recipientFit = fitSingleLine(
    context,
    recipient,
    888,
    82,
    46,
    (size) => `italic ${size}px ${FONT_SERIF}`
  );
  context.fillStyle = "#F9F7FB";
  context.font = `italic ${recipientFit.size}px ${FONT_SERIF}`;
  context.fillText(recipientFit.text, 96, 382);

  context.fillStyle = "rgba(255, 255, 255, 0.16)";
  context.fillRect(96, 438, 888, 1);

  // Message
  const messageLayout = layoutMessage(
    context,
    sanitizeText(input.message, 2000),
    888,
    720
  );
  context.font = `${messageLayout.size}px ${FONT_SERIF}`;
  context.fillStyle = "#F7F5FA";
  let lineY = 556;
  for (const line of messageLayout.lines) {
    lineY += messageLayout.lineHeight;
    context.fillText(line, 96, lineY);
  }

  // Sender
  context.fillStyle = "rgba(255, 255, 255, 0.5)";
  context.font = `600 20px ${FONT_SANS}`;
  drawTrackedText(context, "FROM", 96, 1394, 5);

  const sender = sanitizeText(input.sender, 80).trim() || "Anonymous";
  const senderFit = fitSingleLine(
    context,
    sender,
    700,
    42,
    28,
    (size) => `${size}px ${FONT_SERIF}`
  );
  context.fillStyle = "#F1EEF6";
  context.font = `${senderFit.size}px ${FONT_SERIF}`;
  context.fillText(senderFit.text, 96, 1452);

  // Song card (or a text-only equivalent)
  const cardY = 1500;
  roundedRect(context, 96, cardY, 888, 132, 28);
  context.fillStyle = "rgba(255, 255, 255, 0.07)";
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 1;
  context.stroke();

  if (artwork) {
    context.save();
    roundedRect(context, 112, cardY + 16, 104, 104, 18);
    context.clip();
    drawImageCover(context, artwork, 112, cardY + 16, 104, 104);
    context.restore();
  } else {
    roundedRect(context, 112, cardY + 16, 104, 104, 18);
    context.fillStyle = hsl(hue, 0.56, 0.3);
    context.fill();
    context.fillStyle = accent;
    context.font = `52px ${FONT_SANS}`;
    context.textAlign = "center";
    context.fillText("♪", 164, cardY + 84);
    context.textAlign = "left";
  }

  const songTitle = sanitizeText(
    trackDetails?.name || (input.track ? "A Spotify track" : "No song attached"),
    120
  );
  const songArtist = sanitizeText(
    trackDetails?.artist ||
      (input.track ? "Attached to this note" : "Just words, for now"),
    120
  );

  const titleFit = fitSingleLine(
    context,
    songTitle,
    700,
    30,
    22,
    (size) => `600 ${size}px ${FONT_SANS}`
  );
  context.fillStyle = "#F7F5FA";
  context.font = `600 ${titleFit.size}px ${FONT_SANS}`;
  context.fillText(titleFit.text, 236, cardY + 58);

  const artistFit = fitSingleLine(
    context,
    songArtist,
    700,
    24,
    18,
    (size) => `400 ${size}px ${FONT_SANS}`
  );
  context.fillStyle = "rgba(255, 255, 255, 0.58)";
  context.font = `400 ${artistFit.size}px ${FONT_SANS}`;
  context.fillText(artistFit.text, 236, cardY + 96);

  // Call to action. The URL is printed for recognition only; the real
  // clickable destination must be added as a native Link sticker by the user.
  const ctaY = 1654;
  roundedRect(context, 96, ctaY, 888, 124, 28);
  const ctaFill = context.createLinearGradient(96, ctaY, 984, ctaY + 124);
  ctaFill.addColorStop(0, hsl(hue, 0.7, 0.3, 0.85));
  ctaFill.addColorStop(1, "rgba(255, 255, 255, 0.07)");
  context.fillStyle = ctaFill;
  context.fill();
  context.strokeStyle = hsl(hue, 0.8, 0.7, 0.38);
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = "#FFFFFF";
  context.font = `700 26px ${FONT_SANS}`;
  drawTrackedText(context, "DISCOVER MORE", 124, ctaY + 48, 4);

  const urlLabel = safeUrlLabel(input.destinationUrl) || "untold-diaries";
  const urlFit = fitSingleLine(
    context,
    urlLabel,
    560,
    22,
    16,
    (size) => `500 ${size}px ${FONT_SANS}`
  );
  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  context.font = `500 ${urlFit.size}px ${FONT_SANS}`;
  context.fillText(urlFit.text, 124, ctaY + 88);

  roundedRect(context, 720, ctaY + 24, 232, 40, 20);
  context.fillStyle = accent;
  context.fill();
  context.fillStyle = "#0B0D14";
  context.font = `700 14px ${FONT_SANS}`;
  drawTrackedText(context, "LINK IN STORY", 836, ctaY + 50, 1.5, "center");

  // Footer
  context.fillStyle = "rgba(255, 255, 255, 0.45)";
  context.font = `600 18px ${FONT_SANS}`;
  drawTrackedText(
    context,
    "untolddiaries",
    STORY_TEMPLATE_WIDTH / 2,
    1852,
    4,
    "center"
  );
  context.fillStyle = accent;
  context.beginPath();
  context.arc(STORY_TEMPLATE_WIDTH / 2, 1890, 4, 0, Math.PI * 2);
  context.fill();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("The Story image could not be exported")),
      "image/png",
      1
    );
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    blob,
    filename: "untold-diaries-story.png",
  };
}
