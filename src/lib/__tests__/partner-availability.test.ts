// Tests for the operator's calendar write path (build loop 2F).
//
// This layer decides whether a car can be sold on a given day, and it
// fails in one direction that matters far more than the other. A blackout
// wrongly REJECTED costs the operator an argument with a form. A blackout
// wrongly ACCEPTED tells them they are protected on days a renter is
// already booked to collect the keys — and because 0046 rule (d) keeps a
// confirmed booking ahead of every availability row, that write is a
// legal no-op the database will happily perform. Nothing downstream
// catches it. So the guard is here, and so is its suite.
//
// The parse half matters for a narrower reason 0046's own header records:
// an unrecognised `kind` is dropped by partition() in
// rental-availability.ts, so a typo does not fail loudly — it resolves to
// "not a blackout, therefore bookable".

import { describe, it, expect } from "vitest";
import {
  MAX_AVAILABILITY_RANGE_DAYS,
  availabilityFailureMessage,
  availabilityWriteMessage,
  bookingsBlockingBlackout,
  classifyAvailabilityWriteError,
  parseAvailabilityWrite,
} from "../partner-availability";
import { addUtcDays } from "../rental-availability";

const LISTING = "fe4830aa-3e1a-4fd1-83ee-d3398b21c409";
const TODAY = "2026-09-01";

function body(over: Record<string, unknown> = {}) {
  return {
    listingId: LISTING,
    kind: "blackout",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    ...over,
  };
}

