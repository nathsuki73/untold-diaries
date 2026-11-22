"use client";

import { useEffect, useRef } from "react";

type RGB = [number, number, number];

type AmbiencePalette = {
  light: [RGB, RGB, RGB];
  dark: [RGB, RGB, RGB];
};

const LAYER_KEYS = ["a", "b", "c"] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl([red, green, blue]: RGB): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return [hue, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): RGB {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation, 0, 1);
  const l = clamp(lightness, 0, 1);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = l - chroma / 2;

  let channels: [number, number, number];
  if (h < 60) channels = [chroma, secondary, 0];
  else if (h < 120) channels = [secondary, chroma, 0];
  else if (h < 180) channels = [0, chroma, secondary];
  else if (h < 240) channels = [0, secondary, chroma];
  else if (h < 300) channels = [secondary, 0, chroma];
  else channels = [chroma, 0, secondary];

  return channels.map(
    (channel) => Math.round((channel + match) * 255)
  ) as RGB;
}

function triplet([red, green, blue]: RGB) {
  return `${Math.round(red)} ${Math.round(green)} ${Math.round(blue)}`;
}

function hueFromSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

function paletteFromHue(
  hue: number,
  saturation = 0.54,
  lightness = 0.5
): AmbiencePalette {
  const sat = clamp(saturation, 0.32, 0.72);
  const light = clamp(lightness, 0.36, 0.64);

  return {
    light: [
      hslToRgb(hue, sat * 0.78, clamp(light + 0.08, 0.48, 0.72)),
      hslToRgb(hue + 18, sat * 0.86, clamp(light + 0.02, 0.42, 0.66)),
      hslToRgb(hue - 16, sat * 0.74, clamp(light - 0.04, 0.36, 0.6)),
    ],
    dark: [
      hslToRgb(hue, sat * 0.68, clamp(light - 0.1, 0.28, 0.46)),
      hslToRgb(hue + 18, sat * 0.76, clamp(light - 0.14, 0.24, 0.42)),
      hslToRgb(hue - 16, sat * 0.64, clamp(light - 0.18, 0.22, 0.38)),
    ],
  };
}

function paletteFromRgb(rgb: RGB): AmbiencePalette {
  const [hue, saturation, lightness] = rgbToHsl(rgb);

  // Near-grey artwork still gets a calm violet rather than muddy grey light.
  if (saturation < 0.16) return paletteFromHue(258, 0.42, 0.5);
  return paletteFromHue(hue, saturation, lightness);
}

function loadDominantColor(src: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (value: RGB | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          finish(null);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;
        const buckets = Array.from({ length: 24 }, () => ({
          weight: 0,
          red: 0,
          green: 0,
          blue: 0,
        }));

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3] / 255;
          if (alpha < 0.5) continue;

          const rgb: RGB = [
            pixels[index],
            pixels[index + 1],
            pixels[index + 2],
          ];
          const [hue, saturation, lightness] = rgbToHsl(rgb);
          if (saturation < 0.14 || lightness < 0.1 || lightness > 0.94) {
            continue;
          }

          const weight =
            alpha * (0.25 + saturation) * (1 - Math.abs(lightness - 0.55) * 0.5);
          const bucket =
            buckets[Math.floor((hue / 360) * buckets.length) % buckets.length];
          bucket.weight += weight;
          bucket.red += rgb[0] * weight;
          bucket.green += rgb[1] * weight;
          bucket.blue += rgb[2] * weight;
        }

        const strongest = buckets.reduce((best, bucket) =>
          bucket.weight > best.weight ? bucket : best
        );
        if (strongest.weight === 0) {
          finish(null);
          return;
        }

        finish([
          strongest.red / strongest.weight,
          strongest.green / strongest.weight,
          strongest.blue / strongest.weight,
        ]);
      } catch {
        finish(null);
      }
    };
    image.onerror = () => finish(null);
    image.src = src;
  });
}

type StoryAmbienceProps = {
  trackId?: string | null;
  seed: string | number;
};

export default function StoryAmbience({ trackId, seed }: StoryAmbienceProps) {
  const ambientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ambientRef.current;
    if (!element) return;

    const syncVisibility = () => {
      element.dataset.paused = document.hidden ? "true" : "false";
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    const element = ambientRef.current;
    if (!element) return;

    let cancelled = false;
    let frame = 0;
    element.dataset.ready = "false";

    const applyPalette = (palette: AmbiencePalette) => {
      LAYER_KEYS.forEach((key, index) => {
        element.style.setProperty(
          `--ambient-light-${key}`,
          triplet(palette.light[index])
        );
        element.style.setProperty(
          `--ambient-dark-${key}`,
          triplet(palette.dark[index])
        );
      });

      frame = window.requestAnimationFrame(() => {
        if (!cancelled) element.dataset.ready = "true";
      });
    };

    const loadPalette = async () => {
      let sampled: RGB | null = null;

      if (trackId) {
        try {
          const response = await fetch(
            `/api/spotify/get?id=${encodeURIComponent(trackId)}`,
            { cache: "force-cache" }
          );
          if (response.ok) {
            const track = await response.json();
            if (typeof track.image === "string" && track.image) {
              sampled = await loadDominantColor(track.image);
            }
          }
        } catch {
          // A failed artwork lookup falls through to the deterministic palette.
        }
      }

      if (cancelled) return;
      applyPalette(
        sampled
          ? paletteFromRgb(sampled)
          : paletteFromHue(hueFromSeed(String(seed)))
      );
    };

    void loadPalette();

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [trackId, seed]);

  return (
    <div
      ref={ambientRef}
      className="story-ambience"
      data-ready="false"
      data-paused="false"
      aria-hidden="true"
    >
      <span className="story-ambience__blob story-ambience__blob--a" />
      <span className="story-ambience__blob story-ambience__blob--b" />
      <span className="story-ambience__blob story-ambience__blob--c" />
    </div>
  );
}
