"use client";

// Reveal, wraps children in a subtle fade-up animation triggered the
// first time the element scrolls into view. Two key timing details:
//   1. We wait one frame after mount before activating the observer,
//      so the browser definitely paints the initial (hidden) state
//      before transitioning to visible. Without this, fast networks
//      paint the visible state directly and the animation never fires.
//   2. We scope the transition to opacity + transform only, so the
//      .theme-ready color transitions in globals.css don't fight with
//      the reveal animation.

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  delayMs = 0,
  as: Tag = "div",
  className = "",
  /** When true, animation runs once then disconnects. Default true. */
  once = true,
  /** How far the element travels up during the reveal. Default 16px. */
  distance = 16,
  /** Animation duration in ms. Default 700. */
  durationMs = 700,
}: {
  children: React.ReactNode;
  delayMs?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
  once?: boolean;
  distance?: number;
  durationMs?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who've asked the OS not to animate.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    // No IntersectionObserver support (very old browsers), show
    // immediately so content isn't permanently invisible.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // Wait one animation frame so the browser paints the initial
    // hidden state before we switch to visible. This guarantees the
    // transition actually fires.
    let frameId: number;
    let obs: IntersectionObserver | null = null;
    frameId = requestAnimationFrame(() => {
      obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setVisible(true);
              if (once && obs) obs.disconnect();
            } else if (!once) {
              setVisible(false);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
      );
      obs.observe(el);
    });

    return () => {
      cancelAnimationFrame(frameId);
      obs?.disconnect();
    };
  }, [once]);

  const style: React.CSSProperties = {
    transitionProperty: "opacity, transform",
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: delayMs ? `${delayMs}ms` : undefined,
    opacity: visible ? 1 : 0,
    transform: visible
      ? "translate3d(0, 0, 0)"
      : `translate3d(0, ${distance}px, 0)`,
    willChange: "opacity, transform",
  };

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {children}
    </Tag>
  );
}
