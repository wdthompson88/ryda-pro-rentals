// The only home for money math (AGENTS.md), and since the co-ownership
// buy flow was removed this file is rental-only: the acquisition-fee
// helpers it used to carry went with it.
//
// ── Rental payment rail — the configurable booking-fee engine ────────
//
// (RYDA_RENTAL_BUILD_LOOP.md task 3A; founder decisions D1 and D2.)
//
// WHAT THIS COMPUTES. Given a base rental price — daily rate x billable
// nights, after any duration discount — decide RYDA's booking fee, who
// carries it, what the renter's card is charged, and what the operator
// ends up with. Four numbers that must agree with each other exactly,
// forever, in every surface that shows them.
//
// WHERE THE MONEY ACTUALLY GOES, so no comment here over-promises.
// Two rails read this one function, and they are NOT the same shape:
//
//   · the pre-pivot inquiry rail (0041 / the admin payment-link route)
//     is a Stripe Connect DIRECT charge on the operator's own connected
//     account, where RYDA's cut rides along as application_fee_amount.
//     On that rail the rental price never enters RYDA's balance.
//   · the booking rail (D1, task 3B) charges the renter on RYDA's OWN
//     platform account. The money lands in RYDA's balance and the
//     operator is paid out by a Transfer after a clean return (D4). On
//     that rail there is no application-fee object at all: the fee is
//     simply the part of the balance RYDA does not transfer out.
//
// Which means "RYDA never holds your money" is true of the first rail
// and false of the second. Copy must not state it globally — that sweep
// is task 4A and it lands with 3B, not before.
//
// So `applicationFeeCents` is NOT the only consumer of this result any
// more, and the output below is deliberately named for the economics
// (feeCents / renterTotalCents / operatorNetCents) rather than for one
// rail's Stripe field. See the note on `applicationFeeCents` in
// RentalFeeBreakdown.
//
// THE SINGLE-SOURCE RULE, which is why this lives here at all. The
// co-ownership buy flow once showed a flat $1,500 "closing fee" in the
// client while the server charged a 5% acquisition fee — $1,500 vs
// $1,700 on a $34k share, and it would have been $1,500 vs $15,000 on a
// $300k boat share. One fee, computed two ways, disagreeing by up to
// $13,500. That code is gone but the lesson is why this file exists:
// every surface that shows a rental fee — the admin operator-terms
// preview on /admin/partners, the renter's quote, the booking snapshot
// written to rental_bookings, the Stripe call — calls THIS function.
// Nothing re-derives a fee from a rate by hand.
//
// Single source of truth, and that discipline is load-bearing. This
// module previously also carried the co-ownership acquisition-fee math,
// which existed because the client once showed a flat $1,500 "closing
// fee" while the server charged 5% — a $13,500 divergence on a $300k
// share, found in audit. The lesson survives its subject: the admin
// "send payment link" preview and the Checkout Session the server
// creates must both call computeRentalFee, so the fee the admin sees
// and the fee Stripe takes can never drift apart.
//
// Works in CENTS, Stripe's own unit. Rental amounts are operator-quoted
// arbitrary prices rather than fixed sticker dollars, so cents-in /
// cents-out avoids a *100 conversion step where a rounding bug could
// hide.

/** Platform commission when the partner row has no override.
 *  Mirrors partners.commission_rate's default (0.150) in migration 0041. */
export const RENTAL_COMMISSION_RATE_DEFAULT = 0.15;

