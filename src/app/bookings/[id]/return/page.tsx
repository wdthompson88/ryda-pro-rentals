"use client";

// /bookings/[id]/return — return-handover flow.
//
// Same shape as /bookings/[id]/checkin (intentionally — they share
// the HandoverFlow component); the only differences are:
//   - variant="return" instead of "checkin"
//   - status guardrail expects "in-progress" instead of "confirmed"
//   - the API call transitions in-progress → completed
//
// Both pages duplicate ~80% of the boilerplate rather than sharing
// because the next-launch refactor will likely pull both into a
// single dynamic route once the conditional copy stabilizes.
// Keeping them parallel for now makes the diff obvious and keeps
// the handover component itself dead-simple to reason about.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HandoverFlow, type HandoverSubmitInput } from "@/components/handover-flow";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { getVehicleBySymbol } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type BookingRow = {
  id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  status: string;
};

export default function ReturnPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, vehicle_symbol, boat_slug, status")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadErr(error?.message ?? "Booking not found.");
      } else {
        setBooking(data as BookingRow);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-mute">
          Loading booking…
        </div>
      </>
    );
  }

  if (loadErr || !booking) {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Return
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink">
            Booking not available.
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            {loadErr ?? "We couldn't load this booking."} If you booked
            this vehicle and are seeing this message, please reach out
            via the chat icon — RYDA support is on call 24/7.
          </p>
          <Link
            href="/bookings"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
          >
            Back to bookings →
          </Link>
        </div>
      </>
    );
  }

  let vehicleName = "RYDA-operated vehicle";
  if (booking.vehicle_symbol) {
    const v = getVehicleBySymbol(booking.vehicle_symbol);
    if (v) vehicleName = `${v.year} ${v.name}`;
  } else if (booking.boat_slug) {
    const b = BOATS.find((x) => x.slug === booking.boat_slug);
    if (b) vehicleName = `${b.year} ${b.name}`;
  }

  // Returns require status == in-progress (i.e., checkin already done).
  if (booking.status !== "in-progress") {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Return
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink">
            This booking isn&apos;t ready for return.
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            Current status:{" "}
            <span className="font-medium text-ink">{booking.status}</span>.
            Return is only available once the booking is{" "}
            <span className="font-medium text-ink">in-progress</span>{" "}
            (after pickup).
          </p>
          <Link
            href="/bookings"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
          >
            Back to bookings →
          </Link>
        </div>
      </>
    );
  }

  async function handleSubmit(input: HandoverSubmitInput) {
    const res = await authedFetch(`/api/bookings/${id}/handover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: input.type,
        odometer_miles: input.odometerMiles,
        fuel_level_pct: input.fuelLevelPct,
        condition_good: input.conditionGood,
        condition_notes: input.conditionNotes || null,
        member_signed_name: input.memberSignedName,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    router.refresh();
  }

  return (
    <>
      <SiteHeader />
      <HandoverFlow
        variant="return"
        bookingId={booking.id}
        vehicleName={vehicleName}
        onSubmit={handleSubmit}
      />
    </>
  );
}
