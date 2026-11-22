"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_COLOR: Record<Theme, string> = {
  light: "#f7f7f5",
  dark: "#0b0d14",
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => {
      setThemeState(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light"
      );
    };

    sync();
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);

  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // Storage can be unavailable in private browsing; the theme still applies.
    }
    document
      .getElementById("theme-color")
      ?.setAttribute("content", THEME_COLOR[next]);
    setThemeState(next);
    window.dispatchEvent(new Event("themechange"));
  };

  return { theme, setTheme };
}
