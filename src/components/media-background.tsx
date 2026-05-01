"use client";

// Background-media component with TRUE overlay-fade between clips —
// no poster flash mid-transition.
//
// PROBLEM with a naive symmetric cross-fade (old: 1→0, new: 0→1
// simultaneously): at the midpoint, both videos sit at ~50% opacity,
// the SUM doesn't reach 100%, and the still poster underneath shows
// through for a moment. CEO flagged this as a "stock image flash."
//
// SOLUTION: layered overlay-fade.
//   - The new clip is loaded into the inactive slot, given a higher
//     z-index than the old, and fades 0 → 1 over FADE_MS.
//   - The OLD clip stays at opacity-1 throughout that fade-in (held
//     visible behind the new one).
//   - After the new clip is fully opaque (FADE_MS later), the old
//     clip's opacity is dropped to 0 — the user doesn't see the
//     change because the new clip is sitting on top at full opacity.
//
// At every moment of the transition, at least one slot is at high
// opacity directly over the poster. No flash.
//
// Two stable <video> elements (slotA + slotB) ping-pong as we cycle.
// Single-clip rotations replay from fragment-start. Reduced-motion
// skips video and shows a Ken-Burns poster.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  videos?: string | string[];
  poster: string;
  alt: string;
  position?: string;
  priority?: boolean;
  sizes?: string;
  kenBurns?: boolean;
  className?: string;
};

const FADE_MS = 900;
/** Extra grace before we drop the old slot, just to make sure the
 *  fade-in transition has fully completed (CSS transitions can run a
 *  hair longer than declared depending on the browser scheduler). */
const HOLD_PREV_MS = FADE_MS + 250;

function toList(v: Props["videos"]): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.length > 0) return [v];
  return [];
}

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

  const [aSrc, setASrc] = useState<string | null>(null);
  const [bSrc, setBSrc] = useState<string | null>(null);
  const [aReady, setAReady] = useState(false);
  const [bReady, setBReady] = useState(false);
  const [activeSlot, setActiveSlot] = useState<Slot>("A");
  // True while the OLD slot should remain visible (opacity 1) over
  // the poster — set when we kick off a transition, cleared after
  // the new slot's fade-in completes.
  const [holdPrev, setHoldPrev] = useState(false);

  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSlotRef = useRef<Slot>("A");
  const aSrcRef = useRef<string | null>(null);
  const bSrcRef = useRef<string | null>(null);

  useEffect(() => {
    activeSlotRef.current = activeSlot;
    aSrcRef.current = aSrc;
    bSrcRef.current = bSrc;
  }, [activeSlot, aSrc, bSrc]);

  // Initial mount: load a random clip into slot A.
  useEffect(() => {
    if (list.length === 0) return;
    setASrc(list[Math.floor(Math.random() * list.length)]);
  }, [list]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Cleanup the hold timer on unmount.
  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  function pickNext(): string {
    const currentUrl =
      activeSlotRef.current === "A" ? aSrcRef.current : bSrcRef.current;
    const currentIdx = currentUrl ? list.indexOf(currentUrl) : -1;
    const nextIdx = pickRandomExcept(list.length, currentIdx);
    return list[nextIdx];
  }

  function replaySingle(slot: Slot) {
    const ref = slot === "A" ? aRef : bRef;
    const v = ref.current;
    const src = slot === "A" ? aSrcRef.current : bSrcRef.current;
    if (!v || !src) return;
    const { startTime } = parseFragment(src);
    try {
      v.currentTime = startTime ?? 0;
      void v.play().catch(() => {});
    } catch {
      // Some browsers reject pre-canplay seeks; ignore.
    }
  }

  function advance() {
    if (list.length <= 1) {
      replaySingle(activeSlotRef.current);
      return;
    }
    const nextUrl = pickNext();
    if (activeSlotRef.current === "A") {
      setBReady(false);
      setBSrc(nextUrl);
    } else {
      setAReady(false);
      setASrc(nextUrl);
    }
  }

  // Promote the slot that just finished loading to active. The other
  // slot stays held visible (holdPrev=true) while the new fades in;
  // after FADE_MS we drop it.
  function promote(slot: Slot) {
    if (activeSlotRef.current === slot) return; // no-op
    activeSlotRef.current = slot;
    setHoldPrev(true);
    setActiveSlot(slot);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      setHoldPrev(false);
      holdTimer.current = null;
    }, HOLD_PREV_MS);
  }

  // Slot A handlers
  useEffect(() => {
    const v = aRef.current;
    if (!v || !aSrc) return;
    setAReady(false);
    const { endTime } = parseFragment(aSrc);

    const onCanPlay = () => {
      setAReady(true);
      void v.play().catch(() => {});
      // If A just loaded into the inactive slot, promote it.
      if (activeSlotRef.current !== "A" && bSrcRef.current) promote("A");
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

  // Slot B handlers
  useEffect(() => {
    const v = bRef.current;
    if (!v || !bSrc) return;
    setBReady(false);
    const { endTime } = parseFragment(bSrc);

    const onCanPlay = () => {
      setBReady(true);
      void v.play().catch(() => {});
      if (activeSlotRef.current !== "B" && aSrcRef.current) promote("B");
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

  // Opacity model:
  //   Active slot: fades in 0 → 1 once `ready`. Stays at 1 thereafter.
  //   Inactive slot: stays at 1 while `holdPrev` is true (visible
  //     behind the active one as it fades in). Drops to 0 after
  //     holdPrev clears.
  // Z-index keeps the active slot on top throughout.
  const aOpacity =
    activeSlot === "A" ? (aReady ? 1 : 0) : holdPrev ? 1 : 0;
  const bOpacity =
    activeSlot === "B" ? (bReady ? 1 : 0) : holdPrev ? 1 : 0;
  const aZ = activeSlot === "A" ? 2 : 1;
  const bZ = activeSlot === "B" ? 2 : 1;

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Poster image — always rendered. Visible only when both slots
          are at 0 opacity (initial load before the first canplay, or
          when reduced-motion forces video off). */}
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${kenBurns ? "media-kenburns" : ""}`}
        style={{ objectPosition: position }}
      />

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
            zIndex: aZ,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      )}

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
            zIndex: bZ,
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
