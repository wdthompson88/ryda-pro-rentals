// Reading operator fee terms off a request body.
//
// Every function under test decides what a live commercial term becomes
// from JSON that no browser had to produce. The admin UI is not the
// threat model here — /api/admin/partners is an API an integration can
// call directly, and the failures below are the silent ones: a value
// that is malformed in a way `Number()` turns into a legal-looking term.

import { describe, it, expect } from "vitest";
import {
  readCentsField,
  readCommissionRate,
  readEnumField,
} from "../partner-fee-body";
import {
  RENTAL_COMMISSION_RATE_MAX,
  RENTAL_FEE_CENTS_MAX,
  RENTAL_FEE_MODES,
} from "../fees";

describe("readCommissionRate", () => {
  it("reads a normal rate", () => {
    expect(readCommissionRate({ commission_rate: 0.15 })).toEqual({
      ok: true,
      provided: true,
      value: 0.15,
    });
    // camelCase for API-first callers.
    expect(readCommissionRate({ commissionRate: "0.2" })).toEqual({
      ok: true,
      provided: true,
      value: 0.2,
    });
  });

  it("treats absence as absence, not as 0%", () => {
    expect(readCommissionRate({})).toEqual({ ok: true, provided: false });
    expect(readCommissionRate({ commission_rate: null })).toEqual({
      ok: true,
      provided: false,
    });
  });

  it("does NOT read an empty string as a 0% commission", () => {
    // THE BUG. `Number('')` is 0, 0 is a legal rate, so
    // {"commission_rate": ""} used to pass every guard and write a
    // no-commission operator — RYDA then earned nothing on every future
    // booking of theirs, with no error anywhere to notice. Absence is
    // the only safe reading: the column is NOT NULL with a 0.150 default
    // and cannot be cleared, so nothing is written.
    const result = readCommissionRate({ commission_rate: "" });
    expect(result).toEqual({ ok: true, provided: false });
    expect(result.ok && result.provided).toBe(false);
  });

  it("refuses the other values Number() turns into 0 or 1", () => {
    for (const raw of [[], false, true, {}, [0.5]]) {
      const result = readCommissionRate({ commission_rate: raw });
      expect(result.ok, `${JSON.stringify(raw)} must not be accepted`).toBe(
        false,
      );
    }
    // ...and specifically never silently becomes a rate.
    const empty = readCommissionRate({ commission_rate: [] });
    expect(empty.ok).toBe(false);
    expect(!empty.ok && empty.error).toMatch(/commission_rate/);
  });

  it("refuses a rate outside the imported ceiling", () => {
    expect(readCommissionRate({ commission_rate: -0.01 }).ok).toBe(false);
    expect(
      readCommissionRate({ commission_rate: RENTAL_COMMISSION_RATE_MAX + 0.01 })
        .ok,
    ).toBe(false);
    // The typo the ceiling exists for: 15 where 0.15 belonged.
    expect(readCommissionRate({ commission_rate: 15 }).ok).toBe(false);
    // Both endpoints are legal values.
    expect(readCommissionRate({ commission_rate: 0 }).ok).toBe(true);
    expect(
      readCommissionRate({ commission_rate: RENTAL_COMMISSION_RATE_MAX }).ok,
    ).toBe(true);
  });

  it("refuses a rate finer than numeric(4,3) can store", () => {
    // 0.1575 clears every bound above; Postgres would store 0.158 and
    // every charge would then differ from the preview and the audit
    // entry that approved it — $315.00 quoted, $316.00 taken on the
    // $2,000 reference booking.
    const result = readCommissionRate({ commission_rate: 0.1575 });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/0\.158/);
    expect(readCommissionRate({ commission_rate: 0.1225 }).ok).toBe(false);
    // Three decimal places is the whole storable grid, and it passes.
    expect(readCommissionRate({ commission_rate: 0.157 }).ok).toBe(true);
  });
});

describe("readCentsField", () => {
  it("distinguishes absent / cleared / set", () => {
    expect(readCentsField({}, "fee_flat_cents", "feeFlatCents")).toEqual({
      ok: true,
      provided: false,
    });
    // Explicit null and "" both CLEAR — fee_flat_cents must be
    // clearable or leaving flat mode would be impossible.
    expect(
      readCentsField({ fee_flat_cents: null }, "fee_flat_cents", "feeFlatCents"),
    ).toEqual({ ok: true, provided: true, value: null });
    expect(
      readCentsField({ fee_flat_cents: "" }, "fee_flat_cents", "feeFlatCents"),
    ).toEqual({ ok: true, provided: true, value: null });
    expect(
      readCentsField({ fee_flat_cents: 25_000 }, "fee_flat_cents", "feeFlatCents"),
    ).toEqual({ ok: true, provided: true, value: 25_000 });
  });

  it("refuses non-integer and negative cents", () => {
    for (const raw of [250.5, -1, "abc", NaN]) {
      expect(
        readCentsField({ fee_floor_cents: raw }, "fee_floor_cents", "feeFloorCents")
          .ok,
      ).toBe(false);
    }
  });

  it("refuses an amount above the int4 column, by name", () => {
    // $25,000,000 typed into "Flat fee (USD)" is 2_500_000_000 cents:
    // a whole number, non-negative, and unwritable. Without this rail it
    // cleared the form, this reader and the fee engine and died on the
    // UPDATE as `value "2500000000" is out of range for type integer` —
    // a message no handler recognises, so it reached the admin as a raw
    // 500 rather than as a field-named 400.
    const result = readCentsField(
      { fee_flat_cents: 2_500_000_000 },
      "fee_flat_cents",
      "feeFlatCents",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/fee_flat_cents/);

    for (const field of ["fee_floor_cents", "fee_cap_cents"] as const) {
      expect(
        readCentsField({ [field]: RENTAL_FEE_CENTS_MAX + 1 }, field, field).ok,
      ).toBe(false);
    }
  });

  it("accepts the ceiling itself", () => {
    expect(
      readCentsField(
        { fee_cap_cents: RENTAL_FEE_CENTS_MAX },
        "fee_cap_cents",
        "feeCapCents",
      ),
    ).toEqual({ ok: true, provided: true, value: RENTAL_FEE_CENTS_MAX });
  });
});

describe("readEnumField", () => {
  it("accepts a listed value and refuses anything else", () => {
    expect(
      readEnumField({ fee_mode: "flat" }, "fee_mode", "feeMode", RENTAL_FEE_MODES),
    ).toEqual({ ok: true, provided: true, value: "flat" });
    expect(
      readEnumField(
        { fee_mode: "percentage" },
        "fee_mode",
        "feeMode",
        RENTAL_FEE_MODES,
      ).ok,
    ).toBe(false);
    expect(
      readEnumField({}, "fee_mode", "feeMode", RENTAL_FEE_MODES),
    ).toEqual({ ok: true, provided: false });
  });
});
