/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import AsyncSelect from "react-select/async";
import debounce from "lodash.debounce";
import { Pause, Play } from "lucide-react";
import {
  getPreviewPlaybackSnapshot,
  getServerPreviewPlaybackSnapshot,
  pausePreview,
  primePreview,
  setPreviewPlayerMount,
  subscribePreviewPlayback,
  togglePreview,
} from "@/lib/spotifyPreviewPlayer";

type Artist = {
  name: string;
};

type Track = {
  id: string;
  name: string;
  artists: Artist[];
  image: string;
};

type OptionType = {
  value: string;
  label: string;
  track: Track;
};

interface SearchBarProps {
  setSelected: (option: OptionType | null) => void;
}

// Matches https://open.spotify.com/track/<id> (with optional /intl-xx/ and
// ?si=... share parameters) and spotify:track:<id> URIs.
const TRACK_LINK_PATTERN =
  /(?:spotify:track:|open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/)([A-Za-z0-9]{22})/i;

// Short links copied from the Spotify mobile app, e.g. https://spotify.link/AbC123
const SHORT_LINK_PATTERN =
  /^(?:https?:\/\/)?(spotify\.link|spotify\.app\.link)\/([A-Za-z0-9_-]+)/i;

function extractTrackId(input: string): string | null {
  return input.trim().match(TRACK_LINK_PATTERN)?.[1] ?? null;
}

// Returns the API route that can look up a pasted link, or null if the input
// isn't a Spotify song link (so it should be treated as a search instead).
function getLinkLookupUrl(input: string): string | null {
  const trackId = extractTrackId(input);
  if (trackId) return `/api/spotify/get?id=${trackId}`;

  const short = input.trim().match(SHORT_LINK_PATTERN);
  if (short) {
    const url = `https://${short[1].toLowerCase()}/${short[2]}`;
    return `/api/spotify/resolve?url=${encodeURIComponent(url)}`;
  }
  return null;
}

function toOptions(tracks: Track[]): OptionType[] {
  return tracks.map((track) => ({
    value: track.id,
    label: `${track.name} - ${track.artists
      .map((artist) => artist.name)
      .join(", ")}`,
    track,
  }));
}

function primeResults(tracks: Track[]) {
  if (tracks[0]?.id) void primePreview(tracks[0].id);
}

function PreviewButton({
  track,
  compact = false,
}: {
  track: Track;
  compact?: boolean;
}) {
  const playback = useSyncExternalStore(
    subscribePreviewPlayback,
    getPreviewPlaybackSnapshot,
    getServerPreviewPlaybackSnapshot
  );
  const isThisTrack = playback.trackId === track.id;
  const isPlaying = isThisTrack && playback.isPlaying;
  const isLoading = isThisTrack && playback.isLoading;
  const artists = track.artists.map((artist) => artist.name).join(", ");
  const label = `${isPlaying ? "Pause" : "Play"} preview of ${track.name}${
    artists ? ` by ${artists}` : ""
  }`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={isLoading || undefined}
      data-preview-state={
        isPlaying ? "playing" : isLoading ? "loading" : "idle"
      }
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        void togglePreview(track.id);
      }}
      onKeyDownCapture={(event) => {
        event.stopPropagation();
      }}
      className={`inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        compact ? "h-6 w-6" : "h-8 w-8"
      } ${
        isPlaying
          ? "border-accent bg-accent-weak text-accent"
          : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-raised"
      }`}
    >
      {isPlaying ? (
        <Pause size={compact ? 12 : 14} aria-hidden="true" />
      ) : (
        <Play size={compact ? 12 : 14} aria-hidden="true" />
      )}
    </button>
  );
}

