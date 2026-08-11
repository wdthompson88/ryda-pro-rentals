// GET /api/admin/overview
//
// Admin-only read endpoint that returns counts + recent rows for the
// operational triage dashboard:
//   - rental_inquiries by status (new, sent, booked, lost)
//   - rental_bookings by status (requested, confirmed, in_progress, …)
//   - rental_payments by status (pending, paid, expired, canceled)
//   - 20 most-recent rows per category for spot-checking
//
// This endpoint used to aggregate share_purchases, bookings,
// kyc_verifications and share_transfers — four co-ownership tables with
// no rental row between them. The co-ownership product moved out; the
// triage console now watches the rental funnel end to end: a lead
// arrives (rental_inquiries), an operator answers it (rental_bookings),
// and money moves on the Connect rail (rental_payments).
//
// A note on the two booking tables, because the names collide. Migration
// 0047's header is explicit that public.rental_bookings is a NEW table
// parallel to the older public.bookings — the latter is share-entitlement
// scoped co-ownership and the two are never joined. Only rental_bookings
// is read here. Its status vocabulary also spells the terminal state
// 'cancelled' (two Ls), unlike the co-ownership table; filters below use
// the rental spelling.
//
// Uses the service-role client (bypasses RLS) intentionally — admins
// need to see across all users. Gating is enforced by requireAdmin() on
// app_metadata.role === 'admin' (service-role-only writable;
// user-controlled user_metadata is NOT trusted).

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

// Statuses that mean "this needs a human today". An inquiry sitting in
// 'new' has not been routed to an operator yet; a booking in 'requested'
// is burning down its 24h expiry (0047's `expires_at` default).
const OPEN_BOOKING_STATUSES = ["requested", "confirmed", "in_progress"];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let db;
  try {
    db = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  // Counts and recent rows in parallel. Count queries use the Supabase
  // head=true + count='exact' pattern so we don't pull every row just
  // to count them.
  const [
    inquiriesRecent,
    bookingsRecent,
    paymentsRecent,
    newInquiries,
    sentInquiries,
    bookedInquiries,
    requestedBookings,
    openBookings,
    pendingPayments,
  ] = await Promise.all([
    db
      .from("rental_inquiries")
      .select(
        "id, name, email, vehicle_slug, vehicle_label, fleet, market, start_date, end_date, status, partner_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("rental_bookings")
      .select(
        "id, listing_id, renter_user_id, start_date, end_date, status, initiated_by, renter_total_cents, fee_cents, currency, expires_at, confirmed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("rental_payments")
      .select(
        "id, inquiry_id, partner_id, amount_cents, application_fee_cents, currency, status, pay_link_sent_at, paid_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("rental_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("rental_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    db
      .from("rental_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "booked"),
    db
      .from("rental_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    db
      .from("rental_bookings")
      .select("id", { count: "exact", head: true })
      .in("status", OPEN_BOOKING_STATUSES),
    db
      .from("rental_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  // Resolve listing_id → a human label for the bookings table. Done as
  // a second round-trip rather than a PostgREST embed because the embed
  // would need a named FK relationship and this is at most 20 ids.
  const listingIds = Array.from(
    new Set((bookingsRecent.data ?? []).map((b) => b.listing_id).filter(Boolean)),
  );
  const listingLabels: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await db
      .from("rental_listings")
      .select("id, slug, make, model, year")
      .in("id", listingIds);
    for (const l of listings ?? []) {
      const parts = [l.year, l.make, l.model].filter(Boolean);
      listingLabels[l.id] = parts.length > 0 ? parts.join(" ") : (l.slug ?? l.id);
    }
  }

  return NextResponse.json({
    counts: {
      inquiries_new: newInquiries.count ?? 0,
      inquiries_sent: sentInquiries.count ?? 0,
      inquiries_booked: bookedInquiries.count ?? 0,
      bookings_requested: requestedBookings.count ?? 0,
      bookings_open: openBookings.count ?? 0,
      payments_pending: pendingPayments.count ?? 0,
    },
    recent: {
      inquiries: inquiriesRecent.data ?? [],
      bookings: (bookingsRecent.data ?? []).map((b) => ({
        ...b,
        // Denormalized for display only — the id stays authoritative.
        listing_label: listingLabels[b.listing_id] ?? null,
      })),
      payments: paymentsRecent.data ?? [],
    },
  });
}
