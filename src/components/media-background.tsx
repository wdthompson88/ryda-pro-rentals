"use client";

// Background-media component, REBUILT FROM SCRATCH for reliability.
//
// CONTRACT: given a list of video URLs, cycle through them randomly,
// looping forever. Cross-fade between clips so there's no poster
// flash mid-transition.
//
// DESIGN
// - Two stable <video> slots that ping-pong. Each slot's <video>
//   element mounts ONCE and stays mounted; only its `src` changes.
// - All "what's playing" state lives in REFS, not React state. Event
//   handlers (canplay/ended/timeupdate) read from refs, so there are
//   no stale closures or timing-sensitive state propagation issues.
// - React state is only used for the rendering layer (opacity / z).
//   Every advance() touches refs synchronously, then triggers a
//   re-render via setState.
// - Handlers bind exactly ONCE per slot via callback refs, on mount.
//   Never re-bind, no cleanup/reattach race conditions.
//
// CROSS-FADE
// - Active slot's video is opacity 1 and z-index 2 (on top).
// - During a transition: the old slot stays at opacity 1 (z-index 1,
//   underneath) for FADE_MS + 250ms while the new slot fades 0 → 1
//   over FADE_MS, then the old slot drops to 0. At every moment of
//   the transition, at least one slot is at full opacity, so the
//   poster never bleeds through.
//
// FALLBACKS
// - If a clip 404s or codec-fails, we skip forward to the next.
// - If the user has prefers-reduced-motion, we don't render videos —
//   just the still poster with a slow Ken-Burns zoom.
// - Single-clip rotations (one URL) replay from the fragment-start
//   on `ended` so Media Fragment URI clips loop cleanly.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

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

