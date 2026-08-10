"use client";

// The operator's booking list, as a FETCH — the wire shape and the one
// call that produces it, with no component attached.
//
// WHY IT IS NOT IN booking-request-list.tsx ANY MORE. Two surfaces read
// this list: /partner/requests renders the inbox, and /partner badges its
// Fleet panel with a pending count. Both used to import
// fetchOperatorBookings() from the inbox component — a "use client"
// module that imports RentalDatePicker (a month-grid calendar), the admin
// action modal, rental-quote and rental-availability at module scope. So
// every operator loading the dashboard downloaded a date picker and a
// modal implementation in order to render the string "3 waiting".
//
// WHY IT IS NOT IN rental-booking-display.ts EITHER, which is where
// countOperatorRequests() lives and would otherwise be the obvious home:
// that module is pure by contract — "No React, no server-only import, no
// Supabase client", because it is pulled into three client bundles — and
// authedFetch reaches the browser's Supabase session. Putting a fetch
// there would break the one property its header asks callers to keep.
//
// NOTE WHAT AN EMPTY LIST DOES NOT DISTINGUISH. The route answers
// `{ bookings: [] }` with a 200 for four different worlds: this operator
// has no listings, has listings but no requests, is not approved staff of
// any partner, or is pointed at a database where 0047 has not been
// applied. Each degrades to the same payload on purpose (a missing table
// must not 500 a dashboard), and no field distinguishes them — so the
// inbox's empty state names the possibilities instead of asserting one.

import { authedFetch } from "@/lib/api-fetch";
import type { RentalBookingItem } from "@/lib/rental-booking-access";

/**
 * One row of the inbox.
 *
 * RentalBookingItem is imported rather than restated so the dates, the
 * status, the money, the car and awaitsDecisionFrom are the SAME
 * declaration the route projects — a field renamed there is a compile
 * error here, and the renter's list and the confirmation page read that
 * one declaration too.
 *
 * `renter` and `message` are optional because the platform does not send
 * them yet, and faking either on the client would be worse than their
 * absence. public.rental_bookings (0047) deliberately stores no renter
 * PII — "renter identity lives in rental_profiles and auth.users" — and
 * rental-booking-access.ts, the one authority on what a booking
 * discloses, has no renter projection at all: RentalBookingView carries
 * renterUserId and nothing else about the person. When a first name IS
 * disclosed it must be a FIRST NAME ONLY, the mirror of D6's operator
 * anonymity: neither side gets a surname out of a booking that has not
 * been confirmed. Typed here so the day the route adds the block, the
 * list renders it with no further change; rendered as absent until then.
 */
export type OperatorBooking = RentalBookingItem & {
  /** First name only. Absent until the API discloses it — see above. */
  renter?: { firstName: string | null } | null;
  /** The note the renter sent with the request. Absent until disclosed. */
  message?: string | null;
};

export const OPERATOR_BOOKINGS_ENDPOINT = "/api/rental-bookings?role=operator";

/** The inbox, or an honest reason there isn't one. */
export async function fetchOperatorBookings(): Promise<
  | { ok: true; bookings: OperatorBooking[] }
  | { ok: false; status: number; error: string }
> {
  let res: Response;
  try {
    res = await authedFetch(OPERATOR_BOOKINGS_ENDPOINT);
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Could not reach RYDA. Check your connection.",
    };
  }
  const body = (await res.json().catch(() => ({}))) as {
    bookings?: OperatorBooking[];
    error?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: body.error || `Could not load requests (${res.status}).`,
    };
  }
  return {
    ok: true,
    bookings: Array.isArray(body.bookings) ? body.bookings : [],
  };
}