/**
 * Upper bound on the percent commission, as a fraction.
 *
 * THIS CONSTANT IS THE CONTRACT. The same ceiling is asserted in four
 * places that a compiler cannot relate to each other:
 *
 *   1. `partners_commission_rate_bounded` — the DB CHECK (0048, which
 *      replaces 0041's inline `<= 0.5`).
 *   2. this guard, inside computeRentalFee.
 *   3. the POST validation in src/app/api/admin/partners/route.ts.
 *   4. the admin form rails in src/app/admin/partners/page.tsx.
 *
 * 2–4 all import this constant, so they cannot drift. 1 is SQL and
 * cannot import anything, so src/lib/__tests__/rental-fee-config.test.ts
 * parses 0048 and fails if the CHECK and this number disagree. A CHECK
 * stricter than the UI is a confusing 500 on save; a UI stricter than
 * the CHECK silently blocks a legitimate commercial term.
 *
 * WHY 0.75 AND NOT 0.5. The old 0.5 was a guess about commercial
 * reality made when the only shape a fee could take was "a percentage
 * deducted from the operator's payout". D2 added renter-pays-on-top,
 * where the rate is a markup rather than a deduction and 50% is no
 * longer an obvious wall. The ceiling's real job is typo protection —
 * catching `15` typed where `0.15` belonged, or `1.5` for `0.15` — and
 * any ceiling below 1 does that job. 0.75 keeps it, sits above every
 * plausible term including a renter-paid concierge markup, and stays
 * strictly below 1 so the percent path can never on its own produce a
 * zero-or-negative operator payout (rental_bookings.operator_net_cents
 * is CHECKed >= 0 in 0047). A flat fee CAN cross that line, which is
 * what the operator-pays assertion at the end of computeRentalFee is
 * for.
 */
export const RENTAL_COMMISSION_RATE_MAX = 0.75;

/**
 * Decimal places `partners.commission_rate` can actually STORE.
 *
 * 0041 declared the column `numeric(4,3)` — three decimal places, i.e.
 * 0.1% granularity on the percent. RENTAL_COMMISSION_RATE_MAX above is
 * the ceiling half of the contract; this is the RESOLUTION half, and it
 * was the missing one. A rate of 0.1575 (15.75%) passes every ceiling
 * check in the stack, is previewed and audit-logged as $315.00 on the
 * $2,000 reference booking, and is then silently re-rounded by Postgres
 * to 0.158 — so the charge is $316.00 and the preview, the modal, the
 * audit entry and the money all disagree. On a $10,000 booking that is
 * $1,575.00 quoted against $1,580.00 taken.
 *
 * So a rate finer than this is REFUSED at the write boundaries (the
 * admin form and the POST validation) rather than rounded there: any
 * rounding we do here would have to match Postgres's half-away-from-zero
 * on the exact decimal, which double arithmetic cannot promise
 * (0.1225 → JS 0.122, Postgres 0.123). Refusing needs no such promise.
 *
 * NOT enforced inside computeRentalFee: the engine must keep computing
 * whatever a row hands it — including a row written before this guard
 * existed — rather than throwing mid-charge over a storage detail.
 * src/lib/__tests__/rental-fee-config.test.ts parses 0041 and fails if
 * the column's scale and this number drift apart.
 */
export const RENTAL_COMMISSION_RATE_SCALE = 3;

/**
 * Can this rate survive a round trip through `numeric(4,3)` unchanged?
 *
 * NOT `toFixed(3) === rate`, which is the obvious form and is wrong: a
 * rate reaches this function as a percent divided by 100, and 0.7 / 100
 * is 0.006999999999999999 in binary. That IS the rate 0.007 and must be
 * accepted — the naive comparison refuses 185 of the 751 legal
 * one-decimal percents. So the storage scale is compared against a
 * scale six places finer: fine enough that 0.1575 (genuinely beyond the
 * column) still fails, coarse enough that binary noise ~1e-17 does not
 * register as precision the admin asked for.
 */
export function isStorableCommissionRate(rate: number): boolean {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return false;
  return (
    Number(rate.toFixed(RENTAL_COMMISSION_RATE_SCALE)) ===
    Number(rate.toFixed(RENTAL_COMMISSION_RATE_SCALE + 6))
  );
}

/** What Postgres would store for a rate this fine — used only to SHOW
 *  the admin what they would have been charged, never to write. */
export function storedCommissionRate(rate: number): number {
  return Number(rate.toFixed(RENTAL_COMMISSION_RATE_SCALE));
}

/**
 * Ceiling on every cents-valued fee term.
 *
 * partners.fee_flat_cents / fee_floor_cents / fee_cap_cents are `integer`
 * in 0048, so 2,147,483,647 is a hard storage limit, not a taste
 * judgement. Without it a large-but-well-formed amount ($25,000,000
 * typed into "Flat fee") passes the form, passes the POST's shape check,
 * passes the engine — and dies on the UPDATE as `value "2500000000" is
 * out of range for type integer`, which no error handler recognises and
 * which reaches the admin as a raw 500. That is the same class of
 * confusing failure 0048's four-place ceiling contract exists to
 * prevent, so the bound lives here with the others.
 */
