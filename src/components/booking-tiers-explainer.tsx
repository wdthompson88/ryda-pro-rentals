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

      {/* Published fairness invariant — Ember pattern. Their "at least
          half of the 24-month calendar will be available at any time"
          guarantee is enforced by code and shown on the calendar
          header. RYDA's analog: no member can hold more than 30% of
          the next 90 days of any single vehicle. Visible commitment,
          not buried policy. */}
      <p className="mt-3 inline-flex max-w-2xl items-baseline gap-2 rounded-full border border-rule bg-cream-2/40 px-4 py-1.5 text-[11px] text-ink-soft">
        <span className="font-medium uppercase tracking-[0.16em] text-red">
          Fairness invariant
        </span>
        <span>
          No member can hold more than 30% of the next 90 days on any
          one vehicle.
        </span>
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

      {/* Peak protection — explicit Miami calendar so buyers can plan
          before they wire money. Generic "F1 weekend / Art Basel"
          copy is what every fractional site says; specific date
          windows + a clear rotation rule is what distinguishes us
          (research: Fraxioned's specificity on holiday rotation is
          the single biggest trust-trust signal in the category). */}
      <div className="mt-6 rounded-2xl border border-red/30 bg-red/5 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
            Peak protection · Miami calendar
          </p>
          <p className="text-[10px] uppercase tracking-wider text-mute">
            One protected peak per share, then rotate
          </p>
        </div>
        <p className="mt-3 text-sm text-ink">
          Every share gets one protected peak window before any co-owner
          books a second. After everyone&apos;s used their first, the
          calendar opens for second picks in claim order. Calendar-fairness
          enforced by code, not by polite asks.
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MIAMI_PEAK_WINDOWS.map((w) => (
            <PeakWindow
              key={w.name}
              name={w.name}
              dates={w.dates}
              note={w.note}
            />
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-mute">
          Dates are approximate — the calendar opens 12 months out with
          firm dates. Track-day weekends, charity drives, and member
          off-sites are not counted as peaks.
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

// Concrete Miami peak event windows — keeps the explainer specific
// instead of "examples like Art Basel". Order: roughly chronological.
// Sourced from public event calendars; refresh annually as exact
// dates firm up. Specificity here is the trust signal — buyers want
// to know "if I want the F1 weekend, how does that work?"
const MIAMI_PEAK_WINDOWS: {
  name: string;
  dates: string;
  note: string;
}[] = [
  {
    name: "Miami Boat Show weekend",
    dates: "mid-Feb (Pres. Day)",
    note: "Five-day yacht event; A1A traffic pattern doubles as a parade route.",
  },
  {
    name: "Spring Break + Ultra Music Fest",
    dates: "late March",
    note: "Heaviest valet demand of the year on Ocean Drive.",
  },
  {
    name: "F1 Miami Grand Prix",
    dates: "early May",
    note: "Hard Rock paddock + Brickell takeover. Highest-bid weekend on the calendar.",
  },
  {
    name: "Memorial Day weekend",
    dates: "late May",
    note: "Urban Beach Week kicks off summer; long weekend.",
  },
  {
    name: "Fourth of July",
    dates: "Jul 4 weekend",
    note: "Bayfront fireworks; club Friday-Monday.",
  },
  {
    name: "Art Basel Miami Beach",
    dates: "first week of Dec",
    note: "International collector arrivals; #1 Miami social calendar event.",
  },
  {
    name: "Holiday week + NYE",
    dates: "Dec 26 – Jan 1",
    note: "Snowbird arrivals + South Beach NYE. Locked early.",
  },
  {
    name: "Super Bowl host year",
    dates: "early Feb (when in MIA)",
    note: "Only counts in years Miami hosts; otherwise off the list.",
  },
];

function PeakWindow({
  name,
  dates,
  note,
}: {
  name: string;
  dates: string;
  note: string;
}) {
  return (
    <li className="rounded-xl border border-rule bg-surface/60 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink leading-snug">{name}</p>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-red">
          {dates}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{note}</p>
    </li>
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
