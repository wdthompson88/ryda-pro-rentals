// Tests for the rental booking state machine (migration 0047).
//
// Two jobs. The first is the ordinary one: prove the transition map
// says yes to the moves the flow needs and no to everything else.
//
// The second is the one that earns this file its keep. The map is a
// MIRROR of a plpgsql trigger — the same rules written twice, in two
// languages, in two files that no compiler relates to each other. That
// is exactly the arrangement that drifts: someone adds a status to the
// migration's CHECK constraint, ships it, and the route keeps rejecting
// the value months later for no visible reason. So the "in sync with
// the migration" block below parses 0047_rental_bookings.sql and
// compares it to this module. If they disagree, this suite fails and
// names the difference.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  RENTAL_BOOKING_RESERVING_STATUSES,
  RENTAL_BOOKING_STATUSES,
  RENTAL_BOOKING_TERMINAL_STATUSES,
  RENTAL_BOOKING_TRANSITIONS,
  assertRentalBookingTransition,
  canTransitionRentalBooking,
  isRentalBookingStatus,
  isTerminalRentalBookingStatus,
  nextRentalBookingStatuses,
  reservesRentalDates,
  type RentalBookingStatus,
} from "../rental-booking-status";

// ── the migration, as text ──────────────────────────────────────────

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/0047_rental_bookings.sql",
);

/** The migration with `--` line comments removed, so prose about the
 *  status list is never mistaken for the status list. */
const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8").replace(
  /--[^\n]*/g,
  "",
);

/** Pull the quoted identifiers out of a SQL `in ('a','b')` body. */
function quoted(list: string): string[] {
  return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("0047 migration is readable (guards the parser, not the code)", () => {
  it("found the file and it is the rental_bookings migration", () => {
    // Without this, every assertion below would pass vacuously if the
    // migration were renamed or renumbered.
    expect(MIGRATION_SQL).toContain("create table if not exists public.rental_bookings");
    expect(MIGRATION_SQL).toContain("rental_bookings_no_overlap");
    expect(MIGRATION_SQL).toContain(
      "public.rental_bookings_enforce_status()",
    );
  });
});

describe("status vocabulary matches the migration's CHECK constraint", () => {
  it("the CHECK allows exactly RENTAL_BOOKING_STATUSES", () => {
    const match = /check\s*\(status\s+in\s*\(([^)]*)\)\)/.exec(MIGRATION_SQL);
    expect(match, "no `check (status in (…))` found in 0047").not.toBeNull();

    expect(sorted(quoted(match![1]))).toEqual(sorted(RENTAL_BOOKING_STATUSES));
  });

  it("has no duplicates", () => {
    expect(new Set(RENTAL_BOOKING_STATUSES).size).toBe(
      RENTAL_BOOKING_STATUSES.length,
    );
  });

  it("spells its terminal 'cancelled', not rental_payments' 'canceled'", () => {
    // The one-L spelling belongs to rental_payments (0041) and the
    // co-own bookings (0009). A copy-pasted filter using it here
    // matches nothing, silently — this is the tripwire.
    expect(RENTAL_BOOKING_STATUSES).toContain("cancelled");
    expect(RENTAL_BOOKING_STATUSES as readonly string[]).not.toContain(
      "canceled",
    );
  });
});

