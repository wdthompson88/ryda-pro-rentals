"use client";

// Background-media component. Renders an autoplay/muted/playsInline
// video over a poster image and SHUFFLES through the rotation —
// every visit picks a random starting clip, and every clip-end picks
// another random clip (avoiding immediate repeats so it feels truly
// random, not "play same clip twice in a row").
//
// Falls back to the still poster (with Ken-Burns) if:
//   • no videos provided (empty array)
//   • the chosen clip 404s or codec fails (advances to next)
//   • prefers-reduced-motion is set
//
// Media Fragment URI: clip URLs may include a "#t=START,END" fragment
// (e.g. "/videos/cars-svj.mp4#t=1.5,11.5"). We parse the END value
// and use timeupdate as a fallback because some browsers don't fire
// `ended` when reaching the fragment-end (vs. file-end) — so the
// cycle would otherwise stall on trimmed clips.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** One URL, multiple URLs (shuffles through), or empty for poster-only. */
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

function toList(v: Props["videos"]): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.length > 0) return [v];
  return [];
}

/** Parse "#t=START,END" or "#t=START" from a media URL. */
function parseFragment(url: string): { startTime: number | null; endTime: number | null } {
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
  // Reroll if we hit the same one (so back-to-back never repeats).
  if (next === avoid) next = (next + 1) % len;
  return next;
}

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Lock the playlist for this column at mount.
  const [list] = useState<string[]>(() => toList(videos));
  // Random starting index. avoid=-1 means no exclusion on first pick.
  const [index, setIndex] = useState<number>(() => {
    const items = toList(videos);
    return items.length === 0 ? 0 : Math.floor(Math.random() * items.length);
  });
  const [videoOK, setVideoOK] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const chosenVideo = list[index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Whenever the chosen URL changes (initial mount or shuffle advance),
  // reset visible-state, bind handlers, and arm the timeupdate fallback
  // for trimmed clips.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !chosenVideo) return;
    setVideoOK(false);

    const { endTime } = parseFragment(chosenVideo);

    const advance = () => {
      if (list.length > 1) {
        setIndex((current) => pickRandomExcept(list.length, current));
      } else {
        // Single-clip rotation: replay from start manually so Media
        // Fragment URI clips (which don't honor `loop`) restart cleanly.
        try {
          v.currentTime = 0;
          void v.play().catch(() => {});
        } catch {
          // Some browsers reject currentTime sets pre-canplay; ignore.
        }
      }
    };

    const tryPlay = () => {
      // Explicit play() in addition to the autoPlay attribute. Browsers
      // sometimes don't honor autoPlay on subsequent <video> elements
      // mounted dynamically (post-cycle). Muted+playsInline gets us
      // permission to play without user gesture.
      void v.play().catch(() => {});
    };

    const onCanPlay = () => {
      setVideoOK(true);
      tryPlay();
    };

    const onEnded = advance;

    const onError = () => {
      if (list.length > 1) {
        setIndex((current) => pickRandomExcept(list.length, current));
      }
    };

    // Fallback for Media-Fragment-URI trimmed clips: some browsers
    // play to the file end rather than fragment end. Watch
    // currentTime and advance when we cross the END timestamp.
    const onTimeUpdate = endTime
      ? () => {
          if (v.currentTime >= endTime - 0.05) {
            advance();
          }
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
  }, [chosenVideo, list]);

  const showVideo = !!chosenVideo && !reducedMotion;

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Poster image — always rendered so SSR + bandwidth-restricted
          clients see something cinematic immediately. */}
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${kenBurns ? "media-kenburns" : ""}`}
        style={{ objectPosition: position }}
      />

      {/* Video layer — re-keyed per URL so React unmounts the old
          element and creates a fresh one on each shuffle advance. */}
      {showVideo && (
        <video
          key={chosenVideo}
          ref={videoRef}
          src={chosenVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            videoOK ? "opacity-100" : "opacity-0"
          }`}
          style={{ objectPosition: position }}
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
