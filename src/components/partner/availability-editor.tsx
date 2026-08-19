"use client";

// The operator's calendar editor (build loop 2F).
//
// WHAT THIS FIXES. 0046 makes a listing default-open: a car with no rows
// is bookable for the next 180 days. Until this screen existed there was
// no way to write a rental_availability row from anywhere in the product,
// so every one of the 37 seeded cars advertised 180 days its operator had
// never agreed to, and the request inbox absorbed the entire difference.
//
// THE ONE THING THIS SCREEN MUST NOT DO is tell an operator they are
// protected when they are not. Blocking days that are already booked is a
// legal database write that changes nothing a renter sees (0046 rule (d)
// keeps a confirmed booking ahead of every availability row), so the
// route refuses it — and this screen shows those days as taken BEFORE the
// operator picks them, so the refusal is a rare backstop rather than the
// normal way to discover a conflict.
//
// Deliberately a month grid rather than two date inputs. An operator
// answering "which days can I not serve?" is reading a shape, not typing
// a range, and the shape is what carries the information the inputs
// cannot: that the 14th is already sold.

import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import { FOCUS_RING } from "@/lib/rental-booking-display";
import {
  RENTAL_AVAILABILITY_REASONS,
  addUtcDays,
  expandDays,
  operatingWindow,
  parseUtcDay,
  reservingRanges,
  utcDayOf,
  type BookedRange,
  type RentalAvailabilityReason,
  type RentalAvailabilityRow,
} from "@/lib/rental-availability";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REASON_LABEL: Record<RentalAvailabilityReason, string> = {
  maintenance: "Maintenance",
  owner_use: "I'm using it",
  off_platform: "Booked elsewhere",
  other: "Other",
};

export type EditorListing = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  status: string;
  availableFrom: string | null;
  availableUntil: string | null;
  bookingHorizonDays: number;
  // Carried only to satisfy operatingWindow()'s RentalListingAvailability,
  // which pairs the window columns with the nights bounds because the
  // renter-facing path needs both. This screen blocks whole days and has
  // no opinion on trip length — but taking the same input type is what
  // stops the editor's window drifting from the published one.
  minNights: number;
  maxNights: number;
};

type CalendarState = {
  rows: RentalAvailabilityRow[];
  bookings: BookedRange[];
};

