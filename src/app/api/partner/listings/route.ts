// GET /api/partner/listings — the cars this operator may manage.
// (RYDA_RENTAL_BUILD_LOOP.md task 2F.)
//
// The picker the availability editor opens with, and the first surface
// anywhere in the product that answers "which cars are mine?" for an
// operator. /rent answers it for renters and only for `active` listings;
// this returns EVERY status the operator owns, because a draft or paused
// car is precisely the one they need to find in order to work on it.
//
// Same auth shape as /api/partner/availability: service-role client with
// ownership enforced in code (guardrail 3.7), scoped through
// loadPartnerStaffIds() so "this operator's staff" has one definition
// across the operator surfaces.
//
// WHAT IT DOES NOT RETURN. No commission_rate, no fee terms, no
// stripe_account_id — those live on `partners` and are service-role only
// by 0041's design, and an operator's own commission is shown to them
// through the admin-managed terms surface, not smuggled into a listing
// list. No VIN either: nothing on this screen needs it.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { loadPartnerStaffIds } from "@/lib/rental-booking-access";

export const runtime = "nodejs";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

const COLS =
  "id, slug, make, model, year, status, market, daily_rate_cents, " +
  "min_nights, max_nights, available_from, available_until, " +
  "booking_horizon_days, instant_book";

type Row = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  status: string;
  market: string;
  daily_rate_cents: number;
  min_nights: number;
  max_nights: number;
  available_from: string | null;
  available_until: string | null;
  booking_horizon_days: number;
  instant_book: boolean;
};

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (
    !(await isAllowed(
      `partner-listings:${user.id}:${clientIp(req)}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    ))
  ) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const db = requireSupabaseAdmin();
  const partnerIds = await loadPartnerStaffIds(db, user.id);
  // Not approved staff anywhere: an empty fleet, not an error. A pending
  // applicant hitting this should see "no cars yet", not a 403 that reads
  // as a bug on a page they were legitimately shown.
  if (partnerIds.length === 0) {
    return NextResponse.json({ listings: [] });
  }

  const res = await db
    .from("rental_listings")
    .select(COLS)
    .in("partner_id", partnerIds)
    .order("make", { ascending: true })
    .order("model", { ascending: true });

  if (res.error) {
    console.warn("[partner-listings]", res.error.message);
    return NextResponse.json(
      { error: "Could not load your cars." },
      { status: 500 },
    );
  }

  const listings = ((res.data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    slug: r.slug,
    make: r.make,
    model: r.model,
    year: r.year,
    status: r.status,
    market: r.market,
    dailyRateCents: r.daily_rate_cents,
    minNights: r.min_nights,
    maxNights: r.max_nights,
    availableFrom: r.available_from,
    availableUntil: r.available_until,
    bookingHorizonDays: r.booking_horizon_days,
    instantBook: r.instant_book,
  }));

  return NextResponse.json({ listings });
}
