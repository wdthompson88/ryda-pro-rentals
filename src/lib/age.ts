// Age computation helper. Pulled into its own module so the gate logic
// is unit-testable without booting the full create-checkout route.
//
// CODEX-CHALLENGE caught this gap: ToS at /legal/terms requires 28+
// but no code path enforced it. Stripe Identity returns a
// `verified_outputs.dob: { day, month, year }` once the user passes
// KYC; we now compute age and gate at create-checkout (and any future
// share-purchase entry point — wire the same `requireMinAge()` helper).
//
// No `import "server-only"` here: this module is pure compute, holds
// no secrets, and runs equally well in Node tests + edge + RSC. The
// gate enforcement is at the API route boundary; this helper is
// universal.

/** Minimum member age for any LLC share purchase. Lives here as a
 *  named constant so it can move to env / per-vertical config later
 *  without grepping every gate. Doctrinal: matches /legal/terms § 2. */
export const MIN_MEMBER_AGE_YEARS = 28;

/** Stripe Identity `verified_outputs.dob` shape. */
export type StripeDob = {
  day?: number | null;
  month?: number | null;
  year?: number | null;
};

/** Compute integer years between dob and asOf. Returns null if dob
 *  is missing/malformed. Handles birthday-not-yet-this-year correctly
 *  (e.g. dob 1998-12-15 with asOf 2026-05-07 → 27, not 28). */
export function computeAgeYears(
  dob: StripeDob | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dob) return null;
  const { day, month, year } = dob;
  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    typeof day !== "number" ||
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  let age = asOf.getUTCFullYear() - year;
  // Subtract a year if the birthday hasn't occurred yet this year.
  // getUTCMonth() is 0-indexed; Stripe DOB month is 1-indexed.
  const monthDelta = asOf.getUTCMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getUTCDate() < day)) {
    age -= 1;
  }
  return age;
}

/** Result of an age-gate evaluation. */
export type AgeGateResult =
  | { ok: true; age: number }
  | { ok: false; code: "dob_missing" | "age_under_min"; message: string };

/** Evaluate the age gate against a Stripe Identity DOB. */
export function requireMinAge(
  dob: StripeDob | null | undefined,
  asOf: Date = new Date(),
  minAge: number = MIN_MEMBER_AGE_YEARS,
): AgeGateResult {
  const age = computeAgeYears(dob, asOf);
  if (age === null) {
    return {
      ok: false,
      code: "dob_missing",
      message:
        "Date of birth is required to claim a share. Re-run identity verification or contact support.",
    };
  }
  if (age < minAge) {
    return {
      ok: false,
      code: "age_under_min",
      message: `RYDA membership requires age ${minAge} or older. Per the Operating Agreement and our Terms of Service, we cannot record an underage member.`,
    };
  }
  return { ok: true, age };
}
