/* eslint-disable @typescript-eslint/no-explicit-any */
const TOKEN_URL = "https://accounts.spotify.com/api/token";

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Spotify token request returned ${res.status}: ${JSON.stringify(data).slice(0, 300)}`
    );
  }
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export type SearchTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  preview_url: string | null;
  image: string;
};

export async function searchTracks(
  query: string,
  options: { market?: string; limit?: number } = {}
): Promise<SearchTrack[]> {
  const token = await getSpotifyToken();
  const market = options.market
    ? `&market=${encodeURIComponent(options.market)}`
    : "";
  const limit = options.limit ?? 5;

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track&limit=${limit}${market}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify search returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data.tracks) return [];

  // Format each track to match frontend expectations
  return data.tracks.items.map((track: any): SearchTrack => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist: any) => ({ name: artist.name })),
    preview_url: track.preview_url,
    image: track.album.images[1]?.url || track.album.images[0]?.url || "", // Use medium or fallback
  }));
}

export type TrendingTrack = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  image: string;
};

type ChartEntry = {
  id: string;
  name: string;
  artist: string;
};

const PH_CHART_URL = "https://kworb.net/spotify/country/ph_daily.html";

let trendingCache: { items: TrendingTrack[]; expires: number } | null = null;

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parsePhilippinesChart(html: string, limit: number): ChartEntry[] {
  const entries: ChartEntry[] = [];
  const row =
    /<td class="text mp"><div><a href="[^"]*\/artist\/[^"]+">([^<]+)<\/a>\s*-\s*<a href="[^"]*\/track\/([A-Za-z0-9]{22})\.html">([^<]+)<\/a>[\s\S]*?<\/div><\/td>/g;

  let match: RegExpExecArray | null;
  while ((match = row.exec(html)) !== null) {
    entries.push({
      artist: decodeEntities(match[1]),
      id: match[2],
      name: decodeEntities(match[3]),
    });
    if (entries.length >= limit) break;
  }
  return entries;
}

// The Web API available to this app can search tracks but cannot read playlist
// items or chart endpoints. Kworb republishes Spotify's current Philippines
// daily chart with track IDs, so we read the chart there and use Spotify search
// to fill in canonical names, artists, and artwork.
export async function getPhilippinesTopTracks(
  limit = 5
): Promise<TrendingTrack[]> {
  if (trendingCache && Date.now() < trendingCache.expires) {
    return trendingCache.items;
  }

  const chartRes = await fetch(PH_CHART_URL, {
    cache: "no-store",
    headers: { "User-Agent": "UntoldDiaries/1.0" },
  });
  if (!chartRes.ok) {
    throw new Error(`Spotify Philippines chart returned ${chartRes.status}`);
  }

  const chart = parsePhilippinesChart(await chartRes.text(), limit);
  if (!chart.length) return [];

  const items = await Promise.all(
    chart.map(async (entry) => {
      const fallback: TrendingTrack = {
        id: entry.id,
        name: entry.name,
        artists: [{ name: entry.artist }],
        image: "",
      };

      try {
        const query = `${entry.artist} ${entry.name}`.trim();
        const results = await searchTracks(query, { market: "PH", limit: 5 });
        const match =
          results.find((track) => track.id === entry.id) ??
          results.find(
            (track) =>
              normalize(track.name) === normalize(entry.name) &&
              track.artists.some(
                (artist) => normalize(artist.name) === normalize(entry.artist)
              )
          );

        if (!match) return fallback;

        return {
          id: match.id || entry.id,
          name: match.name || entry.name,
          artists: match.artists.length
            ? match.artists
            : [{ name: entry.artist }],
          image: match.image || "",
        };
      } catch {
        return fallback;
      }
    })
  );

  const tracks = items.filter((track) => track.id && track.name);
  trendingCache = { items: tracks, expires: Date.now() + 15 * 60 * 1000 };
  return tracks;
}

export interface TrackInfo {
  id: string;
  name: string;
  artists: string[];
  previewUrl: string | null;
  url: string;
  image: string;
}

// Spotify track IDs are 22 base-62 characters.
const TRACK_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

// Successful lookups are remembered for a day; failures for 5 minutes so a
// temporarily unavailable track is retried without hammering Spotify.
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

const trackCache = new Map<string, { info: TrackInfo | null; expires: number }>();
// Concurrent requests for the same track share a single lookup.
const inFlight = new Map<string, Promise<TrackInfo | null>>();

// Short share links from the Spotify mobile app, e.g. https://spotify.link/AbC123
const SHORT_LINK_HOSTS = new Set(["spotify.link", "spotify.app.link"]);
const TRACK_ID_IN_TEXT = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})/i;
const shortLinkCache = new Map<string, string | null>();

export function isShortLink(input: string) {
  try {
    const url = new URL(input.trim());
    return url.protocol === "https:" && SHORT_LINK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// Follows a spotify.link short link to find the track ID it points to.
export async function resolveShortLink(input: string): Promise<string | null> {
  if (!isShortLink(input)) return null;
  const url = new URL(input.trim());
  const key = `${url.hostname}${url.pathname}`;
  if (shortLinkCache.has(key)) return shortLinkCache.get(key)!;

  let trackId: string | null = null;
  try {
    const res = await fetch(`https://${url.hostname}${url.pathname}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; link-resolver)" },
    });
    // Usually the redirect lands on open.spotify.com/track/<id>; otherwise
    // the landing page still mentions the track URL in its markup.
    trackId =
      res.url.match(TRACK_ID_IN_TEXT)?.[1] ??
      (await res.text()).match(TRACK_ID_IN_TEXT)?.[1] ??
      null;
  } catch (err) {
    console.error("Failed to resolve Spotify short link:", err);
    return null; // don't cache network failures
  }

  shortLinkCache.set(key, trackId);
  return trackId;
}

