/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export type PreviewPlaybackState = {
  trackId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
};

const INITIAL_STATE: PreviewPlaybackState = {
  trackId: null,
  isPlaying: false,
  isLoading: false,
};

// A real track keeps the hidden embed ready before the first preview click.
// It is only ever loaded, never played automatically.
const INITIAL_TRACK_ID = "1EqRuhrJZU5R7aeWyw1z8D";

let state: PreviewPlaybackState = INITIAL_STATE;
let mount: HTMLElement | null = null;
let controller: any = null;
let readyPromise: Promise<any> | null = null;
let primedTrackId: string | null = null;
let requestedTrackId: string | null = null;
let playbackIntent: "play" | "pause" | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribePreviewPlayback(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPreviewPlaybackSnapshot() {
  return state;
}

export function getServerPreviewPlaybackSnapshot(): PreviewPlaybackState {
  return INITIAL_STATE;
}

export function setPreviewPlayerMount(element: HTMLElement | null) {
  mount = element;
}

function trackIdFromUri(uri: unknown) {
  if (typeof uri !== "string" || !uri) return null;
  const parts = uri.split(":");
  return parts[parts.length - 1] || null;
}

function currentControllerTrack() {
  return trackIdFromUri(controller?.currentUri);
}

function updateFromPlayback(data: any) {
  const uriTrackId = trackIdFromUri(data?.playingURI);
  if (uriTrackId && requestedTrackId && uriTrackId !== requestedTrackId) return;

  const isBuffering = Boolean(data?.isBuffering);
  const hasStarted = Boolean(data?.playingURI);
  const isPaused = data?.isPaused === true;

  // The embed can deliver events from before a pause; don't let those restart
  // a preview the user just stopped.
  if (playbackIntent === "pause" && !isPaused) return;

  // Short buffering gaps after playback starts are normal; keep the button in
  // its playing state instead of flickering back to a spinner.
  const keepPlaying = playbackIntent === "play" || state.isPlaying;
  const isPlaying = hasStarted && !isPaused && (!isBuffering || keepPlaying);

  state = {
    trackId: uriTrackId ?? state.trackId,
    isPlaying,
    isLoading: !hasStarted || (isBuffering && !isPlaying),
  };
  emit();
}

function handlePlaybackStarted(data: any) {
  if (playbackIntent === "pause") return;

  const uriTrackId = trackIdFromUri(data?.playingURI);
  if (uriTrackId && requestedTrackId && uriTrackId !== requestedTrackId) return;

  state = {
    trackId: uriTrackId ?? state.trackId,
    isPlaying: true,
    isLoading: false,
  };
  emit();
}

function handleError() {
  requestedTrackId = null;
  playbackIntent = null;
  state = INITIAL_STATE;
  emit();
}

function ensureController(): Promise<any> {
  if (controller) return Promise.resolve(controller);
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve, reject) => {
    const create = () => {
      if (!mount) {
        readyPromise = null;
        reject(new Error("Spotify preview player has no mount element"));
        return;
      }

      const target = document.createElement("div");
      mount.appendChild(target);

      const onCreate = (created: any) => {
        controller = created;

        // The iframe API defaults to lazy loading. The player is tiny and
        // offscreen, so make it eager to avoid waiting for a scroll.
        const iframe = created.iframeElement as HTMLIFrameElement | undefined;
        if (iframe) {
          iframe.setAttribute("loading", "eager");
          iframe.setAttribute("title", "Spotify preview player");
          iframe.tabIndex = -1;
        }

        created.addListener("playback_update", (event: any) =>
          updateFromPlayback(event?.data)
        );
        created.addListener("playback_started", (event: any) =>
          handlePlaybackStarted(event?.data)
        );
        created.addListener("error", handleError);

        resolve(created);
      };

      const options = {
        width: "280",
        height: "80",
        uri: `spotify:track:${primedTrackId ?? INITIAL_TRACK_ID}`,
      };
      const api = (window as any).SpotifyIframeApi;
      if (api?.createController) {
        api.createController(target, options, onCreate);
        return;
      }

      const previous = (window as any).onSpotifyIframeApiReady;
      (window as any).onSpotifyIframeApiReady = (iframeApi: any) => {
        previous?.(iframeApi);
        (window as any).SpotifyIframeApi = iframeApi;
        iframeApi.createController(target, options, onCreate);
      };

      if (!document.getElementById("spotify-iframeapi-script")) {
        const script = document.createElement("script");
        script.id = "spotify-iframeapi-script";
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        document.head.appendChild(script);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", create, { once: true });
    } else {
      create();
    }
  });

  return readyPromise;
}

// Loads a track into the hidden embed without playing it, so the first real
// play click can act on a player that is already ready.
export async function primePreview(trackId: string) {
  if (!trackId) return;
  primedTrackId = trackId;

  try {
    const player = await ensureController();
    if (!state.isPlaying && !state.isLoading && currentControllerTrack() !== trackId) {
      player.loadUri(`spotify:track:${trackId}`);
    }
  } catch {
    // Priming is only an optimization; the play button will retry on click.
  }
}

export async function togglePreview(trackId: string) {
  if (!trackId) return;

  const wasPlaying = state.trackId === trackId && state.isPlaying;
  requestedTrackId = trackId;
  playbackIntent = wasPlaying ? "pause" : "play";
  state = wasPlaying
    ? { trackId, isPlaying: false, isLoading: false }
    : { trackId, isLoading: true, isPlaying: false };
  emit();

  try {
    const player = await ensureController();
    if (currentControllerTrack() === trackId) {
      if (wasPlaying) player.pause();
      else player.play();
      return;
    }

    player.loadUri(`spotify:track:${trackId}`);
    // The iframe API queues this while the new track loads.
    player.play();
  } catch {
    requestedTrackId = null;
    playbackIntent = null;
    state = INITIAL_STATE;
    emit();
  }
}

export function pausePreview() {
  if (!controller) return;
  playbackIntent = "pause";
  controller.pause();
  state = { ...state, isPlaying: false, isLoading: false };
  emit();
}
