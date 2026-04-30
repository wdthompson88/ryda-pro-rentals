"use client";

// Reveal — wraps children in a subtle fade-up animation triggered the
// first time the element scrolls into view. Uses IntersectionObserver
// so it doesn't run on elements above the fold (those just paint
// instantly via the initial CSS state having a one-frame delay before
// useEffect bumps to "in").

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  delayMs = 0,
  as: Tag = "div",
  className = "",
  /** When true, animation runs once then disconnects. Default true. */
  once = true,
}: {
  children: React.ReactNode;
  delayMs?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who've asked the OS not to animate.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref as never}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
