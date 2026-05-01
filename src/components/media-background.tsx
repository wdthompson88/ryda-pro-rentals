"use client";

// Background-media component with TRUE cross-fade between clips.
//
// Implementation: two stable <video> elements (slotA + slotB) that
// ping-pong as we advance. Active slot is opaque; inactive slot is
// hidden. On advance, we load the next URL into the inactive slot,
// wait for its `canplay`, then toggle which slot is active — old
// slot fades to 0, new slot fades to 100, simultaneously, over the
// fade duration. Poster image sits beneath both for SSR + load
// fallback.
//
// Why two stable video elements: if we just remount the <video> with
// React `key`, the old one disappears the instant React re-renders
// (mid-fade), so there's nothing to fade FROM. Keeping both elements
// mounted gives the browser real video frames to cross between.
//
// Honors prefers-reduced-motion (no video, Ken-Burns poster only).
// Single-clip rotations: replay from fragment-start when the clip
// ends, so Media Fragment URI clips loop cleanly.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** One URL, multiple URLs (cross-fades through), or empty for poster-only. */
  videos?: string | string[];
  poster: string;
  alt: string;
  position?: string;
  /** Sized for above-the-fold heroes; we always priority-load the poster. */
  priority?: boolean;
  /** Override the next/image sizes attr. Default 100vw. */
  sizes?: string;
  /** Apply a slow Ken-Burns zoom to the poster (used when no video). */
  kenBurns?: boolean;
  /** Optional CSS class on the wrapper. */
  className?: string;
};

/** Cross-fade duration. Long enough to feel cinematic, short enough
 *  not to feel slow. Matches the brand's transition language. */
const FADE_MS = 900;

function toList(v: Props["videos"]): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.length > 0) return [v];
  return [];
}

/** Parse "#t=START,END" or "#t=START" from a media URL. */
function parseFragment(url: string): {
  startTime: number | null;
  endTime: number | null;
} {
  const hash = url.split("#")[1];
  if (!hash) return { startTime: null, endTime: null };
  const m = hash.match(/^t=([^,]+)(?:,(.+))?$/);
  if (!m) return { startTime: null, endTime: null };
  const start = parseFloat(m[1]);
  const end = m[2] !== undefined ? parseFloat(m[2]) : null;
  return {
    startTime: Number.isFinite(start) ? start : null,
    endTime: end !== null && Number.isFinite(end) ? end : null,
  };
}

/** Pick a random index from [0, len) that's not equal to `avoid`. */
function pickRandomExcept(len: number, avoid: number): number {
  if (len <= 1) return 0;
  let next = Math.floor(Math.random() * len);
  if (next === avoid) next = (next + 1) % len;
  return next;
}

type Slot = "A" | "B";

