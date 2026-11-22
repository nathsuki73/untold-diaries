"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-ink"
    >
      <Sun size={18} aria-hidden="true" className={theme === "light" ? "" : "hidden"} />
      <Moon size={18} aria-hidden="true" className={theme === "dark" ? "" : "hidden"} />
    </button>
  );
}
