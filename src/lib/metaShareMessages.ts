export const NATIVE_READY_MESSAGE = "untold-diaries:native-ready";
export const NATIVE_REQUEST_MESSAGE = "untold-diaries:native-request";
export const NATIVE_RESPONSE_MESSAGE = "untold-diaries:native-response";

export type NativeStoryPlatform = "instagram" | "facebook";

export type NativeMethod =
  | "ping"
  | "isAvailable"
  | "shareToInstagramStory"
  | "shareToFacebookStory"
  | "copyToClipboard";

export type NativeStoryOptions = {
  backgroundBase64: string;
  stickerBase64?: string;
  destinationUrl: string;
  stickerLabel: string;
  songTitle?: string;
  songArtist?: string;
};

export type NativeAvailabilityRequest = {
  platform?: NativeStoryPlatform;
};

export type NativeAvailability = {
  available: boolean;
  installed: boolean;
  reason?: string;
};

export type NativeHandoffResult = {
  handoff: boolean;
  platform: NativeStoryPlatform;
};

export type NativeClipboardResult = {
  copied: boolean;
};

export type NativeRequest = {
  type: typeof NATIVE_REQUEST_MESSAGE;
  id: string;
  method: NativeMethod | string;
  payload?: unknown;
};

export type NativeResponse = {
  type: typeof NATIVE_RESPONSE_MESSAGE;
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type NativeReady = {
  type: typeof NATIVE_READY_MESSAGE;
  available: boolean;
};

export function isNativeResponse(value: unknown): value is NativeResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NativeResponse>;
  return (
    candidate.type === NATIVE_RESPONSE_MESSAGE &&
    typeof candidate.id === "string" &&
    typeof candidate.ok === "boolean" &&
    (candidate.result === undefined || typeof candidate.result === "object") &&
    (candidate.error === undefined || typeof candidate.error === "string")
  );
}

export function isNativeReady(value: unknown): value is NativeReady {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NativeReady>;
  return (
    candidate.type === NATIVE_READY_MESSAGE &&
    typeof candidate.available === "boolean"
  );
}

export function isNativeRequest(value: unknown): value is NativeRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NativeRequest>;
  return (
    candidate.type === NATIVE_REQUEST_MESSAGE &&
    typeof candidate.id === "string" &&
    typeof candidate.method === "string"
  );
}

export function isNativeAvailability(
  value: unknown
): value is NativeAvailability {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NativeAvailability>;
  return (
    typeof candidate.available === "boolean" &&
    typeof candidate.installed === "boolean" &&
    (candidate.reason === undefined || typeof candidate.reason === "string")
  );
}

export function isNativeHandoffResult(
  value: unknown
): value is NativeHandoffResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NativeHandoffResult>;
  return (
    typeof candidate.handoff === "boolean" &&
    (candidate.platform === "instagram" || candidate.platform === "facebook")
  );
}

export function isNativeClipboardResult(
  value: unknown
): value is NativeClipboardResult {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Partial<NativeClipboardResult>).copied === "boolean";
}