export function MediaBackground({
  videos,
  poster,
  alt,
  position = "center",
  priority = false,
  sizes = "100vw",
  kenBurns = true,
  className = "",
}: Props) {
  const [list] = useState<string[]>(() => toList(videos));
  const [reducedMotion, setReducedMotion] = useState(false);

  // Slot state: each slot has its own URL + ready flag. activeSlot is
  // the one currently fading in / opaque.
  const [aSrc, setASrc] = useState<string | null>(null);
  const [bSrc, setBSrc] = useState<string | null>(null);
  const [aReady, setAReady] = useState(false);
  const [bReady, setBReady] = useState(false);
  const [activeSlot, setActiveSlot] = useState<Slot>("A");

  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);

  // Load the initial clip into slot A on mount. Random pick so
  // returning visitors see a different starter.
  useEffect(() => {
    if (list.length === 0) return;
    setASrc(list[Math.floor(Math.random() * list.length)]);
  }, [list]);

  // Reduced-motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Helper: pick the URL of the next clip, avoiding the currently
  // active one so we don't repeat back-to-back.
  function pickNext(): string {
    const currentUrl = activeSlot === "A" ? aSrc : bSrc;
    const currentIdx = currentUrl ? list.indexOf(currentUrl) : -1;
    const nextIdx = pickRandomExcept(list.length, currentIdx);
    return list[nextIdx];
  }

  // Single-clip mode: replay from fragment start on end.
  function replaySingle(slot: Slot) {
    const ref = slot === "A" ? aRef : bRef;
    const v = ref.current;
    const src = slot === "A" ? aSrc : bSrc;
    if (!v || !src) return;
    const { startTime } = parseFragment(src);
    try {
      v.currentTime = startTime ?? 0;
      void v.play().catch(() => {});
    } catch {
      // Ignore — some browsers reject pre-canplay seeks.
    }
  }

  // On advance, load the next clip into the INACTIVE slot. Once that
  // slot signals `canplay` (handled below), we flip activeSlot and
  // both slots' opacities transition.
  function advance() {
    if (list.length <= 1) {
      replaySingle(activeSlot);
      return;
    }
    const nextUrl = pickNext();
    if (activeSlot === "A") {
      setBReady(false);
      setBSrc(nextUrl);
      // activeSlot stays "A" — it'll switch when B fires canplay.
    } else {
      setAReady(false);
      setASrc(nextUrl);
    }
  }

  // Bind handlers to slot A
  useEffect(() => {
    const v = aRef.current;
    if (!v || !aSrc) return;
    setAReady(false);
    const { endTime } = parseFragment(aSrc);

    const onCanPlay = () => {
      setAReady(true);
      void v.play().catch(() => {});
      // If A is now the loading slot (i.e. active is currently B),
      // promote A to active so the cross-fade fires.
      if (activeSlot !== "A" && bSrc) {
        setActiveSlot("A");
      }
    };
    const onEnded = () => advance();
    const onError = () => {
      if (list.length > 1) advance();
    };
    const onTimeUpdate = endTime
      ? () => {
          if (v.currentTime >= endTime - 0.05) advance();
        }
      : null;

    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    if (onTimeUpdate) v.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      if (onTimeUpdate) v.removeEventListener("timeupdate", onTimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aSrc]);

  // Bind handlers to slot B
  useEffect(() => {
    const v = bRef.current;
    if (!v || !bSrc) return;
    setBReady(false);
    const { endTime } = parseFragment(bSrc);

    const onCanPlay = () => {
      setBReady(true);
      void v.play().catch(() => {});
      if (activeSlot !== "B" && aSrc) {
        setActiveSlot("B");
      }
    };
    const onEnded = () => advance();
    const onError = () => {
      if (list.length > 1) advance();
    };
    const onTimeUpdate = endTime
      ? () => {
          if (v.currentTime >= endTime - 0.05) advance();
        }
      : null;

    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    if (onTimeUpdate) v.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      if (onTimeUpdate) v.removeEventListener("timeupdate", onTimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bSrc]);

  const showVideos = !reducedMotion && list.length > 0;
  const aOpacity = activeSlot === "A" && aReady ? 1 : 0;
  const bOpacity = activeSlot === "B" && bReady ? 1 : 0;

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Poster image — always rendered. Visible during initial load
          and as a fallback if both slots fail. */}
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${kenBurns ? "media-kenburns" : ""}`}
        style={{ objectPosition: position }}
      />

      {/* Slot A — stable mount, src swaps on advance */}
      {showVideos && aSrc && (
        <video
          ref={aRef}
          src={aSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: position,
            opacity: aOpacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      )}

      {/* Slot B — stable mount, src swaps on advance */}
      {showVideos && bSrc && (
        <video
          ref={bRef}
          src={bSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: position,
            opacity: bOpacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      )}

      <style jsx>{`
        @keyframes media-kenburns-keys {
          0% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.06) translate3d(-1%, 1%, 0);
          }
          100% {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .media-kenburns {
          animation: media-kenburns-keys 24s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .media-kenburns {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
