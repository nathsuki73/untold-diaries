export type StoryStickerOptions = {
  label: string;
  songTitle?: string;
  songArtist?: string;
};

export type StoryStickerResult = {
  dataUrl: string;
  filename: string;
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.length > lines.length) {
    let last = lines[maxLines - 1];
    while (last && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }

  return lines;
}

/** Creates the recommended 640×480 transparent branded sticker layer. */
export function createStorySticker(
  options: StoryStickerOptions
): StoryStickerResult {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is unavailable on this device");
  }

  const width = 520;
  const x = (canvas.width - width) / 2;
  const y = 148;
  const height = options.songTitle ? 184 : 140;

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.35)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 8;
  roundedRect(context, x, y, width, height, 28);
  context.fillStyle = "rgba(12, 14, 24, 0.86)";
  context.fill();
  context.restore();

  roundedRect(context, x, y, width, height, 28);
  context.strokeStyle = "rgba(255, 255, 255, 0.22)";
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "rgba(255, 255, 255, 0.58)";
  context.font = "600 20px system-ui, -apple-system, sans-serif";
  context.fillText("UNTOLD DIARIES", canvas.width / 2, y + 22);

  context.fillStyle = "#FFFFFF";
  context.font = "600 34px Georgia, serif";
  const labelLines = wrapText(context, options.label, width - 64, 2);
  labelLines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, y + 54 + index * 42);
  });

  if (options.songTitle) {
    const song = options.songArtist
      ? `${options.songTitle} — ${options.songArtist}`
      : options.songTitle;
    context.fillStyle = "rgba(255, 255, 255, 0.72)";
    context.font = "400 22px system-ui, -apple-system, sans-serif";
    const songLines = wrapText(context, `♪ ${song}`, width - 64, 2);
    songLines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, y + height - 62 + index * 28);
    });
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    filename: "untold-diaries-story-sticker.png",
  };
}

export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
