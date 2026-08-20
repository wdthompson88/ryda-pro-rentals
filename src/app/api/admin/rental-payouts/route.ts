// GET /api/admin/rental-payouts — what RYDA owes operators, and what is
// stopping each one. (RYDA_RENTAL_BUILD_LOOP.md phase 3B, decision D4.)
//
// WHY THIS EXISTS BEFORE THE TRANSFER DOES.
//
// The D1 rail makes RYDA hold the operator's money between the charge and
// the payout. That introduces a failure mode the direct-charge rail never
// had: money can sit still. A transfer that never fires is silent — no
// error, no webhook, no angry Stripe email — and the only party who
// notices is the operator who was not paid, eventually, by asking.
//
// So the reconciliation view is not a reporting nicety bolted on after
// the rail; it is the thing that makes holding funds survivable, and it
// is worth having BEFORE the first charge rather than after the first
// complaint. Today it correctly reports nothing owed, because no charge
// exists yet. What it already reports usefully is which operators could
// NOT be paid if money arrived tomorrow — a question with real answers
// right now (see decidePayout's operator branch).
//
// EVERY DECISION COMES FROM decidePayout(). This route does no arithmetic
// and holds no opinion about payability; it joins three tables and hands
// each row to the same pure function the payout route will call. An admin
// looking at "blocked: payouts disabled" is reading the exact reason the
// transfer would refuse with.
//
// Admin-only. partners carries commission terms and acct_ ids, and this
// payload names operators and amounts — none of it is renter- or
// operator-facing.

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import {
  decidePayout,
  isPayoutStatusStale,
  payoutBlockMessage,
  payoutBlockOwner,
  summarisePayouts,
  type PayoutBooking,
  type PayoutLine,
  type PayoutPartner,
  type PayoutPayment,
} from "@/lib/rental-payout";
import type { RentalBookingStatus } from "@/lib/rental-booking-status";

export const runtime = "nodejs";

/** Bookings scanned per call. A marketplace this size cannot exceed it;
 *  the cap exists so the query has a bound, not because it is expected
 *  to bite. `truncated` in the response says when it did. */
const SCAN_LIMIT = 500;

