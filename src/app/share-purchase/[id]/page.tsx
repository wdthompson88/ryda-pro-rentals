"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { formatUSD } from "@/lib/market-data";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import { authedFetch } from "@/lib/api-fetch";

// Reads the actual purchase row from /api/share-purchase/[id] and
// renders the stage tracker against real status. Falls back to a
// hint-style empty state if the row can't be loaded (auth missing,
// preview deploy without Supabase, etc.).

type Purchase = {
  id: string;
  user_id: string | null;
  name: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  shares: number;
  price_per_share: number;
  acquisition_fee: number;
  total_cents: number;
  status: "pending" | "paid" | "closed" | "canceled" | "failed";
  created_at: string;
  updated_at: string;
};

type Stage = { name: string; status: "done" | "current" | "pending" };

function buildStages(p: Purchase): Stage[] {
  // Stage flow: Eligibility → Documents → Payment → LLC amendment → Welcome.
  // 'pending' / 'failed' / 'canceled' purchases sit at Payment.
  // 'paid' purchases mark Payment done and start LLC amendment.
  // 'closed' purchases (the human-followup that ships the welcome
  // packet completes) is fully done.
  const all: Stage["name"][] = [
    "Eligibility",
    "Documents",
    "Payment",
    "LLC amendment",
    "Welcome",
  ];
  const currentIdx =
    p.status === "closed"
      ? all.length // everything done
      : p.status === "paid"
        ? 3 // LLC amendment is in flight
        : p.status === "canceled" || p.status === "failed"
          ? 2 // Payment is the failed step
          : 2; // pending: Payment is current

  return all.map((name, i) => {
    if (p.status === "canceled" || p.status === "failed") {
      if (i < currentIdx) return { name, status: "done" };
      if (i === currentIdx) return { name, status: "current" };
      return { name, status: "pending" };
    }
    if (i < currentIdx) return { name, status: "done" };
    if (i === currentIdx) return { name, status: "current" };
    return { name, status: "pending" };
  });
}

function statusPill(status: Purchase["status"]): { text: string; className: string } {
  switch (status) {
    case "pending":
      return { text: "Pending payment", className: "bg-red/10 text-red" };
    case "paid":
      return {
        text: "Paid · LLC amendment in flight",
        className: "bg-success/10 text-success-deep",
      };
    case "closed":
      return {
        text: "Complete · welcome packet sent",
        className: "bg-success/10 text-success-deep",
      };
    case "canceled":
      return { text: "Canceled", className: "bg-mute/15 text-mute" };
    case "failed":
      return { text: "Payment failed", className: "bg-red/10 text-red" };
  }
}

function assetName(p: Purchase): string {
  if (p.vehicle_symbol) {
    const v = VEHICLES.find((x) => x.symbol === p.vehicle_symbol);
    return v ? `${v.year} ${v.name}` : p.vehicle_symbol;
  }
  if (p.boat_slug) {
    const b = BOATS.find((x) => x.slug === p.boat_slug);
    return b ? `${b.year} ${b.name}` : p.boat_slug;
  }
  return "RYDA share";
}

