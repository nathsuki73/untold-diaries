export const MAX_TAG_LENGTH = 60;

const UNSAFE_CHARACTERS = /[\p{Cc}\p{Cf}<>]/gu;
const WHITESPACE = /\s+/g;

/**
 * Turns free text into one stable, human-readable tag label.
 * Removes control/format characters and angle brackets, normalises Unicode,
 * collapses whitespace, and enforces a short, bounded label.
 */
export function normalizeTag(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const normalized = input
    .normalize("NFKC")
    .replace(UNSAFE_CHARACTERS, "")
    .replace(WHITESPACE, " ")
    .trim();

  if (!normalized || normalized.length > MAX_TAG_LENGTH) return null;
  return normalized;
}

/** Case-insensitive key used to prevent duplicate tags with different casing. */
export function tagKey(value: string): string {
  return value.toLowerCase();
}
