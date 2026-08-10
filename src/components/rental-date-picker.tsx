"use client";

// RentalDatePicker — availability-aware date-range selection for one car
// (build loop 2C).
//
// WHY THIS IS NOT asset-calendar.tsx. That component is the co-ownership
// month grid and it stays exactly as it is: its callers (/my-cars,
// /my-boats) are co-ownership surfaces, and guardrail 3.5 keeps the two
// products out of each other's way. Its grid is also built on LOCAL-time
// accessors — new Date(year, month, 1), getDay(), getDate() — which is
// the one thing a rental calendar may not inherit. Every day here is a
// 'YYYY-MM-DD' string and every step through the grid goes through
// addUtcDays(), because the UTC/local confusion this file avoids is the
// bug the inquiry form still carries a comment about and the reason
// src/lib/rental-availability.ts opens with "UTC OR NOTHING".
//
// WHAT DECIDES WHICH DAYS ARE CLICKABLE. Nothing in this file. The
// server sends the set of open days — selectableDays() output, which has
// already applied the operating window, the blackout rows, the open
// overrides and the bookings that actually hold their dates — and every
// question this component asks about a candidate range goes to
// checkOpenRange() / canStartStay() in rental-quote.ts, the same
// functions whose test asserts they agree with the server's checkRange()
// range for range. A day greyed out here is a day the API would refuse,
// and vice versa; there is no second copy of the rules to drift.
//
// The price is likewise not this component's business: it selects dates
// and reports them upward. The quote is fetched from the server by the
// form (guardrail: no client-trusted pricing).
//
// ACCESSIBILITY. A grid of buttons with a roving tabindex, per the ARIA
// grid pattern: arrows move a day at a time and a week at a time,
// PageUp/PageDown move a month, Home/End move to the ends of the week,
// and Enter/Space select. Unselectable days keep aria-disabled rather
// than the disabled attribute so keyboard users can still traverse the
// month instead of falling into a hole. Every cell carries a full spoken
// date and its state, and the selection is announced in a live region —
// "the 14th" is useless to a screen reader without the month.

import { useEffect, useMemo, useRef, useState } from "react";
import { addUtcDays, nightsBetween, parseUtcDay } from "@/lib/rental-availability";
import type { RangeRejection } from "@/lib/rental-availability";
import {
  canStartStay,
  checkOpenRange,
  firstBookableRange,
  rentalQuoteMessage,
  type OpenDayRangeInput,
} from "@/lib/rental-quote";

