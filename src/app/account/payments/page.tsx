// /account/payments — what RYDA does and does not hold about a rental
// payment.
//
// This page used to launch the Stripe Customer Portal and advertise
// saved cards, ACH bank links, and "receipts for every charge." None
// of that is true of a RYDA rental. Rental charges are Checkout
// sessions created ON the operator's connected account (fee-only
// direct charges — see /api/admin/inquiries/[id]/payment-link): Stripe
// collects the card on the operator's account, no Stripe Customer is
// created on the RYDA platform account for a rental, and the portal
// this page opened would have shown a customer with no rental charge
// in it. So the launcher is deleted rather than relabelled — a working
// button to an empty vault is the falsehood, not the wording around it.
//
// What RYDA actually retains per payment is the rental_payments row
// (amount, currency, application fee, Stripe session + payment-intent
// ids, status, timestamps) tied to the inquiry, plus the two emails it
// sends the customer: the pay link and the booking confirmation. This
// page describes that and stops.

import Link from "next/link";

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Payments
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          No card on file.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          RYDA keeps no saved cards and no bank details. A rental is paid
          once, on a Stripe link created on the operator&apos;s own account
          — so there is nothing here to add, remove, or set as a default.
          Here is what happens instead.
        </p>
      </header>

      <Card title="How a rental gets paid">
        <p className="text-sm leading-relaxed text-ink-soft">
          No card at request. Once the operator confirms your dates and
          price, RYDA emails you a Stripe Checkout link. The charge is
          created on the operator&apos;s own Stripe account: the rental
          price settles to them, and RYDA&apos;s referral commission is
          collected as a platform fee on that same charge.
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Stripe collects the card on its own hosted page — card details
          are never entered on ryda.pro. The link is good for 24 hours; if
          it lapses before you use it, reply to the email and we&apos;ll
          send a fresh one.
        </p>
      </Card>

      <Card title="What RYDA keeps">
        <p className="text-sm leading-relaxed text-ink-soft">
          Per booking: the amount, the currency, RYDA&apos;s commission, a
          Stripe session reference, and whether the link is pending, paid,
          or expired — attached to the request it came from. No card
          number, no expiry date, no bank account.
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Your own copies are the two emails RYDA sends you: the payment
          link with the total on it, and the confirmation once the payment
          goes through.
        </p>
      </Card>

      <Card title="Refunds, deposits, and disputes">
        <p className="text-sm leading-relaxed text-ink-soft">
          The charge sits on the operator&apos;s Stripe account and the
          rental runs on the operator&apos;s own agreement, so refunds,
          security deposits, and damage claims are settled with them rather
          than with RYDA. RYDA will provide the booking records it holds
          and help where it reasonably can — see the{" "}
          <Link
            href="/legal/terms"
            className="font-medium text-red underline-offset-4 hover:text-red-deep hover:underline"
          >
            Terms
          </Link>
          .
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          Replying to any booking email from RYDA reaches the RYDA team.
        </p>
      </Card>

      <p className="text-sm">
        <Link
          href="/account/requests"
          className="font-medium text-red underline-offset-4 hover:text-red-deep hover:underline"
        >
          See where each of your requests stands →
        </Link>
      </p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
