// Tests for pickup and return (build loop 4C, migration 0053).
//
// A handover is the evidence behind a state change money depends on:
// `completed` is decidePayout()'s first check and what releases the
// deposit hold. So the two things this suite protects are the readings
// (which cannot be reconstructed after the car has gone) and the
// ORDERING (a return that precedes a checkin would complete a booking
// whose car was never handed over).
//
// The drift guard matters as much as it does for the status modules:
// 0053's trigger is the authority on which transition each type drives,
// and HANDOVER_TRANSITION mirrors it. If they diverge, the route refuses
// something the database allows or attempts something it forbids.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  HANDOVER_NOTES_MAX,
  HANDOVER_PHOTOS_MAX,
  HANDOVER_TRANSITION,
  ODOMETER_MAX_MILES,
  RENTAL_HANDOVER_TYPES,
  checkHandoverAllowed,
  handoverBlockMessage,
  handoverRejectionMessage,
  milesDriven,
  parseHandover,
  type HandoverRejection,
} from "../rental-handover";

const MIGRATION_SQL = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../supabase/migrations/0053_rental_handovers.sql",
  ),
  "utf8",
).replace(/--[^\n]*/g, "");

const body = (over: Record<string, unknown> = {}) => ({
  type: "checkin",
  odometerMiles: 12_345,
  fuelLevelPct: 80,
  ...over,
});

describe("0053 is readable (guards the parser)", () => {
  it("found the migration", () => {
    expect(MIGRATION_SQL).toContain("public.rental_handovers");
    expect(MIGRATION_SQL).toContain("rental_handovers_advance_booking");
  });
});

describe("the transition map mirrors the trigger", () => {
  it("drives checkin → in_progress from confirmed", () => {
    expect(HANDOVER_TRANSITION.checkin).toEqual({
      from: "confirmed",
      to: "in_progress",
    });
    // The SQL says the same thing.
    expect(MIGRATION_SQL).toMatch(
      /new\.type = 'checkin'[\s\S]*?current_status <> 'confirmed'/,
    );
    expect(MIGRATION_SQL).toMatch(
      /new\.type = 'checkin'[\s\S]*?set status = 'in_progress'/,
    );
  });

  it("drives return → completed from in_progress", () => {
    expect(HANDOVER_TRANSITION.return).toEqual({
      from: "in_progress",
      to: "completed",
    });
    expect(MIGRATION_SQL).toMatch(
      /new\.type = 'return'[\s\S]*?current_status <> 'in_progress'/,
    );
    expect(MIGRATION_SQL).toMatch(
      /new\.type = 'return'[\s\S]*?set status = 'completed'/,
    );
  });

  it("declares exactly the two types the CHECK allows", () => {
    const m = MIGRATION_SQL.match(/check \(type in \(([^)]*)\)\)/i);
    expect(m).not.toBeNull();
    const sqlTypes = [...(m?.[1] ?? "").matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
    expect(sqlTypes.sort()).toEqual([...RENTAL_HANDOVER_TYPES].sort());
  });

  it("takes a row lock before reading the status", () => {
    // Without `for update`, two concurrent handovers could both read
    // 'confirmed' and both attempt the transition.
    expect(MIGRATION_SQL).toMatch(/select status into current_status[\s\S]*?for update/i);
  });

  it("keeps readings write-once and signatures one-directional", () => {
    expect(MIGRATION_SQL).toMatch(/readings are write-once/i);
    expect(MIGRATION_SQL).toMatch(/a signature cannot be withdrawn/i);
  });

  it("allows one checkin and one return per booking", () => {
    expect(MIGRATION_SQL).toMatch(
      /unique index[\s\S]*?rental_handovers_one_per_type[\s\S]*?\(booking_id, type\)/i,
    );
  });
});

