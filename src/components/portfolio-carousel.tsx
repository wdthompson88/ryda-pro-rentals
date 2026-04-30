"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { type Vehicle, formatUSD } from "@/lib/market-data";

// Featured vehicles carousel — Pacaso's portfolio entry uses a horizontal
// carousel with cinematic photos and italic-display destination naming.
// We translate that to vehicles: italic-display brand on hover, large
// photo, market label, per-share price. Auto-advances + arrow controls.

type Props = {
  vehicles: Vehicle[];
  intervalMs?: number;
};

export function PortfolioCarousel({ vehicles, intervalMs = 6500 }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-advance — pauses while user hovers the carousel.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || vehicles.length <= 1) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % vehicles.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, vehicles.length, intervalMs]);

  // Scroll to the active card whenever it changes.
  useEffect(() => {
    if (!trackRef.current) return;
    const card = trackRef.current.children[activeIdx] as
      | HTMLElement
      | undefined;
    if (card) {
      card.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeIdx]);

  function go(delta: number) {
    setActiveIdx((i) => (i + delta + vehicles.length) % vehicles.length);
  }

  if (vehicles.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 sm:gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {vehicles.map((v, i) => (
          <FeaturedCard
            key={v.symbol}
            vehicle={v}
            active={i === activeIdx}
            onClick={() => setActiveIdx(i)}
          />
        ))}
      </div>

      {/* Arrow controls */}
      {vehicles.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous featured vehicle"
            className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface/95 text-ink shadow-md backdrop-blur transition-all hover:scale-105 hover:border-ink sm:flex"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next featured vehicle"
            className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-surface/95 text-ink shadow-md backdrop-blur transition-all hover:scale-105 hover:border-ink sm:flex"
          >
            →
          </button>
        </>
      )}

      {/* Dot indicators */}
      {vehicles.length > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {vehicles.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx
                  ? "w-8 bg-red"
                  : "w-1.5 bg-rule hover:bg-mute"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedCard({
  vehicle: v,
  active,
  onClick,
}: {
  vehicle: Vehicle;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={`/markets/${v.symbol.toLowerCase()}`}
      onClick={onClick}
      className={`group relative block aspect-[4/5] w-[78vw] shrink-0 snap-center overflow-hidden rounded-2xl bg-cream-2 transition-all sm:w-[420px] lg:w-[460px] ${
        active ? "ring-2 ring-red shadow-xl" : "ring-0"
      }`}
    >
      {/* Image */}
      <Image
        src={v.hero}
        alt={`${v.year} ${v.name}`}
        fill
        sizes="(min-width: 1024px) 460px, (min-width: 640px) 420px, 78vw"
        className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
          v.flipImage ? "-scale-x-100" : ""
        }`}
        style={{ objectPosition: v.imagePosition ?? "center" }}
      />

      {/* Dark gradient overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
      />

      {/* Status pill top-right */}
      <span
        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] backdrop-blur ${
          v.sharesAvailable === 0
            ? "bg-mute/90 text-cream"
            : "bg-red/95 text-cream"
        }`}
      >
        {v.sharesAvailable === 0
          ? "Sold out"
          : `${v.sharesAvailable} shares left`}
      </span>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 p-6 text-cream sm:p-7">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cream/70">
          {v.market} · {v.year}
        </p>
        <h3 className="mt-2 font-display text-3xl italic font-light leading-tight sm:text-4xl">
          {v.brand}
        </h3>
        <p className="mt-1 font-display text-lg text-cream/95">{v.name}</p>
        <div className="mt-4 flex items-baseline justify-between border-t border-cream/20 pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-cream/55">
              Per share
            </p>
            <p className="font-display text-2xl tabular-nums">
              {formatUSD(v.pricePerShare)}
            </p>
          </div>
          <span className="text-xs font-medium text-cream/90 transition-transform group-hover:translate-x-1">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
