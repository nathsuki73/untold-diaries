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
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function searchTracks(query: string) {
  const token = await getSpotifyToken();

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Failed to fetch");

  const data = await res.json();
  if (!data.tracks) return [];

  // Format each track to match frontend expectations
  return data.tracks.items.map((track: any) => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist: any) => ({ name: artist.name })),
    preview_url: track.preview_url,
    image: track.album.images[1]?.url || track.album.images[0]?.url || "", // Use medium or fallback
  }));
}

export async function getTrackById(trackId: string) {
  const token = await getSpotifyToken();

  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch track");

  const track = await res.json();

  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist: any) => ({ name: artist.name })),
    preview_url: track.preview_url,
    image: track.album.images[1]?.url || track.album.images[0]?.url || "",
  };
}
