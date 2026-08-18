// The configurable rental fee engine (task 3A, decision D2).
//
// Three jobs, in ascending order of how much they earn their keep.
//
// 1. Exercise every combination the config can take: two payers x two
//    modes x floor/cap, plus the rounding boundary and the invalid
//    configs that must throw rather than quietly charge something.
//
// 2. Assert the RECONCILIATION PROPERTY over a wide sweep of inputs —
//    no cent may be created or lost by any combination of terms. This
//    is the invariant the whole design exists to protect: the renter's
//    total, RYDA's fee and the operator's net are three views of one
//    sum of money, and if they ever disagree by a cent then somebody's
//    card, somebody's payout, or RYDA's ledger is wrong. Postgres
//    asserts the same thing on every row via 0047's
//    rental_bookings_quote_consistent CHECK; this suite asserts it on
//    the arithmetic that produces those rows, before the row exists.
//
// 3. Guard the contract that lives in four places at once. The [0, MAX]
//    commission bound is written in TypeScript (fees.ts), enforced in
//    an API route, drawn as form rails in the admin UI, and CHECKed in
//    SQL. The first three import one constant. SQL cannot import
//    anything, so the last block below PARSES migration 0048 and fails
//    if its CHECK and the constant have drifted apart. Same technique
//    rental-booking-status.test.ts uses on 0047's status list, and for
//    the same reason: a CHECK stricter than the UI is an opaque 500 on
//    save, a UI stricter than the CHECK silently forbids a legitimate
//    commercial term.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  RENTAL_COMMISSION_RATE_DEFAULT,
  RENTAL_COMMISSION_RATE_MAX,
  RENTAL_COMMISSION_RATE_SCALE,
  RENTAL_FEE_CENTS_MAX,
  RENTAL_FEE_EXAMPLE_BASE_CENTS,
  RENTAL_FEE_MODES,
  RENTAL_FEE_PAYERS,
  computeRentalFee,
  isStorableCommissionRate,
  rentalFeeConfigFromPartner,
  resolveRentalFeeConfig,
  storedCommissionRate,
  type RentalFeeConfig,
} from "../fees";

// ── 1) the four quadrants: payer x mode ─────────────────────────────

describe("percent mode", () => {
  it("operator-pays deducts the fee from the payout (today's behavior)", () => {
    const r = computeRentalFee(200_000, {
      mode: "percent",
      rate: 0.15,
      payer: "operator",
    });
    expect(r.feeCents).toBe(30_000);
    expect(r.renterTotalCents).toBe(200_000); // the renter sees the base
    expect(r.operatorNetCents).toBe(170_000);
    expect(r.feePayer).toBe("operator");
  });

  it("renter-pays ADDS the fee on top — the charge itself changes", () => {
    // The distinction that makes this more than a bookkeeping label: the
    // same $2,000 booking at the same 15% produces a $2,300 charge, not
    // a $2,000 one. A renter-pays config that only re-attributed the
    // fee would undercharge by the whole fee, every booking.
    const r = computeRentalFee(200_000, {
      mode: "percent",
      rate: 0.15,
      payer: "renter",
    });
    expect(r.feeCents).toBe(30_000);
    expect(r.renterTotalCents).toBe(230_000);
    expect(r.operatorNetCents).toBe(200_000); // operator keeps the full base
    expect(r.feePayer).toBe("renter");
  });

  it("the two payers differ by exactly the fee, on both sides", () => {
    const base = 137_777;
    const cfg = { mode: "percent", rate: 0.185 } as const;
    const op = computeRentalFee(base, { ...cfg, payer: "operator" });
    const rt = computeRentalFee(base, { ...cfg, payer: "renter" });
    expect(op.feeCents).toBe(rt.feeCents);
    expect(rt.renterTotalCents - op.renterTotalCents).toBe(op.feeCents);
    expect(rt.operatorNetCents - op.operatorNetCents).toBe(op.feeCents);
  });
});

describe("flat mode", () => {
  it("operator-pays takes the flat fee out of the payout", () => {
    const r = computeRentalFee(200_000, {
      mode: "flat",
      flatCents: 25_000,
      payer: "operator",
    });
    expect(r.feeCents).toBe(25_000);
    expect(r.renterTotalCents).toBe(200_000);
    expect(r.operatorNetCents).toBe(175_000);
  });

  it("renter-pays adds the flat fee to the charge", () => {
    const r = computeRentalFee(200_000, {
      mode: "flat",
      flatCents: 25_000,
      payer: "renter",
    });
    expect(r.feeCents).toBe(25_000);
    expect(r.renterTotalCents).toBe(225_000);
    expect(r.operatorNetCents).toBe(200_000);
  });

  it("ignores the base entirely — that is the point of a flat fee", () => {
    // Renter-pays so the sweep can include a base SMALLER than the fee:
    // under operator-pays that config is refused (see the negative-net
    // test below), and the refusal would mask what this test is about.
    for (const base of [1_000, 200_000, 5_000_000]) {
      expect(
        computeRentalFee(base, {
          mode: "flat",
          flatCents: 25_000,
          payer: "renter",
        }).feeCents,
      ).toBe(25_000);
    }
  });

  it("accepts a zero flat fee (a launch promotion), not just a missing one", () => {
    const r = computeRentalFee(200_000, { mode: "flat", flatCents: 0 });
    expect(r.feeCents).toBe(0);
    expect(r.operatorNetCents).toBe(200_000);
    expect(r.renterTotalCents).toBe(200_000);
  });
});

