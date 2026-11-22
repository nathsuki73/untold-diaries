export interface Submission {
  id: number;
  name?: string;
  message?: string;
  track?: string | null;
  tag?: string | null;
  tag_key?: string | null;
}

export interface SubmissionWithTrack extends Submission {
  trackName?: string;
  trackArtists?: string[];
  trackPreviewUrl?: string | null;
  trackUrl?: string;
  trackImage?: string;
}

// Adds the song details used by Browse cards. A failed lookup leaves the fields
// empty so the card can show an unavailable state.
export async function withTrackInfo(
  items: Submission[]
): Promise<SubmissionWithTrack[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.track) return item;
      try {
        const res = await fetch(`/api/spotify/get?id=${item.track}`, {
          cache: "no-store",
        });
        if (!res.ok) return item;
        const data = await res.json();
        return {
          ...item,
          trackName: data.name,
          trackArtists: Array.isArray(data.artists) ? data.artists : [],
          trackPreviewUrl: data.previewUrl ?? null,
          trackUrl: data.url,
          trackImage: data.image,
        };
      } catch {
        return item;
      }
    })
  );
}