export const RENTAL_FEE_CENTS_MAX = 2_147_483_647;

/**
 * The reference booking the operator-terms preview is worked through:
 * $2,000, roughly a two-night exotic rental at the fleet's median rate.
 *
 * Exported so the admin form's live preview and the audit entry written
 * when the terms change quote the SAME example. "15% of a $2,000
 * booking" in the audit log and "$300" on the screen the admin clicked
 * are then the same sentence, six months apart.
 */
export const RENTAL_FEE_EXAMPLE_BASE_CENTS = 200_000;

/** How the fee is derived from the base. Mirrors partners.fee_mode (0048). */
export const RENTAL_FEE_MODES = ["percent", "flat"] as const;
export type RentalFeeMode = (typeof RENTAL_FEE_MODES)[number];

/** Which side of the deal carries the fee. Mirrors partners.fee_payer
 *  (0048) and rental_bookings.fee_payer (0047). */
export const RENTAL_FEE_PAYERS = ["operator", "renter"] as const;
export type RentalFeePayer = (typeof RENTAL_FEE_PAYERS)[number];

/**
 * Per-operator fee terms. Every field is optional so a partner row from
 * a database that has not had 0048 applied yet — where fee_mode and
 * friends simply do not exist — resolves to exactly today's behavior
 * (percent, operator-pays, no floor or cap) instead of throwing.
 */
export type RentalFeeConfig = {
  /** default 'percent' */
  mode?: RentalFeeMode;
  /** the percent rate as a fraction (0.15 = 15%). Used when mode is
   *  'percent'; defaults to RENTAL_COMMISSION_RATE_DEFAULT. */
  rate?: number;
  /** the flat fee in cents. REQUIRED when mode is 'flat', and must be
   *  absent when mode is 'percent' (mirrors 0048's coherence CHECK). */
  flatCents?: number;
  /** default 'operator' */
  payer?: RentalFeePayer;
  /** minimum fee in cents, applied after the raw fee is computed. */
  floorCents?: number;
  /** maximum fee in cents, applied after the raw fee is computed. */
  capCents?: number;
};

/** A RentalFeeConfig with every default filled in — what the engine
 *  actually computes from, and what the admin UI echoes back. */
export type ResolvedRentalFeeConfig = {
  mode: RentalFeeMode;
  rate: number;
  flatCents: number | null;
  payer: RentalFeePayer;
  floorCents: number | null;
  capCents: number | null;
};

export type RentalFeeBreakdown = {
  /** Daily rate x billable nights after discounts, before the fee. */
  baseAmountCents: number;
  /** RYDA's booking fee for this quote, after floor/cap. */
  feeCents: number;
  /** Echo of the payer the split was computed under — callers write it
   *  to rental_bookings.fee_payer, and 0047's quote-consistency CHECK
   *  re-derives these same numbers from it. */
  feePayer: RentalFeePayer;
  /** What the renter's card is charged. base + fee when the renter
   *  pays; base when the operator pays. */
  renterTotalCents: number;
  /** What the operator ends up with — the Transfer amount on the D1
   *  rail, the direct-charge remainder on the 0041 rail. */
  operatorNetCents: number;
  /**
   * Numerically identical to feeCents, always. It exists under this
   * name because on a Stripe Connect DIRECT charge (the 0041 inquiry
   * rail) this is literally the `application_fee_amount` argument, and
   * a route reaching for that field should not have to know that the
   * engine calls it something else.
   *
   * It is NOT the only consumer any more: on the D1 booking rail the
   * charge is on RYDA's platform account, there is no application-fee
   * object, and the number that matters is operatorNetCents — the
   * Transfer sent after a clean return. Prefer feeCents in new code.
   */
  applicationFeeCents: number;
  /**
   * Legacy alias for renterTotalCents — "the amount charged" under the
   * pre-D2 signature, where the renter always paid exactly the base.
   * Kept so the existing payment-link route keeps compiling and keeps
   * meaning the same thing: on a direct charge, amountCents is the
   * charge and applicationFeeCents comes out of it, so
   * `applicationFeeCents + operatorNetCents === amountCents` still
   * holds — under BOTH payers.
   */
  amountCents: number;
  /** The fee before floor/cap. Equal to feeCents unless a clamp bit —
   *  the admin preview says which, so "why is this $50?" is legible. */
  rawFeeCents: number;
  /** Which clamp bound, if either. */
  clampedBy: "floor" | "cap" | null;
  /** The config the numbers above were computed from, defaults filled. */
  config: ResolvedRentalFeeConfig;
};

