// Age-gate tests — pre-launch CRITICAL (CODEX-CHALLENGE caught this:
// Terms of Service requires 28+ but no code enforced it). These tests
// lock in the gate semantics so a future refactor can't silently
// downgrade the gate (e.g. mis-handling Feb 29 DOB, off-by-one when
// birthday hasn't arrived yet this year, partial DOB shapes).

import { describe, it, expect } from "vitest";
import { computeAgeYears, requireMinAge, MIN_MEMBER_AGE_YEARS } from "../age";

const asOf = new Date("2026-05-07T12:00:00Z");

describe("computeAgeYears", () => {
  it("returns exact years when birthday already passed this year", () => {
    expect(computeAgeYears({ year: 1990, month: 1, day: 1 }, asOf)).toBe(36);
  });

  it("returns one less year when birthday not yet reached this year", () => {
    // Birthday Dec 15 — not yet by May 7
    expect(computeAgeYears({ year: 1990, month: 12, day: 15 }, asOf)).toBe(35);
  });

  it("handles birthday on the exact asOf day (no decrement)", () => {
    expect(computeAgeYears({ year: 1990, month: 5, day: 7 }, asOf)).toBe(36);
  });

  it("decrements when birthday is tomorrow", () => {
    expect(computeAgeYears({ year: 1990, month: 5, day: 8 }, asOf)).toBe(35);
  });

  it("handles Feb 29 leap-year DOB (treated as Feb 29 across non-leap years)", () => {
    // Born Feb 29 2000. As of May 7 2026 → age 26.
    expect(computeAgeYears({ year: 2000, month: 2, day: 29 }, asOf)).toBe(26);
  });

  it("returns null for null/undefined dob", () => {
    expect(computeAgeYears(null, asOf)).toBeNull();
    expect(computeAgeYears(undefined, asOf)).toBeNull();
  });

  it("returns null for missing year/month/day", () => {
    expect(computeAgeYears({ year: 1990, month: 5 }, asOf)).toBeNull();
    expect(computeAgeYears({ year: 1990, day: 7 }, asOf)).toBeNull();
    expect(computeAgeYears({ month: 5, day: 7 }, asOf)).toBeNull();
    expect(computeAgeYears({}, asOf)).toBeNull();
  });

  it("returns null for non-numeric fields", () => {
    expect(
      computeAgeYears(
        { year: "1990" as unknown as number, month: 5, day: 7 },
        asOf,
      ),
    ).toBeNull();
  });

  it("returns null for impossible dates (month/day out of range)", () => {
    expect(computeAgeYears({ year: 1990, month: 13, day: 1 }, asOf)).toBeNull();
    expect(computeAgeYears({ year: 1990, month: 0, day: 1 }, asOf)).toBeNull();
    expect(computeAgeYears({ year: 1990, month: 5, day: 32 }, asOf)).toBeNull();
    expect(computeAgeYears({ year: 1990, month: 5, day: 0 }, asOf)).toBeNull();
  });

  it("returns null for absurd years (defensive cap)", () => {
    expect(computeAgeYears({ year: 1899, month: 1, day: 1 }, asOf)).toBeNull();
    expect(computeAgeYears({ year: 2101, month: 1, day: 1 }, asOf)).toBeNull();
  });
});

describe("requireMinAge — gate semantics", () => {
  it("documented minimum is 28 (matches /legal/terms § 2)", () => {
    expect(MIN_MEMBER_AGE_YEARS).toBe(28);
  });

  it("blocks a 22-year-old who passed Stripe Identity (the documented bypass)", () => {
    const result = requireMinAge({ year: 2003, month: 1, day: 1 }, asOf);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("age_under_min");
    }
  });

  it("allows a 28-year-old whose birthday already passed", () => {
    const result = requireMinAge({ year: 1998, month: 1, day: 1 }, asOf);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.age).toBe(28);
    }
  });

  it("blocks a 28-year-old whose birthday hasn't reached yet (still 27)", () => {
    // Dec 15 1998 → not 28 until Dec 15 2026, asOf is May 7 2026 → 27
    const result = requireMinAge({ year: 1998, month: 12, day: 15 }, asOf);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("age_under_min");
    }
  });

  it("allows a 50-year-old (no upper bound)", () => {
    expect(requireMinAge({ year: 1976, month: 1, day: 1 }, asOf).ok).toBe(true);
  });

  it("returns dob_missing code when DOB is null", () => {
    const result = requireMinAge(null, asOf);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("dob_missing");
    }
  });

  it("returns dob_missing code when DOB is undefined", () => {
    const result = requireMinAge(undefined, asOf);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("dob_missing");
    }
  });

  it("returns dob_missing code when DOB is malformed", () => {
    const result = requireMinAge({ year: 1990, month: 13, day: 99 }, asOf);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("dob_missing");
    }
  });

  it("respects custom minAge override (forward-compat for per-vertical gates)", () => {
    expect(requireMinAge({ year: 2000, month: 1, day: 1 }, asOf, 18).ok).toBe(true);
    expect(requireMinAge({ year: 2010, month: 1, day: 1 }, asOf, 18).ok).toBe(false);
  });
});
