// Tests for the rental payment lifecycle (0041, 0047 §7, 0051).
//
// The suite's real job is the DRIFT GUARD: rental_payments_enforce_status
// is the authority and lives in SQL, this module mirrors it in
// TypeScript, and nothing but a test can hold the two together. If a
// transition is added to one and not the other, a route either refuses
// something the database allows (a 409 nobody can explain) or attempts
// something it forbids (a 500 after the money moved).
//
// It matters more here than for bookings. A booking status is an
// intention; a payment status is where money physically is. On the D1
// rail RYDA holds the funds between `paid` and the operator's Transfer,
// and after a chargeback may be holding a debt.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  RENTAL_PAYMENT_HOLDING_STATUSES,
  RENTAL_PAYMENT_STATUS,
  RENTAL_PAYMENT_STATUSES,
  RENTAL_PAYMENT_TERMINAL_STATUSES,
  RENTAL_PAYMENT_TRANSITIONS,
  assertRentalPaymentTransition,
  canTransitionRentalPayment,
  holdsOperatorFunds,
  isRentalPaymentStatus,
  isTerminalRentalPaymentStatus,
  nextRentalPaymentStatuses,
  type RentalPaymentStatus,
} from "../rental-payment-status";

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/0051_rental_payments_platform_rail.sql",
);

/** Comments stripped, so prose ABOUT the statuses is never mistaken for
 *  the status list — the migration explains its own map at length. */
const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8").replace(
  /--[^\n]*/g,
  "",
);

function quoted(list: string): string[] {
  return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

const sorted = (v: readonly string[]) => [...v].sort();

describe("0051 is readable (guards the parser, not the code)", () => {
  it("found the file and it is the rental_payments migration", () => {
    // Without this every assertion below could pass vacuously if the
    // migration were renamed or renumbered.
    expect(MIGRATION_SQL).toContain("public.rental_payments");
    expect(MIGRATION_SQL).toContain("rental_payments_enforce_status");
  });
});

describe("the status vocabulary matches the CHECK constraint", () => {
  it("lists exactly the statuses rental_payments_status_known allows", () => {
    const m = MIGRATION_SQL.match(
      /rental_payments_status_known[\s\S]*?check\s*\(status in \(([^)]*)\)\)/i,
    );
    expect(m).not.toBeNull();
    expect(sorted(quoted(m?.[1] ?? ""))).toEqual(sorted(RENTAL_PAYMENT_STATUSES));
  });

  it("keeps the one-L spelling 0041 established", () => {
    // rental_bookings spells its terminal `cancelled`. These are
    // different columns on different tables and comparing them is always
    // a bug — hence no shared constant.
    expect(RENTAL_PAYMENT_STATUSES).toContain("canceled");
    expect(RENTAL_PAYMENT_STATUSES).not.toContain("cancelled");
  });

  it("maps every name to itself", () => {
    for (const s of RENTAL_PAYMENT_STATUSES) {
      expect(RENTAL_PAYMENT_STATUS[s]).toBe(s);
    }
    expect(sorted(Object.keys(RENTAL_PAYMENT_STATUS))).toEqual(
      sorted(RENTAL_PAYMENT_STATUSES),
    );
  });

  it("narrows unknown values", () => {
    expect(isRentalPaymentStatus("refunded")).toBe(true);
    expect(isRentalPaymentStatus("cancelled")).toBe(false); // two Ls
    expect(isRentalPaymentStatus("")).toBe(false);
    expect(isRentalPaymentStatus(null)).toBe(false);
    expect(isRentalPaymentStatus(7)).toBe(false);
  });
});

