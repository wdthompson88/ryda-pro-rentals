// The admin operator-terms form, as arithmetic.
//
// parseFeeForm produces the config the preview computes from AND the
// body the POST sends, from one pass. So its output IS the claim "what
// the admin was shown is what the server was asked to store" — and the
// $1,500-vs-5% incident in fees.ts's header is what happens when that
// claim goes untested.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  BLANK_FEE_FORM,
  centsFromDollars,
  parseFeeForm,
  pctFromRate,
  type FeeFormState,
} from "../partner-fee-form";
import {
  RENTAL_FEE_CENTS_MAX,
  RENTAL_FEE_EXAMPLE_BASE_CENTS,
  computeRentalFee,
} from "../fees";

function form(patch: Partial<FeeFormState> = {}): FeeFormState {
  return { ...BLANK_FEE_FORM, ...patch };
}

describe("the config and the payload describe the same terms", () => {
  it("a flat renter-pays operator, end to end", () => {
    const parsed = parseFeeForm(
      form({ mode: "flat", flat: "250", payer: "renter" }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.payload).toEqual({
      commission_rate: 0.15,
      fee_mode: "flat",
      fee_flat_cents: 25_000,
      fee_payer: "renter",
      fee_floor_cents: null,
      fee_cap_cents: null,
    });
    const preview = computeRentalFee(
      RENTAL_FEE_EXAMPLE_BASE_CENTS,
      parsed.config,
    );
    expect(preview.renterTotalCents).toBe(225_000);
    expect(preview.operatorNetCents).toBe(200_000);
    expect(preview.feeCents).toBe(25_000);
  });

  it("clears the flat amount when leaving flat mode", () => {
    // 0048's coherence CHECK forbids a percent row from carrying a flat
    // fee, so the row always answers "which number is live?".
    const parsed = parseFeeForm(form({ mode: "percent", flat: "250" }));
    expect(parsed.ok && parsed.payload.fee_flat_cents).toBeNull();
    expect(parsed.ok && parsed.config.flatCents).toBeUndefined();
  });
});

describe("the commission rate the form produces is the one that gets stored", () => {
  it("refuses a rate finer than the column, naming what it would become", () => {
    // 15.75% previews as $315.00 on the worked example and is stored as
    // 0.158, so the charge is $316.00 — the preview-vs-charge split the
    // whole single-source rule exists to prevent, arriving through the
    // storage scale rather than through a second copy of the math.
    const parsed = parseFeeForm(form({ pct: "15.75" }));
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toMatch(/15\.8%/);
    expect(parseFeeForm(form({ pct: "12.25" })).ok).toBe(false);
  });

  it("accepts every one-decimal percent, noise and all", () => {
    // pct / 100 is not exact in binary — 0.7 / 100 is
    // 0.006999999999999999 — so a naive storability check would refuse a
    // quarter of all legitimate rates.
    for (let tenths = 0; tenths <= 750; tenths++) {
      const pct = tenths / 10;
      const parsed = parseFeeForm(form({ pct: String(pct) }));
      expect(parsed.ok, `${pct}% must be saveable`).toBe(true);
      if (!parsed.ok) continue;
      // Stored at the column's scale, so the preview and the row agree
      // exactly rather than to within float noise.
      expect(Number(parsed.payload.commission_rate.toFixed(3))).toBe(
        parsed.payload.commission_rate,
      );
      expect(pctFromRate(parsed.payload.commission_rate)).toBeCloseTo(pct, 9);
    }
  });

  it("still requires the rate explicitly rather than reading '' as 0%", () => {
    expect(parseFeeForm(form({ pct: "" })).ok).toBe(false);
    expect(parseFeeForm(form({ pct: "0" })).ok).toBe(true);
  });

  it("requires it in FLAT mode too — which is why the field must render there", () => {
    // commission_rate is NOT NULL on partners and keeps its value while
    // an operator is on flat terms, so the rate is still a live term and
    // is still required. The bug this pins: FeeTermsFields used to
    // render the Commission % input only in percent mode, so clearing
    // the rate and switching to flat produced "Commission % is
    // required" naming a field that was not on screen — a save the admin
    // could not unblock without switching modes back and forth.
    const blanked = parseFeeForm(form({ pct: "", mode: "flat", flat: "250" }));
    expect(blanked.ok).toBe(false);
    expect(!blanked.ok && blanked.error).toMatch(/Commission % is required/);
  });
});

describe("the cents fields", () => {
  it("cross the x100 boundary once, with Math.round", () => {
    expect(centsFromDollars("250")).toBe(25_000);
    expect(centsFromDollars("250.00")).toBe(25_000);
    expect(centsFromDollars("0.015")).toBe(2); // 1.5 → 2, half away from zero
    expect(centsFromDollars("")).toBeNull();
    expect(centsFromDollars("-1")).toBe("invalid");
    expect(centsFromDollars("abc")).toBe("invalid");
  });

  it("refuses an amount the int4 column cannot hold", () => {
    // $25,000,000 in "Flat fee (USD)" — the input has no max, and past
    // this point the save died as an opaque Postgres range error.
    const parsed = parseFeeForm(
      form({ mode: "flat", flat: "25000000", payer: "renter" }),
    );
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toMatch(/Flat fee/);

    for (const [field, label] of [
      ["floor", "Minimum fee"],
      ["cap", "Maximum fee"],
    ] as const) {
      const result = parseFeeForm(
        form({ [field]: String(RENTAL_FEE_CENTS_MAX / 100 + 1) }),
      );
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toContain(label);
    }
  });

  it("refuses a floor above the cap before the engine has to", () => {
    const parsed = parseFeeForm(form({ floor: "500", cap: "25" }));
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toMatch(/Minimum fee/);
  });
});

// ── the rendering half ──────────────────────────────────────────────
//
// parseFeeForm's rules are only reachable if the fields they name are on
// screen. That is a JSX fact, so it is asserted on the source — the same
// technique rental-fee-config.test.ts uses on the SQL, for the same
// reason: nothing else relates a validation message to a rendered input.

const PAGE_SRC = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../app/admin/partners/page.tsx",
  ),
  "utf8",
);

