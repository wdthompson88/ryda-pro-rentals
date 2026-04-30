"use client";

// Light/dark theme toggle. Persists to localStorage (key: `ryda-theme`).
// Default is dark (matches the original site palette). The no-flash
// bootstrap in layout.tsx reads localStorage before paint so users
// don't see a theme flicker on first load.

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Mount: read the actual theme from <html data-theme>. We don't read
  // localStorage here because the bootstrap script already applied it.
  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme | null) ??
      "dark";
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("ryda-theme", next);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }

  // Render a stable SSR-friendly placeholder until mount so the button
  // doesn't flash a wrong icon on hydration.
  const showLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${showLight ? "dark" : "light"} theme`}
      title={`Switch to ${showLight ? "dark" : "light"} theme`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-rule text-ink-soft transition-colors hover:border-ink hover:text-ink ${className}`}
    >
      {/* Sun icon for currently-light (click to go dark) */}
      {showLight ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <circle
            cx="8"
            cy="8"
            r="3"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5l-1.1-1.1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon icon for currently-dark (click to go light)
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M13.5 9.2A6 6 0 1 1 6.8 2.5a4.6 4.6 0 0 0 6.7 6.7Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
