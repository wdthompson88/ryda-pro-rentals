// May this renter be handed the keys? (RYDA_RENTAL_BUILD_LOOP.md phase
// 1A, open default O6.)
//
// Pure — no Supabase client, no `server-only`, no Stripe. The route that
// blocks a confirmation and the screen that tells a renter why must reach
// the same verdict, and a renter reading "you need to be 25" should be
// reading the exact sentence the approval refused with.
//
// ── WHAT THIS CHECKS, AND WHAT IT DELIBERATELY DOES NOT ─────────────
//
// CHECKS: identity, and age at the date of the trip.
//   Stripe Identity is already integrated (/api/kyc/start, the webhook,
//   kyc_verifications) and its verified_outputs carry a `dob`. That is a
//   government ID checked against a selfie by a vendor, and a date of
//   birth taken off that document — which is a materially stronger claim
//   than a birthday typed into a form.
//
// DOES NOT CHECK: driving record.
//   O6 names Checkr for that and Checkr is not integrated. There is no
//   column, no route and no vendor account, so this module says nothing
//   about a renter's driving history and neither should any copy built on
//   it. Claiming a check RYDA does not run is the class of statement the
//   whole /trust-and-safety rewrite exists to stop.
//
// DOES NOT CHECK: licence number.
//   The build loop suggests persisting one from onboarding. Deliberately
//   not done: with no vendor to check it against, a stored licence number
//   is regulated PII with no consumer — a liability that buys nothing.
//   When Checkr lands it can be collected at the same moment it is used.
//
// ── AGE IS MEASURED AT THE PICKUP DATE, NOT TODAY ───────────────────
//
// The one decision in this file that is easy to get wrong and expensive
// to get wrong. A renter who is 24 today and 25 on the day the trip
// starts is eligible for THAT booking — refusing them would be refusing a
// legal renter over a calendar detail. The reverse never bites: nobody
// gets younger.
//
// It also means eligibility is per-booking, not a property of the user,
// which is why decideRentalEligibility takes a start date rather than
// answering "is this person allowed to rent".

/**
 * Minimum age to rent, in years, at the pickup date (open default O6).
 *
 * NOT the co-ownership floor. src/lib/age.ts held 28 for LLC membership
 * and was deleted with the co-ownership strip, so there is no longer a
 * neighbouring constant to reach for by mistake — but the distinction is
 * recorded here anyway: 28 was about who may own a share of a company,
 * 25 is about who an insurer will cover behind the wheel. They were never
 * the same number and must never be shared.
 */
export const RENTAL_MIN_AGE_YEARS = 25;

/** kyc_verifications.status (0010). */
export type KycStatus =
  | "requires_input"
  | "processing"
  | "verified"
  | "requires_action"
  | "canceled";

/** The `dob` Stripe Identity returns inside verified_outputs. */
export type VerifiedDob = {
  day?: number;
  month?: number;
  year?: number;
} | null | undefined;

export type RentalEligibilityInput = {
  /** Null when the renter has never started identity verification. */
  kycStatus: KycStatus | null;
  /** From the verified outputs. Absent even on a verified row is possible
   *  — see `no_dob_on_file`. */
  dob: VerifiedDob;
  /** The booking's pickup day, 'YYYY-MM-DD'. */
  startDate: string;
};

export type RentalEligibilityBlock =
  | "identity_not_started"
  | "identity_pending"
  | "identity_failed"
  | "no_dob_on_file"
  | "under_age"
  | "bad_start_date";

export type RentalEligibility =
  | { eligible: true; ageAtPickup: number }
  | { eligible: false; reason: RentalEligibilityBlock; ageAtPickup: number | null };

/**
 * Whole years old on `onDate`. UTC throughout, matching the day math in
 * rental-availability.ts — a birthday is a calendar fact and must not
 * shift with the reader's timezone.
 *
 * Returns null for an incomplete or impossible date rather than guessing:
 * a missing month would otherwise silently become January and hand
 * somebody up to eleven months they do not have.
 */
