"use client";

// Background-media component for hero sections. Renders an autoplay /
// muted / looped video on top of a poster image. When given an array
// of video URLs, picks one at random on first mount — fresh content
// on every visit. Falls back to the poster on video error or when no
// URL is provided.
//
// Honors prefers-reduced-motion: if the user has reduced motion on,
// we skip the video entirely and show a calm Ken-Burns-zoomed poster.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** One URL, multiple URLs (rotates randomly), or empty for poster-only. */
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
  const [chosenVideo, setChosenVideo] = useState<string | null>(null);
  const [videoOK, setVideoOK] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Pick a random clip from the rotation on mount. Set on mount only
  // (empty deps) so the choice locks for the visit — no flicker if a
  // parent re-renders.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const list = Array.isArray(videos) ? videos : videos ? [videos] : [];
    if (list.length === 0) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    setChosenVideo(pick);
    // We intentionally exclude `videos` from the deps — we only want
    // to pick once on mount, even if the parent hands us a new array
    // reference on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // If the chosen video fails to play (404, codec issue), drop it
  // silently and let the poster carry the page.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !chosenVideo) return;
    const onCanPlay = () => setVideoOK(true);
    const onError = () => setVideoOK(false);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [chosenVideo]);

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

      {/* Video layer — only rendered if we have a URL and motion is OK.
          Sits above the poster with a fade-in once playback starts. */}
      {showVideo && (
        <video
          ref={videoRef}
          src={chosenVideo}
          autoPlay
          muted
          loop
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