describe("parseHandover", () => {
  it("accepts a well-formed checkin", () => {
    const r = parseHandover(body());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input).toEqual({
        type: "checkin",
        odometerMiles: 12_345,
        fuelLevelPct: 80,
        conditionNotes: null,
        photoPaths: [],
      });
    }
  });

  it("trims notes and treats blank as absent", () => {
    expect(parseHandover(body({ conditionNotes: "   " })).ok).toBe(true);
    const r = parseHandover(body({ conditionNotes: "  scuff on the door  " }));
    if (r.ok) expect(r.input.conditionNotes).toBe("scuff on the door");
  });

  it.each([
    ["a missing type", { type: undefined }, "bad_type"],
    ["an unknown type", { type: "inspection" }, "bad_type"],
    ["a negative odometer", { odometerMiles: -1 }, "bad_odometer"],
    ["a fractional odometer", { odometerMiles: 1.5 }, "bad_odometer"],
    ["a string odometer", { odometerMiles: "12345" }, "bad_odometer"],
    ["an absurd odometer", { odometerMiles: ODOMETER_MAX_MILES + 1 }, "bad_odometer"],
    ["fuel over 100", { fuelLevelPct: 101 }, "bad_fuel"],
    ["negative fuel", { fuelLevelPct: -1 }, "bad_fuel"],
    ["fractional fuel", { fuelLevelPct: 12.5 }, "bad_fuel"],
  ])("rejects %s", (_label, over, reason) => {
    expect(parseHandover(body(over))).toEqual({ ok: false, reason });
  });

  it("accepts the boundary values", () => {
    expect(parseHandover(body({ odometerMiles: 0, fuelLevelPct: 0 })).ok).toBe(true);
    expect(parseHandover(body({ fuelLevelPct: 100 })).ok).toBe(true);
  });

  it("rejects notes past the column's length check", () => {
    expect(
      parseHandover(body({ conditionNotes: "x".repeat(HANDOVER_NOTES_MAX + 1) })),
    ).toEqual({ ok: false, reason: "notes_too_long" });
  });

  it("rejects too many photos", () => {
    const paths = Array.from({ length: HANDOVER_PHOTOS_MAX + 1 }, (_, i) => `a/b/${i}.jpg`);
    expect(parseHandover(body({ photoPaths: paths }))).toEqual({
      ok: false,
      reason: "too_many_photos",
    });
  });

  it.each([
    ["a URL", "https://evil.example/x.jpg"],
    ["a traversal", "a/../../etc/passwd"],
    ["an absolute path", "/etc/passwd"],
    ["a non-string", 42],
  ])("rejects %s as a photo path", (_label, p) => {
    expect(parseHandover(body({ photoPaths: [p] }))).toEqual({
      ok: false,
      reason: "bad_photo_path",
    });
  });

  it("survives a null body", () => {
    expect(parseHandover(null).ok).toBe(false);
  });

  it("gives every rejection a distinct message", () => {
    const all: HandoverRejection[] = [
      "bad_type", "bad_odometer", "bad_fuel",
      "notes_too_long", "too_many_photos", "bad_photo_path",
    ];
    const seen = new Set(all.map(handoverRejectionMessage));
    expect(seen.size).toBe(all.length);
  });
});

describe("checkHandoverAllowed — the ordering rule", () => {
  it("allows a checkin on a confirmed booking", () => {
    expect(checkHandoverAllowed("checkin", "confirmed")).toEqual({ ok: true });
  });

  it("allows a return once the car is out", () => {
    expect(checkHandoverAllowed("return", "in_progress")).toEqual({ ok: true });
  });

  it("names the ACTIONABLE problem when a return precedes a checkin", () => {
    // The mistake an operator actually makes. "expected in_progress" does
    // not tell them to go and check the car out first.
    const r = checkHandoverAllowed("return", "confirmed");
    expect(r).toEqual({ ok: false, reason: "return_before_checkin" });
    expect(handoverBlockMessage("return_before_checkin", "confirmed")).toMatch(
      /check the car out first/i,
    );
  });

  it.each(["requested", "declined", "expired", "cancelled", "completed"] as const)(
    "refuses a checkin on a %s booking",
    (status) => {
      expect(checkHandoverAllowed("checkin", status)).toEqual({
        ok: false,
        reason: "wrong_status_checkin",
      });
    },
  );

  it("refuses a second checkin", () => {
    expect(checkHandoverAllowed("checkin", "confirmed", ["checkin"])).toEqual({
      ok: false,
      reason: "already_recorded",
    });
  });

  it("refuses a second return", () => {
    expect(checkHandoverAllowed("return", "in_progress", ["return"])).toEqual({
      ok: false,
      reason: "already_recorded",
    });
  });

  it("reports already_recorded ahead of a status problem", () => {
    // A duplicate is the more specific truth; telling someone the status
    // is wrong when the real answer is "you already did this" sends them
    // looking for a state bug.
    expect(
      checkHandoverAllowed("checkin", "completed", ["checkin", "return"]),
    ).toEqual({ ok: false, reason: "already_recorded" });
  });

  it("allows a return when a checkin already exists", () => {
    expect(checkHandoverAllowed("return", "in_progress", ["checkin"])).toEqual({
      ok: true,
    });
  });
});

describe("milesDriven", () => {
  it("subtracts the readings", () => {
    expect(milesDriven(12_000, 12_450)).toBe(450);
  });

  it("returns null with no baseline, rather than zero", () => {
    // "We have no baseline" and "the car did not move" are different
    // facts, and only one belongs on an overage charge.
    expect(milesDriven(null, 12_450)).toBeNull();
    expect(milesDriven(undefined, 12_450)).toBeNull();
    expect(milesDriven(12_000, null)).toBeNull();
  });

  it("returns a negative difference rather than clamping it", () => {
    // A backwards odometer is a misread, a swapped car or a tampered
    // cluster — all of which a human needs to see.
    expect(milesDriven(12_450, 12_000)).toBe(-450);
  });

  it("returns zero when the car genuinely did not move", () => {
    expect(milesDriven(12_000, 12_000)).toBe(0);
  });
});
