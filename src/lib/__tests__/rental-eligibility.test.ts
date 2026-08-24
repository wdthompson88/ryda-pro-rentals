// Tests for renter eligibility (build loop 1A, open default O6).
//
// Two things carry real consequence here:
//
//   THE AGE BOUNDARY. Off by one in either direction is a live problem —
//   too strict refuses a legal renter over a calendar detail, too loose
//   puts a 24-year-old in a supercar the insurer will not cover. The
//   birthday-exactly-on-pickup case is the one that decides it.
//
//   AGE IS MEASURED AT PICKUP, NOT TODAY. A renter who turns 25 the week
//   before their trip is eligible for that trip. Getting this wrong is
//   invisible in testing with fixed dates and obvious to the renter who
//   was refused.

import { describe, it, expect } from "vitest";
import {
  RENTAL_MIN_AGE_YEARS,
  ageOnDate,
  decideRentalEligibility,
  eligibilityBlockOwner,
  rentalEligibilityMessage,
  rentalEligibilityOperatorMessage,
  type KycStatus,
  type RentalEligibilityBlock,
} from "../rental-eligibility";

const dob = (year: number, month: number, day: number) => ({ year, month, day });

const decide = (over: Partial<Parameters<typeof decideRentalEligibility>[0]> = {}) =>
  decideRentalEligibility({
    kycStatus: "verified",
    dob: dob(1990, 6, 15),
    startDate: "2026-09-12",
    ...over,
  });

describe("ageOnDate", () => {
  it("counts whole years", () => {
    expect(ageOnDate(dob(1990, 6, 15), "2026-09-12")).toBe(36);
  });

  it("has not counted the birthday that has not happened yet", () => {
    expect(ageOnDate(dob(1990, 12, 25), "2026-09-12")).toBe(35);
  });

  it("counts the birthday ON the day itself", () => {
    // The boundary the whole gate turns on.
    expect(ageOnDate(dob(2001, 9, 12), "2026-09-12")).toBe(25);
  });

  it("does not count it the day before", () => {
    expect(ageOnDate(dob(2001, 9, 13), "2026-09-12")).toBe(24);
  });

  it("handles a 29 February birthday", () => {
    // Born on a leap day, measured in a non-leap year. The birthday has
    // passed by 1 March.
    expect(ageOnDate(dob(2000, 2, 29), "2026-03-01")).toBe(26);
    expect(ageOnDate(dob(2000, 2, 29), "2026-02-28")).toBe(25);
  });

  it("is UTC, not local — a date is a calendar fact", () => {
    // Same input must give the same answer regardless of the runner's zone.
    expect(ageOnDate(dob(2001, 1, 1), "2026-01-01")).toBe(25);
  });

  it.each([
    ["null dob", null],
    ["undefined dob", undefined],
    ["a missing month", { year: 2000, day: 12 }],
    ["a missing year", { month: 6, day: 12 }],
    ["a missing day", { year: 2000, month: 6 }],
    ["month 13", { year: 2000, month: 13, day: 1 }],
    ["day 0", { year: 2000, month: 6, day: 0 }],
    ["an impossible date", { year: 2001, month: 2, day: 31 }],
    ["a nonsense year", { year: 1200, month: 6, day: 1 }],
  ])("returns null for %s rather than guessing", (_label, d) => {
    expect(ageOnDate(d as never, "2026-09-12")).toBeNull();
  });

  it("returns null for a malformed target date", () => {
    expect(ageOnDate(dob(1990, 6, 15), "12/09/2026")).toBeNull();
  });
});

describe("decideRentalEligibility — identity comes first", () => {
  it("lets a verified adult through", () => {
    const d = decide();
    expect(d.eligible).toBe(true);
    if (d.eligible) expect(d.ageAtPickup).toBe(36);
  });

  it("blocks a renter who has never started", () => {
    expect(decide({ kycStatus: null })).toMatchObject({
      eligible: false,
      reason: "identity_not_started",
    });
  });

  it("treats a cancelled check as never started — it is the same next step", () => {
    expect(decide({ kycStatus: "canceled" })).toMatchObject({
      reason: "identity_not_started",
    });
  });

  it.each(["requires_input", "processing"] as const)(
    "blocks as pending while status is %s",
    (kycStatus: KycStatus) => {
      expect(decide({ kycStatus })).toMatchObject({ reason: "identity_pending" });
    },
  );

  it("distinguishes requires_action from pending", () => {
    // Different next step: pending is "wait", this is "somebody has to
    // look at it".
    expect(decide({ kycStatus: "requires_action" })).toMatchObject({
      reason: "identity_failed",
    });
  });

  it("checks identity BEFORE age — you cannot be too young if we don't know your age", () => {
    const d = decide({ kycStatus: null, dob: dob(2010, 1, 1) });
    expect(d).toMatchObject({ reason: "identity_not_started" });
  });
});

