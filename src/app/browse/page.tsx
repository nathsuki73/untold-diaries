"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import BrowseStoryCard, {
  type BrowseStory,
} from "@/components/BrowseStoryCard";
import { type Submission, withTrackInfo } from "@/lib/tracks";

const PAGE_SIZE = 12;

type FeedError = {
  message: string;
  kind: "initial" | "more";
};

type FeedResponse = {
  items?: Submission[];
  total?: number;
  total_pages?: number;
};

type PopularTag = {
  key: string;
  tag: string;
  count: number;
};

function mergeItems(current: BrowseStory[], incoming: BrowseStory[]) {
  const seen = new Set(current.map((item) => item.id));
  return [
    ...current,
    ...incoming.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }),
  ];
}

function StoryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[16rem] flex-col rounded-xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="h-3 w-8 rounded bg-surface-raised" />
      <div className="mt-3 h-6 w-2/3 rounded bg-surface-raised" />
      <div className="mt-5 space-y-2">
        <div className="h-3.5 w-full rounded bg-surface-raised" />
        <div className="h-3.5 w-11/12 rounded bg-surface-raised" />
        <div className="h-3.5 w-4/5 rounded bg-surface-raised" />
        <div className="h-3.5 w-2/3 rounded bg-surface-raised" />
      </div>
      <div className="mt-auto border-t border-line pt-4">
        <div className="h-3.5 w-20 rounded bg-surface-raised" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <ul
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <StoryCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

const chipClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-sm transition-colors";

