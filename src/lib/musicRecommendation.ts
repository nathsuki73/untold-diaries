export type MusicRecommendation = {
  title: string;
  artist: string;
  searchQuery: string;
  source: "spotify" | "text";
};

const TRACK_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

function normalizeArtistList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry: unknown) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object") return "";
      const name = (entry as { name?: unknown }).name;
      return typeof name === "string" ? name.trim() : "";
    })
    .filter(Boolean)
    .join(", ");
}

function fromTrackDetails(details: {
  name?: unknown;
  artists?: unknown;
}): MusicRecommendation | null {
  const title = typeof details.name === "string" ? details.name.trim() : "";
  if (!title) return null;

  const artist = normalizeArtistList(details.artists);
  return {
    title,
    artist,
    searchQuery: artist ? `${title} ${artist}` : title,
    source: "spotify",
  };
}

function parsePlainLabel(track: string): MusicRecommendation | null {
  const cleaned = track.trim().replace(/^spotify:track:/i, "");
  const parts = cleaned
    .split(/\s+(?:—|–|-|by)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const title = parts[0] || "";
  if (!title) return null;
  const artist = parts.slice(1).join(", ");

  return {
    title,
    artist,
    searchQuery: artist ? `${title} ${artist}` : title,
    source: "text",
  };
}

function extractTrackId(value: string): string {
  const direct = value.trim();
  if (TRACK_ID_PATTERN.test(direct)) return direct;

  try {
    const url = new URL(direct);
    if (url.hostname === "open.spotify.com") {
      const match = url.pathname.match(/\/track\/([A-Za-z0-9]{22})/);
      if (match?.[1]) return match[1];
    }
  } catch {
    // Not a URL; fall through to the plain-label parser.
  }

  return "";
}

async function fetchTrack(path: string): Promise<MusicRecommendation | null> {
  try {
    const response = await fetch(path, { cache: "force-cache" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return null;
    return fromTrackDetails(data as { name?: unknown; artists?: unknown });
  } catch {
    return null;
  }
}

/**
 * Turns the note's Spotify ID/link into a human-readable song query. This only
 * prepares a recommendation; the Story composer's music sticker is controlled
 * by the user.
 */
export async function analyzeMusic(
  track?: string | null
): Promise<MusicRecommendation | null> {
  if (!track?.trim()) return null;

  const trackId = extractTrackId(track);
  if (trackId) {
    const recommendation = await fetchTrack(
      `/api/spotify/get?id=${encodeURIComponent(trackId)}`
    );
    if (recommendation) return recommendation;
  } else {
    try {
      const url = new URL(track.trim());
      if (/spotify\.link|spotify\.app\.link/.test(url.hostname)) {
        const recommendation = await fetchTrack(
          `/api/spotify/resolve?url=${encodeURIComponent(track.trim())}`
        );
        if (recommendation) return recommendation;
      }
    } catch {
      // Not a short link; try the stored label below.
    }
  }

  return parsePlainLabel(track);
}