export function ageOnDate(dob: VerifiedDob, onDate: string): number | null {
  if (!dob) return null;
  const { day, month, year } = dob;
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    (month as number) < 1 ||
    (month as number) > 12 ||
    (day as number) < 1 ||
    (day as number) > 31 ||
    (year as number) < 1900
  ) {
    return null;
  }

  const m = onDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const onY = Number(m[1]);
  const onM = Number(m[2]);
  const onD = Number(m[3]);

  // Round-trip the birth date so an impossible one (31 February) is
  // rejected rather than silently rolling into the next month.
  const born = new Date(Date.UTC(year as number, (month as number) - 1, day as number));
  if (
    born.getUTCFullYear() !== year ||
    born.getUTCMonth() !== (month as number) - 1 ||
    born.getUTCDate() !== day
  ) {
    return null;
  }

  let age = onY - (year as number);
  // Not yet had the birthday in the target year.
  if (onM < (month as number) || (onM === (month as number) && onD < (day as number))) {
    age -= 1;
  }
  return age;
}

/**
 * The verdict for one renter on one booking.
 *
 * Order is identity → data → age, because that is the order a renter can
 * act in: there is no point telling somebody they are too young when the
 * system has not yet established how old they are.
 */
export function decideRentalEligibility(
  input: RentalEligibilityInput,
): RentalEligibility {
  const { kycStatus, dob, startDate } = input;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { eligible: false, reason: "bad_start_date", ageAtPickup: null };
  }

  if (kycStatus === null || kycStatus === "canceled") {
    return { eligible: false, reason: "identity_not_started", ageAtPickup: null };
  }
  if (kycStatus === "requires_input" || kycStatus === "processing") {
    return { eligible: false, reason: "identity_pending", ageAtPickup: null };
  }
  if (kycStatus === "requires_action") {
    // Stripe could not clear it automatically. Distinct from pending
    // because the renter's next step differs: pending is "wait",
    // requires_action is "somebody has to look at this".
    return { eligible: false, reason: "identity_failed", ageAtPickup: null };
  }

  // kycStatus === 'verified' from here.
  const age = ageOnDate(dob, startDate);
  if (age === null) {
    // Verified, but no usable date of birth. Happens on a legacy row
    // whose encrypted outputs predate the key (0029's stale-row case) and
    // on a document type that returned no dob. Not the renter's fault and
    // not something they can fix by re-uploading, so it is its own reason
    // rather than being folded into under_age — which would accuse
    // somebody of being too young on no evidence at all.
    return { eligible: false, reason: "no_dob_on_file", ageAtPickup: null };
  }

  if (age < RENTAL_MIN_AGE_YEARS) {
    return { eligible: false, reason: "under_age", ageAtPickup: age };
  }

  return { eligible: true, ageAtPickup: age };
}

/**
 * Copy for the RENTER. Second person, names the next action, and never
 * mentions a check RYDA does not run.
 */
export function rentalEligibilityMessage(
  reason: RentalEligibilityBlock,
): string {
  switch (reason) {
    case "identity_not_started":
      return "Verify your identity before this booking can be confirmed — it takes a couple of minutes.";
    case "identity_pending":
      return "Your identity check is still going through. We'll email you as soon as it clears.";
    case "identity_failed":
      return "Your identity check needs another look. Contact us and we'll sort it out.";
    case "no_dob_on_file":
      return "We couldn't read a date of birth from your ID. Contact us and we'll sort it out.";
    case "under_age":
      return `Renters must be ${RENTAL_MIN_AGE_YEARS} or over on the pickup date.`;
    case "bad_start_date":
      return "Something's wrong with this booking's dates.";
  }
}

/**
 * Copy for the OPERATOR, who sees a request they cannot approve.
 *
 * A separate vocabulary on purpose. The renter's date of birth, the state
 * of their ID check and whether it failed are all theirs, not the
 * operator's — an operator needs to know they cannot approve this yet and
 * that it is not their problem to fix. Every blocked reason therefore
 * collapses to the same sentence, which is the D6-adjacent instinct
 * applied to identity rather than to money.
 */
export function rentalEligibilityOperatorMessage(): string {
  return "This renter hasn't finished RYDA's checks yet. We'll let you know when they have — nothing for you to do.";
}

/** Whether the renter can fix it themselves, for surfaces that route. */
export function eligibilityBlockOwner(
  reason: RentalEligibilityBlock,
): "renter" | "ryda" {
  switch (reason) {
    case "identity_not_started":
    case "under_age":
      return "renter";
    case "identity_pending":
    case "identity_failed":
    case "no_dob_on_file":
    case "bad_start_date":
      return "ryda";
  }
}
