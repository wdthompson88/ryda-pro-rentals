// What a renter must have on file before a request can be sent, and the
// one validator both sides of the wire run against it.
//
// Founder decision (2026-08-26): a rental request is sent by a known
// person. Full name and phone so the operator can reach them (email
// comes off the account), and a date of birth so an under-25 renter is
// told BEFORE the request exists rather than at the operator's confirm
// step, where 1A refuses (rental-eligibility.ts).
//
// The date of birth typed here is NOT the one 1A trusts. That one comes
// off a government ID via Stripe Identity and is decrypted server-side
// only. This one is the renter's own word — enough to stop a wasted
// request, and nothing built on it may claim more.
//
// Pure: no Supabase, no `server-only`. The confirm dialog on
// /rent/[symbol] and POST /api/rental-bookings both call
// validateRenterDetails, so a refusal after the click reads in the same
// words as one before it.

import {
  ageOnDate,
  RENTAL_MIN_AGE_YEARS,
  rentalEligibilityMessage,
} from "./rental-eligibility";

export type RenterDetails = {
  /** Legal name, as on the ID the operator sees at the kerb. */
  fullName: string;
  phone: string;
  /** 'YYYY-MM-DD', or "" when nothing is on file. */
  dateOfBirth: string;
};

export const EMPTY_RENTER_DETAILS: RenterDetails = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
};

export type RenterDetailsField = keyof RenterDetails;

export type RenterDetailsProblem = {
  field: RenterDetailsField;
  /**
   * missing    the field is blank or not a value at all
   * invalid    a value, but not a possible one (Feb 30, born after pickup)
   * under_age  a real date of birth that fails the 25-at-pickup rule
   */
  kind: "missing" | "invalid" | "under_age";
  /** Renter-facing, and the same sentence on both sides of the wire. */
  message: string;
};

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → the {day, month, year} shape rental-eligibility reads. */
export function isoToDob(
  iso: string,
): { day: number; month: number; year: number } | null {
  const m = ISO_DAY.exec(iso.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** How many digits a string carries — the "is this a phone number at
 *  all" test. Formatting is the renter's business; seven digits is the
 *  shortest thing an operator could dial. */
function phoneDigits(phone: string): number {
  return (phone.match(/\d/g) ?? []).length;
}

/**
 * The first thing wrong with these details, or null when they are fit to
 * send. `pickupDate` is the booking's start day: age is measured THERE,
 * not today — a renter who turns 25 the week before the trip is eligible
 * for that trip (rental-eligibility.ts explains at length).
 */
export function validateRenterDetails(
  details: RenterDetails,
  pickupDate: string,
): RenterDetailsProblem | null {
  if (details.fullName.trim().length < 2) {
    return {
      field: "fullName",
      kind: "missing",
      message: "Your full name, as it appears on your ID.",
    };
  }
  if (phoneDigits(details.phone) < 7) {
    return {
      field: "phone",
      kind: "missing",
      message: "A phone number the operator can reach you on.",
    };
  }
  const dob = isoToDob(details.dateOfBirth);
  if (!dob) {
    return { field: "dateOfBirth", kind: "missing", message: "Your date of birth." };
  }
  // ageOnDate rejects an impossible calendar day (Feb 30 → null) and
  // returns a negative age for a birthday after the pickup. Both are
  // "check the date", not "you're too young".
  const age = ageOnDate(dob, pickupDate);
  if (age === null || age < 0) {
    return {
      field: "dateOfBirth",
      kind: "invalid",
      message: "Check your date of birth.",
    };
  }
  if (age < RENTAL_MIN_AGE_YEARS) {
    return {
      field: "dateOfBirth",
      kind: "under_age",
      message: rentalEligibilityMessage("under_age"),
    };
  }
  return null;
}