type BookingRow = PayoutBooking & { listing_id: string };

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const db = requireSupabaseAdmin();

  // Everything that could ever owe a payout. `completed` is the only
  // status decidePayout() will pay on, but the scan deliberately includes
  // the two that PRECEDE it so the view can show an admin what is coming
  // — a payout pipeline that only lists what is already due tells you
  // nothing until the moment it is late.
  const bookingsRes = await db
    .from("rental_bookings")
    .select("id, listing_id, status, end_date")
    .in("status", ["confirmed", "in_progress", "completed"])
    .order("end_date", { ascending: true })
    .limit(SCAN_LIMIT + 1);

  if (bookingsRes.error) {
    console.warn("[admin rental-payouts · bookings]", bookingsRes.error.message);
    return NextResponse.json(
      { error: "Could not read bookings." },
      { status: 500 },
    );
  }

  const scanned = (bookingsRes.data ?? []) as unknown as BookingRow[];
  const truncated = scanned.length > SCAN_LIMIT;
  const bookings = truncated ? scanned.slice(0, SCAN_LIMIT) : scanned;

  if (bookings.length === 0) {
    return NextResponse.json({
      summary: summarisePayouts([]),
      lines: [],
      truncated: false,
    });
  }

  // The operator behind each booking is a two-hop join (booking →
  // listing → partner), done as two IN queries rather than a nested
  // select so a missing row degrades to "unknown operator" instead of
  // dropping the booking from the reconciliation entirely. A payout that
  // vanishes from the list because of a join miss is the exact class of
  // silence this route exists to prevent.
  const listingIds = [...new Set(bookings.map((b) => b.listing_id))];
  const listingsRes = await db
    .from("rental_listings")
    .select("id, partner_id")
    .in("id", listingIds);

  if (listingsRes.error) {
    console.warn("[admin rental-payouts · listings]", listingsRes.error.message);
    return NextResponse.json(
      { error: "Could not read listings." },
      { status: 500 },
    );
  }
  const partnerByListing = new Map<string, string>();
  for (const l of (listingsRes.data ?? []) as { id: string; partner_id: string }[]) {
    partnerByListing.set(l.id, l.partner_id);
  }

  const partnerIds = [...new Set([...partnerByListing.values()])];
  const partnersRes = partnerIds.length
    ? await db
        .from("partners")
        .select(
          "id, name, stripe_account_id, payouts_enabled, details_submitted, " +
            "transfers_capability, payout_status_at",
        )
        .in("id", partnerIds)
    : { data: [], error: null };

  if (partnersRes.error) {
    // A pre-0052 database has no readiness columns. Rather than 500 the
    // whole view, fall back to a roster with readiness unknown — which
    // decidePayout() treats as not-payable, so the numbers stay
    // conservative and the reason reads honestly.
    console.warn("[admin rental-payouts · partners]", partnersRes.error.message);
  }
  const partnerById = new Map<string, PayoutPartner>();
  for (const p of (partnersRes.data ?? []) as unknown as PayoutPartner[]) {
    partnerById.set(p.id, p);
  }

  // The ledger rows, keyed by booking. A booking may have several over
  // its life (charge, deposit, refund); the payout decision cares about
  // the CHARGE, which is the row carrying operator_net_cents.
  const paymentsRes = await db
    .from("rental_payments")
    .select(
      "id, booking_id, status, operator_net_cents, refunded_cents, " +
        "stripe_transfer_id, transferred_at",
    )
    .in(
      "booking_id",
      bookings.map((b) => b.id),
    );

  if (paymentsRes.error) {
    console.warn("[admin rental-payouts · payments]", paymentsRes.error.message);
    return NextResponse.json(
      { error: "Could not read the payment ledger." },
      { status: 500 },
    );
  }

  const paymentByBooking = new Map<string, PayoutPayment>();
  for (const row of (paymentsRes.data ?? []) as unknown as (PayoutPayment & {
    booking_id: string | null;
  })[]) {
    if (!row.booking_id) continue;
    // Keep the row that actually carries an operator net — the charge —
    // over a deposit or a zero-net sibling.
    const existing = paymentByBooking.get(row.booking_id);
    if (!existing || (existing.operator_net_cents ?? 0) === 0) {
      paymentByBooking.set(row.booking_id, row);
    }
  }

  const UNKNOWN_PARTNER: PayoutPartner = {
    id: "",
    name: "Unknown operator",
    stripe_account_id: null,
    payouts_enabled: false,
    details_submitted: false,
    transfers_capability: null,
    payout_status_at: null,
  };

  const lines: PayoutLine[] = bookings.map((b) => {
    const partnerId = partnerByListing.get(b.listing_id) ?? "";
    const partner = partnerById.get(partnerId) ?? {
      ...UNKNOWN_PARTNER,
      id: partnerId,
    };
    return {
      bookingId: b.id,
      partnerId: partner.id,
      partnerName: partner.name,
      decision: decidePayout({
        booking: {
          id: b.id,
          status: b.status as RentalBookingStatus,
          end_date: b.end_date,
        },
        payment: paymentByBooking.get(b.id) ?? null,
        partner,
      }),
    };
  });

  return NextResponse.json({
    summary: summarisePayouts(lines),
    truncated,
    lines: lines.map((l) => ({
      bookingId: l.bookingId,
      partnerId: l.partnerId,
      partnerName: l.partnerName,
      payable: l.decision.payable,
      amountCents: l.decision.amountCents,
      reason: l.decision.payable ? null : l.decision.reason,
      message: l.decision.payable ? null : payoutBlockMessage(l.decision.reason),
      blockedBy: l.decision.payable ? null : payoutBlockOwner(l.decision.reason),
      // Surfaced per line so an admin can tell "Stripe says payouts are
      // off" from "we have not asked Stripe since June".
      readinessStale: isPayoutStatusStale(
        partnerById.get(l.partnerId)?.payout_status_at ?? null,
      ),
    })),
  });
}
