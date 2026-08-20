// Pickup and return: what a handover may contain, who may record one,
// and which booking transition it drives. (Build loop 4C, migration 0053.)
//
// Pure — no Supabase client, no `server-only` — so the route, its tests
// and any future at-the-kerb UI all decide the same way.
//
// THE DATABASE IS THE AUTHORITY on the transition: 0053's
// rental_handovers_advance trigger moves the booking in the same
// transaction as the insert, and 0047's status trigger polices whether
// that move is legal. This module exists so a route can say the same
// thing FIRST, with a sentence an operator standing next to a car can
// act on, instead of surfacing a raise from two tables away.

import type { RentalBookingStatus } from "./rental-booking-status";

export const RENTAL_HANDOVER_TYPES = ["checkin", "return"] as const;
export type RentalHandoverType = (typeof RENTAL_HANDOVER_TYPES)[number];

/** Mirrors 0053's length check on condition_notes. */
export const HANDOVER_NOTES_MAX = 4000;

/** A defensive ceiling on odometer input — roughly twice the highest
 *  mileage any real car reaches, so a typo'd extra digit is caught while
 *  no legitimate reading is. 0053 only checks >= 0. */
export const ODOMETER_MAX_MILES = 2_000_000;

/** Photos per handover. Enough to document a car from every angle plus
 *  damage close-ups; bounded so one submit cannot write an unbounded
 *  array into a row. */
export const HANDOVER_PHOTOS_MAX = 24;

/**
 * The booking status each handover type requires, and the one it
 * produces. Mirrors the trigger in 0053 exactly — the drift test asserts
 * it against the SQL.
 */
export const HANDOVER_TRANSITION: Readonly<
  Record<RentalHandoverType, { from: RentalBookingStatus; to: RentalBookingStatus }>
> = {
  checkin: { from: "confirmed", to: "in_progress" },
  return: { from: "in_progress", to: "completed" },
} as const;

export type HandoverInput = {
  type: RentalHandoverType;
  odometerMiles: number;
  fuelLevelPct: number;
  conditionNotes: string | null;
  photoPaths: string[];
};

export type HandoverRejection =
  | "bad_type"
  | "bad_odometer"
  | "bad_fuel"
  | "notes_too_long"
  | "too_many_photos"
  | "bad_photo_path";

export type HandoverParse =
  | { ok: true; input: HandoverInput }
  | { ok: false; reason: HandoverRejection };

/** Storage paths only — no URLs, no traversal, no absolute paths. */
const PHOTO_PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/._-]{0,255}$/;

function isType(v: unknown): v is RentalHandoverType {
  return (
    typeof v === "string" &&
    (RENTAL_HANDOVER_TYPES as readonly string[]).includes(v)
  );
}

export function parseHandover(raw: unknown): HandoverParse {
  const b = (raw ?? {}) as Record<string, unknown>;

  if (!isType(b.type)) return { ok: false, reason: "bad_type" };

  // Integers only. A fractional odometer is a misread field, and 0053
  // declares the column integer — letting 12345.6 through would round in
  // the driver rather than being rejected where it can be explained.
  const odo = b.odometerMiles;
  if (
    typeof odo !== "number" ||
    !Number.isSafeInteger(odo) ||
    odo < 0 ||
    odo > ODOMETER_MAX_MILES
  ) {
    return { ok: false, reason: "bad_odometer" };
  }

  const fuel = b.fuelLevelPct;
  if (
    typeof fuel !== "number" ||
    !Number.isSafeInteger(fuel) ||
    fuel < 0 ||
    fuel > 100
  ) {
    return { ok: false, reason: "bad_fuel" };
  }

  let conditionNotes: string | null = null;
  if (typeof b.conditionNotes === "string" && b.conditionNotes.trim()) {
    const trimmed = b.conditionNotes.trim();
    if (trimmed.length > HANDOVER_NOTES_MAX) {
      return { ok: false, reason: "notes_too_long" };
    }
    conditionNotes = trimmed;
  }

  const rawPaths = Array.isArray(b.photoPaths) ? b.photoPaths : [];
  if (rawPaths.length > HANDOVER_PHOTOS_MAX) {
    return { ok: false, reason: "too_many_photos" };
  }
  const photoPaths: string[] = [];
  for (const p of rawPaths) {
    if (typeof p !== "string" || !PHOTO_PATH_RE.test(p) || p.includes("..")) {
      return { ok: false, reason: "bad_photo_path" };
    }
    photoPaths.push(p);
  }

  return {
    ok: true,
    input: {
      type: b.type,
      odometerMiles: odo,
      fuelLevelPct: fuel,
      conditionNotes,
      photoPaths,
    },
  };
}