describe("parseAvailabilityWrite", () => {
  it("accepts a well-formed blackout and normalises an absent reason to null", () => {
    const r = parseAvailabilityWrite(body(), TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input).toEqual({
      listingId: LISTING,
      kind: "blackout",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      reason: null,
    });
  });

  it("treats an empty-string reason as absent rather than invalid", () => {
    // The obvious shape of an untouched <select>. Rejecting it would make
    // the common case an error.
    const r = parseAvailabilityWrite(body({ reason: "" }), TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.reason).toBeNull();
  });

  it("keeps a reason from the checked vocabulary", () => {
    const r = parseAvailabilityWrite(body({ reason: "maintenance" }), TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.reason).toBe("maintenance");
  });

  it("rejects a reason outside the vocabulary", () => {
    // 0046 checks this column because SELECT on the table is PUBLIC —
    // free text here would eventually publish a renter's name.
    const r = parseAvailabilityWrite(body({ reason: "held for Bob" }), TODAY);
    expect(r).toEqual({ ok: false, reason: "bad_reason" });
  });

  it("rejects an unknown kind rather than letting it fall through", () => {
    // The important one: partition() drops an unrecognised kind, so
    // 'blackuot' would silently mean "bookable" if this passed.
    const r = parseAvailabilityWrite(body({ kind: "blackuot" }), TODAY);
    expect(r).toEqual({ ok: false, reason: "bad_kind" });
  });

  it("accepts kind=open", () => {
    const r = parseAvailabilityWrite(body({ kind: "open" }), TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.kind).toBe("open");
  });

  it.each([
    ["a non-uuid", "not-a-uuid"],
    ["an empty string", ""],
    ["a number", 42],
  ])("rejects %s as a listing id", (_label, listingId) => {
    const r = parseAvailabilityWrite(body({ listingId }), TODAY);
    expect(r).toEqual({ ok: false, reason: "bad_listing_id" });
  });

  it("rejects a malformed date", () => {
    const r = parseAvailabilityWrite(body({ startDate: "10/09/2026" }), TODAY);
    expect(r).toEqual({ ok: false, reason: "bad_dates" });
  });

  it("rejects an end before the start", () => {
    const r = parseAvailabilityWrite(
      body({ startDate: "2026-09-12", endDate: "2026-09-10" }),
      TODAY,
    );
    expect(r).toEqual({ ok: false, reason: "dates_reversed" });
  });

  it("accepts a single-day range (both ends inclusive)", () => {
    const r = parseAvailabilityWrite(
      body({ startDate: "2026-09-10", endDate: "2026-09-10" }),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });

  it("accepts a range of exactly the maximum length", () => {
    // Inclusive of both ends, so the last legal end is start + (max - 1).
    const end = addUtcDays("2026-09-10", MAX_AVAILABILITY_RANGE_DAYS - 1);
    const r = parseAvailabilityWrite(
      body({ startDate: "2026-09-10", endDate: end! }),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });

  it("rejects one day beyond the maximum", () => {
    const end = addUtcDays("2026-09-10", MAX_AVAILABILITY_RANGE_DAYS);
    const r = parseAvailabilityWrite(
      body({ startDate: "2026-09-10", endDate: end! }),
      TODAY,
    );
    expect(r).toEqual({ ok: false, reason: "range_too_long" });
  });

  it("rejects a backdated start rather than clamping it", () => {
    // Clamping would silently pick one of two readings — "the rest of
    // that span" or "last year's dates pasted by mistake".
    const r = parseAvailabilityWrite(body({ startDate: "2026-08-30" }), TODAY);
    expect(r).toEqual({ ok: false, reason: "starts_in_past" });
  });

  it("allows a range starting today", () => {
    const r = parseAvailabilityWrite(
      body({ startDate: TODAY, endDate: "2026-09-05" }),
      TODAY,
    );
    expect(r.ok).toBe(true);
  });

  it("survives a null body", () => {
    expect(parseAvailabilityWrite(null, TODAY).ok).toBe(false);
  });

  it("gives every rejection a distinct, non-empty message", () => {
    const reasons = [
      "bad_listing_id",
      "bad_kind",
      "bad_dates",
      "dates_reversed",
      "range_too_long",
      "starts_in_past",
      "bad_reason",
    ] as const;
    const seen = new Set<string>();
    for (const r of reasons) {
      const m = availabilityWriteMessage(r);
      expect(m.length).toBeGreaterThan(0);
      seen.add(m);
    }
    expect(seen.size).toBe(reasons.length);
  });
});

describe("bookingsBlockingBlackout — the guard that stops a sold week being blacked out", () => {
  const booking = (start: string, end: string, status = "confirmed") => ({
    start_date: start,
    end_date: end,
    status: status as never,
  });

  it("finds a booking fully inside the proposed blackout", () => {
    const clashes = bookingsBlockingBlackout(
      { start_date: "2026-09-10", end_date: "2026-09-20" },
      [booking("2026-09-12", "2026-09-15")],
    );
    expect(clashes).toHaveLength(1);
  });

  it("finds a booking that merely overlaps at the edge", () => {
    // The blackout starts the day the booking ends. Both ends are
    // inclusive (0046), so that shared day IS a conflict — the car is
    // still out on it.
    const clashes = bookingsBlockingBlackout(
      { start_date: "2026-09-15", end_date: "2026-09-20" },
      [booking("2026-09-12", "2026-09-15")],
    );
    expect(clashes).toHaveLength(1);
  });

  it("ignores a booking that ends the day before the blackout starts", () => {
    const clashes = bookingsBlockingBlackout(
      { start_date: "2026-09-16", end_date: "2026-09-20" },
      [booking("2026-09-12", "2026-09-15")],
    );
    expect(clashes).toEqual([]);
  });

  it("ignores cancelled and declined bookings", () => {
    // reservingRanges() owns which statuses hold dates, so this cannot
    // drift from 0047's EXCLUDE or from the read path.
    const clashes = bookingsBlockingBlackout(
      { start_date: "2026-09-10", end_date: "2026-09-20" },
      [
        booking("2026-09-12", "2026-09-15", "cancelled"),
        booking("2026-09-13", "2026-09-14", "declined"),
        booking("2026-09-11", "2026-09-12", "expired"),
      ],
    );
    expect(clashes).toEqual([]);
  });

  it("catches a merely REQUESTED booking? no — a request does not hold dates", () => {
    // 0047's whole design: 'requested' reserves nothing, so an operator
    // may blackout over an unanswered request. Declining it is the
    // separate, deliberate act.
    const clashes = bookingsBlockingBlackout(
      { start_date: "2026-09-10", end_date: "2026-09-20" },
      [booking("2026-09-12", "2026-09-15", "requested")],
    );
    expect(clashes).toEqual([]);
  });

  it("returns every clashing booking, not just the first", () => {
    const clashes = bookingsBlockingBlackout(
      { start_date: "2026-09-01", end_date: "2026-09-30" },
      [
        booking("2026-09-03", "2026-09-05"),
        booking("2026-09-20", "2026-09-22", "in_progress"),
      ],
    );
    expect(clashes).toHaveLength(2);
  });

  it("is empty when there are no bookings at all", () => {
    expect(
      bookingsBlockingBlackout(
        { start_date: "2026-09-10", end_date: "2026-09-20" },
        [],
      ),
    ).toEqual([]);
  });
});

describe("classifyAvailabilityWriteError", () => {
  it("reads a 23P01 as an overlap with the operator's own entry", () => {
    expect(classifyAvailabilityWriteError({ code: "23P01" })).toEqual({
      kind: "overlap",
    });
  });

  it("recognises the constraint by name when no code is present", () => {
    expect(
      classifyAvailabilityWriteError({
        message: 'conflicting key value violates exclusion constraint "rental_availability_no_overlap"',
      }),
    ).toEqual({ kind: "overlap" });
  });

  it("reads a foreign-key violation as a missing listing", () => {
    expect(classifyAvailabilityWriteError({ code: "23503" })).toEqual({
      kind: "not_found",
    });
  });

  it("keeps an unknown error's message for the log rather than swallowing it", () => {
    const f = classifyAvailabilityWriteError({ code: "42P01", message: "boom" });
    expect(f).toEqual({ kind: "unknown", message: "boom" });
  });

  it("survives a null error", () => {
    expect(classifyAvailabilityWriteError(null).kind).toBe("unknown");
  });

  it("words an overlap differently for a blackout and an opening", () => {
    const a = availabilityFailureMessage({ kind: "overlap" }, "blackout");
    const b = availabilityFailureMessage({ kind: "overlap" }, "open");
    expect(a).not.toBe(b);
    expect(a).toMatch(/blocked/i);
    expect(b).toMatch(/opening/i);
  });

  it("never tells the operator to simply retry an overlap", () => {
    // A retry would fail identically — the fix is to edit the existing
    // row, and the copy has to say so.
    const m = availabilityFailureMessage({ kind: "overlap" }, "blackout");
    expect(m).not.toMatch(/try again/i);
  });
});