// ── 2) the clamps ───────────────────────────────────────────────────

describe("floor and cap", () => {
  it("raises a small percent fee to the floor", () => {
    // 5% of a $300 one-night rental is $15; the $25 floor is the "we
    // don't process a booking for less than this" rule.
    const r = computeRentalFee(30_000, {
      rate: 0.05,
      floorCents: 2_500,
      payer: "operator",
    });
    expect(r.rawFeeCents).toBe(1_500);
    expect(r.feeCents).toBe(2_500);
    expect(r.clampedBy).toBe("floor");
    expect(r.operatorNetCents).toBe(27_500);
  });

  it("lowers a large percent fee to the cap", () => {
    const r = computeRentalFee(1_000_000, {
      rate: 0.15,
      capCents: 50_000,
      payer: "operator",
    });
    expect(r.rawFeeCents).toBe(150_000);
    expect(r.feeCents).toBe(50_000);
    expect(r.clampedBy).toBe("cap");
    expect(r.operatorNetCents).toBe(950_000);
  });

  it("leaves a fee between the bounds untouched", () => {
    const r = computeRentalFee(200_000, {
      rate: 0.15,
      floorCents: 2_500,
      capCents: 50_000,
    });
    expect(r.feeCents).toBe(30_000);
    expect(r.rawFeeCents).toBe(30_000);
    expect(r.clampedBy).toBeNull();
  });

  it("clamps BEFORE the split, so both sides move together", () => {
    // The ordering that matters. Clamping after the split would let the
    // renter be charged base + floor while the operator was debited
    // base - raw, and the two halves of one deal would disagree by the
    // clamp — a cent leak that 0047's quote CHECK would then reject at
    // insert time, mid-booking.
    const cfg = { rate: 0.05, floorCents: 2_500 } as const;
    const renter = computeRentalFee(30_000, { ...cfg, payer: "renter" });
    expect(renter.renterTotalCents).toBe(32_500);
    expect(renter.operatorNetCents).toBe(30_000);
    expect(renter.renterTotalCents - renter.feeCents).toBe(30_000);

    const operator = computeRentalFee(30_000, { ...cfg, payer: "operator" });
    expect(operator.renterTotalCents).toBe(30_000);
    expect(operator.operatorNetCents + operator.feeCents).toBe(30_000);
  });

  it("applies clamps in flat mode too", () => {
    const raised = computeRentalFee(200_000, {
      mode: "flat",
      flatCents: 1_000,
      floorCents: 2_500,
    });
    expect(raised.feeCents).toBe(2_500);
    expect(raised.clampedBy).toBe("floor");

    const lowered = computeRentalFee(200_000, {
      mode: "flat",
      flatCents: 90_000,
      capCents: 50_000,
    });
    expect(lowered.feeCents).toBe(50_000);
    expect(lowered.clampedBy).toBe("cap");
  });

  it("a floor equal to the cap pins the fee", () => {
    const r = computeRentalFee(200_000, {
      rate: 0.15,
      floorCents: 5_000,
      capCents: 5_000,
    });
    expect(r.feeCents).toBe(5_000);
  });
});

// ── 3) rounding ─────────────────────────────────────────────────────