function show(value: unknown): string {
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : Object.prototype.toString.call(value);
}

/** Integer-cents gate. Rejects floats (the dollars-where-cents-belong
 *  100x bug), NaN, Infinity and negatives by naming the field — and the
 *  upper end too, because int4 is where these values are stored and a
 *  number past it is a 22003 nobody catches rather than a fee. */
function assertCents(label: string, value: unknown, min: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    throw new Error(
      `computeRentalFee: ${label} must be an integer number of cents >= ${min}, got ${show(value)}`,
    );
  }
  if (value > RENTAL_FEE_CENTS_MAX) {
    throw new Error(
      `computeRentalFee: ${label} of ${value} is above the ${RENTAL_FEE_CENTS_MAX} storage ceiling — partners' cents columns are int4 (0048), so a larger value cannot be written at all`,
    );
  }
  return value;
}

/**
 * Fill in the defaults and reject an incoherent config LOUDLY — the
 * same coherence 0048's CHECK constraints enforce at the database, so a
 * config the UI accepts can never be one the row refuses.
 *
 * Exported because the admin POST validates with it before writing, and
 * the admin preview renders from it: one definition of "is this a legal
 * set of operator terms", not three.
 */
export function resolveRentalFeeConfig(
  config: RentalFeeConfig = {},
): ResolvedRentalFeeConfig {
  const mode = config.mode ?? "percent";
  if (!RENTAL_FEE_MODES.includes(mode)) {
    throw new Error(
      `computeRentalFee: mode must be one of ${RENTAL_FEE_MODES.join(" | ")}, got ${show(mode)}`,
    );
  }

  const payer = config.payer ?? "operator";
  if (!RENTAL_FEE_PAYERS.includes(payer)) {
    throw new Error(
      `computeRentalFee: payer must be one of ${RENTAL_FEE_PAYERS.join(" | ")}, got ${show(payer)}`,
    );
  }

  const rate = config.rate ?? RENTAL_COMMISSION_RATE_DEFAULT;
  // Checked in BOTH modes. commission_rate is NOT NULL on partners
  // (0041) and keeps its value while an operator is on flat terms, so a
  // rate that is out of contract is a live misconfiguration waiting for
  // the next flip back to percent — not something to wave through
  // because it happens to be unused this second.
  if (
    typeof rate !== "number" ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > RENTAL_COMMISSION_RATE_MAX
  ) {
    throw new Error(
      `computeRentalFee: commissionRate must be within [0, ${RENTAL_COMMISSION_RATE_MAX}], got ${show(rate)}`,
    );
  }

  // flatCents is required in flat mode and forbidden in percent mode.
  // The asymmetry with `rate` above is deliberate and it mirrors the
  // schema: commission_rate is NOT NULL since 0041 and cannot be nulled
  // without breaking every existing consumer, so it necessarily carries
  // a value in flat mode; fee_flat_cents is new and nullable, so it is
  // held to the stricter rule. The point of the strictness is that
  // reading a partners row must answer "which number is live?" without
  // a second lookup — a stale flat amount left behind by a mode flip
  // would otherwise silently become the fee the day someone flips back.
  let flatCents: number | null = null;
  if (mode === "flat") {
    if (config.flatCents === undefined || config.flatCents === null) {
      throw new Error(
        "computeRentalFee: flatCents is required when mode is 'flat'",
      );
    }
    flatCents = assertCents("flatCents", config.flatCents, 0);
  } else if (config.flatCents !== undefined && config.flatCents !== null) {
    throw new Error(
      `computeRentalFee: flatCents must be absent when mode is 'percent' (got ${show(config.flatCents)}) — clear it when switching back to a percent rate`,
    );
  }

  const floorCents =
    config.floorCents === undefined || config.floorCents === null
      ? null
      : assertCents("floorCents", config.floorCents, 0);
  const capCents =
    config.capCents === undefined || config.capCents === null
      ? null
      : assertCents("capCents", config.capCents, 0);
  if (floorCents !== null && capCents !== null && floorCents > capCents) {
    throw new Error(
      `computeRentalFee: floorCents (${floorCents}) must be <= capCents (${capCents})`,
    );
  }

  return { mode, rate, flatCents, payer, floorCents, capCents };
}

