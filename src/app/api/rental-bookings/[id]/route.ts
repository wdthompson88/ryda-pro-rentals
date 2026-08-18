// GET /api/rental-bookings/[id] — one booking, for a party to it.
//
// "A party" is the renter on the row, approved staff of the operator that
// owns the listing, or an admin. Everyone else gets 404, not 403:
// confirming that a booking id exists is itself a disclosure, and there
// is nothing a stranger could do with the answer. rental-booking-access.ts
// decides all of that; this route only maps its verdict onto a status
// code.
//
// D6 lives in the same place. The operator's name, and their contact
// email, reach the renter only once the booking is confirmed — before
// that the payload carries "a vetted Miami operator" and nothing else.
// The identity is not even LOADED unless the disclosure rule has already
// said yes, so a future edit to the payload cannot leak what was never
// fetched.
//
// Reads go through the service-role client, which bypasses RLS, so the
// checks below are the boundary (guardrail 3.7, RYDA's dominant pattern).
// 0047 is not applied anywhere yet, so a missing table reads as "no such
// booking" — truthful, and not a 500.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/admin-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import {
  RENTAL_BOOKING_COLS,
  discloseOperator,
  isRentalBookingOperatorStaff,
  isRentalBookingRenter,
  loadPartnerStaffIds,
  projectRentalBooking,
  rentalBookingAccess,
  rentalBookingSubject,
  type RentalBookingCaller,
  type RentalBookingListingSummary,
  type RentalBookingRow,
  type RentalOperatorIdentity,
} from "@/lib/rental-booking-access";

export const runtime = "nodejs";

const READ_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTableMissing(
  error: { message?: string } | null,
  table: string,
): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes(table) &&
    (msg.includes("schema cache") || msg.includes("does not exist"))
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await isAllowed(`rental-booking:${clientIp(req)}`, READ_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const bookingRes = await db
    .from("rental_bookings")
    .select(RENTAL_BOOKING_COLS)
    .eq("id", id)
    .maybeSingle();

  if (bookingRes.error) {
    // Pre-0047: the table does not exist, so neither does this booking.
    if (isTableMissing(bookingRes.error, "rental_bookings")) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("[rental-booking · read]", bookingRes.error);
    return NextResponse.json({ error: "Could not load that booking." }, { status: 500 });
  }

  const row = bookingRes.data as RentalBookingRow | null;
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // The listing carries the one fact authorization needs that the booking
  // does not: which operator owns the car. A failed load leaves it null,
  // which fails CLOSED — operator staff are then not recognised and the
  // renter still sees their own row.
  const listingRes = await db
    .from("rental_listings")
    .select("id, partner_id, slug, make, model, year, market")
    .eq("id", row.listing_id)
    .maybeSingle();
  if (listingRes.error) {
    console.warn("[rental-booking · listing]", listingRes.error.message);
  }
  const listing = listingRes.data as {
    id: string;
    partner_id: string;
    slug: string;
    make: string;
    model: string;
    year: number | null;
    market: string;
  } | null;

  const subject = rentalBookingSubject(row, listing?.partner_id);

  // Resolve the caller's other hats only if the cheap one misses. A
  // renter reading their own booking costs one lookup; the partner-staff
  // query and the admin round trip are for the paths that need them.
  const caller: RentalBookingCaller = { userId: user.id };
  if (!isRentalBookingRenter(caller, subject)) {
    caller.partnerIds = await loadPartnerStaffIds(db, user.id);
    if (!isRentalBookingOperatorStaff(caller, subject)) {
      caller.isAdmin = !!(await requireAdmin(req));
    }
  }

  const access = rentalBookingAccess(caller, subject);
  if (!access.ok) {
    return access.reason === "unauthenticated"
      ? NextResponse.json({ error: "Sign in required." }, { status: 401 })
      : NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Loaded ONLY when the disclosure rule has already said yes.
  let operator: RentalOperatorIdentity | null = null;
  if (access.operatorRevealed && listing) {
    const partnerRes = await db
      .from("partners")
      .select("id, name, contact_email")
      .eq("id", listing.partner_id)
      .maybeSingle();
    if (partnerRes.error) {
      console.warn("[rental-booking · operator]", partnerRes.error.message);
    } else if (partnerRes.data) {
      const p = partnerRes.data as {
        id: string;
        name: string | null;
        contact_email: string | null;
      };
      operator = { partnerId: p.id, name: p.name ?? "", email: p.contact_email };
    }
  }

  // ANNOTATED, not inferred, and dropping partner_id is the whole job —
  // see listingSummary() in the list route. Both routes project the car
  // through RentalBookingListingSummary so the three client surfaces read
  // one declaration rather than three that happen to agree today.
  const listingBlock: RentalBookingListingSummary | null = listing
    ? {
        id: listing.id,
        slug: listing.slug,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        market: listing.market,
      }
    : null;

  return NextResponse.json({
    booking: projectRentalBooking(row, access),
    listing: listingBlock,
    operator: discloseOperator(access, operator, listing?.market),
    viewer: { party: access.party, canDecide: access.canDecide },
  });
}