type SlotIdx = 0 | 1;

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
  // Lock the playlist once on mount.
  const [list] = useState<string[]>(() => toList(videos));
  const listRef = useRef<string[]>(list);
  listRef.current = list;

  // Render state, drives opacity / z-index in JSX.
  const [activeSlot, setActiveSlot] = useState<SlotIdx>(0);
  const [slot0Src, setSlot0Src] = useState<string | null>(null);
  const [slot1Src, setSlot1Src] = useState<string | null>(null);
  const [holdPrev, setHoldPrev] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Refs that mirror the render state, kept in sync on every render
  // so event handlers (which are bound once and outlive renders) read
  // the LATEST values, not closures captured at bind time.
  const activeSlotRef = useRef<SlotIdx>(0);
  const slot0SrcRef = useRef<string | null>(null);
  const slot1SrcRef = useRef<string | null>(null);
  // Synchronous-update pattern: this fires on every render of the
  // component, BEFORE any event handler can run during the same tick.
  activeSlotRef.current = activeSlot;
  slot0SrcRef.current = slot0Src;
  slot1SrcRef.current = slot1Src;

  const video0Ref = useRef<HTMLVideoElement | null>(null);
  const video1Ref = useRef<HTMLVideoElement | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersBoundRef = useRef<{ s0: boolean; s1: boolean }>({
    s0: false,
    s1: false,
  });

  // Initial pick, random clip into slot 0 on first mount.
  useEffect(() => {
    if (list.length === 0) return;
    const startUrl = list[Math.floor(Math.random() * list.length)];
    setSlot0Src(startUrl);
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

  // Cleanup hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // ─── Core advance + promote logic ──────────────────────────────
  // Stable across renders, uses refs for all reads, so calling these
  // from event handlers never sees stale data.

  const advance = useCallback(() => {
    const list = listRef.current;
    const ai = activeSlotRef.current;
    const s0 = slot0SrcRef.current;
    const s1 = slot1SrcRef.current;

    if (list.length === 0) return;

    // Single-clip rotations: replay from fragment start.
    if (list.length === 1) {
      const v = ai === 0 ? video0Ref.current : video1Ref.current;
      const url = ai === 0 ? s0 : s1;
      if (!v || !url) return;
      const { startTime } = parseFragment(url);
      try {
        v.currentTime = startTime ?? 0;
        void v.play().catch(() => {});
      } catch {
        // Some browsers reject pre-canplay seeks.
      }
      return;
    }

    // Multi-clip rotations.
    const activeUrl = ai === 0 ? s0 : s1;
    const inactiveUrl = ai === 0 ? s1 : s0;
    const inactiveSlot: SlotIdx = ai === 0 ? 1 : 0;
    const inactiveVideo =
      inactiveSlot === 0 ? video0Ref.current : video1Ref.current;
    const activeIdx_ = activeUrl ? list.indexOf(activeUrl) : -1;
    const inactiveIdx_ = inactiveUrl ? list.indexOf(inactiveUrl) : -1;

    // Pick a next URL, try to avoid BOTH the active and inactive
    // current URLs. Reroll up to a few times. If the list is short
    // (e.g. 2 clips) we fall back to "anything but active."
    let nextIdx = Math.floor(Math.random() * list.length);
    for (let attempts = 0; attempts < 8; attempts++) {
      if (nextIdx !== activeIdx_ && nextIdx !== inactiveIdx_) break;
      nextIdx = Math.floor(Math.random() * list.length);
    }
    if (nextIdx === activeIdx_) {
      nextIdx = pickRandomExcept(list.length, activeIdx_);
    }
    const nextUrl = list[nextIdx];

    // FREEZE-PROOF FAST PATH: if the picked URL matches what the
    // inactive slot ALREADY has loaded, calling setSlot{0,1}Src with
    // the same value is a React no-op, no re-render, no `canplay`,
    // the cycle would stall here. Instead, just rewind and play the
    // already-loaded video element and promote it directly.
    if (nextUrl === inactiveUrl && inactiveVideo) {
      try {
        const { startTime } = parseFragment(nextUrl);
        inactiveVideo.currentTime = startTime ?? 0;
        void inactiveVideo.play().catch(() => {});
      } catch {
        // Pre-canplay seek may throw, ignore; the play() will still
        // resume from current position once the browser is ready.
      }
      promote(inactiveSlot);
      return;
    }

    // Default path: setSrc on the inactive slot. Once its `canplay`
    // fires, the canplay handler calls promote() which swaps active.
    if (ai === 0) {
      slot1SrcRef.current = nextUrl;
      setSlot1Src(nextUrl);
    } else {
      slot0SrcRef.current = nextUrl;
      setSlot0Src(nextUrl);
    }
  }, []);

  const promote = useCallback((target: SlotIdx) => {
    if (activeSlotRef.current === target) return;
    activeSlotRef.current = target;
    setActiveSlot(target);
    setHoldPrev(true);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      setHoldPrev(false);
      holdTimerRef.current = null;
    }, HOLD_PREV_MS);
  }, []);

  // ─── Bind handlers once per video element ──────────────────────
  // Using callback refs so we bind the moment React assigns the ref,
  // and only ONCE per element. No useEffect-re-bind cycle.

  const bindSlotHandlers = useCallback(
    (slot: SlotIdx, v: HTMLVideoElement) => {
      const flag = slot === 0 ? "s0" : "s1";
      if (handlersBoundRef.current[flag]) return; // already bound
      handlersBoundRef.current[flag] = true;

      const getSlotUrl = () =>
        slot === 0 ? slot0SrcRef.current : slot1SrcRef.current;

      const onCanPlay = () => {
        void v.play().catch(() => {});
        // If this slot just received a NEW URL while the OTHER slot
        // was active, this is a "promote me" handshake.
        const otherUrl =
          slot === 0 ? slot1SrcRef.current : slot0SrcRef.current;
        if (activeSlotRef.current !== slot && otherUrl) {
          promote(slot);
        }
      };

      const onEnded = () => {
        // Only advance if THIS slot is currently active. The inactive
        // slot may also fire ended (it kept playing in the background
        // after a previous transition); ignore those.
        if (activeSlotRef.current === slot) advance();
      };

      const onError = () => {
        // Codec or 404, skip forward.
        if (activeSlotRef.current === slot && listRef.current.length > 1) {
          advance();
        }
      };

      const onTimeUpdate = () => {
        const url = getSlotUrl();
        if (!url) return;
        const { endTime } = parseFragment(url);
        if (
          endTime !== null &&
          v.currentTime >= endTime - 0.05 &&
          activeSlotRef.current === slot
        ) {
          advance();
        }
      };

      v.addEventListener("canplay", onCanPlay);
      v.addEventListener("ended", onEnded);
      v.addEventListener("error", onError);
      v.addEventListener("timeupdate", onTimeUpdate);
    },
    [advance, promote],
  );

  const setVideo0Ref = useCallback(
    (node: HTMLVideoElement | null) => {
      video0Ref.current = node;
      if (node) {
        bindSlotHandlers(0, node);
      } else {
        // Element unmounted (e.g. reduced-motion toggled). Reset the
        // bound flag so we re-bind handlers when the next mount runs
        // (otherwise we'd attach to a dead element on first mount and
        // never re-bind to the live one).
        handlersBoundRef.current.s0 = false;
      }
    },
    [bindSlotHandlers],
  );

  const setVideo1Ref = useCallback(
    (node: HTMLVideoElement | null) => {
      video1Ref.current = node;
      if (node) {
        bindSlotHandlers(1, node);
      } else {
        handlersBoundRef.current.s1 = false;
      }
    },
    [bindSlotHandlers],
  );

  // Watchdog, backstop the natural `ended` event in case the browser
  // doesn't dispatch it (well-documented edge case for some codecs and
  // for Media Fragment URI clips). Catches the freeze the CEO has been
  // hitting after several cycles.
  //
  // Re-arms on every activeSlot change (this useEffect runs), and on
  // durationchange/play events from the active video. Uses the Media
  // Fragment URI `endTime` when present (more accurate than v.duration)
  // and falls back to a conservative 30s ceiling if duration is never
  // reported (rare but happens with chunked streams or codecs that
  // don't expose metadata cleanly).
  useEffect(() => {
    if (list.length <= 1 || reducedMotion) return;
    const v = activeSlot === 0 ? video0Ref.current : video1Ref.current;
    if (!v) return;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const arm = () => {
      if (watchdog) clearTimeout(watchdog);
      // Determine end time: prefer fragment endTime, fall back to file
      // duration, fall back to a 30s safety ceiling.
      const url =
        activeSlot === 0 ? slot0SrcRef.current : slot1SrcRef.current;
      const { endTime } = url
        ? parseFragment(url)
        : { endTime: null };

      let endSec: number;
      if (endTime !== null) {
        endSec = endTime;
      } else if (v.duration && Number.isFinite(v.duration)) {
        endSec = v.duration;
      } else {
        // Duration unknown, use a 30s ceiling so we don't freeze
        // forever on metadata-less streams. arm() will re-fire on
        // durationchange if the browser eventually reports duration.
        endSec = (v.currentTime ?? 0) + 30;
      }

      const remainingMs =
        Math.max(0, endSec - (v.currentTime ?? 0)) * 1000 + 800;

      watchdog = setTimeout(() => {
        // Only fire if we're still the active slot. We DO NOT bail on
        // v.paused, a video paused at end is exactly the case this
        // watchdog exists to catch (browser didn't fire `ended`).
        if (activeSlotRef.current === activeSlot) {
          advance();
        }
      }, remainingMs);
    };

    arm();
    v.addEventListener("durationchange", arm);
    v.addEventListener("play", arm);
    return () => {
      if (watchdog) clearTimeout(watchdog);
      v.removeEventListener("durationchange", arm);
      v.removeEventListener("play", arm);
    };
  }, [activeSlot, list.length, reducedMotion, advance]);

  // ─── Opacity model ─────────────────────────────────────────────
  // Active slot: opacity 1 (transitions in from 0 via the inline CSS
  //   transition the moment React sets opacity 1).
  // Inactive slot: opacity 1 while holdPrev is true (held visible
  //   behind the new active during fade-in), opacity 0 otherwise.
  // z-index: active slot 2, inactive slot 1.

  const showVideos = !reducedMotion && list.length > 0;
  const slot0Visible = activeSlot === 0 || holdPrev;
  const slot1Visible = activeSlot === 1 || holdPrev;

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${kenBurns ? "media-kenburns" : ""}`}
        style={{ objectPosition: position }}
      />

      {showVideos && (
        <>
          <video
            ref={setVideo0Ref}
            src={slot0Src ?? undefined}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: position,
              opacity: slot0Visible ? 1 : 0,
              zIndex: activeSlot === 0 ? 2 : 1,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
            }}
          />
          <video
            ref={setVideo1Ref}
            src={slot1Src ?? undefined}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: position,
              opacity: slot1Visible ? 1 : 0,
              zIndex: activeSlot === 1 ? 2 : 1,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
            }}
          />
        </>
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
