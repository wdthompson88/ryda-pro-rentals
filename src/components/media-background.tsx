"use client";

// Background-media component for hero sections. Renders an autoplay /
// muted / looped video on top of a poster image. The poster image
// shows during loading and as a permanent fallback if the video fails
// (no URL provided, network error, codec unsupported).
//
// Honors prefers-reduced-motion: if the user has reduced motion on,
// we skip the video entirely and show a calm Ken-Burns-zoomed poster
// instead. Ambient motion only — never audio, never autoplay-with-sound.
//
// Why a client component: <video autoPlay muted playsInline /> needs
// to mount in the browser to actually start playing on Safari/Chrome
// first-paint. We could SSR the <video> element with hydration but a
// client island is simpler and the cost is one tiny script.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  video?: string;
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
  video,
  poster,
  alt,
  position = "center",
  priority = false,
  sizes = "100vw",
  kenBurns = true,
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoOK, setVideoOK] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // If the video hits an error (404, codec issue), drop it silently and
  // let the poster carry the page.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !video) return;
    const onCanPlay = () => setVideoOK(true);
    const onError = () => setVideoOK(false);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [video]);

  const showVideo = !!video && !reducedMotion;

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
          Sits above the poster with a fade-in once playback starts so
          the transition is graceful. */}
      {showVideo && (
        <video
          ref={videoRef}
          src={video}
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

      {/* Inline keyframes for the slow Ken-Burns motion. Subtle scale
          (1.0 → 1.06) over 24s back-and-forth, easing-in-out. We keep
          the keyframes inline so the component is self-contained and
          doesn't depend on globals.css. */}
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
