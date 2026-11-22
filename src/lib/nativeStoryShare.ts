import {
  NATIVE_REQUEST_MESSAGE,
  isNativeAvailability,
  isNativeClipboardResult,
  isNativeHandoffResult,
  isNativeReady,
  isNativeResponse,
  type NativeAvailability,
  type NativeAvailabilityRequest,
  type NativeClipboardResult,
  type NativeHandoffResult,
  type NativeMethod,
  type NativeRequest,
  type NativeStoryOptions,
  type NativeStoryPlatform,
} from "@/lib/metaShareMessages";
import { getAllowedShellOrigins } from "@/lib/siteUrl";

const HANDSHAKE_ID = "__untold_native_handshake__";
const HANDSHAKE_TIMEOUT_MS = 1500;
const REQUEST_TIMEOUT_MS = 10000;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: number;
};

let activeOrigin = "";
let bridgePromise: Promise<string> | null = null;
let listenerInstalled = false;
let resolveHandshake: ((origin: string) => void) | null = null;
const pending = new Map<string, PendingRequest>();

function isAllowedShellOrigin(origin: string): boolean {
  return getAllowedShellOrigins().includes(origin);
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function installListener(): void {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    if (!isAllowedShellOrigin(event.origin)) return;

    if (isNativeReady(event.data) && event.data.available) {
      activeOrigin = event.origin;
      resolveHandshake?.(event.origin);
      return;
    }

    if (!isNativeResponse(event.data)) return;

    if (event.data.id === HANDSHAKE_ID) {
      if (event.data.ok) {
        activeOrigin = event.origin;
        resolveHandshake?.(event.origin);
      }
      return;
    }

    const entry = pending.get(event.data.id);
    if (!entry) return;
    pending.delete(event.data.id);
    window.clearTimeout(entry.timer);

    if (event.data.ok) {
      entry.resolve(event.data.result ?? {});
    } else {
      entry.reject(
        new Error(event.data.error || "The native sharing request failed")
      );
    }
  });
}

function ensureBridge(): Promise<string> {
  if (typeof window === "undefined" || window.parent === window) {
    return Promise.reject(new Error("Not running inside the Capacitor shell"));
  }
  if (activeOrigin) return Promise.resolve(activeOrigin);
  if (bridgePromise) return bridgePromise;

  installListener();

  bridgePromise = new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      resolveHandshake = null;
      reject(new Error("Native bridge did not respond"));
    }, HANDSHAKE_TIMEOUT_MS);

    resolveHandshake = (origin: string) => {
      window.clearTimeout(timer);
      resolveHandshake = null;
      resolve(origin);
    };

    const handshake: NativeRequest = {
      type: NATIVE_REQUEST_MESSAGE,
      id: HANDSHAKE_ID,
      method: "ping",
    };
    window.parent.postMessage(handshake, "*");
  }).catch((error: unknown) => {
    bridgePromise = null;
    throw error;
  });

  return bridgePromise;
}

async function request(
  method: NativeMethod,
  payload?: unknown
): Promise<unknown> {
  const origin = await ensureBridge();
  const id = createId();

  return new Promise<unknown>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error("The native sharing request timed out"));
    }, REQUEST_TIMEOUT_MS);

    pending.set(id, { resolve, reject, timer });

    const message: NativeRequest = {
      type: NATIVE_REQUEST_MESSAGE,
      id,
      method,
      payload,
    };
    window.parent.postMessage(message, origin);
  });
}

/** Returns true only when the hosted app is inside our Capacitor shell. */
export async function probeNativeBridge(): Promise<boolean> {
  try {
    await ensureBridge();
    return true;
  } catch {
    return false;
  }
}

export async function getNativeAvailability(
  platform?: NativeStoryPlatform
): Promise<NativeAvailability> {
  const payload: NativeAvailabilityRequest | undefined = platform
    ? { platform }
    : undefined;
  const result = await request("isAvailable", payload);
  if (!isNativeAvailability(result)) {
    throw new Error("The native sharing response was invalid");
  }
  return result;
}

export async function shareToNativeStory(
  platform: NativeStoryPlatform,
  options: NativeStoryOptions
): Promise<NativeHandoffResult> {
  const method =
    platform === "instagram" ? "shareToInstagramStory" : "shareToFacebookStory";
  const result = await request(method, options);
  if (!isNativeHandoffResult(result)) {
    throw new Error("The native sharing response was invalid");
  }
  return result;
}

export async function copyToNativeClipboard(
  value: string
): Promise<NativeClipboardResult> {
  const result = await request("copyToClipboard", { value });
  if (!isNativeClipboardResult(result)) {
    throw new Error("The clipboard response was invalid");
  }
  return result;
}
