// The operator fee-terms FORM, as pure functions (decision D2 /
// migration 0048).
//
// Lifted out of src/app/admin/partners/page.tsx so it can be unit
// tested. Same reason partner-resolution.ts is free of Supabase: the
// rule this module encodes decides what a live commercial term becomes,
// and "render a client component and click things" is not a way to
// assert money math. Nothing here imports React or the browser.
//
// TWO RULES GOVERN THIS MODULE.
//
// 1. It never computes a fee. parseFeeForm produces the CONFIG that
//    computeRentalFee is then called with — the same function the server
//    charges with — and the POST body, from ONE pass, so the preview and
//    the row can never describe different terms. fees.ts's header
//    records why this matters: a client preview and a server charge that
//    each derived "the fee" their own way once disagreed by $13,500 on a
//    single share.
//
// 2. Dollars on screen, CENTS on the wire — and this module is the only
//    place the x100 crossing happens.

import {
  RENTAL_COMMISSION_RATE_DEFAULT,
  RENTAL_COMMISSION_RATE_MAX,
  RENTAL_FEE_CENTS_MAX,
  isStorableCommissionRate,
  storedCommissionRate,
  type RentalFeeConfig,
  type RentalFeeMode,
  type RentalFeePayer,
} from "@/lib/fees";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function usd(cents: number): string {
  return USD.format(cents / 100);
}

/** Rate → percent number without float noise (0.15 * 100 is
 *  15.000000000000002). */
export function pctFromRate(rate: number): number {
  return Math.round(rate * 10000) / 100;
}

export const MAX_PCT = pctFromRate(RENTAL_COMMISSION_RATE_MAX);

export type FeeFormState = {
  /** commission as a percent STRING, e.g. "15" */
  pct: string;
  mode: RentalFeeMode;
  /** dollar strings; "" means "not set" */
  flat: string;
  payer: RentalFeePayer;
  floor: string;
  cap: string;
};

export function dollarsFromCents(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : String(cents / 100);
}

export const BLANK_FEE_FORM: FeeFormState = {
  pct: String(pctFromRate(RENTAL_COMMISSION_RATE_DEFAULT)),
  mode: "percent",
  flat: "",
  payer: "operator",
  floor: "",
  cap: "",
};

/** "" → null (field cleared); a bad number → "invalid"; otherwise
 *  integer cents. Same Math.round(Number(x) * 100) crossing the
 *  payment-link form uses, kept in one function here. */
export function centsFromDollars(input: string): number | null | "invalid" {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100);
}

/** The POST body's fee half. Keys deliberately match the `partners`
 *  column names AND the admin page's Partner type, so `{ ...partner,
 *  ...payload }` is the row as it will be — which is what the confirm
 *  modal describes. */
export type FeePayload = {
  commission_rate: number;
  fee_mode: RentalFeeMode;
  fee_flat_cents: number | null;
  fee_payer: RentalFeePayer;
  fee_floor_cents: number | null;
  fee_cap_cents: number | null;
};

export type FeeFormParse =
  | { ok: true; config: RentalFeeConfig; payload: FeePayload }
  | { ok: false; error: string };

/**
 * Validate the form and produce BOTH the config the preview computes
 * from and the body the POST sends — from one pass, so they can never
 * describe different terms.
 *
 * The messages here are friendlier duplicates of rules the server and
 * migration 0048 also enforce. That duplication is deliberate and it is
 * bounded: the BOUNDS themselves are imported (RENTAL_COMMISSION_RATE_MAX,
 * RENTAL_FEE_CENTS_MAX, the storage scale via isStorableCommissionRate),
 * and every rule that involves arithmetic is delegated to
 * computeRentalFee rather than restated.
 */