const DAY_LABELS = [
  { short: "Su", long: "Sunday" },
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type RentalDateRange = { startDate: string; endDate: string };

export type RentalDatePickerProps = {
  /** Every selectable day, from the availability route. */
  openDays: readonly string[];
  /** The listing's operating window — the outer bound of navigation. */
  windowStart: string;
  windowEnd: string;
  minNights: number;
  maxNights: number;
  /** Current selection; "" for unset. endDate === "" means "pick a return". */
  startDate: string;
  endDate: string;
  onSelect: (range: RentalDateRange) => void;
  /** The server's UTC today, so "Today" is marked on the server's terms. */
  today?: string;
  disabled?: boolean;
  /** Distinguishes ids when two pickers share a page. */
  idPrefix?: string;
};

// ── UTC month arithmetic ────────────────────────────────────────────
//
// Deliberately string-first: a 'YYYY-MM' key sorts and compares as text,
// so month navigation never constructs a Date and never asks the host
// what timezone it is in.

function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

function monthShift(monthKey: string, delta: number): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = index - y * 12;
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}`;
}

function monthDays(monthKey: string): string[] {
  const days: string[] = [];
  let cursor: string | null = `${monthKey}-01`;
  // 31 iterations at most; the guard is the month key changing.
  while (cursor && monthKeyOf(cursor) === monthKey) {
    days.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

/** Weekday index, 0 = Sunday, in UTC. Never the local weekday. */
function weekdayOf(iso: string): number {
  const ms = parseUtcDay(iso);
  return ms === null ? 0 : new Date(ms).getUTCDay();
}

function monthTitle(monthKey: string): string {
  const month = Number(monthKey.slice(5, 7));
  return `${MONTH_LABELS[month - 1]} ${monthKey.slice(0, 4)}`;
}

/**
 * A spoken date. Intl is safe here — and only here — because the zone is
 * PINNED to UTC, so this formats the same calendar day the string names
 * regardless of where the browser thinks it is.
 */
function formatDay(iso: string, style: "long" | "short"): string {
  const ms = parseUtcDay(iso);
  if (ms === null) return iso;
  return new Date(ms).toLocaleDateString(
    "en-US",
    style === "long"
      ? { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : { timeZone: "UTC", month: "short", day: "numeric" },
  );
}

/** Same day-of-month in another month, clamped to that month's length. */
function sameDayInMonth(monthKey: string, iso: string): string {
  const days = monthDays(monthKey);
  const dom = Number(iso.slice(8, 10));
  return days[Math.min(dom, days.length) - 1] ?? days[days.length - 1];
}

type DayCell = {
  kind: "day";
  key: string;
  iso: string;
  label: number;
  open: boolean;
  selectable: boolean;
  /**
   * WHY the cell is dead, when it is dead for a reason the renter can act
   * on. `too_long` in particular used to be indistinguishable from
   * "unavailable": a renter arrowing past a car's max_nights saw day
   * after day grey out and concluded the car was booked solid, when it
   * simply caps the stay.
   */
  reason: RangeRejection | null;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  isToday: boolean;
};

type Cell = { kind: "pad"; key: string } | DayCell;

export function RentalDatePicker({
  openDays,
  windowStart,
  windowEnd,
  minNights,
  maxNights,
  startDate,
  endDate,
  onSelect,
  today,
  disabled = false,
  idPrefix = "rental-dates",
}: RentalDatePickerProps) {
  const openSet = useMemo(() => new Set(openDays), [openDays]);

  // The window is passed through so a rejection reads "isn't offered on
  // those dates" rather than the blanket "aren't available" — same
  // distinction checkRange() draws on the server.
  const rules: OpenDayRangeInput = useMemo(
    () => ({
      openDays: openSet,
      minNights,
      maxNights,
      window: { start_date: windowStart, end_date: windowEnd },
    }),
    [openSet, minNights, maxNights, windowStart, windowEnd],
  );

  // The pending pickup: a start with no return yet. DERIVED, not stored —
  // the form owns the selection, and a second copy here could disagree
  // with the value that actually gets submitted.
  const anchor = startDate && !endDate ? startDate : null;

  // Both seeded from the SAME clamped day. They used to disagree —
  // viewMonth from the raw value, focusDay from the clamped one — so a
  // listing whose window opens more than a month out rendered today's
  // month while the roving tabindex pointed at a day in the window's
  // first month. No cell matched, every button got tabIndex -1, and Tab
  // skipped the whole grid.
  const [viewMonth, setViewMonth] = useState(() =>
    monthKeyOf(clamp(startDate || today || windowStart, windowStart, windowEnd)),
  );
  const [focusDay, setFocusDay] = useState(() =>
    clamp(startDate || today || windowStart, windowStart, windowEnd),
  );
  // Set only by keyboard navigation, so the grid never steals focus on
  // mount or when the form seeds a default range.
  const [pullFocus, setPullFocus] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Follow the selection when it changes from outside (the form seeds a
  // first bookable range once availability loads).
  useEffect(() => {
    if (!startDate) return;
    setViewMonth(monthKeyOf(startDate));
    setFocusDay(clamp(startDate, windowStart, windowEnd));
  }, [startDate, windowStart, windowEnd]);

  useEffect(() => {
    if (!pullFocus) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-day="${focusDay}"]`,
    );
    el?.focus();
    setPullFocus(false);
  }, [pullFocus, focusDay]);

  const days = useMemo(() => monthDays(viewMonth), [viewMonth]);

  const cells: Cell[] = useMemo(() => {
    const out: Cell[] = [];
    const lead = days.length > 0 ? weekdayOf(days[0]) : 0;
    for (let i = 0; i < lead; i += 1) out.push({ kind: "pad", key: `lead-${i}` });

    for (const iso of days) {
      const open = openSet.has(iso);
      let selectable = false;
      let reason: RangeRejection | null = null;
      if (!disabled && open) {
        if (anchor && iso > anchor) {
          // Only a day that makes a LEGAL stay from the anchor can be a
          // return date: past max_nights, or across a closed day, the
          // cell goes dead rather than accepting a click the API would
          // then refuse. The reason is kept so the label can say WHICH
          // rule closed it.
          const check = checkOpenRange(anchor, iso, rules);
          selectable = check.ok;
          if (!check.ok) reason = check.reason;
        } else {
          // Everything else is a candidate PICKUP — including a day
          // before the anchor, which restarts the selection.
          selectable = canStartStay(iso, rules);
        }
      }
      out.push({
        kind: "day",
        key: iso,
        iso,
        label: Number(iso.slice(8, 10)),
        open,
        selectable,
        reason,
        isStart: !!startDate && iso === startDate,
        isEnd: !!endDate && iso === endDate,
        inRange:
          !!startDate && !!endDate && iso > startDate && iso < endDate,
        isToday: iso === today,
      });
    }
    while (out.length % 7 !== 0) out.push({ kind: "pad", key: `tail-${out.length}` });
    return out;
  }, [days, openSet, anchor, rules, startDate, endDate, today, disabled]);

  const weeks = useMemo(() => {
    const rows: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);

  /**
   * THE GRID'S SINGLE TAB STOP, with a fallback.
   *
   * A roving tabindex that points at a day not on screen leaves the grid
   * with no tabbable element at all, and Tab walks straight past the
   * calendar. focusDay and viewMonth are seeded together now, but month
   * navigation and an externally-cleared selection can still part them,
   * so the stop is DERIVED from what is actually rendered rather than
   * assumed to be present.
   */
  const tabDay = useMemo(() => {
    const dayCells = cells.filter((c): c is DayCell => c.kind === "day");
    if (dayCells.some((c) => c.iso === focusDay)) return focusDay;
    return dayCells.find((c) => c.selectable)?.iso ?? dayCells[0]?.iso ?? null;
  }, [cells, focusDay]);

  /** The first range this car could actually take — null when none can. */
  const firstOpen = useMemo(() => firstBookableRange(rules), [rules]);
  const monthHasOpenDay = useMemo(
    () => cells.some((c) => c.kind === "day" && c.selectable),
    [cells],
  );

  const canPrev = monthShift(viewMonth, -1) >= monthKeyOf(windowStart);
  const canNext = monthShift(viewMonth, 1) <= monthKeyOf(windowEnd);

  function goMonth(delta: number) {
    // A no-op at the bound rather than a disabled button. A control that
    // disables itself under the user's own keyboard drops focus to
    // <body>, and the next Tab restarts from the top of the document —
    // the same reasoning the day cells already apply with aria-disabled.
    if (disabled) return;
    if (delta < 0 && !canPrev) return;
    if (delta > 0 && !canNext) return;
    const next = monthShift(viewMonth, delta);
    setViewMonth(next);
    // Keep the roving tabindex pointing at something visible, without
    // yanking focus off the nav button the user is still using.
    setFocusDay(clamp(sameDayInMonth(next, focusDay), windowStart, windowEnd));
  }

  /** Move the grid to a specific day — the "next available" affordance. */
  function jumpTo(iso: string) {
    if (disabled) return;
    const target = clamp(iso, windowStart, windowEnd);
    setViewMonth(monthKeyOf(target));
    setFocusDay(target);
    setPullFocus(true);
  }

  function pick(iso: string, selectable: boolean) {
    if (disabled || !selectable) return;
    setFocusDay(iso);
    if (anchor && iso > anchor) {
      onSelect({ startDate: anchor, endDate: iso });
      return;
    }
    // A fresh pickup — and clearing the return is the point: a start with
    // no end is the state that asks for the second click, and it is what
    // stops a stale return date from surviving a new pickup.
    onSelect({ startDate: iso, endDate: "" });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let next: string | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = addUtcDays(focusDay, -1);
        break;
      case "ArrowRight":
        next = addUtcDays(focusDay, 1);
        break;
      case "ArrowUp":
        next = addUtcDays(focusDay, -7);
        break;
      case "ArrowDown":
        next = addUtcDays(focusDay, 7);
        break;
      case "Home":
        next = addUtcDays(focusDay, -weekdayOf(focusDay));
        break;
      case "End":
        next = addUtcDays(focusDay, 6 - weekdayOf(focusDay));
        break;
      case "PageUp":
        next = sameDayInMonth(monthShift(monthKeyOf(focusDay), -1), focusDay);
        break;
      case "PageDown":
        next = sameDayInMonth(monthShift(monthKeyOf(focusDay), 1), focusDay);
        break;
      default:
        return;
    }
    if (!next) return;
    e.preventDefault();
    const target = clamp(next, windowStart, windowEnd);
    setFocusDay(target);
    setViewMonth(monthKeyOf(target));
    setPullFocus(true);
  }

  const nights = startDate && endDate ? nightsBetween(startDate, endDate) : null;
  const status = anchor
    ? `Pickup ${formatDay(anchor, "short")} selected. Now choose a return date.`
    : nights !== null
      ? `${formatDay(startDate, "short")} to ${formatDay(endDate, "short")}, ${nights} night${nights === 1 ? "" : "s"}.`
      : firstOpen
        ? "No dates selected."
        : "This car has no open dates in its current booking window.";

  // The ceiling is only worth stating while the renter is choosing a
  // return date — that is when it starts greying cells out — but until
  // now it was never stated at all, in the grid's description or in any
  // cell label, so a max_nights refusal read as "booked solid".
  const hint =
    [
      minNights > 1 ? rentalQuoteMessage("too_short", { minNights }) : null,
      anchor && maxNights > 0
        ? rentalQuoteMessage("too_long", { maxNights })
        : null,
    ]
      .filter(Boolean)
      .join(" ") || "Greyed dates aren't available.";

  const headingId = `${idPrefix}-month`;
  const hintId = `${idPrefix}-hint`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        {/* The grid's accessible name. NOT a live region: every cell
            already speaks its full date, and announcing the month on
            every arrow key would talk over them. */}
        <p id={headingId} className="font-display text-base text-ink">
          {monthTitle(viewMonth)}
        </p>
        <div className="flex items-center gap-2">
          {/* aria-disabled, not disabled — see goMonth. */}
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-disabled={!canPrev || disabled}
            aria-label="Previous month"
            className={navClass(!canPrev || disabled)}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-disabled={!canNext || disabled}
            aria-label="Next month"
            className={navClass(!canNext || disabled)}
          >
            ›
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-rule bg-surface p-3">
        <div
          ref={gridRef}
          role="grid"
          aria-labelledby={headingId}
          aria-describedby={hintId}
          onKeyDown={onKeyDown}
          className="select-none"
        >
          <div role="row" className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((d) => (
              <div
                key={d.short}
                role="columnheader"
                aria-label={d.long}
                className="py-1 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-mute"
              >
                {d.short}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={`w-${wi}`} role="row" className="grid grid-cols-7 gap-1">
              {week.map((cell) =>
                cell.kind === "pad" ? (
                  // An empty cell, not a hidden one: aria-hidden here
                  // would give the row six cells where its siblings have
                  // seven, and a grid with ragged rows navigates badly.
                  <div key={cell.key} role="gridcell" className="aspect-square" />
                ) : (
                  <div
                    key={cell.key}
                    role="gridcell"
                    aria-selected={cell.isStart || cell.isEnd || cell.inRange}
                  >
                    <button
                      type="button"
                      data-day={cell.iso}
                      // Roving tabindex: one stop for the whole grid, then
                      // the arrow keys do the walking.
                      tabIndex={cell.iso === tabDay ? 0 : -1}
                      // aria-disabled, not disabled: a disabled button is
                      // unfocusable, which would put holes in the grid a
                      // keyboard user cannot cross.
                      aria-disabled={!cell.selectable}
                      aria-label={dayLabel(cell, anchor, { minNights, maxNights })}
                      onClick={() => pick(cell.iso, cell.selectable)}
                      onFocus={() => setFocusDay(cell.iso)}
                      className={cellClass(cell)}
                    >
                      <span className="tabular-nums">{cell.label}</span>
                    </button>
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-ink-soft">
          {anchor ? (
            "Now pick your return date."
          ) : nights !== null ? (
            <>
              <span className="font-medium text-ink">{formatDay(startDate, "short")}</span>
              {" – "}
              <span className="font-medium text-ink">{formatDay(endDate, "short")}</span>
              <span className="ml-1.5 tabular-nums text-mute">
                {nights} night{nights === 1 ? "" : "s"}
              </span>
            </>
          ) : firstOpen ? (
            "Pick your pickup date."
          ) : (
            // A car with nothing bookable used to render as month after
            // month of struck-through cells under "Pick your pickup
            // date." — an instruction the renter cannot follow, with
            // nothing on screen saying why.
            <span className="font-medium text-ink">
              No open dates in this car&apos;s booking window.
            </span>
          )}
        </p>
        <p id={hintId} className="text-[11px] text-mute">
          {hint}
        </p>
      </div>

      {/* The first date the car CAN take, offered rather than left to be
          found by clicking through months. Only when the month on screen
          holds nothing selectable — otherwise it is noise beside a
          calendar the renter can already use. */}
      {firstOpen && !monthHasOpenDay && nights === null && !anchor && (
        <button
          type="button"
          onClick={() => jumpTo(firstOpen.startDate)}
          aria-disabled={disabled}
          className="mt-2 rounded-full border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
        >
          Next available: {formatDay(firstOpen.startDate, "short")}
        </button>
      )}
    </div>
  );
}

function clamp(iso: string, min: string, max: string): string {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}

function navClass(off: boolean): string {
  const base =
    "h-8 w-8 rounded-full border transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red";
  return off
    ? `${base} cursor-not-allowed border-rule text-mute`
    : `${base} border-rule text-ink-soft hover:border-ink hover:text-ink`;
}

function dayLabel(
  cell: DayCell,
  anchor: string | null,
  bounds: { minNights: number; maxNights: number },
): string {
  const date = formatDay(cell.iso, "long");
  if (cell.isStart && cell.isEnd) return `${date}, selected`;
  if (cell.isStart) return `${date}, selected pickup date`;
  if (cell.isEnd) return `${date}, selected return date`;
  if (cell.inRange) return `${date}, within your selected stay`;
  if (!cell.selectable) {
    // A night-bound refusal is not an availability refusal, and saying
    // "unavailable" for both is what makes a car that simply caps at a
    // week read as a car that is booked solid.
    if (cell.reason === "too_long" || cell.reason === "too_short") {
      return `${date}, unavailable — ${rentalQuoteMessage(cell.reason, bounds)}`;
    }
    return `${date}, unavailable`;
  }
  // BRANCHES ON ORDERING, exactly as pick() does. A selectable day BEFORE
  // the anchor is not a return date — clicking it discards the pickup and
  // restarts the selection — and announcing it as one sent a renter
  // arrowing backwards for a cheaper week into an action they did not
  // ask for.
  if (anchor) {
    return cell.iso > anchor
      ? `${date}, choose as return date`
      : `${date}, choose as a new pickup date, replacing your current one`;
  }
  return `${date}, choose as pickup date`;
}

function cellClass(cell: DayCell): string {
  // NO `focus:outline-none` HERE, and it is not an oversight it is
  // missing. In Tailwind v4 that utility compiles to
  // `:focus { --tw-outline-style: none; outline-style: none }`, and
  // `focus-visible:outline-2` compiles to
  // `:focus-visible { outline-style: var(--tw-outline-style) }` — same
  // specificity, and a keyboard focus matches BOTH, so the pair resolved
  // to no outline at all. On a roving-tabindex grid the ring is the only
  // thing telling a keyboard renter which of 31 identical cells is
  // current, so the grid had no positional cue whatsoever.
  const base =
    "flex aspect-square w-full items-center justify-center rounded-lg text-sm transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red";

  if (cell.isStart || cell.isEnd) {
    // border-red on bg-red is invisible in normal rendering; under
    // forced-colors (Windows High Contrast), where backgrounds are
    // overridden wholesale and start/end/in-range would otherwise
    // collapse into the unselected cells, the border survives as a
    // system-coloured ring.
    return `${base} border-2 border-red bg-red font-medium text-cream`;
  }
  if (cell.inRange) {
    // The wash carries the LOOK, the underline carries the STATE. #C03030
    // at 10% over white is ~1.18:1 against the plain cells beside it —
    // far under WCAG 1.4.11's 3:1 for a state indicator — and it vanishes
    // entirely under forced-colors. A text decoration is neither a
    // background nor a colour alone, so it survives both.
    return `${base} bg-red/10 font-medium text-ink underline decoration-red decoration-2 underline-offset-4`;
  }
  if (!cell.selectable) {
    const closed = cell.open ? "" : " line-through";
    return `${base} cursor-not-allowed text-mute${closed}`;
  }
  const todayRing = cell.isToday ? " ring-1 ring-inset ring-mute" : "";
  return `${base} text-ink hover:bg-cream-2${todayRing}`;
}