describe("decideRentalEligibility — the age gate", () => {
  it(`blocks a renter under ${RENTAL_MIN_AGE_YEARS} at pickup`, () => {
    const d = decide({ dob: dob(2005, 1, 1), startDate: "2026-09-12" });
    expect(d).toMatchObject({ eligible: false, reason: "under_age" });
    if (!d.eligible) expect(d.ageAtPickup).toBe(21);
  });

  it("allows a renter who turns 25 exactly on the pickup date", () => {
    // The boundary. Refusing here refuses a legal renter.
    const d = decide({ dob: dob(2001, 9, 12), startDate: "2026-09-12" });
    expect(d.eligible).toBe(true);
    if (d.eligible) expect(d.ageAtPickup).toBe(25);
  });

  it("blocks a renter who turns 25 the day AFTER pickup", () => {
    const d = decide({ dob: dob(2001, 9, 13), startDate: "2026-09-12" });
    expect(d).toMatchObject({ eligible: false, reason: "under_age" });
  });

  it("measures at PICKUP, not today — a renter who ages into it qualifies", () => {
    // Same person, two bookings. This is the case a today-based check
    // gets wrong, and it is invisible unless it is tested directly.
    const birthday = dob(2001, 10, 1);
    const before = decide({ dob: birthday, startDate: "2026-09-30" });
    const after = decide({ dob: birthday, startDate: "2026-10-01" });
    expect(before.eligible).toBe(false);
    expect(after.eligible).toBe(true);
  });

  it("does not accuse a verified renter of being young when the dob is unreadable", () => {
    // A legacy encrypted row (0029's stale case) or a document with no
    // dob. Folding this into under_age would accuse somebody on no
    // evidence, and it is not something re-uploading fixes.
    const d = decide({ dob: null });
    expect(d).toMatchObject({ eligible: false, reason: "no_dob_on_file" });
    if (!d.eligible) expect(d.ageAtPickup).toBeNull();
  });

  it("rejects a malformed start date rather than computing against it", () => {
    expect(decide({ startDate: "next tuesday" })).toMatchObject({
      reason: "bad_start_date",
    });
  });
});

describe("copy", () => {
  const ALL: RentalEligibilityBlock[] = [
    "identity_not_started", "identity_pending", "identity_failed",
    "no_dob_on_file", "under_age", "bad_start_date",
  ];

  it("gives every block a distinct, non-empty renter message", () => {
    const seen = new Set(ALL.map(rentalEligibilityMessage));
    expect(seen.size).toBe(ALL.length);
    for (const m of seen) expect(m.length).toBeGreaterThan(0);
  });

  it("never claims a driving-record or licence check", () => {
    // Checkr is not integrated. Copy that implies a driving-history check
    // is the exact class of claim the trust-and-safety rewrite removed.
    for (const m of ALL.map(rentalEligibilityMessage)) {
      expect(m).not.toMatch(/driving record|driving history|licen[cs]e check|DMV/i);
    }
    expect(rentalEligibilityOperatorMessage()).not.toMatch(
      /driving record|driving history|DMV/i,
    );
  });

  it("names the age floor in the under-age message", () => {
    expect(rentalEligibilityMessage("under_age")).toContain(
      String(RENTAL_MIN_AGE_YEARS),
    );
  });

  it("tells the operator nothing about the renter's identity state", () => {
    // The renter's dob, ID status and failures are theirs. An operator
    // needs to know they cannot approve yet and that it is not their
    // problem — the D6 instinct applied to identity.
    const m = rentalEligibilityOperatorMessage();
    expect(m).not.toMatch(/age|birth|\bID\b|identity check failed|too young/i);
    expect(m).toMatch(/nothing for you to do/i);
  });

  it("routes the two the renter can act on to the renter", () => {
    expect(eligibilityBlockOwner("identity_not_started")).toBe("renter");
    expect(eligibilityBlockOwner("under_age")).toBe("renter");
  });

  it("routes the rest to RYDA", () => {
    for (const r of ["identity_pending", "identity_failed", "no_dob_on_file", "bad_start_date"] as const) {
      expect(eligibilityBlockOwner(r)).toBe("ryda");
    }
  });
});

describe("the age floor is the RENTAL one", () => {
  it("is 25, not the co-ownership 28", () => {
    // src/lib/age.ts held 28 for LLC membership and was deleted with the
    // co-ownership strip. 28 was about who may own a share of a company;
    // 25 is about who an insurer will cover behind the wheel.
    expect(RENTAL_MIN_AGE_YEARS).toBe(25);
  });
});