describe("rounding", () => {
  it("rounds half away from zero, at the single rounding point", () => {
    // Every input here is positive, so Math.round is plain half-up.
    expect(computeRentalFee(103, { rate: 0.15 }).feeCents).toBe(15); // 15.45
    expect(computeRentalFee(105, { rate: 0.15 }).feeCents).toBe(16); // 15.75
    expect(computeRentalFee(90, { rate: 0.15 }).feeCents).toBe(14); // 13.5 → 14
    expect(computeRentalFee(110, { rate: 0.15 }).feeCents).toBe(17); // 16.5 → 17
    expect(computeRentalFee(10, { rate: 0.15 }).feeCents).toBe(2); // 1.5 → 2
    expect(computeRentalFee(30, { rate: 0.15 }).feeCents).toBe(5); // 4.5 → 5
  });

  it("an odd-cent fee still reconciles exactly, under either payer", () => {
    // 12_345 * 0.15 = 1851.75 → 1852. The half-cent has to land on ONE
    // side of the deal; what must never happen is it landing on neither
    // (a cent lost) or both (a cent created).
    const operator = computeRentalFee(12_345, {
      rate: 0.15,
      payer: "operator",
    });
    expect(operator.feeCents).toBe(1_852);
    expect(operator.operatorNetCents).toBe(10_493);
    expect(operator.operatorNetCents + operator.feeCents).toBe(12_345);

    const renter = computeRentalFee(12_345, { rate: 0.15, payer: "renter" });
    expect(renter.feeCents).toBe(1_852);
    expect(renter.renterTotalCents).toBe(14_197);
    expect(renter.renterTotalCents - renter.feeCents).toBe(12_345);
  });

  it("never rounds twice — the clamp and split are integer-only", () => {
    // A floor/cap expressed in whole cents cannot introduce a fraction,
    // so rawFeeCents is the only value that was ever non-integral.
    for (const base of [1, 7, 99, 101, 12_345, 999_999]) {
      const r = computeRentalFee(base, {
        rate: 0.175,
        floorCents: 3,
        capCents: 100_000,
        payer: "renter",
      });
      expect(Number.isInteger(r.feeCents)).toBe(true);
      expect(Number.isInteger(r.renterTotalCents)).toBe(true);
      expect(Number.isInteger(r.operatorNetCents)).toBe(true);
    }
  });

  it("a 1-cent rental never produces a negative operator net", () => {
    const r = computeRentalFee(1, { rate: 0.15, payer: "operator" });
    expect(r.feeCents).toBe(0); // 0.15 rounds to 0
    expect(r.operatorNetCents).toBe(1);
  });
});

// ── 4) THE RECONCILIATION PROPERTY ──────────────────────────────────

