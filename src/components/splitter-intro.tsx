"use client";

// Splitter intro animation — a brief brand-mark fade-out over the three-card
// chooser when the page first loads. Plays on first visit to / per
// session (sessionStorage flag). On subsequent visits within the same
// session it skips the animation so the splitter is instant.
//
// Pure CSS keyframes inlined here so we don't pull in framer-motion just
// for one effect. Plays on top of the splitter then fades out.

import { useEffect, useState } from "react";

const SESSION_KEY = "ryda-splitter-played";

export function SplitterIntro() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "done">("hidden");

  useEffect(() => {
    let played: string | null = null;
    try {
      played = sessionStorage.getItem(SESSION_KEY);
    } catch {
      // sessionStorage may be blocked; fall through to playing the
      // intro — better than crashing.
    }
    if (played === "1") {
      setPhase("done");
      return;
    }
    setPhase("playing");
    // Total animation budget: ~1500ms. Mark done so the overlay stops
    // intercepting clicks and the underlying chooser becomes interactive.
    const t = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Best-effort — if storage is blocked the intro just plays again.
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  if (phase === "done") return null;

  return (
    <>
      <style jsx>{`
        @keyframes ryda-mark-in {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          40% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px) scale(1.04);
          }
        }
        @keyframes ryda-tagline-in {
          0%,
          25% {
            opacity: 0;
            transform: translateY(6px);
          }
          55% {
            opacity: 0.85;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-2px);
          }
        }
        @keyframes ryda-veil-out {
          0%,
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        .ryda-veil {
          animation: ryda-veil-out 1500ms cubic-bezier(0.4, 0, 0.2, 1)
            forwards;
        }
        .ryda-mark {
          animation: ryda-mark-in 1400ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
          will-change: transform, opacity;
        }
        .ryda-tagline {
          animation: ryda-tagline-in 1500ms cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
          will-change: transform, opacity;
        }
      `}</style>
      <div
        className="ryda-veil pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink"
        aria-hidden
      >
        <div className="text-center">
          <p className="ryda-mark font-display text-6xl font-light text-cream sm:text-7xl">
            RYDA
          </p>
          <p className="ryda-tagline mt-3 text-[11px] font-medium uppercase tracking-[0.32em] text-cream/70">
            Luxury vehicle access
          </p>
        </div>
      </div>
    </>
  );
}
