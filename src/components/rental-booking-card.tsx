"use client";

// The /rent/[symbol] booking card — headline rate, driver requirements,
// and the request form.
//
// WHY THIS IS A COMPONENT AND NOT MARKUP ON THE PAGE. The card used to
// render two independently-sourced daily rates about eight rows apart:
// the headline came from partner-fleet.ts's hardcoded `dailyRate`, and
// the quote inside the form came from rental_listings.daily_rate_cents
// via the availability route. Nothing tied them together — phase 0A's
// premise is that the table replaces the static file, so through the
// transition both are live and free to diverge, and an operator dropping
// their rate in the listings table left the card shouting the old number
// over the new one. Two prices in one card is precisely the credibility
// failure the server-side quote pipeline was built to prevent.
//
// So the card owns the rate. The static value is the FALLBACK — used for
// RYDA-fleet symbols, which have no listing row, and while the calendar
// is still loading — and the database value replaces it the moment the
// availability route answers. One number, one source, and the source is
// the same row the quote is computed from.

import { useState } from "react";
import { formatUSD } from "@/lib/market-data";
import { RentalInquiryForm } from "@/components/rental-inquiry-form";

/** Whole dollars unless the rate genuinely carries cents — the same rule
 *  the quote line uses, so the two cannot disagree by a rounding step. */
function formatRate(dollars: number): string {
  return formatUSD(dollars, {
    decimals: Number.isInteger(dollars) ? 0 : 2,
  });
}

export function RentalBookingCard({
  vehicleSlug,
  vehicleName,
  market,
  fallbackDailyRate,
  regularRate,
  includesNote,
}: {
  vehicleSlug: string;
  vehicleName: string;
  market: string;
  /** partner-fleet.ts / market-data.ts, used until the listing answers. */
  fallbackDailyRate: number;
  /** Struck-through "regular" rate, when the operator publishes one. */
  regularRate?: number | null;
  includesNote: string;
}) {
  const [liveRateCents, setLiveRateCents] = useState<number | null>(null);

  const dailyRate =
    liveRateCents !== null ? liveRateCents / 100 : fallbackDailyRate;
  // Only meaningful against the rate actually on screen: a struck-through
  // "regular" price that is lower than the live rate is not a discount.
  const showRegular =
    typeof regularRate === "number" && regularRate > dailyRate;

  return (
    <div className="rounded-2xl border border-rule bg-surface p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-3xl text-ink tabular-nums">
          {formatRate(dailyRate)}
        </p>
        <p className="text-sm text-mute">/day</p>
      </div>
      {showRegular && (
        <p className="mt-1 text-xs text-mute">
          Regular{" "}
          <span className="line-through tabular-nums">
            {formatRate(regularRate)}
          </span>
          /day
        </p>
      )}
      <p className="mt-1 text-xs text-ink-soft">{includesNote}</p>

      {/* Driver requirements — operators impose these, so they qualify
          the lead. */}
      <div className="mt-4 space-y-2 rounded-xl border border-rule bg-cream-2/40 p-3 text-[11px] text-ink-soft">
        <div className="flex items-baseline justify-between">
          <span className="text-mute">Min. driver age</span>
          <span className="font-medium text-ink">28+</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-mute">Driving experience</span>
          <span className="font-medium text-ink">5+ years</span>
        </div>
      </div>

      <div className="mt-5 border-t border-rule pt-5">
        <RentalInquiryForm
          vehicleSlug={vehicleSlug}
          vehicleName={vehicleName}
          market={market}
          onListingRateCents={setLiveRateCents}
        />
      </div>
    </div>
  );
}