describe("no cent may vanish", () => {
  // A deterministic sweep rather than a random one: a money invariant
  // that fails only on Tuesdays is worse than no test. The bases are
  // chosen to include primes, near-round numbers and odd-cent values,
  // since those are where a rounding bug hides.
  const BASES = [
    1, 2, 3, 7, 49, 99, 100, 101, 333, 1_000, 1_001, 2_499, 12_345, 30_000,
    99_999, 100_000, 110_500, 137_777, 200_000, 999_999, 1_000_003, 5_000_000,
  ];
  const RATES = [0, 0.001, 0.05, 0.15, 0.1725, 0.3333, 0.5, RENTAL_COMMISSION_RATE_MAX];
  const CLAMPS: Array<Pick<RentalFeeConfig, "floorCents" | "capCents">> = [
    {},
    { floorCents: 2_500 },
    { capCents: 50_000 },
    { floorCents: 2_500, capCents: 50_000 },
    { floorCents: 0, capCents: 0 },
  ];

  it("renterTotal - fee === base whenever the renter pays", () => {
    for (const base of BASES) {
      for (const rate of RATES) {
        for (const clamp of CLAMPS) {
          const r = computeRentalFee(base, { rate, payer: "renter", ...clamp });
          expect(r.renterTotalCents - r.feeCents).toBe(base);
          // ...and the operator is untouched by a fee they do not pay.
          expect(r.operatorNetCents).toBe(base);
          // The legacy identity holds under the new payer too.
          expect(r.applicationFeeCents + r.operatorNetCents).toBe(r.amountCents);
        }
      }
    }
  });

  it("operatorNet + fee === base whenever the operator pays", () => {
    for (const base of BASES) {
      for (const rate of RATES) {
        for (const clamp of CLAMPS) {
          // Skip the configs whose floor exceeds this particular base —
          // the engine refuses those loudly and that is its own test
          // below; here we are asserting the arithmetic of the ones it
          // accepts.
          const floor = clamp.floorCents ?? 0;
          if (floor > base) continue;
          const r = computeRentalFee(base, {
            rate,
            payer: "operator",
            ...clamp,
          });
          expect(r.operatorNetCents + r.feeCents).toBe(base);
          expect(r.renterTotalCents).toBe(base);
          expect(r.operatorNetCents).toBeGreaterThanOrEqual(0);
          expect(r.applicationFeeCents + r.operatorNetCents).toBe(r.amountCents);
        }
      }
    }
  });

  it("flat fees reconcile on the same terms", () => {
    for (const base of BASES) {
      for (const flatCents of [0, 1, 999, 2_500, 25_000]) {
        const renter = computeRentalFee(base, {
          mode: "flat",
          flatCents,
          payer: "renter",
        });
        expect(renter.renterTotalCents - renter.feeCents).toBe(base);

        if (flatCents <= base) {
          const operator = computeRentalFee(base, {
            mode: "flat",
            flatCents,
            payer: "operator",
          });
          expect(operator.operatorNetCents + operator.feeCents).toBe(base);
        }
      }
    }
  });

  it("matches 0047's rental_bookings_quote_consistent CHECK, both arms", () => {
    // The engine writes these four numbers into a row whose CHECK
    // re-derives them from fee_payer. Anything the engine can produce
    // that the CHECK would reject is a booking that 500s at insert.
    for (const payer of RENTAL_FEE_PAYERS) {
      for (const mode of RENTAL_FEE_MODES) {
        const r = computeRentalFee(200_000, {
          mode,
          rate: 0.15,
          payer,
          ...(mode === "flat" ? { flatCents: 25_000 } : {}),
        });
        if (payer === "renter") {
          expect(r.renterTotalCents).toBe(r.baseAmountCents + r.feeCents);
          expect(r.operatorNetCents).toBe(r.baseAmountCents);
        } else {
          expect(r.renterTotalCents).toBe(r.baseAmountCents);
          expect(r.operatorNetCents).toBe(r.baseAmountCents - r.feeCents);
        }
        expect(r.feeCents).toBeGreaterThanOrEqual(0);
        expect(r.renterTotalCents).toBeGreaterThan(0);
        expect(r.operatorNetCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ── 5) invalid configs are refused, loudly ──────────────────────────

describe("invalid configs throw instead of charging something", () => {
  it("rejects a flat mode with no amount", () => {
    expect(() => computeRentalFee(200_000, { mode: "flat" })).toThrow(
      /flatCents is required/,
    );
  });

  it("rejects a percent mode still carrying a flat amount", () => {
    // 0048's coherence CHECK says the same thing: a row must never hold
    // two candidate fees, because the stale one silently becomes live
    // the day someone flips the mode back.
    expect(() =>
      computeRentalFee(200_000, { mode: "percent", flatCents: 25_000 }),
    ).toThrow(/flatCents must be absent/);
  });

  it("rejects a non-integer or negative flat amount", () => {
    expect(() =>
      computeRentalFee(200_000, { mode: "flat", flatCents: 250.5 }),
    ).toThrow(/flatCents/);
    // Dollars where cents belong — the 100x bug, caught by the integer
    // gate the same way the base amount is.
    expect(() =>
      computeRentalFee(200_000, { mode: "flat", flatCents: 25.0000001 }),
    ).toThrow(/flatCents/);
    expect(() =>
      computeRentalFee(200_000, { mode: "flat", flatCents: -1 }),
    ).toThrow(/flatCents/);
    expect(() =>
      computeRentalFee(200_000, { mode: "flat", flatCents: NaN }),
    ).toThrow(/flatCents/);
  });

  it("rejects non-integer, negative and non-finite clamps", () => {
    expect(() => computeRentalFee(200_000, { floorCents: 25.5 })).toThrow(
      /floorCents/,
    );
    expect(() => computeRentalFee(200_000, { capCents: -1 })).toThrow(/capCents/);
    expect(() => computeRentalFee(200_000, { capCents: Infinity })).toThrow(
      /capCents/,
    );
  });

  it("rejects a floor above the cap", () => {
    expect(() =>
      computeRentalFee(200_000, { floorCents: 50_000, capCents: 2_500 }),
    ).toThrow(/floorCents \(50000\) must be <= capCents \(2500\)/);
  });

  it("rejects an unknown mode or payer", () => {
    expect(() =>
      computeRentalFee(200_000, {
        mode: "percentage" as unknown as "percent",
      }),
    ).toThrow(/mode must be one of/);
    expect(() =>
      computeRentalFee(200_000, {
        payer: "platform" as unknown as "renter",
      }),
    ).toThrow(/payer must be one of/);
  });

  it("rejects an out-of-contract rate even in flat mode", () => {
    // commission_rate is NOT NULL on partners and survives a flip to
    // flat terms, so a bad rate parked there is a live misconfiguration
    // waiting for the next flip back — not something to wave through
    // because it happens to be unused this second.
    expect(() =>
      computeRentalFee(200_000, { mode: "flat", flatCents: 100, rate: 15 }),
    ).toThrow(/\[0, 0\.75\]/);
  });

  it("refuses an operator-paid fee larger than the booking", () => {
    // Would make the payout negative, which 0047 CHECKs against — so
    // the row could not be written anyway. Throwing here names the
    // terms; letting it through names a constraint, mid-booking.
    expect(() =>
      computeRentalFee(2_000, { mode: "flat", flatCents: 5_000, payer: "operator" }),
    ).toThrow(/exceeds the 2000 base/);
    expect(() =>
      computeRentalFee(2_000, { rate: 0.15, floorCents: 5_000, payer: "operator" }),
    ).toThrow(/exceeds the 2000 base/);
  });

  it("permits the same fee when the RENTER carries it", () => {
    // Nothing to refuse: the operator still receives the full base and
    // the renter simply sees a larger total.
    const r = computeRentalFee(2_000, {
      mode: "flat",
      flatCents: 5_000,
      payer: "renter",
    });
    expect(r.renterTotalCents).toBe(7_000);
    expect(r.operatorNetCents).toBe(2_000);
  });

  it("still rejects a bad base amount whichever form is used", () => {
    expect(() => computeRentalFee(0, { rate: 0.15 })).toThrow(/positive integer/);
    expect(() => computeRentalFee(-1, { rate: 0.15 })).toThrow(/positive integer/);
    expect(() => computeRentalFee(1105.5, { rate: 0.15 })).toThrow(
      /positive integer/,
    );
    expect(() => computeRentalFee(NaN, { rate: 0.15 })).toThrow(
      /positive integer/,
    );
  });

  it("rejects a garbage second argument rather than ignoring it", () => {
    // A string in the rate slot must not fall through to the default
    // 15% — that would charge a fee nobody configured.
    expect(() =>
      computeRentalFee(200_000, "0.2" as unknown as number),
    ).toThrow(/\[0, 0\.75\]/);
  });
});

// ── 6) the compatibility overload ───────────────────────────────────

describe("the pre-D2 call form still means what it meant", () => {
  it("computeRentalFee(cents) === percent / default rate / operator-pays", () => {
    const legacy = computeRentalFee(110_500);
    const explicit = computeRentalFee(110_500, {
      mode: "percent",
      rate: RENTAL_COMMISSION_RATE_DEFAULT,
      payer: "operator",
    });
    expect(legacy).toEqual(explicit);
  });

  it("computeRentalFee(cents, rate) === that rate, operator-pays", () => {
    expect(computeRentalFee(50_000, 0.2)).toEqual(
      computeRentalFee(50_000, { mode: "percent", rate: 0.2, payer: "operator" }),
    );
  });
});

// ── 7) reading terms off a partners row ─────────────────────────────

describe("rentalFeeConfigFromPartner", () => {
  it("resolves a pre-0048 row to exactly today's behavior", () => {
    // The migration is proposed by code and applied by a human, so this
    // is not hypothetical: the route reads rows without these columns
    // for as long as that gap lasts.
    const config = rentalFeeConfigFromPartner({ commission_rate: 0.15 });
    expect(resolveRentalFeeConfig(config)).toEqual({
      mode: "percent",
      rate: 0.15,
      flatCents: null,
      payer: "operator",
      floorCents: null,
      capCents: null,
    });
  });

  it("treats a null commission_rate as absent, not as 0%", () => {
    // Number(null) === 0, so a naive coercion would silently create a
    // no-commission operator out of a missing value.
    const config = rentalFeeConfigFromPartner({ commission_rate: null });
    expect(resolveRentalFeeConfig(config).rate).toBe(
      RENTAL_COMMISSION_RATE_DEFAULT,
    );
  });

  it("coerces the numeric columns Supabase may hand back as strings", () => {
    const config = rentalFeeConfigFromPartner({
      commission_rate: "0.225",
      fee_mode: "flat",
      fee_flat_cents: "25000",
      fee_payer: "renter",
      fee_floor_cents: "2500",
      fee_cap_cents: "50000",
    });
    expect(resolveRentalFeeConfig(config)).toEqual({
      mode: "flat",
      rate: 0.225,
      flatCents: 25_000,
      payer: "renter",
      floorCents: 2_500,
      capCents: 50_000,
    });
  });

  it("survives a null row", () => {
    expect(resolveRentalFeeConfig(rentalFeeConfigFromPartner(null)).mode).toBe(
      "percent",
    );
  });

  it("carries a full flat/renter row through to the money", () => {
    const r = computeRentalFee(
      200_000,
      rentalFeeConfigFromPartner({
        commission_rate: 0.15,
        fee_mode: "flat",
        fee_flat_cents: 25_000,
        fee_payer: "renter",
      }),
    );
    expect(r.renterTotalCents).toBe(225_000);
    expect(r.operatorNetCents).toBe(200_000);
  });
});

describe("the worked-example constant", () => {
  it("is a whole number of cents the preview can actually compute", () => {
    expect(Number.isInteger(RENTAL_FEE_EXAMPLE_BASE_CENTS)).toBe(true);
    expect(RENTAL_FEE_EXAMPLE_BASE_CENTS).toBeGreaterThan(0);
    expect(computeRentalFee(RENTAL_FEE_EXAMPLE_BASE_CENTS).feeCents).toBe(30_000);
  });
});

// ── 8) the SQL half of the contract ─────────────────────────────────

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/0048_partner_fee_config.sql",
);

/** The migration with `--` line comments removed, so prose ABOUT the
 *  bound is never mistaken for the bound. The header of 0048 discusses
 *  both 0.5 and 0.75 at length; only the CHECK counts. */
const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8").replace(
  /--[^\n]*/g,
  "",
);

describe("0048 is readable (guards the parser, not the code)", () => {
  it("found the file and it is the partner fee-config migration", () => {
    // Without this every assertion below would pass vacuously if the
    // migration were renamed or renumbered.
    expect(MIGRATION_SQL).toContain("partners_commission_rate_bounded");
    expect(MIGRATION_SQL).toContain("fee_mode");
    expect(MIGRATION_SQL).toContain("fee_payer");
  });
});

describe("the commission ceiling is the same number in SQL and TypeScript", () => {
  it("the CHECK bound equals RENTAL_COMMISSION_RATE_MAX", () => {
    const match = MIGRATION_SQL.match(
      /commission_rate\s*>=\s*0\s+and\s+commission_rate\s*<=\s*([0-9.]+)/,
    );
    expect(match, "0048 must declare the commission_rate CHECK").not.toBeNull();
    expect(Number(match![1])).toBe(RENTAL_COMMISSION_RATE_MAX);
  });

  it("drops 0041's narrower inline CHECK so the old bound cannot survive", () => {
    // Postgres named 0041's inline check `partners_commission_rate_check`.
    // Adding a wider constraint without dropping it leaves BOTH in force
    // and the effective ceiling stays 0.5 — a widening that silently
    // does nothing.
    expect(MIGRATION_SQL).toMatch(
      /drop constraint if exists partners_commission_rate_check/,
    );
  });

  it("is re-runnable: every constraint is dropped before it is added", () => {
    const added = [
      ...MIGRATION_SQL.matchAll(/add constraint (\w+)/g),
    ].map((m) => m[1]);
    expect(added.length).toBeGreaterThan(0);
    for (const name of added) {
      expect(
        MIGRATION_SQL.includes(`drop constraint if exists ${name}`),
        `${name} is added without a matching drop — the migration is not re-runnable`,
      ).toBe(true);
    }
  });

  it("adds every column idempotently", () => {
    for (const col of [
      "fee_mode",
      "fee_flat_cents",
      "fee_payer",
      "fee_floor_cents",
      "fee_cap_cents",
    ]) {
      expect(MIGRATION_SQL).toContain(`add column if not exists ${col}`);
    }
  });
});

describe("the enum vocabularies match the TypeScript unions", () => {
  /** Pull the quoted identifiers out of a SQL `in ('a','b')` body. */
  function quoted(list: string): string[] {
    return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  }

  it("fee_mode's CHECK allows exactly RENTAL_FEE_MODES", () => {
    const match = MIGRATION_SQL.match(/check\s*\(fee_mode in \(([^)]*)\)\)/);
    expect(match, "0048 must CHECK fee_mode").not.toBeNull();
    expect(quoted(match![1])).toEqual([...RENTAL_FEE_MODES].sort());
  });

  it("fee_payer's CHECK allows exactly RENTAL_FEE_PAYERS", () => {
    const match = MIGRATION_SQL.match(/check\s*\(fee_payer in \(([^)]*)\)\)/);
    expect(match, "0048 must CHECK fee_payer").not.toBeNull();
    expect(quoted(match![1])).toEqual([...RENTAL_FEE_PAYERS].sort());
  });

  it("defaults reproduce the pre-D2 behavior", () => {
    // Applying 0048 must not move a single operator's economics.
    expect(MIGRATION_SQL).toMatch(/fee_mode text not null default 'percent'/);
    expect(MIGRATION_SQL).toMatch(/fee_payer text not null default 'operator'/);
  });
});

describe("the coherence CHECKs mirror resolveRentalFeeConfig", () => {
  it("requires the amount that belongs to the active mode", () => {
    const normalized = MIGRATION_SQL.replace(/\s+/g, " ");
    expect(normalized).toContain("when 'percent' then fee_flat_cents is null");
    expect(normalized).toContain("when 'flat' then fee_flat_cents is not null");
    // An unmatched CASE returns NULL and a CHECK passes on NULL, so the
    // ELSE is what makes an unknown mode fail rather than slip through.
    expect(normalized).toContain("else false");
  });

  it("forbids a floor above the cap and negative amounts", () => {
    const normalized = MIGRATION_SQL.replace(/\s+/g, " ");
    expect(normalized).toContain("fee_floor_cents <= fee_cap_cents");
    expect(normalized).toMatch(/fee_flat_cents\s*>= 0/);
    expect(normalized).toMatch(/fee_floor_cents\s*>= 0/);
    expect(normalized).toMatch(/fee_cap_cents\s*>= 0/);
  });
});

// ── 9) the RESOLUTION half of the contract ──────────────────────────
//
// The ceiling above says how LARGE a rate may be. This says how FINE.
// partners.commission_rate is numeric(4,3), and nothing in the stack
// used to know that: 0.1575 cleared every bound, was previewed and
// audit-logged as $315.00 on the $2,000 reference booking, and was then
// stored as 0.158 — so every later quote charged $316.00. Preview,
// modal, audit entry and money, four numbers, three of them wrong.

const SCHEMA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/0041_partners_and_rental_payments.sql",
);

const SCHEMA_SQL = readFileSync(SCHEMA_PATH, "utf8").replace(/--[^\n]*/g, "");

describe("commission_rate fits the column it is stored in", () => {
  it("0041 declares the scale RENTAL_COMMISSION_RATE_SCALE claims", () => {
    // The SQL half of the contract, same technique as the ceiling above:
    // widen or narrow the column without moving the constant and this
    // fails, instead of a re-rounded rate reaching a card.
    const match = SCHEMA_SQL.match(/commission_rate\s+numeric\((\d+),\s*(\d+)\)/);
    expect(match, "0041 must declare commission_rate as numeric(p,s)").not.toBeNull();
    expect(Number(match![2])).toBe(RENTAL_COMMISSION_RATE_SCALE);
    // The precision has to leave room for the ceiling itself.
    expect(RENTAL_COMMISSION_RATE_MAX).toBeLessThan(
      10 ** (Number(match![1]) - Number(match![2])),
    );
  });

  it("refuses a rate finer than the column — the 15.75% case", () => {
    expect(isStorableCommissionRate(0.1575)).toBe(false);
    expect(storedCommissionRate(0.1575)).toBe(0.158);
    // The divergence itself, in cents, on the example the admin is shown
    // and the audit log records.
    expect(computeRentalFee(RENTAL_FEE_EXAMPLE_BASE_CENTS, 0.1575).feeCents).toBe(
      31_500,
    );
    expect(
      computeRentalFee(RENTAL_FEE_EXAMPLE_BASE_CENTS, storedCommissionRate(0.1575))
        .feeCents,
    ).toBe(31_600);

    // 12.25% is the same trap and rounds the other way, so a fix that
    // merely quantized in one direction would still miss it.
    expect(isStorableCommissionRate(0.1225)).toBe(false);
  });

  it("accepts every rate the column CAN hold, including 0 and the ceiling", () => {
    for (let thousandths = 0; thousandths <= 750; thousandths++) {
      const rate = thousandths / 1000;
      expect(
        isStorableCommissionRate(rate),
        `${rate} is exactly three decimal places and must be storable`,
      ).toBe(true);
      expect(storedCommissionRate(rate)).toBe(rate);
    }
    expect(isStorableCommissionRate(RENTAL_COMMISSION_RATE_MAX)).toBe(true);
  });

  it("is not fooled by the binary noise a percent/100 leaves behind", () => {
    // THE REASON the check is not `toFixed(3) === rate`. The admin form
    // computes the rate as pct / 100, and 0.7 / 100 is
    // 0.006999999999999999 in binary — the rate 0.007, which must be
    // accepted. The naive comparison refuses 185 of the 751 legal
    // one-decimal percents, i.e. it would block a quarter of all
    // legitimate saves while claiming to protect them.
    expect(0.7 / 100).not.toBe(0.007); // the noise is real
    for (let tenths = 0; tenths <= 750; tenths++) {
      const pct = tenths / 10;
      const rate = pct / 100;
      expect(
        isStorableCommissionRate(rate),
        `${pct}% is one decimal place and must be storable`,
      ).toBe(true);
      // ...and snapping it removes the noise rather than any precision.
      expect(storedCommissionRate(rate)).toBeCloseTo(rate, 12);
      expect(Number(storedCommissionRate(rate).toFixed(9))).toBe(
        Number(rate.toFixed(9)),
      );
    }
  });

  it("refuses non-numbers rather than treating them as 0", () => {
    expect(isStorableCommissionRate(NaN)).toBe(false);
    expect(isStorableCommissionRate(Infinity)).toBe(false);
    expect(
      isStorableCommissionRate("0.15" as unknown as number),
    ).toBe(false);
  });
});

// ── 10) the cents columns are int4 ──────────────────────────────────

describe("the cents ceiling", () => {
  it("is the int4 maximum, because that is what the columns are", () => {
    expect(RENTAL_FEE_CENTS_MAX).toBe(2_147_483_647);
    expect(MIGRATION_SQL).toMatch(/fee_flat_cents\s+integer/);
    expect(MIGRATION_SQL).toMatch(/fee_floor_cents\s+integer/);
    expect(MIGRATION_SQL).toMatch(/fee_cap_cents\s+integer/);
  });

  it("refuses an amount the column cannot hold, by name", () => {
    // $25,000,000 typed into "Flat fee" — well-formed, non-negative, an
    // integer number of cents, and unwritable. Before the ceiling it
    // passed the form, the API and the engine and surfaced as a raw
    // Postgres 22003 at 500.
    const tooBig = 2_500_000_000;
    expect(() =>
      computeRentalFee(200_000, {
        mode: "flat",
        flatCents: tooBig,
        payer: "renter",
      }),
    ).toThrow(/flatCents/);
    expect(() => computeRentalFee(200_000, { floorCents: tooBig })).toThrow(
      /floorCents/,
    );
    expect(() => computeRentalFee(200_000, { capCents: tooBig })).toThrow(
      /capCents/,
    );
  });

  it("accepts the ceiling itself", () => {
    const r = computeRentalFee(200_000, {
      mode: "flat",
      flatCents: RENTAL_FEE_CENTS_MAX,
      payer: "renter",
    });
    expect(r.feeCents).toBe(RENTAL_FEE_CENTS_MAX);
  });
});

// ── 11) THE RAIL THAT CHARGES: /admin/inquiries payment links ───────
//
// Task 3A's acceptance criterion is that the admin preview and the
// server charge call the SAME function and agree to the cent for every
// payer/mode combination. The payment-link route is, today, the only
// rail that charges a card — so until 3B exists it IS "the server
// charge", and it used to compute from commission_rate alone. A flat
// $250 renter-pays operator was previewed at "renter pays $2,250,
// operator receives $2,000" and charged $2,000 with a $300 application
// fee: the renter short by $250, the operator short by $300, silently,
// on every link.
//
// The route cannot be imported here (next/server, Supabase, Stripe), so
// this section asserts the behavior on the engine and the WIRING on the
// source — the same two-part technique used on the SQL above, and for
// the same reason: the compiler cannot relate a select list to a fee.

const PAYMENT_LINK_ROUTE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../app/api/admin/inquiries/[id]/payment-link/route.ts",
);

