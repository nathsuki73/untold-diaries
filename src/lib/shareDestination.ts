import { getStoryUrl, isSafeHttpUrl } from "@/lib/siteUrl";

export type ShareDestination = {
  url: string;
  tracked: boolean;
};

// One resolved destination per story per page session. Opening and closing the
// modal must not create a new tracking row on every click.
const destinationCache = new Map<number, Promise<ShareDestination>>();

export function getShareDestination(storyId: number): Promise<ShareDestination> {
  const cached = destinationCache.get(storyId);
  if (cached) return cached;

  const request = fetch("/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId }),
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Share link unavailable");
      const data: unknown = await response.json();
      const url = (data as { url?: unknown } | null)?.url;
      if (typeof url !== "string" || !isSafeHttpUrl(url)) {
        throw new Error("Invalid share link");
      }
      return { url, tracked: true } satisfies ShareDestination;
    })
    .catch(() => {
      const fallback = getStoryUrl(storyId);
      return {
        url: isSafeHttpUrl(fallback) ? fallback : "",
        tracked: false,
      } satisfies ShareDestination;
    });

  destinationCache.set(storyId, request);
  return request;
}