export function handoverRejectionMessage(reason: HandoverRejection): string {
  switch (reason) {
    case "bad_type":
      return "Say whether this is a pickup or a return.";
    case "bad_odometer":
      return "Enter the odometer reading in whole miles.";
    case "bad_fuel":
      return "Enter the fuel level as a whole percentage, 0 to 100.";
    case "notes_too_long":
      return `Keep condition notes under ${HANDOVER_NOTES_MAX} characters.`;
    case "too_many_photos":
      return `Attach at most ${HANDOVER_PHOTOS_MAX} photos.`;
    case "bad_photo_path":
      return "One of those photos didn't upload correctly. Try again.";
  }
}

export type HandoverBlockReason =
  | "wrong_status_checkin"
  | "wrong_status_return"
  | "return_before_checkin"
  | "already_recorded";

/**
 * May this handover be recorded against a booking in this status?
 *
 * `return_before_checkin` is called out separately from the generic
 * wrong-status case because it is the mistake an operator actually makes
 * — recording a return on a booking they never checked in — and "expected
 * in_progress" does not tell them to go and check in first.
 */
export function checkHandoverAllowed(
  type: RentalHandoverType,
  bookingStatus: RentalBookingStatus,
  existingTypes: readonly RentalHandoverType[] = [],
): { ok: true } | { ok: false; reason: HandoverBlockReason } {
  if (existingTypes.includes(type)) {
    return { ok: false, reason: "already_recorded" };
  }

  const expected = HANDOVER_TRANSITION[type].from;
  if (bookingStatus === expected) return { ok: true };

  if (type === "return") {
    // Confirmed but never checked in — the actionable case.
    if (bookingStatus === "confirmed") {
      return { ok: false, reason: "return_before_checkin" };
    }
    return { ok: false, reason: "wrong_status_return" };
  }
  return { ok: false, reason: "wrong_status_checkin" };
}

export function handoverBlockMessage(
  reason: HandoverBlockReason,
  bookingStatus: RentalBookingStatus,
): string {
  switch (reason) {
    case "already_recorded":
      return "That's already been recorded for this booking.";
    case "return_before_checkin":
      return "Check the car out first — this booking hasn't been picked up yet.";
    case "wrong_status_checkin":
      return `This booking is ${bookingStatus}, so it can't be picked up.`;
    case "wrong_status_return":
      return `This booking is ${bookingStatus}, so it can't be returned.`;
  }
}

/**
 * Miles driven between two readings, or null when it cannot be known.
 *
 * Returns null rather than 0 for a missing checkin: "we have no baseline"
 * and "the car did not move" are different facts, and only one of them
 * should ever appear on an overage charge.
 *
 * A NEGATIVE difference is returned as-is rather than clamped. An
 * odometer that went backwards is a misread, a swapped car or a tampered
 * cluster — every one of which a human needs to see, and none of which is
 * improved by showing zero.
 */
export function milesDriven(
  checkinOdometer: number | null | undefined,
  returnOdometer: number | null | undefined,
): number | null {
  if (typeof checkinOdometer !== "number" || typeof returnOdometer !== "number") {
    return null;
  }
  return returnOdometer - checkinOdometer;
}