describe("the transition map matches the trigger", () => {
  // The trigger is a single `if not (... or ... or ...)` over pairs.
  // Parsing it exactly would couple the test to its formatting, so this
  // extracts the (old, new-list) pairs and compares them as data.
  function triggerPairs(): Record<string, string[]> {
    const body = MIGRATION_SQL.match(
      /create or replace function public\.rental_payments_enforce_status[\s\S]*?\$\$ language plpgsql;/i,
    )?.[0];
    expect(body).toBeTruthy();
    const out: Record<string, string[]> = {};
    for (const m of (body ?? "").matchAll(
      /old\.status\s*=\s*'([a-z_]+)'\s*and\s*new\.status in \(([^)]*)\)/gi,
    )) {
      out[m[1]] = quoted(m[2]);
    }
    return out;
  }

  it("allows exactly the same moves the SQL allows", () => {
    const sql = triggerPairs();
    // Every non-terminal status in TS must appear in the SQL with the
    // same destinations.
    for (const from of RENTAL_PAYMENT_STATUSES) {
      const ts = RENTAL_PAYMENT_TRANSITIONS[from];
      if (ts.length === 0) {
        expect(sql[from]).toBeUndefined();
        continue;
      }
      expect(sorted(sql[from] ?? [])).toEqual(sorted(ts));
    }
    // ...and the SQL introduces no source status TS does not know.
    expect(sorted(Object.keys(sql))).toEqual(
      sorted(
        RENTAL_PAYMENT_STATUSES.filter(
          (s) => RENTAL_PAYMENT_TRANSITIONS[s].length > 0,
        ),
      ),
    );
  });

  it("lets a pending payment reach every settlement 0041 defined", () => {
    expect(sorted(nextRentalPaymentStatuses("pending"))).toEqual(
      sorted(["paid", "expired", "canceled"]),
    );
  });

  it("lets a paid payment be refunded or disputed — the whole point of 0051", () => {
    // Both were `raise exception` before this migration, which is why a
    // chargeback on the D1 rail had nowhere to land.
    expect(canTransitionRentalPayment("paid", "refunded")).toBe(true);
    expect(canTransitionRentalPayment("paid", "disputed")).toBe(true);
  });

  it("lets a won dispute return to paid, and a lost one refund", () => {
    expect(canTransitionRentalPayment("disputed", "paid")).toBe(true);
    expect(canTransitionRentalPayment("disputed", "refunded")).toBe(true);
  });

  it("never reopens a refunded, expired or canceled payment", () => {
    for (const terminal of ["refunded", "expired", "canceled"] as const) {
      expect(nextRentalPaymentStatuses(terminal)).toEqual([]);
      expect(isTerminalRentalPaymentStatus(terminal)).toBe(true);
      for (const to of RENTAL_PAYMENT_STATUSES) {
        expect(canTransitionRentalPayment(terminal, to)).toBe(false);
      }
    }
  });

  it("refuses the moves that would skip settlement entirely", () => {
    expect(canTransitionRentalPayment("pending", "refunded")).toBe(false);
    expect(canTransitionRentalPayment("pending", "disputed")).toBe(false);
  });

  it("refuses a self-transition", () => {
    for (const s of RENTAL_PAYMENT_STATUSES) {
      expect(canTransitionRentalPayment(s, s)).toBe(false);
    }
  });

  it("derives the terminal set rather than restating it", () => {
    expect(sorted(RENTAL_PAYMENT_TERMINAL_STATUSES)).toEqual(
      sorted(["refunded", "expired", "canceled"]),
    );
  });

  it("throws the trigger's own sentence", () => {
    expect(() => assertRentalPaymentTransition("pending", "refunded")).toThrow(
      "illegal rental_payments status transition: pending -> refunded",
    );
    expect(() =>
      assertRentalPaymentTransition("paid", "refunded"),
    ).not.toThrow();
  });
});

describe("holding statuses — when RYDA has money that isn't RYDA's", () => {
  it("counts paid and disputed, and nothing else", () => {
    expect(sorted(RENTAL_PAYMENT_HOLDING_STATUSES)).toEqual(
      sorted(["paid", "disputed"]),
    );
  });

  it("does not count pending — nothing has been charged yet", () => {
    expect(holdsOperatorFunds("pending")).toBe(false);
  });

  it("does not count refunded — the money went back", () => {
    expect(holdsOperatorFunds("refunded")).toBe(false);
  });

  it("counts disputed, because the operator's claim is unsettled", () => {
    expect(holdsOperatorFunds("disputed")).toBe(true);
  });
});

describe("the ledger columns 0051 adds", () => {
  it("bounds a refund by what was charged", () => {
    expect(MIGRATION_SQL).toMatch(
      /rental_payments_refund_bounded[\s\S]*?refunded_cents <= amount_cents/i,
    );
  });

  it("makes the transfer id unique so a retry cannot pay twice", () => {
    expect(MIGRATION_SQL).toMatch(
      /rental_payments_transfer_id_unique unique \(stripe_transfer_id\)/i,
    );
  });

  it("freezes the financial terms after insert", () => {
    const guard = MIGRATION_SQL.match(
      /financial terms are immutable[\s\S]{0,80}/i,
    );
    expect(guard).not.toBeNull();
    for (const col of [
      "base_amount_cents",
      "fee_payer",
      "operator_net_cents",
    ]) {
      expect(MIGRATION_SQL).toContain(`new.${col} is distinct from old.${col}`);
    }
  });

  it("lets refunded_cents grow but never shrink", () => {
    expect(MIGRATION_SQL).toMatch(
      /new\.refunded_cents < old\.refunded_cents[\s\S]*?raise exception/i,
    );
    // ...and it is deliberately NOT in the frozen list.
    const frozen = MIGRATION_SQL.match(
      /financial terms are immutable[\s\S]*?raise exception/i,
    )?.[0];
    expect(frozen).toBeTruthy();
  });

  it("keeps the Stripe objects write-once", () => {
    for (const col of ["stripe_transfer_id", "stripe_charge_id"]) {
      expect(MIGRATION_SQL).toMatch(
        new RegExp(`${col} is write-once`, "i"),
      );
    }
  });
});
