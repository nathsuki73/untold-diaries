const DEFAULT_SHELL_ORIGINS = [
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "ionic://localhost",
];

function normalizeUrl(value: string | undefined | null): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** Stable public origin used for share links and canonical metadata. */
export function getSiteUrl(): string {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getMetadataBase(): URL | undefined {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return configured ? new URL(configured) : undefined;
}

export function getStoryUrl(storyId: number): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/view?id=${storyId}`;
}

export function getHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

/** Origins allowed to act as the Capacitor shell around the hosted web app. */
export function getAllowedShellOrigins(): string[] {
  const configured = (process.env.NEXT_PUBLIC_CAPACITOR_SHELL_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeUrl(origin) || origin);

  return configured.length > 0 ? configured : DEFAULT_SHELL_ORIGINS;
}
