"use client";

// PhotoGallery, hero image + thumbnail strip + fullscreen lightbox
// cycler. Drop in an array of image URLs and a click on any tile opens
// a dim-overlay carousel with prev/next arrows, pagination dots, ESC
// to close, and arrow-key navigation.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export function PhotoGallery({
  photos,
  alt,
  flipFirst,
  imagePosition,
  optimize = false,
}: {
  photos: string[];
  alt: string;
  /** Mirror the first (hero) photo horizontally. RYDA fleet uses this
   *  for cars sourced facing the wrong way. */
  flipFirst?: boolean;
  /** CSS object-position for the hero crop (RYDA fleet only). */
  imagePosition?: string;
  /** When false, renders <Image unoptimized />, needed for partner
   *  Wix CDN images that aren't in the next/image allowlist's
   *  optimization budget. */
  optimize?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setOpenIndex((i) =>
      i === null ? null : (i + 1) % photos.length,
    );
  }, [photos.length]);
  const prev = useCallback(() => {
    setOpenIndex((i) =>
      i === null ? null : (i - 1 + photos.length) % photos.length,
    );
  }, [photos.length]);

  // Keyboard navigation: ESC closes, arrows cycle.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, next, prev]);

  // Lock body scroll while the lightbox is open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (photos.length === 0) return null;
  const hero = photos[0];
  const thumbs = photos.slice(1);

  return (
    <>
      {/* Hero — aspect-[4/3] matches the dealer-photo source ratio
          (1024x768) so the image fills the container with no
          letterboxing. Background is dark ink instead of cream so any
          edge that doesn't fill perfectly reads as cinematic, not
          empty. object-cover + center-bottom bias keeps the car
          subject in frame even on tighter aspects (mobile/portrait). */}
      <button
        type="button"
        onClick={() => setOpenIndex(0)}
        aria-label={`Open ${alt} photo gallery`}
        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink"
      >
        <Image
          src={hero}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 66vw, 100vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
            flipFirst ? "-scale-x-100" : ""
          }`}
          style={{ objectPosition: imagePosition ?? "center 55%" }}
          unoptimized={!optimize}
        />
        {photos.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-medium text-cream backdrop-blur">
            View all {photos.length} photos
          </span>
        ) : null}
      </button>

      {/* Thumbnail strip below the hero — same aspect + dark
          background as the hero so the strip reads as one cohesive
          set of images, not a content card. */}
      {thumbs.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {thumbs.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setOpenIndex(i + 1)}
              aria-label={`Open photo ${i + 2} of ${photos.length}`}
              className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink transition-opacity hover:opacity-90"
            >
              <Image
                src={src}
                alt={`${alt}, view ${i + 2}`}
                fill
                sizes="(min-width: 768px) 20vw, 33vw"
                className="object-cover"
                style={{ objectPosition: "center 55%" }}
                unoptimized={!optimize}
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox modal */}
      {isOpen ? (
        <Lightbox
          photos={photos}
          index={openIndex!}
          alt={alt}
          optimize={optimize}
          onClose={close}
          onNext={next}
          onPrev={prev}
          onSelect={setOpenIndex}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  photos,
  index,
  alt,
  optimize,
  onClose,
  onNext,
  onPrev,
  onSelect,
}: {
  photos: string[];
  index: number;
  alt: string;
  optimize: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelect: (i: number) => void;
}) {
  const current = photos[index];
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // a11y: when the lightbox opens, remember what had focus, move focus
  // to the close button, and restore on unmount. Tab + Shift-Tab are
  // trapped inside the dialog so keyboard users don't tab behind it.
  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      lastFocusedRef.current?.focus();
    };
  }, []);

  // Focus trap: cycle Tab through the dialog's focusable elements only.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const dialog = closeRef.current?.closest('[role="dialog"]');
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} photo viewer`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button (top-right) */}
      <button
        ref={closeRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close photo viewer"
        className="absolute right-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M2 2L16 16M2 16L16 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Counter (top-center) */}
      <p className="absolute left-1/2 top-6 -translate-x-1/2 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
        {index + 1} / {photos.length}
      </p>

      {/* Prev (left) */}
      {photos.length > 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous photo"
          className="absolute left-5 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:h-14 sm:w-14"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M13 4L7 10L13 16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {/* Next (right) */}
      {photos.length > 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next photo"
          className="absolute right-5 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:h-14 sm:w-14"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M7 4L13 10L7 16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {/* Photo (centered, contained, click swallows propagation) */}
      <div
        className="relative h-[88vh] w-[92vw] sm:h-[84vh] sm:w-[88vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={current}
          alt={`${alt}, photo ${index + 1} of ${photos.length}`}
          fill
          sizes="92vw"
          className="object-contain"
          unoptimized={!optimize}
          priority
        />
      </div>

      {/* Pagination dots (bottom-center) */}
      {photos.length > 1 ? (
        <div
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Go to photo ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