describe("transition map matches the migration's trigger", () => {
  /** Every `(old.status = 'x' and new.status in ('a','b'))` clause in
   *  the trigger body, as a map. */
  function triggerTransitions(): Record<string, string[]> {
    const pattern =
      /\(old\.status\s*=\s*'(\w+)'\s+and\s+new\.status\s+in\s*\(([^)]*)\)\)/g;
    const out: Record<string, string[]> = {};
    for (const m of MIGRATION_SQL.matchAll(pattern)) {
      out[m[1]] = quoted(m[2]);
    }
    return out;
  }

  it("finds transition clauses to compare (guards the regex)", () => {
    expect(Object.keys(triggerTransitions()).length).toBeGreaterThan(0);
  });

  it("every non-terminal status has the same targets in both", () => {
    const fromSql = triggerTransitions();
    for (const [from, to] of Object.entries(fromSql)) {
      expect(
        sorted(to),
        `trigger allows ${from} -> ${to.join("|")}`,
      ).toEqual(sorted(RENTAL_BOOKING_TRANSITIONS[from as RentalBookingStatus]));
    }
  });

  it("the trigger names no status the map treats as terminal", () => {
    // The other direction of the same check: a status the SQL can move
    // off but the map cannot.
    const fromSql = Object.keys(triggerTransitions());
    for (const terminal of RENTAL_BOOKING_TERMINAL_STATUSES) {
      expect(fromSql, `${terminal} should be terminal`).not.toContain(terminal);
    }
  });

  it("the map names no source the trigger has forgotten", () => {
    const fromSql = Object.keys(triggerTransitions());
    const nonTerminal = RENTAL_BOOKING_STATUSES.filter(
      (s) => RENTAL_BOOKING_TRANSITIONS[s].length > 0,
    );
    expect(sorted(fromSql)).toEqual(sorted(nonTerminal));
  });

  it("shares the trigger's exception wording", () => {
    // So one grep finds the rejection whichever layer produced it.
    expect(MIGRATION_SQL).toContain(
      "illegal rental_bookings status transition: % -> %",
    );
    expect(() =>
      assertRentalBookingTransition("requested", "completed"),
    ).toThrow("illegal rental_bookings status transition: requested -> completed");
  });
});

describe("reserving statuses match the EXCLUDE constraint", () => {
  it("the EXCLUDE fires on exactly RENTAL_BOOKING_RESERVING_STATUSES", () => {
    const match = /where\s*\(status\s+in\s*\(([^)]*)\)\)/.exec(MIGRATION_SQL);
    expect(match, "no `where (status in (…))` found on the EXCLUDE").not.toBeNull();

    expect(sorted(quoted(match![1]))).toEqual(
      sorted(RENTAL_BOOKING_RESERVING_STATUSES),
    );
  });

  it("copies 0021's inclusive daterange primitive", () => {
    // '[]' is what makes the return day block the next pickup. A
    // silent change to '[)' would let two renters share a turnaround
    // day and the EXCLUDE would still look correct.
    expect(MIGRATION_SQL).toContain("daterange(start_date, end_date, '[]')");
    expect(MIGRATION_SQL).toContain("exclude using gist");
  });

  it("'requested' does NOT reserve dates", () => {
    // The core of request-to-book (D3): several renters may be asking
    // for the same week; the operator picks one. If this ever flips,
    // the first click silently locks out every other renter.
    expect(reservesRentalDates("requested")).toBe(false);
  });

  it("confirmed and in_progress hold the car", () => {
    expect(reservesRentalDates("confirmed")).toBe(true);
    expect(reservesRentalDates("in_progress")).toBe(true);
  });

  it("no terminal status reserves (that is what ending means)", () => {
    for (const status of RENTAL_BOOKING_TERMINAL_STATUSES) {
      expect(reservesRentalDates(status), status).toBe(false);
    }
  });

  it("every reserving status is a real status", () => {
    for (const status of RENTAL_BOOKING_RESERVING_STATUSES) {
      expect(isRentalBookingStatus(status)).toBe(true);
    }
  });
});

describe("canTransitionRentalBooking — the legal moves", () => {
  it("allows every pair in the map", () => {
    for (const from of RENTAL_BOOKING_STATUSES) {
      for (const to of RENTAL_BOOKING_TRANSITIONS[from]) {
        expect(
          canTransitionRentalBooking(from, to),
          `${from} -> ${to}`,
        ).toBe(true);
        expect(() => assertRentalBookingTransition(from, to)).not.toThrow();
      }
    }
  });

  it("walks the happy path end to end", () => {
    const happyPath: RentalBookingStatus[] = [
      "requested",
      "confirmed",
      "in_progress",
      "completed",
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(
        canTransitionRentalBooking(happyPath[i], happyPath[i + 1]),
      ).toBe(true);
    }
  });

  it("lets a request end three ways short of confirmation", () => {
    // Operator says no, nobody answered in 24h (O5), renter withdrew.
    expect(canTransitionRentalBooking("requested", "declined")).toBe(true);
    expect(canTransitionRentalBooking("requested", "expired")).toBe(true);
    expect(canTransitionRentalBooking("requested", "cancelled")).toBe(true);
  });

  it("allows a confirmed booking to be cancelled (O3 refund tiers)", () => {
    expect(canTransitionRentalBooking("confirmed", "cancelled")).toBe(true);
  });

  it("treats a same-status update as allowed, matching the trigger", () => {
    // The trigger only consults its table when the status actually
    // changes, so stamping expires_at on a still-'requested' row is a
    // legal UPDATE. This function reports the database's behaviour, not
    // a stricter opinion.
    for (const status of RENTAL_BOOKING_STATUSES) {
      expect(canTransitionRentalBooking(status, status), status).toBe(true);
    }
  });
});