export default function SearchBar({ setSelected }: SearchBarProps) {
  const [mounted, setMounted] = useState(false);
  const playerMountRef = useRef<HTMLDivElement>(null);
  const clearedByTypingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPreviewPlayerMount(mounted ? playerMountRef.current : null);
    return () => setPreviewPlayerMount(null);
  }, [mounted]);

  const [searchFailed, setSearchFailed] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const [trendingFailed, setTrendingFailed] = useState(false);

  // Created once so the debounce actually groups keystrokes together, and
  // uses react-select's callback form so the debounced result reaches it.
  const fetchResults = useMemo(
    () =>
      debounce((q: string, callback: (options: any) => void) => {
        if (!q.trim()) {
          fetch("/api/spotify/trending")
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json().catch(() => null);
              if (!Array.isArray(data)) throw new Error("Invalid response");
              setTrendingFailed(false);
              primeResults(data as Track[]);
              callback(
                data.length
                  ? [
                      {
                        label: "Trending in the Philippines",
                        options: toOptions(data as Track[]),
                      },
                    ]
                  : []
              );
            })
            .catch(() => {
              setTrendingFailed(true);
              callback([]);
            });
          return;
        }

        // A pasted Spotify song link is looked up through the key-less
        // oEmbed route, so it works even when Spotify search is unavailable.
        const lookupUrl = getLinkLookupUrl(q);
        if (lookupUrl) {
          fetch(lookupUrl)
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              const track: Track = {
                id: data.id,
                name: data.name || "Spotify track",
                artists: [],
                image: data.image || "",
              };
              setLinkFailed(false);
              primeResults([track]);
              callback([{ value: track.id, label: track.name, track }]);
            })
            .catch(() => {
              setLinkFailed(true);
              callback([]);
            });
          return;
        }

        fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`)
          .then(async (res) => {
            const data = await res.json().catch(() => null);
            if (!res.ok || !Array.isArray(data)) {
              setSearchFailed(true);
              callback([]);
              return;
            }
            setSearchFailed(false);
            primeResults(data as Track[]);
            callback(toOptions(data as Track[]));
          })
          .catch(() => {
            setSearchFailed(true);
            callback([]);
          });
      }, 300),
    []
  );

  useEffect(() => () => fetchResults.cancel(), [fetchResults]);

  const handleChange = (option: OptionType | null) => {
    setSelected(option);
    const clearedByTyping = clearedByTypingRef.current;
    clearedByTypingRef.current = false;

    if (!option) {
      // react-select clears the value as soon as the user types to search.
      // That shouldn't stop a preview the user deliberately started.
      if (!clearedByTyping) pausePreview();
      return;
    }

    // Selecting an option starts its preview. If that exact song is already
    // playing, leave it alone so selection never interrupts it.
    const playback = getPreviewPlaybackSnapshot();
    if (!(playback.trackId === option.track.id && playback.isPlaying)) {
      void togglePreview(option.track.id);
    }
  };

  const handleInputChange = (_value: string, actionMeta: { action: string }) => {
    if (actionMeta.action === "input-change") clearedByTypingRef.current = true;
  };

  const customSingleValue = ({ data }: any) => (
    <div className="flex min-w-0 items-center gap-2">
      <PreviewButton track={data.track} compact />
      {data.track.image && (
        <img
          src={data.track.image}
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 rounded object-cover"
          alt=""
        />
      )}
      <span className="truncate">{data.label}</span>
    </div>
  );

  const customOption = (props: any) => {
    const { data, innerRef, innerProps, isFocused } = props;
    const { track } = data;

    return (
      <div
        ref={innerRef}
        {...innerProps}
        className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ${
          isFocused ? "bg-surface-raised" : ""
        }`}
      >
        <PreviewButton track={track} />
        {track.image && (
          <img
            src={track.image}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded object-cover"
            alt=""
          />
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">
            {track.name}
          </div>
          {track.artists.length > 0 && (
            <div className="truncate text-xs text-muted">
              {track.artists.map((a: Artist) => a.name).join(", ")}
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatGroupLabel = (data: any) => (
    <div className="px-3 py-1.5 text-xs font-medium text-muted">
      {data.label}
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="mt-2">
      <div
        ref={playerMountRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 280,
          height: 80,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <AsyncSelect
        inputId="song"
        instanceId="song"
        name="song"
        cacheOptions
        defaultOptions
        isClearable
        loadOptions={fetchResults}
        onChange={handleChange}
        onInputChange={handleInputChange}
        components={{ SingleValue: customSingleValue, Option: customOption }}
        formatGroupLabel={formatGroupLabel}
        className="w-full"
        placeholder="Search, paste a Spotify link, or choose trending…"
        loadingMessage={({ inputValue }) =>
          inputValue ? "Searching…" : "Loading top songs in the Philippines…"
        }
        noOptionsMessage={({ inputValue }) =>
          !inputValue
            ? trendingFailed
              ? "Top songs are unavailable. Search or paste a Spotify link."
              : "No top songs available"
            : getLinkLookupUrl(inputValue)
            ? linkFailed
              ? "Couldn’t find that song. Check the link and try again."
              : "No tracks found"
            : searchFailed
            ? "Search is unavailable. Paste a Spotify song link instead (Share → Copy Song Link)."
            : "No tracks found"
        }
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: 44,
            backgroundColor: "var(--surface-raised)",
            borderColor: state.isFocused ? "var(--accent)" : "var(--line)",
            borderRadius: 8,
            boxShadow: state.isFocused
              ? "0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)"
              : "none",
            fontSize: 14,
            ":hover": {
              borderColor: state.isFocused
                ? "var(--accent)"
                : "var(--line-strong)",
            },
          }),
          valueContainer: (base) => ({
            ...base,
            padding: "2px 12px",
          }),
          singleValue: (base) => ({
            ...base,
            color: "var(--ink)",
          }),
          input: (base) => ({
            ...base,
            color: "var(--ink)",
          }),
          placeholder: (base) => ({
            ...base,
            color: "var(--muted)",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            overflow: "hidden",
            zIndex: 50,
          }),
          menuList: (base) => ({
            ...base,
            padding: 4,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused
              ? "var(--surface-raised)"
              : "transparent",
            color: "var(--ink)",
            cursor: "pointer",
          }),
          noOptionsMessage: (base) => ({
            ...base,
            color: "var(--muted)",
            fontSize: 13,
          }),
          loadingMessage: (base) => ({
            ...base,
            color: "var(--muted)",
            fontSize: 13,
          }),
          indicatorSeparator: () => ({ display: "none" }),
          dropdownIndicator: (base) => ({
            ...base,
            color: "var(--muted)",
            ":hover": { color: "var(--ink)" },
          }),
          clearIndicator: (base) => ({
            ...base,
            color: "var(--muted)",
            ":hover": { color: "var(--ink)" },
          }),
        }}
      />
    </div>
  );
}
