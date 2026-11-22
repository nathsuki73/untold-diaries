export type WebShareSupport = {
  api: boolean;
  files: boolean;
};

type FileShareData = {
  files?: File[];
  title?: string;
  text?: string;
  url?: string;
};

type WebShareNavigator = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

export type ImageShareInput = {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
  url?: string;
};

export type ImageShareOutcome =
  | "shared"
  | "unsupported"
  | "cancelled"
  | "error";

function getNavigator(): WebShareNavigator | null {
  if (typeof navigator === "undefined") return null;
  return navigator as WebShareNavigator;
}

export function getWebShareSupport(file?: File): WebShareSupport {
  const nav = getNavigator();
  if (!nav || typeof nav.share !== "function") {
    return { api: false, files: false };
  }

  if (typeof nav.canShare !== "function" || !file) {
    return { api: true, files: false };
  }

  try {
    return { api: true, files: nav.canShare({ files: [file] }) };
  } catch {
    return { api: true, files: false };
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Opens the browser/OS share sheet with the generated image. The site cannot
 * choose or detect the destination app, and resolving only means the OS
 * accepted the payload — not that anything was published.
 */
export async function shareImage(
  input: ImageShareInput
): Promise<ImageShareOutcome> {
  const nav = getNavigator();
  if (!nav?.share || typeof nav.canShare !== "function") {
    return "unsupported";
  }

  const file = new File([input.blob], input.filename, { type: "image/png" });
  const candidates: FileShareData[] = [
    {
      files: [file],
      title: input.title,
      text: input.url ? `${input.text}\n${input.url}` : input.text,
      ...(input.url ? { url: input.url } : {}),
    },
    { files: [file], title: input.title, text: input.text },
    { files: [file] },
  ];

  let sawRejection = false;
  for (const data of candidates) {
    try {
      if (!nav.canShare(data)) continue;
      await nav.share(data);
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
      sawRejection = true;
    }
  }

  return sawRejection ? "error" : "unsupported";
}