const PAYMENT_LINK_SRC = readFileSync(PAYMENT_LINK_ROUTE_PATH, "utf8");

describe("the payment-link rail charges the operator's configured terms", () => {
  /** Exactly what the route builds its Stripe call from. */
  function charge(partnerRow: Record<string, unknown>, baseCents: number) {
    const fee = computeRentalFee(baseCents, rentalFeeConfigFromPartner(partnerRow));
    return {
      unitAmount: fee.amountCents,
      applicationFee: fee.applicationFeeCents,
      operatorNet: fee.operatorNetCents,
    };
  }

  it("agrees with the preview for a flat renter-pays operator", () => {
    const partner = {
      commission_rate: 0.15,
      fee_mode: "flat",
      fee_flat_cents: 25_000,
      fee_payer: "renter",
    };
    // What /admin/partners shows the admin, from the same function.
    const preview = computeRentalFee(200_000, rentalFeeConfigFromPartner(partner));
    expect(preview.renterTotalCents).toBe(225_000);
    expect(preview.operatorNetCents).toBe(200_000);

    // What the card is charged.
    expect(charge(partner, 200_000)).toEqual({
      unitAmount: 225_000,
      applicationFee: 25_000,
      operatorNet: 200_000,
    });

    // The regression, stated as the numbers it used to produce.
    const legacy = computeRentalFee(200_000, Number(partner.commission_rate));
    expect(legacy.amountCents).toBe(200_000);
    expect(legacy.applicationFeeCents).toBe(30_000);
  });

  it("agrees for every payer x mode combination, to the cent", () => {
    for (const fee_payer of RENTAL_FEE_PAYERS) {
      for (const fee_mode of RENTAL_FEE_MODES) {
        for (const base of [30_000, 137_777, 200_000, 999_999]) {
          const partner = {
            commission_rate: 0.15,
            fee_mode,
            fee_payer,
            ...(fee_mode === "flat" ? { fee_flat_cents: 2_500 } : {}),
            fee_floor_cents: 1_000,
            fee_cap_cents: 50_000,
          };
          const preview = computeRentalFee(
            base,
            rentalFeeConfigFromPartner(partner),
          );
          const charged = charge(partner, base);
          expect(charged.unitAmount).toBe(preview.renterTotalCents);
          expect(charged.applicationFee).toBe(preview.feeCents);
          // The direct-charge identity: the application fee comes OUT of
          // the amount charged, under BOTH payers.
          expect(charged.applicationFee + charged.operatorNet).toBe(
            charged.unitAmount,
          );
        }
      }
    }
  });

  it("still charges the pre-D2 math for a pre-0048 partners row", () => {
    // The migration is applied by a human, so the route reads rows
    // without the fee columns for as long as that gap lasts. Absence
    // must resolve to percent / operator-pays, not to a default fee.
    const legacyRow = { commission_rate: 0.15 };
    expect(charge(legacyRow, 200_000)).toEqual({
      unitAmount: 200_000,
      applicationFee: 30_000,
      operatorNet: 170_000,
    });
  });

  it("SELECTS the fee columns — the half of the wiring a fee cannot show", () => {
    // rentalFeeConfigFromPartner tests each fee_* key with `!= null` and
    // skips the ones that are absent, by design (that fallback is the
    // pre-0048 case above). So a route that calls it on a row selected
    // without those columns computes the OLD math, silently, with no
    // throw and no warning — and the diff looks complete. The select
    // list is therefore part of the fix, not a detail of it.
    for (const column of [
      "fee_mode",
      "fee_flat_cents",
      "fee_payer",
      "fee_floor_cents",
      "fee_cap_cents",
    ]) {
      expect(
        PAYMENT_LINK_SRC,
        `payment-link route must select partners.${column}`,
      ).toContain(`"${column}"`);
    }
  });

  it("computes from the partner's terms, not from commission_rate alone", () => {
    expect(PAYMENT_LINK_SRC).toContain(
      "computeRentalFee(amountCents, rentalFeeConfigFromPartner(partner))",
    );
    expect(PAYMENT_LINK_SRC).not.toContain(
      "computeRentalFee(amountCents, Number(partner.commission_rate))",
    );
  });
});