/** Shape of the fee columns as they come off a `partners` row. Loose on
 *  purpose: Supabase hands numerics back as number|string depending on
 *  the driver path, and a pre-0048 row simply has no fee_* keys. */
export type PartnerFeeColumns = {
  commission_rate?: number | string | null;
  fee_mode?: string | null;
  fee_flat_cents?: number | string | null;
  fee_payer?: string | null;
  fee_floor_cents?: number | string | null;
  fee_cap_cents?: number | string | null;
};

/**
 * The 0048 fee-terms column names, as a select list.
 *
 * Hoisted here because THREE rails now price with them — the admin
 * payment-link route, the booking request, and the operator decision —
 * and a route that forgets one does not fail: rentalFeeConfigFromPartner
 * simply sees no such key and resolves that term to its default. A
 * missing `fee_payer` in a select list is therefore indistinguishable
 * from an operator who is on operator-pays, which is exactly how the
 * booking path came to charge a renter-pays operator's fee to the
 * operator for an entire release.
 *
 * Kept separate from commission_rate (0041) because the pre-0048
 * fallback in payment-link retries with only the older column, and that
 * retry needs the two lists to be distinguishable.
 */
export const PARTNER_FEE_COLUMNS = [
  "fee_mode",
  "fee_flat_cents",
  "fee_payer",
  "fee_floor_cents",
  "fee_cap_cents",
] as const;

/**
 * Everything computeRentalFee needs about an operator, as one select
 * string. Any route pricing a rental should use this rather than naming
 * columns by hand.
 */
export const PARTNER_FEE_SELECT = `commission_rate, ${PARTNER_FEE_COLUMNS.join(", ")}`;

/** null / undefined stay absent (so the default applies); anything else
 *  is coerced once, here, rather than at four call sites. Note that
 *  Number(null) === 0 — coercing a null commission_rate would quietly
 *  create a 0% operator, which is why absence is checked first. */
function num(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === "number" ? value : Number(value);
}

/**
 * Read a partners row's fee terms into a config. The one adapter
 * between the DB columns (0041 + 0048) and the engine — used by the
 * admin route, the admin preview, and the booking quote calculator, so
 * "what are this operator's terms" is answered identically everywhere.
 *
 * A row from a pre-0048 database resolves to percent / operator-pays /
 * no clamps, i.e. exactly the behavior that shipped before this task.
 */
export function rentalFeeConfigFromPartner(
  row: PartnerFeeColumns | null | undefined,
): RentalFeeConfig {
  if (!row) return {};
  const config: RentalFeeConfig = {};
  if (row.fee_mode != null) config.mode = row.fee_mode as RentalFeeMode;
  if (row.fee_payer != null) config.payer = row.fee_payer as RentalFeePayer;
  const rate = num(row.commission_rate);
  if (rate !== undefined) config.rate = rate;
  const flat = num(row.fee_flat_cents);
  if (flat !== undefined) config.flatCents = flat;
  const floor = num(row.fee_floor_cents);
  if (floor !== undefined) config.floorCents = floor;
  const cap = num(row.fee_cap_cents);
  if (cap !== undefined) config.capCents = cap;
  return config;
}

