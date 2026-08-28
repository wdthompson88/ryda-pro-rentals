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

      {/* A "Driver requirements" panel stood here — "Min. driver age 28+",
          "Driving experience 5+ years" — and it is deleted, not softened.
          Neither figure appears in partner-fleet.ts, in any migration, or
          in anything an operator sends us; the 28 was the co-ownership
          member floor, which has nothing to do with renting a car. Terms
          §3 and /trust-and-safety both state that eligibility for a
          particular car is the operator's to set and differs car to car,
          so a platform-wide number here turns away drivers the operator
          would rent to and implies RYDA checks something it never sees.

          This panel outlived its first deletion. The co-ownership strip
          removed it from /rent/[symbol], but the markup had already been
          copied into this component, so extracting the card silently put
          it back on all 37 listings — a clean merge and a green build
          both missed it. There is no replacement: RYDA holds no
          eligibility data to show. */}

      <div className="mt-5 border-t border-rule pt-5">
        <RentalInquiryForm
          vehicleSlug={vehicleSlug}
          vehicleName={vehicleName}
          market={market}
          onListingRateCents={setLiveRateCents}
        />
      </div>

      {/* Collapsed by default — this used to be three full-width banner
          sections on the page (Hosted by + trust badges, a standalone
          Payment section, a 4-pillar "How the rental works" grid).
          Founder call (Aug 2026): the detail page should read as just
          the car and the request form; the process/payment explanation
          stays available, one click away, in the requesting flow
          itself rather than as marketing banners. Every fact here is
          unchanged from those sections — nothing was cut, only moved
          and collapsed. */}
      <details className="group mt-5 border-t border-rule pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink marker:hidden">
          How this rental works
          <span className="text-lg text-red transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-ink-soft">
          <p>
            <span className="font-medium text-ink">An operator.</span> Your
            request comes to RYDA, and we pass it to the Miami operator who
            runs this car. They confirm availability directly with you.
          </p>
          <p>
            <span className="font-medium text-ink">
              Their contract &amp; insurance.
            </span>{" "}
            The rental closes on the operator&apos;s own agreement and
            coverage — the same terms you&apos;d get going direct.
          </p>
          <p>
            <span className="font-medium text-ink">No card at request.</span>{" "}
            Nothing is charged until you and the operator confirm together.
            Once confirmed, RYDA emails a secure Stripe link — the charge
            settles on the operator&apos;s own Stripe account, and RYDA&apos;s
            commission is collected as a platform fee on that charge.
          </p>
        </div>
      </details>
    </div>
  );
}