export function isValidTrackId(trackId: string) {
  return TRACK_ID_PATTERN.test(trackId);
}

async function fetchTrackFromWebApi(trackId: string): Promise<TrackInfo | null> {
  const token = await getSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const track = await res.json();
  return {
    id: trackId,
    name: track.name || "",
    artists: (track.artists ?? [])
      .map((artist: any) => String(artist.name ?? "").trim())
      .filter(Boolean),
    previewUrl: track.preview_url || null,
    url: track.external_urls?.spotify || `https://open.spotify.com/track/${trackId}`,
    image:
      track.album?.images?.[1]?.url ||
      track.album?.images?.[0]?.url ||
      "",
  };
}

async function fetchTrackFromOEmbed(trackId: string): Promise<TrackInfo | null> {
  // oEmbed is Spotify's public, key-less endpoint (the same source as the
  // embed player), so it does not count against the app's Web API rate limit.
  const trackUrl = `https://open.spotify.com/track/${trackId}`;
  const res = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`
  );

  if (!res.ok) {
    console.error(`Spotify oEmbed returned ${res.status} for track ${trackId}`);
    return null;
  }

  const data = await res.json();
  return {
    id: trackId,
    name: data.title || "",
    artists: [],
    previewUrl: null,
    url: trackUrl,
    image: data.thumbnail_url || "",
  };
}

export async function getTrackById(trackId: string): Promise<TrackInfo | null> {
  const cached = trackCache.get(trackId);
  if (cached && Date.now() < cached.expires) return cached.info;

  const pending = inFlight.get(trackId);
  if (pending) return pending;

  // The Web API supplies artists and preview URLs; oEmbed is the fallback when
  // credentials or quota are unavailable, keeping the old name/art behaviour.
  const lookup = fetchTrackFromWebApi(trackId)
    .catch(() => null)
    .then((info) => info ?? fetchTrackFromOEmbed(trackId))
    .catch((err) => {
      console.error(`Spotify lookup failed for track ${trackId}:`, err);
      return null;
    })
    .then((info) => {
      trackCache.set(trackId, {
        info,
        expires: Date.now() + (info ? SUCCESS_TTL_MS : FAILURE_TTL_MS),
      });
      return info;
    })
    .finally(() => inFlight.delete(trackId));

  inFlight.set(trackId, lookup);
  return lookup;
}