/**
 * Split a base rental price into RYDA's booking fee, the renter's total
 * and the operator's net.
 *
 * THE ORDER OF OPERATIONS, which is the part that has to be written
 * down because every other ordering is also plausible and gives
 * different money:
 *
 *   1. Validate. Anything non-integer, negative, NaN or incoherent
 *      throws by name. Nothing is guessed — this number reaches a card.
 *   2. Derive the RAW fee from the base:
 *        percent → Math.round(base * rate)
 *        flat    → flatCents (already an integer; the base is ignored)
 *   3. CLAMP the raw fee to [floorCents, capCents]. Before the split,
 *      never after: clamping after would mean a $50 floor produced a
 *      renter total of base + 50 but an operator net of base - 47, and
 *      the two sides of one deal would disagree by the clamp. Because
 *      step 1 already refused floor > cap, the clamp is order-
 *      independent — min-then-max and max-then-min give the same cent.
 *      The clamp applies in BOTH modes; on a flat fee it is normally a
 *      no-op and a bite is a config smell the preview surfaces.
 *   4. SPLIT by payer:
 *        renter   → renterTotal = base + fee, operatorNet = base
 *                   (the fee is ADDED ON TOP — this changes the amount
 *                    charged, not merely who it is attributed to)
 *        operator → renterTotal = base,       operatorNet = base - fee
 *      These are the two arms of 0047's rental_bookings_quote_consistent
 *      CHECK, written the same way round on purpose.
 *
 * ROUNDING: Math.round, once, in step 2 and nowhere else — half away
 * from zero, and every input here is positive so that is plain half-up.
 * Steps 3 and 4 are integer arithmetic, so no cent is created or lost
 * after the single rounding point. That is what makes the reconciliation
 * property in the tests exact rather than approximate.
 *
 * BACKWARD COMPATIBILITY: the pre-D2 call form is still supported and
 * still means what it meant —
 *   computeRentalFee(110_500)        → 15% deducted from the operator
 *   computeRentalFee(50_000, 0.2)    → 20% deducted from the operator
 * — because a bare number in the second slot is read as the percent
 * rate with operator-pays and no clamps, which is precisely the old
 * behavior. Existing call sites did not need editing.
 */
export function computeRentalFee(
  amountCents: number,
  commissionRate?: number,
): RentalFeeBreakdown;
export function computeRentalFee(
  baseAmountCents: number,
  config: RentalFeeConfig,
): RentalFeeBreakdown;
export function computeRentalFee(
  amountCents: number,
  configOrRate?: number | RentalFeeConfig,
): RentalFeeBreakdown {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(
      `computeRentalFee: amountCents must be a positive integer, got ${show(amountCents)}`,
    );
  }

  // Legacy form: a bare rate (or nothing) means percent / operator-pays.
  // `typeof !== "object"` rather than `typeof === "number"` so a string
  // or a boolean lands in resolveRentalFeeConfig's rate guard and throws
  // by name instead of being silently ignored as an unknown config.
  const config: RentalFeeConfig =
    configOrRate === undefined
      ? {}
      : typeof configOrRate === "object" && configOrRate !== null
        ? configOrRate
        : { rate: configOrRate as number };

  const resolved = resolveRentalFeeConfig(config);
  const baseAmountCents = amountCents;

  // Step 2 — the raw fee. The ONE rounding point in this function.
  const rawFeeCents =
    resolved.mode === "flat"
      ? (resolved.flatCents as number)
      : Math.round(baseAmountCents * resolved.rate);

  // Step 3 — clamp, before the split.
  let feeCents = rawFeeCents;
  let clampedBy: "floor" | "cap" | null = null;
  if (resolved.floorCents !== null && feeCents < resolved.floorCents) {
    feeCents = resolved.floorCents;
    clampedBy = "floor";
  }
  if (resolved.capCents !== null && feeCents > resolved.capCents) {
    feeCents = resolved.capCents;
    clampedBy = "cap";
  }

  // Step 4 — the split.
  const renterPays = resolved.payer === "renter";
  const renterTotalCents = renterPays
    ? baseAmountCents + feeCents
    : baseAmountCents;
  const operatorNetCents = renterPays
    ? baseAmountCents
    : baseAmountCents - feeCents;

  // An operator-paid fee larger than the base would pay RYDA to rent
  // the operator's car out, and 0047 CHECKs operator_net_cents >= 0, so
  // the row could not be written anyway. Throw here, where the message
  // can name the terms, rather than let a constraint name surface as a
  // 500 halfway through a booking. Reachable only via a flat fee or a
  // floor — RENTAL_COMMISSION_RATE_MAX < 1 keeps the percent path clear.
  // (Under renter-pays there is nothing to refuse: the operator still
  // receives the full base and the renter simply sees the total.)
  if (operatorNetCents < 0) {
    throw new Error(
      `computeRentalFee: an operator-paid fee of ${feeCents} exceeds the ${baseAmountCents} base, which would make the payout negative — cap the fee or move it to the renter`,
    );
  }

  return {
    baseAmountCents,
    feeCents,
    feePayer: resolved.payer,
    renterTotalCents,
    operatorNetCents,
    applicationFeeCents: feeCents,
    amountCents: renterTotalCents,
    rawFeeCents,
    clampedBy,
    config: resolved,
  };
}
