"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StoryAmbience from "@/components/StoryAmbience";
import StoryShareButton from "@/components/StoryShareButton";

type Submission = {
  id: number;
  name: string;
  message: string;
  from: string;
  track: string;
};

type SpotifyEmbedController = {
  iframeElement?: HTMLIFrameElement;
  addListener: (event: string, handler: () => void) => void;
  play: () => void;
  destroy: () => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { width: string; height: number; uri: string },
    callback: (controller: SpotifyEmbedController) => void
  ) => void;
};

type SpotifyWindow = Window & {
  SpotifyIframeApi?: SpotifyIframeApi;
  onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
};

function createAutoplayEmbed(element: HTMLElement, trackId: string) {
  let disposed = false;
  let controller: SpotifyEmbedController | null = null;
  const spotifyWindow = window as SpotifyWindow;

  const create = (api: SpotifyIframeApi) => {
    if (disposed) return;

    api.createController(
      element,
      {
        width: "100%",
        height: 352,
        uri: `spotify:track:${trackId}`,
      },
      (created) => {
        if (disposed) {
          created.destroy();
          return;
        }

        controller = created;
        const iframe = created.iframeElement;
        if (iframe) {
          iframe.title = "Spotify player";
          iframe.setAttribute("loading", "eager");
          iframe.setAttribute(
            "allow",
            "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          );
          iframe.style.borderRadius = "12px";
          iframe.style.width = "100%";
        }

        // The embed is ready to stream here, so start it without another click.
        created.addListener("ready", () => {
          if (!disposed) created.play();
        });
        created.play();
      }
    );
  };

  if (spotifyWindow.SpotifyIframeApi) {
    create(spotifyWindow.SpotifyIframeApi);
    return () => {
      disposed = true;
      controller?.destroy();
    };
  }

  const previous = spotifyWindow.onSpotifyIframeApiReady;
  const handler = (api: SpotifyIframeApi) => {
    previous?.(api);
    spotifyWindow.SpotifyIframeApi = api;
    create(api);
  };
  spotifyWindow.onSpotifyIframeApiReady = handler;

  const scriptId = "spotify-view-iframeapi-script";
  if (
    !document.getElementById("spotify-iframeapi-script") &&
    !document.getElementById(scriptId)
  ) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.head.appendChild(script);
  }

  return () => {
    disposed = true;
    if (spotifyWindow.onSpotifyIframeApiReady === handler) {
      spotifyWindow.onSpotifyIframeApiReady = previous;
    }
    controller?.destroy();
  };
}

function StatusPage({
  title,
  body,
  loading = false,
}: {
  title: string;
  body: string;
  loading?: boolean;
}) {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <h1 className="font-serif text-3xl tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p
        role={loading ? "status" : undefined}
        className="mt-3 text-base leading-7 text-muted"
      >
        {body}
      </p>
      {!loading && (
        <Link
          href="/browse"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
        >
          Browse stories
        </Link>
      )}
    </main>
  );
}

const ViewClient = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    fetch(`/api/submissions/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Submission not found");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSubmission(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setSubmission(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const element = playerRef.current;
    if (!submission?.track || !element) return;
    return createAutoplayEmbed(element, submission.track);
  }, [submission?.track]);

  if (!id) {
    return (
      <StatusPage
        title="No story selected"
        body="Open a story from the browse page to read it here."
      />
    );
  }

  if (loading) {
    return (
      <StatusPage
        title="Loading story"
        body="Just a moment…"
        loading
      />
    );
  }

  if (error) {
    return (
      <StatusPage
        title="Story not found"
        body="We couldn’t find that story. It may have been removed."
      />
    );
  }

  if (!submission) {
    return (
      <StatusPage
        title="Story not found"
        body="We couldn’t find that story. It may have been removed."
      />
    );
  }

  return (
    <main
      id="main"
      className="relative isolate mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14"
    >
      <StoryAmbience trackId={submission.track} seed={submission.id} />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/browse"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            All stories
          </Link>

          <StoryShareButton
            storyId={submission.id}
            recipient={submission.name}
            message={submission.message}
            track={submission.track}
          />
        </div>

        <article className="mt-6 rounded-xl border border-line bg-surface p-6 sm:p-10">
          <header>
            <p className="text-sm text-muted">A note for</p>
            <h1
              id="story-title"
              className="mt-1 break-words font-serif text-3xl tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {submission.name || "Someone"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              A song and a message someone thought you might appreciate.
            </p>
          </header>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
            <div>
              <p className="whitespace-pre-wrap break-words font-serif text-lg leading-8 text-ink">
                {submission.message}
              </p>

              {submission.from && (
                <p className="mt-6 text-sm text-muted">
                  From{" "}
                  <span className="font-medium text-ink">
                    {submission.from}
                  </span>
                </p>
              )}
            </div>

            {submission.track && (
              <div
                ref={playerRef}
                aria-label="Spotify player"
                className="min-h-[352px] w-full overflow-hidden rounded-xl"
              />
            )}
          </div>
        </article>
      </div>
    </main>
  );
};

export default ViewClient;
