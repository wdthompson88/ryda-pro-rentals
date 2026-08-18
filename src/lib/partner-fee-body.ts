// Reading operator fee terms off a REQUEST BODY (decision D2 /
// migration 0048).
//
// Lifted out of src/app/api/admin/partners/route.ts so it can be unit
// tested: every function here decides what a live commercial term
// becomes from attacker- or integration-supplied JSON, and the failures
// they exist to prevent are silent ones — a 0% commission written from
// an empty string, a flat fee that only fails once it reaches Postgres.
// Free of next/server and Supabase on purpose.
//
// THE COERCION RULE, which every reader below follows: a value that is
// not the right SHAPE is refused by name, never coerced. `Number()` is
// the trap — Number('') and Number([]) and Number(false) are all 0, and
// 0 is a legal commission rate, so a bare coercion turns a malformed
// field into a valid-looking term that earns RYDA nothing.

import {
  RENTAL_COMMISSION_RATE_MAX,
  RENTAL_COMMISSION_RATE_SCALE,
  RENTAL_FEE_CENTS_MAX,
  isStorableCommissionRate,
  storedCommissionRate,
} from "@/lib/fees";

/** A field that can be absent (leave alone), explicitly null (clear), or
 *  set. The three-way distinction matters: fee_flat_cents MUST be
 *  clearable, and a two-way "null means untouched" read would make it a
 *  write-once column by accident. */
export type OptionalField<T> =
  | { ok: true; provided: false }
  | { ok: true; provided: true; value: T | null }
  | { ok: false; error: string };

/** Dollars for an error message. Cents stay the unit everywhere else. */
function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/** Integer cents from the request body, accepting snake_case (the admin
 *  UI) and camelCase (API-first callers). Empty string is treated as
 *  null so an emptied number input clears the field rather than
 *  coercing to Number('') === 0 — which here would silently pin a $0.00
 *  floor. */
export function readCentsField(
  body: Record<string, unknown>,
  snake: string,
  camel: string,
): OptionalField<number> {
  const raw = body[snake] !== undefined ? body[snake] : body[camel];
  if (raw === undefined) return { ok: true, provided: false };
  if (raw === null || raw === "") return { ok: true, provided: true, value: null };
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return {
      ok: false,
      error: `${snake}: whole number of cents, 0 or more (2500 = $25.00). Got ${JSON.stringify(raw)}.`,
    };
  }
  // The UPPER rail, and it is a storage fact rather than a preference:
  // these columns are int4 in 0048. Without it a well-formed
  // $25,000,000 clears the admin form, this reader and the fee engine,
  // then fails on the UPDATE as `value "2500000000" is out of range for
  // type integer` — a message no handler here recognises, so it reaches
  // the admin as a raw 500. Same class of confusing failure the
  // four-place ceiling contract exists to prevent.
  if (n > RENTAL_FEE_CENTS_MAX) {
    return {
      ok: false,
      error: `${snake}: at most ${RENTAL_FEE_CENTS_MAX} cents (${usd(
        RENTAL_FEE_CENTS_MAX,
      )}) — the column is a 32-bit integer. Got ${JSON.stringify(raw)}.`,
    };
  }
  return { ok: true, provided: true, value: n };
}

/** One of a fixed set of strings, or absent. Never clearable — fee_mode
 *  and fee_payer are NOT NULL with defaults in 0048. */
export function readEnumField<T extends string>(
  body: Record<string, unknown>,
  snake: string,
  camel: string,
  allowed: readonly T[],
): OptionalField<T> {
  const raw = body[snake] !== undefined ? body[snake] : body[camel];
  if (raw === undefined || raw === null) return { ok: true, provided: false };
  if (typeof raw !== "string" || !allowed.includes(raw as T)) {
    return {
      ok: false,
      error: `${snake}: must be ${allowed.map((a) => `'${a}'`).join(" or ")}.`,
    };
  }
  return { ok: true, provided: true, value: raw as T };
}

/**
 * The percent commission off a request body. `null` means "not
 * provided" — commission_rate is NOT NULL with a 0.150 default since
 * 0041 and cannot be cleared, so absence means leave the row's value
 * alone rather than write anything.
 *
 * THREE ways this used to go wrong, all of them silent:
 *
 *   · `Number('')` is 0. An integration posting an empty commission_rate
 *     put its operator on a 0% commission and RYDA earned nothing on
 *     every future booking. So do `Number([])` and `Number(false)`.
 *   · a rate past the ceiling reached Postgres as a constraint name.
 *   · a rate FINER than the column — 0.1575 — passed every check, was
 *     previewed and audit-logged as $315.00 on the $2,000 reference
 *     booking, and was then stored as 0.158 so every charge was $316.00.
 *     numeric(4,3) rounds; the preview does not know that it did.
 */
export function readCommissionRate(
  body: Record<string, unknown>,
): OptionalField<number> {
  const raw = body.commission_rate ?? body.commissionRate;
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, provided: false };
  }
  // Anything not a number or a numeric string becomes NaN and is
  // refused below by name, rather than coerced to a rate nobody typed.
  const rate =
    typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(rate) || rate < 0 || rate > RENTAL_COMMISSION_RATE_MAX) {
    return {
      ok: false,
      error: `commission_rate: decimal fraction between 0 and ${RENTAL_COMMISSION_RATE_MAX} (0.15 = 15%). Got ${JSON.stringify(
        raw,
      )}.`,
    };
  }
  if (!isStorableCommissionRate(rate)) {
    return {
      ok: false,
      error: `commission_rate: at most ${RENTAL_COMMISSION_RATE_SCALE} decimal places (0.1% steps) — the column is numeric(4,${RENTAL_COMMISSION_RATE_SCALE}), so ${rate} would be stored as ${storedCommissionRate(
        rate,
      )} and every charge would differ from the quote.`,
    };
  }
  return { ok: true, provided: true, value: rate };
}
