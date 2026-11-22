"use client";

export type PlaybackState = {
  trackId: string | null;
  isPlaying: boolean;
};

let audio: HTMLAudioElement | null = null;
let state: PlaybackState = { trackId: null, isPlaying: false };
let operation = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("ended", () => {
      state = { trackId: null, isPlaying: false };
      emit();
    });
    audio.addEventListener("pause", () => {
      if (state.isPlaying) {
        state = { ...state, isPlaying: false };
        emit();
      }
    });
  }
  return audio;
}

export function subscribePlayback(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPlaybackSnapshot(): PlaybackState {
  return state;
}

export function getServerPlaybackSnapshot(): PlaybackState {
  return state;
}

export async function togglePreview(trackId: string, previewUrl: string | null) {
  if (!previewUrl) return;

  const element = getAudio();
  if (!element) return;

  const currentOperation = ++operation;
  const isCurrentTrack = state.trackId === trackId;

  if (isCurrentTrack && state.isPlaying) {
    element.pause();
    state = { trackId, isPlaying: false };
    emit();
    return;
  }

  if (!isCurrentTrack) {
    element.pause();
    element.src = previewUrl;
    element.load();
    state = { trackId, isPlaying: false };
    emit();
  }

  try {
    await element.play();
    if (currentOperation !== operation) return;
    state = { trackId, isPlaying: true };
  } catch {
    if (currentOperation !== operation) return;
    state = { trackId, isPlaying: false };
  }
  emit();
}
