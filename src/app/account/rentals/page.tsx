// /account/rentals — the renter's "My rentals" (build loop 2G).
//
// A SIBLING, NOT A REPLACEMENT. /account/requests is the lead-gen
// inquiry history (rental_inquiries, 0039/0040) and it stays exactly as
// it is; this page is the booking history (rental_bookings, 0047). They
// are different tables describing different things — an inquiry is a
// message to an operator, a booking is a dated financial record with a
// status machine behind it — and the co-ownership surfaces beside them
// (/account/portfolio, /bookings, /portfolio) are untouched, per
// guardrail 3.5.
//
// A server component with a client list inside it: nothing here needs
// state, and the fetch belongs next to the rendering that depends on it.
// The auth gate lives in /account/layout.tsx, which bounces anonymous
// visitors to /signin — RentalBookingList still handles a 401 of its own,
// because a session can expire between the gate and the fetch.

import type { Metadata } from "next";
import { RentalBookingList } from "@/components/account/rental-booking-list";

export const metadata: Metadata = {
  title: "My rentals",
  description:
    "Every car you've requested and where each booking stands — upcoming, active, awaiting the operator, and past.",
  // robots.ts already disallows /account; this defends the route on its
  // own if it is ever linked directly. Same shape as /partner.
  robots: { index: false, follow: false },
};

export default function AccountRentalsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          My rentals
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          You ask for the dates. The operator confirms them.
        </h1>
        {/* GUARDRAIL 3.9: the money rail does not exist yet. This says
            what the code does — a request, an operator's answer, and no
            card anywhere in between — and promises nothing about holds
            or charges that the codebase cannot keep. It also names WHO
            collects: "payment comes later" implied a RYDA charge still to
            come, and RENTAL_CHARGE_RAIL_LIVE is false with no path in
            this build that could make one. */}
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Every car you&apos;ve requested and where it stands. No card is
          collected when you ask, and nothing is charged through RYDA when an
          operator confirms — you settle payment with the operator directly.
        </p>
      </header>

      <RentalBookingList />
    </div>
  );
}
