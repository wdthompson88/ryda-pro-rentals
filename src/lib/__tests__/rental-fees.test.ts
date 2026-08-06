// computeRentalFee unit tests — the rental rail's money math. This
// function's output becomes application_fee_amount on a live Stripe
// direct charge, so the invariants that matter are: the split always
// reconciles to the charged amount exactly (no lost/created cents),
// rounding is deterministic, and bad input throws instead of charging
// a wrong fee.

import { describe, it, expect } from "vitest";
import { RENTAL_COMMISSION_RATE_DEFAULT, computeRentalFee } from "../fees";

describe("computeRentalFee", () => {
  it("defaults to the 15% platform commission", () => {
    expect(RENTAL_COMMISSION_RATE_DEFAULT).toBe(0.15);
    // Real fleet number: the $1,105/day Huracán EVO rate in cents.
    // 110_500 * 0.15 = 16_575 exactly — RYDA takes $165.75, the
    // operator nets $939.25.
    const result = computeRentalFee(110_500);
    expect(result.amountCents).toBe(110_500);
    expect(result.applicationFeeCents).toBe(16_575);
    expect(result.operatorNetCents).toBe(93_925);
  });

  it("fee + operator net always reconciles to the charged amount", () => {
    // The invariant Stripe enforces implicitly: application fee comes
    // OUT of the charge, so the pieces must sum exactly — for awkward
    // amounts too.
    for (const amount of [1, 3, 99, 101, 12_345, 110_500, 1_000_003]) {
      const { amountCents, applicationFeeCents, operatorNetCents } =
        computeRentalFee(amount);
      expect(applicationFeeCents + operatorNetCents).toBe(amountCents);
    }
  });

  it("rounds odd-cent fees with Math.round (half away from zero)", () => {
    // 103 * 0.15 = 15.45 → 15
    expect(computeRentalFee(103).applicationFeeCents).toBe(15);
    // 105 * 0.15 = 15.75 → 16
    expect(computeRentalFee(105).applicationFeeCents).toBe(16);
    // 90 * 0.15 = 13.5 → exactly half a cent rounds up to 14
    expect(computeRentalFee(90).applicationFeeCents).toBe(14);
    // 110 * 0.15 = 16.5 → 17
    expect(computeRentalFee(110).applicationFeeCents).toBe(17);
  });

  it("honors a per-partner commission override", () => {
    // 20% partner: 50_000 * 0.20 = 10_000
    const result = computeRentalFee(50_000, 0.2);
    expect(result.applicationFeeCents).toBe(10_000);
    expect(result.operatorNetCents).toBe(40_000);
  });

  it("accepts the rate bounds themselves (0 and 0.5)", () => {
    // Matches the DB check constraint on partners.commission_rate —
    // both endpoints are legal values, not errors.
    const free = computeRentalFee(10_000, 0);
    expect(free.applicationFeeCents).toBe(0);
    expect(free.operatorNetCents).toBe(10_000);

    const half = computeRentalFee(10_001, 0.5);
    expect(half.applicationFeeCents).toBe(5_001); // 5000.5 rounds up
    expect(half.operatorNetCents).toBe(5_000);
  });

  it("handles a 1-cent charge without producing a negative net", () => {
    const result = computeRentalFee(1);
    expect(result.applicationFeeCents).toBe(0); // 0.15 rounds to 0
    expect(result.operatorNetCents).toBe(1);
  });

  it("rejects non-integer amounts", () => {
    // Dollars passed where cents belong is the classic 100x bug —
    // 1105.50 is clearly dollars, never cents.
    expect(() => computeRentalFee(1105.5)).toThrow(/positive integer/);
    expect(() => computeRentalFee(0.15)).toThrow(/positive integer/);
  });

  it("rejects zero and negative amounts", () => {
    expect(() => computeRentalFee(0)).toThrow(/positive integer/);
    expect(() => computeRentalFee(-110_500)).toThrow(/positive integer/);
  });

  it("rejects non-finite amounts", () => {
    expect(() => computeRentalFee(NaN)).toThrow(/positive integer/);
    expect(() => computeRentalFee(Infinity)).toThrow(/positive integer/);
  });

  it("rejects out-of-bounds commission rates", () => {
    expect(() => computeRentalFee(10_000, -0.01)).toThrow(/\[0, 0\.5\]/);
    expect(() => computeRentalFee(10_000, 0.51)).toThrow(/\[0, 0\.5\]/);
    // A percentage passed where a fraction belongs (15 vs 0.15) must
    // throw, not silently take a 15x fee.
    expect(() => computeRentalFee(10_000, 15)).toThrow(/\[0, 0\.5\]/);
  });

  it("rejects non-finite commission rates", () => {
    expect(() => computeRentalFee(10_000, NaN)).toThrow(/\[0, 0\.5\]/);
    expect(() => computeRentalFee(10_000, Infinity)).toThrow(/\[0, 0\.5\]/);
  });
});
