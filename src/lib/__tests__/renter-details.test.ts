// Tests for the renter-details rule (renter-details.ts).
//
// Two things carry consequence: the same validator runs in the confirm
// dialog and in POST /api/rental-bookings, so its verdicts are what
// "you must fill in your details to request" actually means; and the
// age check measures at PICKUP, mirroring rental-eligibility.ts — the
// birthday-on-pickup-day case is the one that decides it.

import { describe, expect, it } from "vitest";
import {
  EMPTY_RENTER_DETAILS,
  isoToDob,
  validateRenterDetails,
} from "../renter-details";
import { RENTAL_MIN_AGE_YEARS } from "../rental-eligibility";

const PICKUP = "2026-09-10";
const ok = {
  fullName: "David Thompson",
  phone: "+1 305 555 0145",
  dateOfBirth: "1990-04-02",
};

describe("isoToDob", () => {
  it("splits a calendar day", () => {
    expect(isoToDob("1990-04-02")).toEqual({ year: 1990, month: 4, day: 2 });
    expect(isoToDob(" 1990-04-02 ")).toEqual({ year: 1990, month: 4, day: 2 });
  });
  it("rejects anything that is not YYYY-MM-DD", () => {
    expect(isoToDob("")).toBeNull();
    expect(isoToDob("04/02/1990")).toBeNull();
    expect(isoToDob("1990-4-2")).toBeNull();
  });
});

describe("validateRenterDetails", () => {
  it("accepts a complete, eligible renter", () => {
    expect(validateRenterDetails(ok, PICKUP)).toBeNull();
  });

  it("asks for the name first, then the phone, then the date of birth", () => {
    expect(validateRenterDetails(EMPTY_RENTER_DETAILS, PICKUP)).toMatchObject({
      field: "fullName",
      kind: "missing",
    });
    expect(
      validateRenterDetails({ ...EMPTY_RENTER_DETAILS, fullName: "D" }, PICKUP),
    ).toMatchObject({ field: "fullName", kind: "missing" });
    expect(
      validateRenterDetails({ ...ok, phone: "" }, PICKUP),
    ).toMatchObject({ field: "phone", kind: "missing" });
    expect(
      validateRenterDetails({ ...ok, phone: "305-55" }, PICKUP),
    ).toMatchObject({ field: "phone", kind: "missing" });
    expect(
      validateRenterDetails({ ...ok, dateOfBirth: "" }, PICKUP),
    ).toMatchObject({ field: "dateOfBirth", kind: "missing" });
  });

  it("counts digits, not formatting, for the phone", () => {
    expect(validateRenterDetails({ ...ok, phone: "(305) 555-0145" }, PICKUP)).toBeNull();
    expect(validateRenterDetails({ ...ok, phone: "3055550" }, PICKUP)).toBeNull();
  });

  it("flags an impossible or future date of birth as 'check the date', not under-age", () => {
    expect(
      validateRenterDetails({ ...ok, dateOfBirth: "1990-02-30" }, PICKUP),
    ).toMatchObject({ field: "dateOfBirth", kind: "invalid" });
    expect(
      validateRenterDetails({ ...ok, dateOfBirth: "2027-01-01" }, PICKUP),
    ).toMatchObject({ field: "dateOfBirth", kind: "invalid" });
  });

  it("measures age at the pickup date, and the birthday itself counts", () => {
    // Turns 25 exactly on pickup day → eligible.
    const onTheDay = `${2026 - RENTAL_MIN_AGE_YEARS}-09-10`;
    expect(validateRenterDetails({ ...ok, dateOfBirth: onTheDay }, PICKUP)).toBeNull();
    // Turns 25 the day after pickup → not yet.
    const dayAfter = `${2026 - RENTAL_MIN_AGE_YEARS}-09-11`;
    expect(
      validateRenterDetails({ ...ok, dateOfBirth: dayAfter }, PICKUP),
    ).toMatchObject({ field: "dateOfBirth", kind: "under_age" });
    // Same renter, a trip a day later → eligible for THAT trip.
    expect(
      validateRenterDetails({ ...ok, dateOfBirth: dayAfter }, "2026-09-11"),
    ).toBeNull();
  });

  it("uses the shared under-age sentence so both sides of the wire agree", () => {
    const p = validateRenterDetails({ ...ok, dateOfBirth: "2010-01-01" }, PICKUP);
    expect(p?.kind).toBe("under_age");
    expect(p?.message).toContain(String(RENTAL_MIN_AGE_YEARS));
    expect(p?.message).toMatch(/pickup date/);
  });
});
