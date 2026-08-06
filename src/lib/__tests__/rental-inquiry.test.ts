// rental-inquiry validation tests — pins the exact predicate the
// /api/rental-inquiry route uses (imported from lib, not duplicated
// in-test, same reasoning as csp-report-validation.test.ts).
//
// `now` is injected everywhere so date-boundary assertions can't race
// the wall clock (the rate-limit suite learned that lesson the flaky
// way). Fixed reference: 2026-08-06 UTC.

import { describe, it, expect } from "vitest";
import {
  validateRentalInquiry,
  resolveRentalVehicle,
  type RentalInquiry,
} from "../rental-inquiry";
import type { Vehicle } from "../market-data";

const NOW = new Date("2026-08-06T15:00:00Z");

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Ava Renter",
    email: "Ava@Example.com",
    vehicleSlug: "lamborghini-huracan-evo",
    startDate: "2026-08-10",
    endDate: "2026-08-12",
    marketingOptIn: false,
    clientToken: "tok-abc123",
    ...overrides,
  };
}

function expectOk(input: Record<string, unknown>): RentalInquiry {
  const res = validateRentalInquiry(input, NOW);
  expect(res.ok).toBe(true);
  if (!res.ok) throw new Error(res.error); // narrow for TS
  return res.value;
}

function expectError(input: Record<string, unknown>): string {
  const res = validateRentalInquiry(input, NOW);
  expect(res.ok).toBe(false);
  if (res.ok) throw new Error("expected validation failure");
  return res.error;
}

describe("validateRentalInquiry — happy paths", () => {
  it("accepts a partner-fleet inquiry and resolves attribution", () => {
    const v = expectOk(body());
    expect(v.fleet).toBe("partner");
    expect(v.vehicleSlug).toBe("lamborghini-huracan-evo");
    expect(v.vehicleLabel).toBe("Lamborghini Huracán EVO");
    // Ops attribution present on the row — the route keeps it out of
    // every customer-facing surface.
    expect(v.partnerName).toBe("GM LUXE");
    expect(v.email).toBe("ava@example.com"); // normalized lowercase
  });

  it("accepts a RYDA-fleet symbol case-insensitively", () => {
    const v = expectOk(body({ vehicleSlug: "gt3" }));
    expect(v.fleet).toBe("ryda");
    expect(v.vehicleSlug).toBe("GT3"); // canonical symbol, not raw input
    expect(v.vehicleLabel).toBe("Porsche 911 GT3 RS");
    expect(v.partnerName).toBeNull();
  });

  it("accepts a single-day rental (end == start)", () => {
    const v = expectOk(body({ startDate: "2026-08-10", endDate: "2026-08-10" }));
    expect(v.startDate).toBe("2026-08-10");
    expect(v.endDate).toBe("2026-08-10");
  });

  it("normalizes optional fields to null when absent", () => {
    const v = expectOk(body({ phone: "", message: "   ", clientToken: "" }));
    expect(v.phone).toBeNull();
    expect(v.message).toBeNull();
    // Missing token = no dedupe, but still a valid lead (never lose a
    // lead beats strict idempotency).
    expect(v.clientToken).toBeNull();
  });

  it("caps message at 5000 chars and phone at 32", () => {
    const v = expectOk(body({ message: "x".repeat(6000), phone: "5".repeat(40) }));
    expect(v.message).toHaveLength(5000);
    expect(v.phone).toHaveLength(32);
  });
});

describe("validateRentalInquiry — identity fields", () => {
  it("rejects empty and whitespace-only names", () => {
    expect(expectError(body({ name: "" }))).toMatch(/name/i);
    expect(expectError(body({ name: "   " }))).toMatch(/name/i);
  });

  it("rejects emails without @", () => {
    expect(expectError(body({ email: "not-an-email" }))).toMatch(/email/i);
    expect(expectError(body({ email: "" }))).toMatch(/email/i);
  });

  it("treats marketingOptIn as consent only when strictly true", () => {
    expect(expectOk(body({ marketingOptIn: true })).marketingOptIn).toBe(true);
    // "true", 1, undefined are NOT consent.
    expect(expectOk(body({ marketingOptIn: "true" })).marketingOptIn).toBe(false);
    expect(expectOk(body({ marketingOptIn: 1 })).marketingOptIn).toBe(false);
    expect(expectOk(body({ marketingOptIn: undefined })).marketingOptIn).toBe(false);
  });

  it("rejects non-object bodies", () => {
    expect(validateRentalInquiry(null, NOW).ok).toBe(false);
    expect(validateRentalInquiry("hi", NOW).ok).toBe(false);
    expect(validateRentalInquiry(42, NOW).ok).toBe(false);
  });
});

describe("validateRentalInquiry — dates", () => {
  it.each([
    ["08/10/2026", "US format"],
    ["2026-8-10", "unpadded month"],
    ["2026-02-31", "rollover date (Feb 31 → Mar 3)"],
    ["", "empty"],
    ["not-a-date", "garbage"],
  ])("rejects startDate %s (%s)", (startDate) => {
    expect(expectError(body({ startDate }))).toMatch(/date/i);
  });

  it("rejects end before start", () => {
    expect(
      expectError(body({ startDate: "2026-08-12", endDate: "2026-08-10" })),
    ).toMatch(/end date/i);
  });

  it("accepts a span of exactly 30 days, rejects 31", () => {
    expectOk(body({ startDate: "2026-08-10", endDate: "2026-09-09" })); // +30d
    expect(
      expectError(body({ startDate: "2026-08-10", endDate: "2026-09-10" })), // +31d
    ).toMatch(/30 days/i);
  });

  it("accepts today and — UTC tolerance — yesterday, rejects two days back", () => {
    // Miami evenings are already "tomorrow" in UTC, so a start date one
    // day behind the server's UTC date is a legitimate same-day request.
    expectOk(body({ startDate: "2026-08-06", endDate: "2026-08-08" }));
    expectOk(body({ startDate: "2026-08-05", endDate: "2026-08-08" }));
    expect(
      expectError(body({ startDate: "2026-08-04", endDate: "2026-08-08" })),
    ).toMatch(/past/i);
  });
});

describe("resolveRentalVehicle", () => {
  it("rejects unknown slugs", () => {
    expect(resolveRentalVehicle("bugatti-chiron")).toBeNull();
    expect(resolveRentalVehicle("")).toBeNull();
    expect(expectError(body({ vehicleSlug: "bugatti-chiron" }))).toMatch(/vehicle/i);
  });

  it("skips RYDA vehicles not flagged rentalAvailable", () => {
    // Every current VEHICLES entry has rentalAvailable: true, so the
    // gate is exercised through the injectable list — that keeps this
    // pinned even after fleet data changes.
    const noRental = {
      symbol: "TEST",
      name: "Test Car",
      rentalAvailable: false,
    } as unknown as Vehicle;
    const forRental = { ...noRental, rentalAvailable: true } as Vehicle;
    expect(resolveRentalVehicle("test", [], [noRental])).toBeNull();
    expect(resolveRentalVehicle("test", [], [forRental])).toMatchObject({
      fleet: "ryda",
      vehicleSlug: "TEST",
      partnerName: null,
    });
  });
});
