"use client";

// Background-media component. Renders an autoplay/muted/playsInline
// video over a poster image and CYCLES through the array on each
// video-end event — so a column with N clips plays clip[0], then
// clip[1], …, then loops back to clip[0].
//
// Why cycling vs. random-pick-and-loop: a splitter that loops one
// clip forever turns into wallpaper. Cycling keeps the column alive
// for visitors who hover for any length of time.
//
// Falls back to the still poster (with Ken-Burns) if:
//   • no videos provided (empty array)
//   • the chosen clip 404s or codec fails
//   • prefers-reduced-motion is set
//
// Media Fragment URI: clip URLs may include a `#t=START,END` fragment
// (e.g. "/videos/cars-svj.mp4#t=1.5,11.5") — browsers natively respect
// it for `<video src>`. Used to trim YouTube-short intro/outro frames
// without re-encoding the file.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** One URL, multiple URLs (cycles through), or empty for poster-only. */
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
  // The full ordered list of clips for this column.
  const [list] = useState<string[]>(() => toList(videos));
  // Index of the currently-playing clip. Start at a random index so
  // each visit feels different but every clip eventually plays.
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

  // Whenever the chosen URL changes (initial mount or cycle advance),
  // reset the visible-state and bind error/canplay/ended handlers.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !chosenVideo) return;
    setVideoOK(false);
    const onCanPlay = () => setVideoOK(true);
    // If a clip 404s or the codec fails, advance to the next one
    // rather than freezing on a poster mid-rotation.
    const onError = () => {
      if (list.length > 1) {
        setIndex((i) => (i + 1) % list.length);
      }
    };
    // Cycle through the list — no `loop` attribute on the video
    // element, so `ended` fires and we step to the next clip.
    const onEnded = () => {
      if (list.length > 1) {
        setIndex((i) => (i + 1) % list.length);
      } else {
        // Single-clip rotation: replay it from the start manually so
        // we don't stall (Media Fragment URI clips don't auto-loop).
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    };
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
      v.removeEventListener("ended", onEnded);
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

      {/* Video layer — fades in once the next clip in the cycle is
          playable. We re-key on the URL so React unmounts/remounts
          the <video> element on each cycle advance, which forces a
          fresh load + the canplay handshake. */}
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