/** Format 'YYYY-MM-DD' for display without touching local time. */
function prettyDay(iso: string): string {
  const ms = parseUtcDay(iso);
  if (ms === null) return iso;
  return new Date(ms).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AvailabilityEditor({ listing }: { listing: EditorListing }) {
  const [state, setState] = useState<CalendarState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection is an anchor + a hover/second click, the same two-tap model
  // the renter's date picker uses — an operator blocking a week should
  // not have to learn a second interaction.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const [reason, setReason] = useState<RentalAvailabilityReason | "">("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const today = utcDayOf();
  const [monthCursor, setMonthCursor] = useState(() => today.slice(0, 7));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(
        `/api/partner/availability?listingId=${encodeURIComponent(listing.id)}`,
      );
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          (json as { error?: string })?.error ?? "Could not load this calendar.",
        );
        setState(null);
        return;
      }
      const j = json as { rows?: RentalAvailabilityRow[]; bookings?: BookedRange[] };
      setState({ rows: j.rows ?? [], bookings: j.bookings ?? [] });
    } catch {
      setError("Could not load this calendar.");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [listing.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // The window the operator may write inside — the same computation the
  // renter-facing route uses, so the editor cannot offer a day the
  // calendar would refuse to publish.
  const window = useMemo(
    () =>
      operatingWindow(
        {
          available_from: listing.availableFrom,
          available_until: listing.availableUntil,
          booking_horizon_days: listing.bookingHorizonDays,
          min_nights: listing.minNights,
          max_nights: listing.maxNights,
        },
        today,
      ),
    [
      listing.availableFrom,
      listing.availableUntil,
      listing.bookingHorizonDays,
      listing.minNights,
      listing.maxNights,
      today,
    ],
  );

  // Days already spoken for. reservingRanges() decides what counts, so
  // this cannot disagree with 0047's EXCLUDE about which statuses hold.
  const bookedDays = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    for (const r of reservingRanges(state.bookings)) {
      for (const d of expandDays(r)) set.add(d);
    }
    return set;
  }, [state]);

  const blockedDays = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    for (const r of state.rows) {
      if (r.kind !== "blackout") continue;
      for (const d of expandDays(r)) set.add(d);
    }
    return set;
  }, [state]);

  const selection = useMemo(() => {
    if (!anchor) return null;
    const other = second ?? anchor;
    return anchor <= other
      ? { start: anchor, end: other }
      : { start: other, end: anchor };
  }, [anchor, second]);

  const selectionHitsBooking = useMemo(() => {
    if (!selection) return false;
    return expandDays({ start_date: selection.start, end_date: selection.end }).some((d) =>
      bookedDays.has(d),
    );
  }, [selection, bookedDays]);

  function onDayClick(day: string) {
    setNotice(null);
    if (!anchor || second) {
      setAnchor(day);
      setSecond(null);
      return;
    }
    setSecond(day);
  }

  async function save() {
    if (!selection) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await authedFetch("/api/partner/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          kind: "blackout",
          startDate: selection.start,
          endDate: selection.end,
          reason: reason || undefined,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(
          (json as { error?: string })?.error ?? "Could not save those dates.",
        );
        return;
      }
      setAnchor(null);
      setSecond(null);
      setReason("");
      await load();
    } catch {
      setNotice("Could not save those dates.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setNotice(null);
    try {
      const res = await authedFetch(
        `/api/partner/availability?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json: unknown = await res.json().catch(() => null);
        setNotice(
          (json as { error?: string })?.error ?? "Could not remove that entry.",
        );
        return;
      }
      await load();
    } catch {
      setNotice("Could not remove that entry.");
    }
  }

  // ── the month grid ────────────────────────────────────────────────

  const grid = useMemo(() => {
    const [y, m] = monthCursor.split("-").map((n) => Number.parseInt(n, 10));
    const first = Date.UTC(y, m - 1, 1);
    const lead = new Date(first).getUTCDay();
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${monthCursor}-${String(d).padStart(2, "0")}`);
    }
    return cells;
  }, [monthCursor]);

  const monthTitle = useMemo(() => {
    const [y, m] = monthCursor.split("-").map((n) => Number.parseInt(n, 10));
    return `${MONTH_LABELS[m - 1]} ${y}`;
  }, [monthCursor]);

  function shiftMonth(delta: number) {
    const [y, m] = monthCursor.split("-").map((n) => Number.parseInt(n, 10));
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonthCursor(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  const blackouts = (state?.rows ?? []).filter((r) => r.kind === "blackout");

  return (
    <div className="space-y-6">
      {/* ── calendar ── */}
      <div className="rounded-2xl border border-rule bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className={`rounded-lg px-3 py-1 text-sm text-ink-soft transition-colors hover:text-ink ${FOCUS_RING}`}
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="font-display text-lg text-ink">{monthTitle}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className={`rounded-lg px-3 py-1 text-sm text-ink-soft transition-colors hover:text-ink ${FOCUS_RING}`}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((d) => (
            <div key={d} className="pb-2 text-[11px] font-medium text-mute">
              {d}
            </div>
          ))}
          {grid.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;

            const outside =
              !window || day < window.start_date || day > window.end_date;
            const booked = bookedDays.has(day);
            const blocked = blockedDays.has(day);
            const inSelection =
              selection && day >= selection.start && day <= selection.end;

            // A booked day is not selectable: the route would refuse it,
            // and offering it would teach the operator that blocking a
            // sold week is a thing they can do.
            const disabled = outside || booked;

            let cls = "text-ink hover:border-ink";
            if (outside) cls = "text-mute/40 cursor-not-allowed";
            else if (booked)
              cls = "bg-success/15 text-success-deep cursor-not-allowed font-medium";
            else if (inSelection) cls = "bg-red text-cream border-red";
            else if (blocked) cls = "bg-cream-2 text-mute line-through";

            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => onDayClick(day)}
                title={
                  booked
                    ? "Booked — cancel the booking to free this day"
                    : blocked
                      ? "Blocked"
                      : outside
                        ? "Outside your booking window"
                        : undefined
                }
                className={`aspect-square rounded-lg border border-transparent text-xs tabular-nums transition-colors ${cls} ${FOCUS_RING}`}
              >
                {Number.parseInt(day.slice(-2), 10)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-mute">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-success/25" /> Booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-cream-2 ring-1 ring-rule" />{" "}
            Blocked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-red" /> Selected
          </span>
        </div>
      </div>

      {/* ── the pending selection ── */}
      {selection && (
        <div className="rounded-2xl border border-rule bg-cream-2/40 p-5">
          <p className="text-sm text-ink">
            Block{" "}
            <span className="font-medium">
              {prettyDay(selection.start)}
              {selection.start !== selection.end
                ? ` – ${prettyDay(selection.end)}`
                : ""}
            </span>
          </p>
          {selectionHitsBooking && (
            <p className="mt-2 text-sm text-red">
              Some of those days are booked. Cancel the booking first — blocking
              them here would not cancel it, and the renter would still arrive.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs text-mute">
              Reason (optional)
              <select
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value as RentalAvailabilityReason | "")
                }
                className={`ml-2 rounded-lg border border-rule bg-cream px-3 py-2 text-sm text-ink ${FOCUS_RING}`}
              >
                <option value="">—</option>
                {RENTAL_AVAILABILITY_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REASON_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || selectionHitsBooking}
              className={`inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              {saving ? "Blocking…" : "Block these days"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAnchor(null);
                setSecond(null);
                setNotice(null);
              }}
              className={`text-sm text-mute underline transition-colors hover:text-ink ${FOCUS_RING}`}
            >
              Clear
            </button>
          </div>
          {/* The renter-visible consequence, stated where the decision is
              made. An operator blocking days is removing inventory, and
              the reason vocabulary is checked precisely because SELECT on
              this table is public. */}
          <p className="mt-3 text-[11px] text-mute">
            Blocked days disappear from your car&apos;s public calendar
            immediately. The reason is never shown to renters.
          </p>
        </div>
      )}

      {notice && (
        <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
          {notice}
        </p>
      )}

      {/* ── existing blocks ── */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
          Blocked dates
        </p>
        {loading ? (
          <p className="mt-3 text-sm text-mute">Loading…</p>
        ) : error ? (
          <p className="mt-3 text-sm text-red">{error}</p>
        ) : blackouts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Nothing blocked. This car is bookable on every open day in its
            window — pick dates above to block time you can&apos;t serve.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {blackouts.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-surface px-4 py-3"
              >
                <span className="text-sm text-ink">
                  {prettyDay(r.start_date)}
                  {r.start_date !== r.end_date
                    ? ` – ${prettyDay(r.end_date)}`
                    : ""}
                  {r.reason && (
                    <span className="ml-2 text-xs text-mute">
                      {REASON_LABEL[r.reason as RentalAvailabilityReason] ??
                        r.reason}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  className={`text-sm text-mute underline transition-colors hover:text-red ${FOCUS_RING}`}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Honest about the horizon, because a default-open calendar is the
          thing this screen exists to make true. */}
      {window && (
        <p className="text-[11px] text-mute">
          Renters can book {prettyDay(window.start_date)} –{" "}
          {prettyDay(window.end_date)}
          {listing.availableUntil
            ? ""
            : ` (${listing.bookingHorizonDays} days ahead)`}
          . Every day in that range not blocked above is bookable.
        </p>
      )}
    </div>
  );
}

/** Exported for the page's "next open day" hint. */
export function nextOpenDay(today: string): string | null {
  return addUtcDays(today, 1);
}
