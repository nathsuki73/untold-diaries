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

/** Server-side origin for API-generated links, preferring explicit config. */
export function getServerSiteUrl(requestUrl?: string): string {
  const configured = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  return normalizeUrl(requestUrl);
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

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