export default function Browse() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [items, setItems] = useState<BrowseStory[]>([]);
  const [loadedPage, setLoadedPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [feedError, setFeedError] = useState<FeedError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const activeQueryRef = useRef<string | null>(null);
  const activeTagRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tags?limit=8", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((data) =>
        setPopularTags(
          Array.isArray(data?.tags)
            ? data.tags.filter(
                (tag: PopularTag) =>
                  typeof tag?.tag === "string" && tag.tag.trim()
              )
            : []
        )
      )
      .catch(() => setPopularTags([]));
    return () => controller.abort();
  }, []);

  const fetchPage = useCallback(async (page: number, signal: AbortSignal) => {
    const q = activeQueryRef.current;
    const tag = activeTagRef.current;
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (tag) params.set("tag", tag);

    const url = q
      ? `/api/submissions/search?q=${encodeURIComponent(q)}&${params}`
      : `/api/submissions?${params}`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: FeedResponse = await res.json();
    const items: BrowseStory[] = await withTrackInfo(
      Array.isArray(data.items) ? data.items : []
    );

    return {
      items,
      total: Number(data.total) || 0,
      totalPages: Math.max(1, Number(data.total_pages) || 1),
    };
  }, []);

  const startFeed = useCallback(
    (nextQuery: string | null, nextTag: string | null) => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      loadingRef.current = false;
      activeQueryRef.current = nextQuery;
      activeTagRef.current = nextTag;
      setActiveQuery(nextQuery);
      setActiveTag(nextTag);
      setItems([]);
      setLoadedPage(0);
      setTotalPages(1);
      setTotal(0);
      setFeedError(null);
      setLoading(true);
      setSearching(true);
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const requestId = requestIdRef.current;
    abortRef.current = controller;
    loadingRef.current = true;
    setLoading(true);
    setFeedError(null);
    setSearching(true);

    const loadFirstPage = async () => {
      try {
        const result = await fetchPage(1, controller.signal);
        if (controller.signal.aborted || requestId !== requestIdRef.current)
          return;
        setItems(mergeItems([], result.items));
        setLoadedPage(1);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } catch {
        if (controller.signal.aborted || requestId !== requestIdRef.current)
          return;
        setFeedError({
          message: "Check your connection and try again.",
          kind: "initial",
        });
      } finally {
        if (controller.signal.aborted || requestId !== requestIdRef.current)
          return;
        loadingRef.current = false;
        abortRef.current = null;
        setLoading(false);
        setSearching(false);
      }
    };

    void loadFirstPage();
    return () => controller.abort();
  }, [activeQuery, activeTag, fetchPage, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadedPage >= totalPages) return;

    const requestId = requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;
    setLoading(true);
    setFeedError(null);

    try {
      const result = await fetchPage(loadedPage + 1, controller.signal);
      if (controller.signal.aborted || requestId !== requestIdRef.current)
        return;
      setItems((current) => mergeItems(current, result.items));
      setLoadedPage((current) => current + 1);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch {
      if (controller.signal.aborted || requestId !== requestIdRef.current)
        return;
      setFeedError({
        message: "Couldn’t load more stories. Check your connection and try again.",
        kind: "more",
      });
    } finally {
      if (controller.signal.aborted || requestId !== requestIdRef.current)
        return;
      loadingRef.current = false;
      abortRef.current = null;
      setLoading(false);
    }
  }, [fetchPage, loadedPage, totalPages]);

  const retry = useCallback(() => {
    if (!feedError) return;
    if (feedError.kind === "initial") {
      setReloadKey((key) => key + 1);
      return;
    }
    void loadMore();
  }, [feedError, loadMore]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startFeed(query.trim() || null, activeTagRef.current);
  };

  const clearSearch = () => {
    setQuery("");
    startFeed(null, activeTagRef.current);
  };

  const clearTag = () => {
    startFeed(activeQueryRef.current, null);
  };

  const selectTag = (tag: string) => {
    const nextTag = activeTagRef.current === tag ? null : tag;
    startFeed(activeQueryRef.current, nextTag);
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (
      !node ||
      loading ||
      feedError ||
      items.length === 0 ||
      loadedPage >= totalPages
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feedError, items.length, loadMore, loadedPage, loading, totalPages]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
    },
    []
  );

  const hasMore = loadedPage < totalPages;
  const hasFilter = Boolean(activeQuery || activeTag);

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14"
    >
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl tracking-[-0.02em] text-ink sm:text-4xl">
          Browse stories
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          Search by the person a note was written for, or discover stories from
          a group.
        </p>
      </div>

      <form
        role="search"
        onSubmit={handleSearch}
        className="mt-8 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="story-search" className="sr-only">
            Search stories by recipient
          </label>
          <input
            id="story-search"
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by recipient…"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
        >
          <Search size={16} aria-hidden="true" />
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      <section aria-labelledby="explore-groups" className="mt-6">
        <h2
          id="explore-groups"
          className="text-sm font-medium text-ink"
        >
          Explore groups
        </h2>
        <div
          role="group"
          aria-label="Filter stories by group"
          className="mt-2 flex gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            aria-pressed={!activeTag}
            onClick={() => activeTag && clearTag()}
            className={`${chipClass} ${
              !activeTag
                ? "border-accent bg-accent-weak text-ink"
                : "border-line bg-surface text-muted hover:bg-surface-raised hover:text-ink"
            }`}
          >
            All Stories
          </button>
          {popularTags.map((tag) => {
            const active = activeTag === tag.tag;
            return (
              <button
                key={tag.key}
                type="button"
                aria-pressed={active}
                onClick={() => selectTag(tag.tag)}
                className={`${chipClass} ${
                  active
                    ? "border-accent bg-accent-weak text-ink"
                    : "border-line bg-surface text-muted hover:bg-surface-raised hover:text-ink"
                }`}
              >
                {tag.tag}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-8">
        {hasFilter && !feedError && (items.length > 0 || !loading) && (
          <div
            aria-live="polite"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
          >
            <p className="text-muted">
              {total} {total === 1 ? "story" : "stories"}
              {activeQuery ? ` for “${activeQuery}”` : ""}
              {activeTag ? ` in group “${activeTag}”` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {activeQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink"
                >
                  Clear search
                </button>
              )}
              {activeTag && (
                <button
                  type="button"
                  onClick={clearTag}
                  className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink"
                >
                  Clear group
                </button>
              )}
            </div>
          </div>
        )}

        {loading && items.length === 0 && !feedError ? (
          <div aria-busy="true">
            <p role="status" className="sr-only">
              Loading stories…
            </p>
            <SkeletonGrid count={6} />
          </div>
        ) : items.length === 0 ? (
          feedError?.kind === "initial" ? (
            <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
              <h2 className="font-serif text-xl text-ink">
                Couldn’t load stories
              </h2>
              <p
                role="alert"
                className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted"
              >
                {feedError.message}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
              <h2 className="font-serif text-xl text-ink">
                {hasFilter ? "No stories found" : "No stories yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                {activeQuery && activeTag
                  ? "Try a different name or group, or clear a filter."
                  : activeTag
                  ? "No stories in this group yet. Try another group or clear the filter."
                  : activeQuery
                  ? "Try a different name, or clear the search to see every story."
                  : "Be the first to leave an anonymous note and a song."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {activeQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                  >
                    Clear search
                  </button>
                )}
                {activeTag && (
                  <button
                    type="button"
                    onClick={clearTag}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
                  >
                    Clear group
                  </button>
                )}
                {!hasFilter && (
                  <Link
                    href="/submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-strong px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                  >
                    Share your story
                  </Link>
                )}
              </div>
            </div>
          )
        ) : (
          <>
            {!hasFilter && (
              <p className="mb-4 text-sm text-muted" aria-live="polite">
                Showing {items.length} of {total}{" "}
                {total === 1 ? "story" : "stories"}
              </p>
            )}

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {items.map((story) => (
                <li
                  key={story.id}
                  className="h-full [contain-intrinsic-size:16rem] [content-visibility:auto]"
                >
                  <BrowseStoryCard story={story} />
                </li>
              ))}
            </ul>

            {loading && (
              <div className="mt-5" aria-busy="true">
                <p role="status" className="sr-only">
                  Loading more stories…
                </p>
                <SkeletonGrid count={3} />
              </div>
            )}

            {feedError?.kind === "more" && (
              <div
                role="alert"
                className="mt-6 flex flex-col items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm sm:flex-row"
              >
                <p className="text-muted">{feedError.message}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex min-h-11 shrink-0 items-center font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !feedError && !hasMore && (
              <p
                role="status"
                className="mt-10 border-t border-line pt-6 text-center text-sm text-muted"
              >
                You’ve reached the end.
              </p>
            )}

            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          </>
        )}
      </div>
    </main>
  );
}
