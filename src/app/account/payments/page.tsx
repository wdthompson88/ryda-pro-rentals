"use client";

// /account/payments — payment-method management. Stripe owns the UI
// for saved cards / ACH / receipts via the Customer Portal; we open
// it server-side as a member-scoped session so the user lands on a
// PCI-compliant Stripe-hosted page with a one-click return.
//
// We deliberately don't render saved-card numbers or receipt history
// in our own UI. The Customer Portal handles add/remove/default,
// receipt PDFs, and dispute initiation natively. Building that
// ourselves would burn engineering hours and add PCI scope for no
// member benefit.

import { useState } from "react";
import { authedFetch } from "@/lib/api-fetch";

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Payments
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Cards, banks, and receipts.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Saved payment methods, default card, and your full receipt history
          live in the Stripe Customer Portal. We open it as a member-scoped
          session — no separate password.
        </p>
      </header>

      <BillingPortalCard />
    </div>
  );
}

// ── Billing portal launcher ────────────────────────────────────

function BillingPortalCard() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      const res = await authedFetch("/api/account/billing-portal", {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Could not open portal (${res.status}).`);
      }
      const j = await res.json();
      if (typeof j.url === "string") {
        window.location.href = j.url;
        return;
      }
      throw new Error("No portal URL returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open portal.");
      setOpening(false);
    }
  }

  return (
    <Card title="Manage payment methods + receipts">
      <p className="text-sm text-ink-soft">
        The Customer Portal opens at <code className="text-xs">billing.stripe.com</code>.
        Add or remove cards, change your default payment method, and download
        receipts for every charge. Your session is tied to your RYDA account —
        no extra sign-in.
      </p>
      {error && (
        <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={open}
        disabled={opening}
        className={btnPrimary}
      >
        {opening ? "Opening…" : "Open Stripe Customer Portal"}
      </button>
      <p className="mt-2 text-[11px] text-mute">
        Portal is generated fresh each time you click — links expire after one
        use, so don't bookmark the destination.
      </p>
    </Card>
  );
}

const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60";

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {hint && <p className="mt-1 max-w-xl text-xs text-mute">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
