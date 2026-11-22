import { registerPlugin } from "@capacitor/core";
import {
  NATIVE_READY_MESSAGE,
  NATIVE_REQUEST_MESSAGE,
  NATIVE_RESPONSE_MESSAGE,
  isNativeRequest,
  type NativeAvailability,
  type NativeClipboardResult,
  type NativeHandoffResult,
  type NativeRequest,
  type NativeResponse,
  type NativeStoryOptions,
  type NativeStoryPlatform,
} from "../../src/lib/metaShareMessages";

type MetaStorySharePlugin = {
  isAvailable(options?: { platform?: NativeStoryPlatform }): Promise<NativeAvailability>;
  shareToInstagramStory(options: NativeStoryOptions): Promise<NativeHandoffResult>;
  shareToFacebookStory(options: NativeStoryOptions): Promise<NativeHandoffResult>;
  copyToClipboard(options: { value: string }): Promise<NativeClipboardResult>;
};

type ShellConfig = {
  appUrl: string;
};

declare global {
  interface Window {
    __UNTOLD_CAPACITOR_CONFIG__?: ShellConfig;
  }
}

const MetaStoryShare = registerPlugin<MetaStorySharePlugin>("MetaStoryShare");

const shellConfig = window.__UNTOLD_CAPACITOR_CONFIG__;
const frame = document.getElementById("app-frame") as HTMLIFrameElement | null;

let appOrigin = "";
if (shellConfig?.appUrl) {
  try {
    appOrigin = new URL(shellConfig.appUrl).origin;
  } catch {
    appOrigin = "";
  }
}

function postToApp(message: NativeResponse | { type: string; available: boolean }) {
  if (!frame?.contentWindow || !appOrigin) return;
  frame.contentWindow.postMessage(message, appOrigin);
}

function response(
  id: string,
  ok: boolean,
  result?: unknown,
  error?: string
): NativeResponse {
  return {
    type: NATIVE_RESPONSE_MESSAGE,
    id,
    ok,
    result,
    error,
  };
}

function asStoryOptions(payload: unknown): NativeStoryOptions {
  if (!payload || typeof payload !== "object") {
    throw new Error("Missing Story options");
  }
  const options = payload as Partial<NativeStoryOptions>;
  if (typeof options.backgroundBase64 !== "string" || !options.backgroundBase64) {
    throw new Error("Missing Story background image");
  }
  if (typeof options.destinationUrl !== "string" || !options.destinationUrl) {
    throw new Error("Missing destination URL");
  }

  return {
    backgroundBase64: options.backgroundBase64,
    stickerBase64:
      typeof options.stickerBase64 === "string"
        ? options.stickerBase64
        : undefined,
    destinationUrl: options.destinationUrl,
    stickerLabel:
      typeof options.stickerLabel === "string" ? options.stickerLabel : "",
    songTitle: typeof options.songTitle === "string" ? options.songTitle : undefined,
    songArtist:
      typeof options.songArtist === "string" ? options.songArtist : undefined,
  };
}

function asPlatform(payload: unknown): NativeStoryPlatform | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const platform = (payload as { platform?: unknown }).platform;
  return platform === "instagram" || platform === "facebook"
    ? platform
    : undefined;
}

async function handleRequest(request: NativeRequest): Promise<NativeResponse> {
  try {
    switch (request.method) {
      case "ping":
        return response(request.id, true, { available: true });
      case "isAvailable": {
        const availability = await MetaStoryShare.isAvailable({
          platform: asPlatform(request.payload),
        });
        return response(request.id, true, availability);
      }
      case "shareToInstagramStory": {
        const result = await MetaStoryShare.shareToInstagramStory(
          asStoryOptions(request.payload)
        );
        return response(request.id, true, result);
      }
      case "shareToFacebookStory": {
        const result = await MetaStoryShare.shareToFacebookStory(
          asStoryOptions(request.payload)
        );
        return response(request.id, true, result);
      }
      case "copyToClipboard": {
        const payload = request.payload as { value?: unknown } | undefined;
        if (typeof payload?.value !== "string" || !payload.value) {
          throw new Error("Missing link to copy");
        }
        const result = await MetaStoryShare.copyToClipboard({
          value: payload.value,
        });
        return response(request.id, true, result);
      }
      default:
        return response(request.id, false, undefined, "Unsupported native method");
    }
  } catch (error) {
    return response(
      request.id,
      false,
      undefined,
      error instanceof Error ? error.message : "Native sharing failed"
    );
  }
}

window.addEventListener("message", (event: MessageEvent) => {
  if (!appOrigin || event.origin !== appOrigin) return;
  if (!isNativeRequest(event.data)) return;

  void handleRequest(event.data).then(postToApp);
});

frame?.addEventListener("load", () => {
  postToApp({ type: NATIVE_READY_MESSAGE, available: true });
});

if (!appOrigin) {
  const notice = document.getElementById("setup-notice");
  if (notice) notice.hidden = false;
}