export function parseFeeForm(s: FeeFormState): FeeFormParse {
  // An emptied input coerces to Number('') === 0, which would silently
  // save a 0%-commission operator. Require the value explicitly —
  // typing 0 on purpose still works.
  //
  // Required in BOTH modes, because commission_rate is NOT NULL on
  // partners and keeps its value while an operator is on flat terms.
  // That is why FeeTermsFields renders the Commission % input in both
  // modes: it used to render it only in percent mode, and a blank rate
  // plus a flip to flat produced an error naming a field that was not on
  // screen — unfixable without switching modes back and forth.
  if (!s.pct.trim()) {
    return {
      ok: false,
      error:
        "Commission % is required — enter 0 explicitly for a no-commission operator.",
    };
  }
  const typedRate = Number(s.pct) / 100;
  if (
    !Number.isFinite(typedRate) ||
    typedRate < 0 ||
    typedRate > RENTAL_COMMISSION_RATE_MAX
  ) {
    return { ok: false, error: `Commission must be between 0 and ${MAX_PCT}%.` };
  }
  // The rate must survive partners.commission_rate, which is
  // numeric(4,3) — one decimal place on the percent. 15.75% clears every
  // bound above and previews as $315.00 on the worked example, then
  // Postgres stores 0.158 and every charge is $316.00. Refuse it here,
  // where the admin can see the number they typed, rather than let the
  // preview and the money diverge silently.
  if (!isStorableCommissionRate(typedRate)) {
    return {
      ok: false,
      error: `Commission % supports one decimal place (0.1% steps) — ${pctFromRate(
        typedRate,
      )}% would be stored as ${pctFromRate(
        storedCommissionRate(typedRate),
      )}% and charged at that instead.`,
    };
  }
  // Snapped to the storage scale, which at this point removes binary
  // noise rather than precision (0.7 / 100 is 0.006999999999999999).
  // The preview, the confirm modal and the POST body then all carry the
  // exact value the column will hold, so no rounding boundary can land
  // one side of the deal on a different cent from the other.
  const rate = storedCommissionRate(typedRate);

  const flat = centsFromDollars(s.flat);
  if (flat === "invalid") {
    return { ok: false, error: "Flat fee: enter a dollar amount, e.g. 250 or 250.00." };
  }
  if (s.mode === "flat" && flat === null) {
    return {
      ok: false,
      error: "Flat fee is required in flat mode — enter 0 explicitly for a no-fee operator.",
    };
  }

  const floor = centsFromDollars(s.floor);
  if (floor === "invalid") {
    return { ok: false, error: "Minimum fee: enter a dollar amount or leave it blank." };
  }
  const cap = centsFromDollars(s.cap);
  if (cap === "invalid") {
    return { ok: false, error: "Maximum fee: enter a dollar amount or leave it blank." };
  }
  // The cents columns are int4 (0048). Above that the save dies as an
  // opaque Postgres range error, so name the field here instead.
  for (const [label, cents] of [
    ["Flat fee", flat],
    ["Minimum fee", floor],
    ["Maximum fee", cap],
  ] as const) {
    if (cents !== null && cents > RENTAL_FEE_CENTS_MAX) {
      return {
        ok: false,
        error: `${label}: ${usd(RENTAL_FEE_CENTS_MAX)} is the maximum this field can store.`,
      };
    }
  }
  if (floor !== null && cap !== null && floor > cap) {
    return {
      ok: false,
      error: `Minimum fee (${usd(floor)}) cannot be above the maximum (${usd(cap)}).`,
    };
  }

  return {
    ok: true,
    config: {
      mode: s.mode,
      rate,
      payer: s.payer,
      ...(s.mode === "flat" ? { flatCents: flat as number } : {}),
      ...(floor !== null ? { floorCents: floor } : {}),
      ...(cap !== null ? { capCents: cap } : {}),
    },
    payload: {
      commission_rate: rate,
      fee_mode: s.mode,
      // null CLEARS the column. Required when leaving flat mode: 0048's
      // coherence CHECK forbids a percent row from carrying a flat
      // amount, precisely so the row always answers "which number is
      // live?" without a second lookup.
      fee_flat_cents: s.mode === "flat" ? flat : null,
      fee_payer: s.payer,
      fee_floor_cents: floor,
      fee_cap_cents: cap,
    },
  };
}
