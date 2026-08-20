"use client";

// /bookings/[id]/handover — the screen both parties open at the car.
// (RYDA_RENTAL_BUILD_LOOP.md phase 4C.)
//
// Deliberately NOT under /account or /partner. Either party records a
// handover — the operator handing over keys, or the renter collecting
// from a lockbox — so a route nested under one party's dashboard would
// be the wrong home for half the people who need it, and would imply an
// ownership the API does not enforce. /bookings/[id] is the booking's
// own surface; the API decides who may see it.
//
// It works out which handover is due rather than asking. A booking is in
// exactly one state, that state determines whether the next event is a
// pickup or a return, and presenting a choice would invite the one
// mistake the API then has to refuse (a return before a checkin). The
// page reads the booking, decides, and shows the single form that applies.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuthStatus } from "@/lib/use-auth-status";
import { authedFetch } from "@/lib/api-fetch";
import { FOCUS_RING } from "@/lib/rental-booking-display";
import { RentalHandoverForm } from "@/components/rental-handover-form";
import {
  HANDOVER_TRANSITION,
  milesDriven,
  type RentalHandoverType,
} from "@/lib/rental-handover";
import type { RentalBookingStatus } from "@/lib/rental-booking-status";

type Booking = {
  id: string;
  status: RentalBookingStatus;
  startDate: string;
  endDate: string;
};

/** The car. A SIBLING of `booking` in the API's response, not nested
 *  inside it — the route returns { booking, listing, operator, viewer }. */
type Listing = {
  make?: string;
  model?: string;
  year?: number | null;
} | null;

type Handover = {
  id: string;
  type: RentalHandoverType;
  odometer_miles: number;
  fuel_level_pct: number;
  condition_notes: string | null;
  photo_paths: string[];
  created_at: string;
};

function carName(l: Listing): string {
  if (!l) return "your booking";
  return [l.year, l.make, l.model].filter(Boolean).join(" ") || "your booking";
}

/** Which handover is due, given where the booking is. Null when none is. */
function dueType(status: RentalBookingStatus): RentalHandoverType | null {
  if (status === HANDOVER_TRANSITION.checkin.from) return "checkin";
  if (status === HANDOVER_TRANSITION.return.from) return "return";
  return null;
}

export default function HandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { status: authStatus } = useAuthStatus();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing>(null);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [miles, setMiles] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setBookingId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!bookingId || authStatus !== "authed") return;
    setLoading(true);
    setError(null);
    try {
      const [bRes, hRes] = await Promise.all([
        authedFetch(`/api/rental-bookings/${encodeURIComponent(bookingId)}`),
        authedFetch(
          `/api/rental-bookings/${encodeURIComponent(bookingId)}/handover`,
        ),
      ]);

      if (!bRes.ok) {
        // 404 covers both "no such booking" and "not yours" — the API
        // does not distinguish, and neither should this.
        setError("We couldn't find that booking.");
        setBooking(null);
        return;
      }
      const bJson = (await bRes.json().catch(() => null)) as {
        booking?: Booking;
        listing?: Listing;
      } | null;
      setBooking(bJson?.booking ?? null);
      setListing(bJson?.listing ?? null);

      if (hRes.ok) {
        const hJson = (await hRes.json().catch(() => null)) as {
          handovers?: Handover[];
          milesDriven?: number | null;
        } | null;
        setHandovers(hJson?.handovers ?? []);
        setMiles(hJson?.milesDriven ?? null);
      }
    } catch {
      setError("We couldn't load that booking.");
    } finally {
      setLoading(false);
    }
  }, [bookingId, authStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const due = booking ? dueType(booking.status) : null;
  const recorded = new Set(handovers.map((h) => h.type));
  // The API is the authority; this only decides what to render.
  const showForm = due !== null && !recorded.has(due);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
        <nav className="text-sm text-mute">
          <Link
            href="/account/rentals"
            className={`underline hover:text-ink ${FOCUS_RING}`}
          >
            My rentals
          </Link>
        </nav>

        {authStatus === "loading" && (
          <p className="mt-8 text-sm text-mute">Loading…</p>
        )}

        {authStatus === "anon" && (
          <div className="mt-8 rounded-2xl border border-rule bg-cream-2 px-8 py-10">
            <p className="font-display text-2xl text-ink">Sign in to continue.</p>
            <Link
              href={`/signin?next=/bookings/${bookingId ?? ""}/handover`}
              className={`mt-4 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red ${FOCUS_RING}`}
            >
              Sign in
            </Link>
          </div>
        )}

        {authStatus === "authed" && (
          <div className="mt-8 space-y-8">
            {loading && <p className="text-sm text-mute">Loading…</p>}

            {error && (
              <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
                {error}
              </p>
            )}

            {!loading && !error && booking && (
              <>
                {showForm && due && (
                  <RentalHandoverForm
                    bookingId={booking.id}
                    type={due}
                    vehicleName={carName(listing)}
                    onRecorded={() => void load()}
                  />
                )}

                {!showForm && (
                  <div className="rounded-2xl border border-rule bg-surface p-6">
                    <p className="font-display text-xl text-ink">
                      {booking.status === "completed"
                        ? "This booking is complete."
                        : "Nothing to record right now."}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">
                      {booking.status === "completed"
                        ? "Both the pickup and the return are on file."
                        : booking.status === "requested"
                          ? "This request hasn't been confirmed yet."
                          : `This booking is ${booking.status}.`}
                    </p>
                  </div>
                )}

                {/* What is already on file. Read-only by design — 0053
                    makes the readings write-once, so an edit affordance
                    here would offer something the server refuses. */}
                {handovers.length > 0 && (
                  <section>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                      On file
                    </p>
                    <ul className="mt-3 space-y-3">
                      {handovers.map((h) => (
                        <li
                          key={h.id}
                          className="rounded-xl border border-rule bg-surface px-4 py-3"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium text-ink">
                              {h.type === "checkin" ? "Pickup" : "Return"}
                            </span>
                            <span className="text-xs text-mute tabular-nums">
                              {h.odometer_miles.toLocaleString()} mi ·{" "}
                              {h.fuel_level_pct}% fuel
                              {h.photo_paths.length > 0
                                ? ` · ${h.photo_paths.length} photo${h.photo_paths.length === 1 ? "" : "s"}`
                                : ""}
                            </span>
                          </div>
                          {h.condition_notes && (
                            <p className="mt-2 text-sm text-ink-soft">
                              {h.condition_notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {miles !== null && (
                      <p className="mt-3 text-sm text-ink-soft tabular-nums">
                        {miles < 0 ? (
                          // Surfaced rather than hidden: a backwards
                          // odometer is a misread, a swapped car or a
                          // tampered cluster, and all three need a human.
                          <span className="text-red">
                            Odometer went backwards by{" "}
                            {Math.abs(miles).toLocaleString()} mi — check the
                            readings.
                          </span>
                        ) : (
                          <>Driven: {miles.toLocaleString()} mi</>
                        )}
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
