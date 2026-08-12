// /rent/booking-confirmed — PUBLIC landing page after a rental
// Checkout payment succeeds.
//
// Why public: rental inquiries are submitted anonymously as the
// normal path (see /api/rental-inquiry), so the payer usually has no
// session. The payment-link route's success_url pointed here must
// never sit behind the /account auth gate — a login wall is the last
// thing a customer should see seconds after a four-figure charge.
// Email confirmation is best-effort by design, so this page IS the
// guaranteed acknowledgment.
//
// `session_id` (Stripe Checkout session, from {CHECKOUT_SESSION_ID})
// is surfaced as a support reference only — no payment state is
// looked up client-side, and the id is unguessable but harmless.

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Booking confirmed — RYDA",
  description: "Your rental payment went through and the booking is confirmed.",
  robots: { index: false },
};

// Loose sanity filter so junk in the query string never renders —
// Stripe session ids are `cs_…` plus URL-safe characters.
const SESSION_ID_RE = /^[\w-]{8,128}$/;

export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = params.session_id;
  const sessionId =
    typeof raw === "string" && SESSION_ID_RE.test(raw) ? raw : null;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-success-deep">
          Payment received
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          You&apos;re booked.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Your payment was processed by Stripe and charged directly to your
          operator&apos;s connected account. A confirmation email with the
          details is on its way to your inbox.
        </p>

        <div className="mt-8 rounded-2xl border border-rule bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mute">
            What happens next
          </p>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
            <li>
              Your operator will reach out directly to coordinate handover and
              delivery details.
            </li>
            <li>
              No email within a few minutes? Check spam first — then{" "}
              <Link
                href="/contact"
                className="text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
              >
                contact us
              </Link>{" "}
              and we&apos;ll confirm everything by hand.
            </li>
          </ul>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          Members can follow the booking under{" "}
          <Link
            href="/account/requests"
            className="text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
          >
            Account → Requests
          </Link>
          .
        </p>

        <div className="mt-8">
          <Link
            href="/rent"
            className="inline-flex h-11 items-center justify-center rounded-full border border-rule bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Browse the fleet
          </Link>
        </div>

        {sessionId && (
          <p className="mt-10 text-xs text-mute">
            Payment reference:{" "}
            <span className="font-mono tabular-nums">{sessionId}</span>
          </p>
        )}
      </main>
    </>
  );
}
