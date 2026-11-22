/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Music2 } from "lucide-react";

export type BrowseStory = {
  id: number;
  name?: string;
  message?: string;
  from?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  submitted_at?: string | null;
  date?: string | null;
  track?: string | null;
  trackName?: string;
  trackArtists?: string[];
  trackPreviewUrl?: string | null;
  trackUrl?: string;
  trackImage?: string;
  tag?: string | null;
  tag_key?: string | null;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    parsed
  );
}

export default function BrowseStoryCard({ story }: { story: BrowseStory }) {
  const recipient = story.name?.trim() || "Someone";
  const message = story.message?.trim();
  const sender = story.from?.trim();
  const rawDate =
    story.created_at ??
    story.createdAt ??
    story.submitted_at ??
    story.date ??
    null;
  const date = rawDate ? formatDate(rawDate) : null;
  const tag = story.tag?.trim();

  const hasTrack = Boolean(story.track);
  const hasTrackInfo = Boolean(story.trackName);
  const artists = story.trackArtists?.filter(Boolean).join(", ") || "";
  const songTitle = hasTrackInfo
    ? story.trackName || "Song unavailable"
    : hasTrack
    ? "Song unavailable"
    : "No song attached";
  const songArtist = hasTrackInfo
    ? artists || "Artist unavailable"
    : hasTrack
    ? "Spotify details aren’t available"
    : "This story has no song";

  return (
    <article className="group relative flex h-full min-h-[20rem] flex-col rounded-xl border border-line bg-surface p-5 transition-[border-color,background-color,transform] duration-150 ease-out hover:border-line-strong hover:bg-surface-raised focus-within:border-accent active:scale-[0.995] sm:p-6">
      <Link
        href={`/view?id=${story.id}`}
        aria-label={`Read story for ${recipient}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <div className="min-w-0">
          <p className="text-xs text-muted">To</p>
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink transition-colors group-hover:text-accent">
            {recipient}
          </h2>
        </div>

        {tag && (
          <p className="mt-3">
            <span className="inline-flex max-w-full items-center rounded-md border border-line bg-surface-raised px-2 py-0.5 text-[11px] font-medium leading-5 text-muted">
              <span className="truncate">{tag}</span>
            </span>
          </p>
        )}

        {(sender || date) && (
          <div className={`${tag ? "mt-2" : "mt-3"} flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted`}>
            {sender && (
              <p>
                From <span className="font-medium text-ink">{sender}</span>
              </p>
            )}
            {date && rawDate && (
              <p>
                Date{" "}
                <time dateTime={rawDate} className="font-medium text-ink">
                  {date}
                </time>
              </p>
            )}
          </div>
        )}

        {message && (
          <p className="mt-4 line-clamp-3 break-words text-[15px] leading-7 text-ink">
            {message}
          </p>
        )}

        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center gap-3">
            {story.trackImage ? (
              <img
                src={story.trackImage}
                alt={`Album art for ${songTitle}`}
                loading="lazy"
                decoding="async"
                className="h-11 w-11 shrink-0 rounded-md border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface-raised text-muted"
              >
                <Music2 size={18} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium text-ink"
                title={songTitle}
              >
                {songTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted" title={songArtist}>
                {songArtist}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