/** The body of FeeTermsFields — the editor both the add form and the
 *  row editor render. */
const FEE_FIELDS_SRC = (() => {
  const start = PAGE_SRC.indexOf("function FeeTermsFields(");
  const end = PAGE_SRC.indexOf("function PreviewLine(");
  expect(start, "FeeTermsFields must exist").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return PAGE_SRC.slice(start, end);
})();

describe("every field parseFeeForm can blame is reachable", () => {
  it("renders Commission % in both modes", () => {
    expect(FEE_FIELDS_SRC).toContain("Commission %");
    // The regression: `value.mode === "percent" ? (<Commission/>) :
    // (<Flat/>)` made the rate un-editable in flat mode, so the
    // required-rate error named a field the admin could not see.
    expect(
      FEE_FIELDS_SRC,
      'the Commission % input must not be behind a `mode === "percent"` branch',
    ).not.toContain('value.mode === "percent" ? (');
  });

  it("renders the flat amount only in flat mode", () => {
    // The other direction still holds: a percent row must not carry a
    // flat fee (0048's coherence CHECK), so the input stays mode-gated.
    expect(FEE_FIELDS_SRC).toContain("Flat fee (USD)");
    expect(FEE_FIELDS_SRC).toContain('value.mode === "flat" && (');
  });

  it("steps the commission input at the granularity the column stores", () => {
    // step="0.5" advertised a coarser grid than the form accepts and a
    // finer one than the column holds; 0.1% is both.
    expect(PAGE_SRC).not.toContain('step="0.5"');
    expect(PAGE_SRC).toContain('step="0.1"');
  });
});
