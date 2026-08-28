"use client";

// One card shape for every car grid on the site — the browse grid
// (rental-listings.tsx) and the landing page's Featured fleet
// (app/page.tsx) rendered two different card components with two
// different information densities for the same kind of object. This
// is the merge: RentalCard's photo-chip treatment (brand badge,
// savings badge, price chip) with a two-line body, used everywhere.
//
// Every field rendered here already exists on PartnerVehicle — no new
// spec, badge or claim is introduced. `milesIncluded` is real per-car
// data (set on all 37 listings); when it's ever missing, the line
// falls back to just the market rather than a fabricated placeholder.

import Image from "next/image";
import Link from "next/link";
import { formatUSD } from "@/lib/market-data";
import { brandTint } from "@/lib/partner-fleet";

export type MarketplaceCardVehicle = {
  slug: string;
  make: string;
  model: string;
  year?: number;
  category: string;
  dailyRate: number;
  regularRate?: number;
  market: string;
  hero?: string;
  milesIncluded?: string;
};

export function MarketplaceCard({
  vehicle: v,
}: {
  vehicle: MarketplaceCardVehicle;
}) {
  const savings = v.regularRate ? v.regularRate - v.dailyRate : 0;
  const savingsPct = v.regularRate
    ? Math.round((savings / v.regularRate) * 100)
    : 0;
  const tint = brandTint(v.make);
  const metaLine = [v.market, v.milesIncluded].filter(Boolean).join(" · ");

  // Dense Mainstable-style card: the photo carries the badges AND the
  // price chip, so the body stays two short lines and the 4-up grid
  // shows far more inventory per screen. The whole card is the link.
  return (
    <Link
      href={`/rent/${v.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface transition-all hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-lg"
    >
      {/* Photo — brand chip top-left, savings badge top-right, price chip
          bottom-right. */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden"
        style={{ backgroundColor: tint }}
      >
        {v.hero ? (
          <Image
            src={v.hero}
            alt={`${v.make} ${v.model}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
            // Operator photos are hosted off-domain (partner CDN), so
            // they bypass the Next image optimizer.
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.08), transparent 50%)",
              }}
            />
            <div className="relative text-center text-cream/90">
              <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">
                {v.make}
              </p>
              <p className="mt-1 font-display text-xl">{v.model}</p>
            </div>
          </div>
        )}

        {/* Brand badge top-left */}
        <span className="absolute left-3 top-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink backdrop-blur">
          {v.make}
        </span>

        {/* Savings badge top-right */}
        {savingsPct >= 10 ? (
          <span className="absolute right-3 top-3 rounded-full bg-red/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cream backdrop-blur">
            Save {savingsPct}%
          </span>
        ) : null}

        {/* Price chip bottom-right — dark so it reads on any photo. The
            regular-rate strikethrough rides inside the chip so the partner
            discount stays visible without a second price block. */}
        <span className="absolute bottom-3 right-3 inline-flex items-baseline gap-1.5 rounded-full bg-ink/85 px-3 py-1 backdrop-blur">
          {v.regularRate && savings > 0 ? (
            <span className="text-[11px] text-cream/70 line-through tabular-nums">
              {formatUSD(v.regularRate)}
            </span>
          ) : null}
          <span className="font-display text-base text-cream tabular-nums">
            {formatUSD(v.dailyRate)}
          </span>
          <span className="text-[11px] text-cream/70">/day</span>
        </span>
      </div>

      {/* Body — two short lines; mt-auto pins the meta line so card
          bottoms align across a row even when a model name wraps. */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg leading-tight text-ink">
          {v.model}
        </h3>
        <p className="mt-1 text-xs text-mute">
          {[v.make, v.year, v.category].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-mute">
          <span>{metaLine}</span>
          <span
            aria-hidden
            className="transition-all group-hover:translate-x-0.5 group-hover:text-red"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