describe("canTransitionRentalBooking — the rejected moves", () => {
  const illegal: Array<[RentalBookingStatus, RentalBookingStatus, string]> = [
    // The build loop's own acceptance example.
    ["requested", "completed", "a request cannot skip the whole trip"],
    ["requested", "in_progress", "the car cannot leave before it is approved"],
    ["confirmed", "completed", "a trip that never started cannot finish"],
    ["confirmed", "requested", "approval does not un-happen"],
    [
      "confirmed",
      "declined",
      "backing out after confirmation is a cancellation, priced differently by O3",
    ],
    ["confirmed", "expired", "only an unanswered request expires"],
    ["in_progress", "confirmed", "the car is already out"],
    [
      "in_progress",
      "cancelled",
      "a bad return is a deposit claim, not a status rewrite",
    ],
    ["in_progress", "declined", "nothing to decline once the trip is running"],
    ["completed", "in_progress", "a finished trip does not restart"],
    ["completed", "cancelled", "money has already moved"],
    ["declined", "confirmed", "a declined request is not revivable"],
    ["expired", "confirmed", "an expired request is re-requested, not revived"],
    ["expired", "requested", "the renter asks again as a new row"],
    ["cancelled", "confirmed", "a cancelled booking is not resurrected"],
    ["cancelled", "in_progress", "the car is not going anywhere"],
    ["declined", "expired", "one terminal state does not become another"],
  ];

  it.each(illegal)("rejects %s -> %s (%s)", (from, to) => {
    expect(canTransitionRentalBooking(from, to)).toBe(false);
    expect(() => assertRentalBookingTransition(from, to)).toThrow(
      `illegal rental_bookings status transition: ${from} -> ${to}`,
    );
  });
});

describe("terminal states stay terminal", () => {
  it("identifies the four dead ends", () => {
    expect(sorted(RENTAL_BOOKING_TERMINAL_STATUSES)).toEqual(
      sorted(["completed", "declined", "expired", "cancelled"]),
    );
  });

  it("no terminal status can move to any OTHER status", () => {
    // Exhaustive rather than representative: this is the property a
    // future edit is most likely to break by accident.
    for (const from of RENTAL_BOOKING_TERMINAL_STATUSES) {
      expect(isTerminalRentalBookingStatus(from)).toBe(true);
      expect(nextRentalBookingStatuses(from)).toEqual([]);

      for (const to of RENTAL_BOOKING_STATUSES) {
        if (to === from) continue;
        expect(
          canTransitionRentalBooking(from, to),
          `${from} -> ${to} must be rejected`,
        ).toBe(false);
      }
    }
  });

  it("the live statuses are not terminal", () => {
    for (const status of ["requested", "confirmed", "in_progress"] as const) {
      expect(isTerminalRentalBookingStatus(status), status).toBe(false);
    }
  });

  it("every status is reachable from 'requested'", () => {
    // A status nothing can reach is dead schema. Breadth-first from the
    // one status a row is created in.
    const seen = new Set<RentalBookingStatus>(["requested"]);
    const queue: RentalBookingStatus[] = ["requested"];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of RENTAL_BOOKING_TRANSITIONS[current]) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect(sorted([...seen])).toEqual(sorted(RENTAL_BOOKING_STATUSES));
  });
});

describe("isRentalBookingStatus", () => {
  it("accepts every member of the vocabulary", () => {
    for (const status of RENTAL_BOOKING_STATUSES) {
      expect(isRentalBookingStatus(status)).toBe(true);
    }
  });

  it("rejects near-misses and non-strings", () => {
    // 'canceled' and 'in-progress' are the two a copy-paste from
    // rental_payments (0041) or the co-own bookings (0009) produces.
    for (const value of [
      "canceled",
      "in-progress",
      "pending",
      "paid",
      "CONFIRMED",
      "",
      null,
      undefined,
      42,
      { status: "confirmed" },
    ]) {
      expect(isRentalBookingStatus(value), String(value)).toBe(false);
    }
  });
});