export default function PurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`/api/share-purchase/${id}`);
        if (cancelled) return;
        if (res.status === 401) {
          setError("Sign in to view this purchase.");
          return;
        }
        if (res.status === 404) {
          setError("Purchase not found.");
          return;
        }
        if (!res.ok) throw new Error(`Lookup failed (${res.status}).`);
        const j = await res.json();
        setPurchase(j.purchase);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load purchase.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <SiteHeader />
      <DemoBanner />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
          <Link
            href="/account"
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← My account
          </Link>

          {loading ? (
            <p className="mt-6 text-sm text-mute">Loading purchase…</p>
          ) : error || !purchase ? (
            <div className="mt-6">
              <p className="text-sm text-red">{error ?? "Purchase not found."}</p>
              <p className="mt-2 text-xs text-mute">Reference: {id}</p>
            </div>
          ) : (
            <>
              <p className="mt-6 text-xs text-mute">Buy-in {purchase.id.slice(0, 8).toUpperCase()}</p>
              <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
                {assetName(purchase)}
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                {purchase.shares} share{purchase.shares > 1 ? "s" : ""} ·{" "}
                {formatUSD(purchase.price_per_share * purchase.shares)} +{" "}
                {formatUSD(purchase.acquisition_fee)} acquisition fee
              </p>
              {(() => {
                const pill = statusPill(purchase.status);
                return (
                  <div
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${pill.className}`}
                  >
                    {pill.text}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </section>

      {purchase ? (
        <>
          <section className="border-b border-rule bg-cream-2">
            <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
              <h2 className="font-display text-2xl text-ink">Purchase progress</h2>
              <ol className="mt-8 space-y-4">
                {buildStages(purchase).map((s, i) => (
                  <li
                    key={s.name}
                    className={`flex items-center gap-4 rounded-xl border p-5 ${
                      s.status === "current"
                        ? "border-red bg-red/5"
                        : s.status === "done"
                          ? "border-rule bg-surface"
                          : "border-rule bg-cream/40"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                        s.status === "done"
                          ? "bg-ink text-cream"
                          : s.status === "current"
                            ? "border-2 border-red bg-cream text-red"
                            : "border border-rule bg-cream text-mute"
                      }`}
                    >
                      {s.status === "done" ? "✓" : i + 1}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`font-display text-base ${
                          s.status === "pending" ? "text-mute" : "text-ink"
                        }`}
                      >
                        {s.name}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {s.name === "Eligibility" &&
                          "KYC + driving-record verification complete"}
                        {s.name === "Documents" &&
                          "Co-Owner Agreement, LLC Operating Agreement, Management Services Agreement signed"}
                        {s.name === "Payment" &&
                          (purchase.status === "paid" ||
                          purchase.status === "closed"
                            ? "Payment received and verified"
                            : purchase.status === "failed"
                              ? "Payment failed · please retry"
                              : purchase.status === "canceled"
                                ? "Payment canceled"
                                : "Awaiting payment confirmation")}
                        {s.name === "LLC amendment" &&
                          "RYDA legal will amend the LLC operating agreement"}
                        {s.name === "Welcome" &&
                          "Membership certificate + first booking access"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="border-b border-rule">
            <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
              <h2 className="font-display text-2xl text-ink">Total wired</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Held in escrow until verifications clear, then released to
                the LLC.
              </p>
              <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-ink-soft">
                <p>
                  Total:{" "}
                  <span className="font-display text-lg text-ink tabular-nums">
                    {formatUSD(purchase.total_cents / 100)}
                  </span>
                </p>
                <p className="mt-2 text-xs text-mute">
                  Reference: <code>{purchase.id}</code>
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-rule bg-cream-2">
            <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
              <h2 className="font-display text-2xl text-ink">What happens next</h2>
              <ul className="mt-6 space-y-4 text-sm">
                <StepRow
                  n="1"
                  t="Payment confirms (1–3 business days for ACH, instant for card)"
                  d="Stripe verifies the transfer and notifies us via webhook. The status above flips automatically."
                />
                <StepRow
                  n="2"
                  t="LLC amendment (1 business day)"
                  d="RYDA legal amends the LLC's operating agreement to add you as a member."
                />
                <StepRow
                  n="3"
                  t="Member register entry"
                  d="You'll receive your signed Operating Agreement and your entry in the LLC's member register by email. The asset appears in /my-cars or /my-boats."
                />
                <StepRow
                  n="4"
                  t="First booking unlocked"
                  d="Once the membership is recorded, you can book your first session immediately."
                />
              </ul>
              <Link
                href="/contact"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
              >
                Question about this purchase?
              </Link>
            </div>
          </section>
        </>
      ) : null}

      <section className="bg-ink py-10 text-center text-cream/60">
        <p className="text-xs">
          Live tracker. Stripe-driven payment confirmations land here within
          a minute of clearing.
        </p>
      </section>
    </>
  );
}

function StepRow({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream font-display text-sm text-red">
        {n}
      </span>
      <div>
        <p className="font-medium text-ink">{t}</p>
        <p className="mt-0.5 text-ink-soft">{d}</p>
      </div>
    </li>
  );
}
