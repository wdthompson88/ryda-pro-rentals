// Reusable explainer for the two-tier booking model, adapted from
// Pacaso's SmartStay system for cars instead of homes. Drops into:
//   - /how-it-works (full version)
//   - /inside (full version, with peak-protection callout)
//   - /markets/[symbol] FAQ (compact version)
//   - /faq (compact version)
//
// Pattern: Pacaso made scheduling fairness a trust-proof, not a footnote.
// We do the same, a member should understand the booking math before
// they wire money.

import { BOOKING_POLICY } from "@/lib/market-data";

type Variant = "full" | "compact";

export function BookingTiersExplainer({
  variant = "full",
}: { variant?: Variant }) {
  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-rule bg-cream-2/40 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
          How booking works
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CompactTier
            tag="Short-notice drives"
            window={`${BOOKING_POLICY.shortNotice.minDaysAdvance}–${BOOKING_POLICY.shortNotice.maxDaysAdvance} days out`}
            limit="Unlimited"
            consecutive={`Max ${BOOKING_POLICY.shortNotice.maxConsecutiveDays} consecutive days`}
            example="Free this weekend? Grab the car."
          />
          <CompactTier
            tag="Planned drives"
            window={`${BOOKING_POLICY.planned.minDaysAdvance}–${BOOKING_POLICY.planned.maxDaysAdvance} days out`}
            limit={`Up to ${BOOKING_POLICY.planned.activeLimitPerShare} active per share`}
            consecutive={`${BOOKING_POLICY.planned.maxConsecutiveDaysPeak} days peak / ${BOOKING_POLICY.planned.maxConsecutiveDaysOffPeak} off-peak`}
            example="August Hamptons trip, booked in March."
          />
        </div>
        <p className="mt-4 text-[11px] text-mute">
          Both modes draw from your share's annual entitlement (32 days, 3,200
          mi). One protected peak window per share before any co-owner
          can claim a second.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
        Booking model
      </p>
      <h3 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
        Two ways to book, short-notice and planned.
      </h3>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">
        Inspired by the best calendar systems in fractional ownership. Same
        annual entitlement, two clear modes so the math is never ambiguous.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Short-notice */}
        <div className="rounded-2xl border border-rule bg-cream-2/40 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
              Short-notice drives
            </p>
            <span className="rounded-full border border-rule bg-surface px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
              {BOOKING_POLICY.shortNotice.minDaysAdvance}–
              {BOOKING_POLICY.shortNotice.maxDaysAdvance} days out
            </span>
          </div>
          <h4 className="mt-3 font-display text-xl text-ink">
            It&apos;s sunny this weekend.
          </h4>
          <p className="mt-2 text-sm text-ink-soft">
            For opportunistic drives, Miami clears up Friday, you&apos;re in
            the car Saturday. No reservation cap; book as many short-notice
            slots as the calendar has open. A 3-day consecutive cap keeps
            short-notice fair across co-owners.
          </p>
          <ul className="mt-5 space-y-2 text-xs text-ink-soft">
            <Bullet>
              <strong className="text-ink">Window:</strong>{" "}
              {BOOKING_POLICY.shortNotice.minDaysAdvance}–
              {BOOKING_POLICY.shortNotice.maxDaysAdvance} days advance
            </Bullet>
            <Bullet>
              <strong className="text-ink">Active limit:</strong> Unlimited
              while calendar is open
            </Bullet>
            <Bullet>
              <strong className="text-ink">Max length:</strong>{" "}
              {BOOKING_POLICY.shortNotice.maxConsecutiveDays} consecutive days
            </Bullet>
          </ul>
        </div>

        {/* Planned */}
        <div className="rounded-2xl border border-rule bg-cream-2/40 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
              Planned drives
            </p>
            <span className="rounded-full border border-rule bg-surface px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
              {BOOKING_POLICY.planned.minDaysAdvance}–
              {BOOKING_POLICY.planned.maxDaysAdvance} days out
            </span>
          </div>
          <h4 className="mt-3 font-display text-xl text-ink">
            The August trip you&apos;re thinking about in March.
          </h4>
          <p className="mt-2 text-sm text-ink-soft">
            For trips you&apos;re actually planning, Hamptons in August,
            Pebble Beach in October. Each share holds up to 4 active planned
            reservations at a time; once one resolves, you can queue another.
          </p>
          <ul className="mt-5 space-y-2 text-xs text-ink-soft">
            <Bullet>
              <strong className="text-ink">Window:</strong>{" "}
              {BOOKING_POLICY.planned.minDaysAdvance}–
              {BOOKING_POLICY.planned.maxDaysAdvance} days advance
            </Bullet>
            <Bullet>
              <strong className="text-ink">Active limit:</strong>{" "}
              {BOOKING_POLICY.planned.activeLimitPerShare} per share
              concurrently
            </Bullet>
            <Bullet>
              <strong className="text-ink">Max length:</strong>{" "}
              {BOOKING_POLICY.planned.maxConsecutiveDaysPeak} days peak /{" "}
              {BOOKING_POLICY.planned.maxConsecutiveDaysOffPeak} days off-peak
            </Bullet>
          </ul>
        </div>
      </div>

      {/* Peak protection */}
      <div className="mt-6 rounded-2xl border border-red/30 bg-red/5 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
          Peak protection
        </p>
        <p className="mt-2 text-sm text-ink">
          One protected peak window per share before any co-owner can book a
          second. Calendar-fairness baked in.
        </p>
        <p className="mt-2 text-xs text-mute">
          Examples in Miami: F1 Grand Prix · Art Basel · Holiday week ·
          Spring Break.
        </p>
      </div>

      <p className="mt-4 text-xs text-mute">
        Both modes draw from your share&apos;s annual entitlement of 32
        driving days and 3,200 included miles. Multi-share holders scale
        linearly, two shares = 64 days, 6,400 miles, 8 active planned
        reservations.
      </p>
    </div>
  );
}

function CompactTier({
  tag,
  window,
  limit,
  consecutive,
  example,
}: {
  tag: string;
  window: string;
  limit: string;
  consecutive: string;
  example: string;
}) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-red">
          {tag}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-mute">
          {window}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{limit}</p>
      <p className="mt-1 text-xs text-ink-soft">{consecutive}</p>
      <p className="mt-3 text-[11px] italic text-mute">{example}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-red" />
      <span>{children}</span>
    </li>
  );
}
