"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";
import { formatUSD } from "@/lib/market-data";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import { authedFetch } from "@/lib/api-fetch";

// Stripe's checkout.session.completed webhook flips status from
// pending → paid asynchronously. When the buyer returns from Stripe
// Checkout via the success URL (?ok=1), the row is often still
// pending for a few seconds. Poll the API on a short interval until
// it flips, then show the celebration screen.
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

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

// Bare asset name (no year) for the LLC-name display, e.g. "Ferrari
// 296 GTB LLC, (member-managed)" — mirrors the convention used in
// the buy-flow ConfirmStep.
function assetBareName(p: Purchase): string {
  if (p.vehicle_symbol) {
    const v = VEHICLES.find((x) => x.symbol === p.vehicle_symbol);
    if (v) return v.name;
  }
  if (p.boat_slug) {
    const b = BOATS.find((x) => x.slug === p.boat_slug);
    if (b) return b.name;
  }
  return "Asset";
}

// Total share count of the underlying asset (typically 10). Used
// for the "X of Y shares" line on the welcome screen. Falls back
// to the buyer's share count if the asset can't be resolved (e.g.
// the slug isn't in the local fleet manifest), which yields a
// truthful "X of X" rather than a fabricated denominator.
function assetTotalShares(p: Purchase): number {
  if (p.vehicle_symbol) {
    const v = VEHICLES.find((x) => x.symbol === p.vehicle_symbol);
    if (v) return v.shares;
  }
  if (p.boat_slug) {
    const b = BOATS.find((x) => x.slug === p.boat_slug);
    if (b) return b.shares;
  }
  return p.shares;
}

export default function PurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // ?ok=1 is the Stripe success-url marker. Its presence means the
  // buyer just returned from Stripe Checkout, so we should treat
  // this view as a celebration moment, not a generic tracker — show
  // an interstitial while the webhook lands, then a welcome screen.
  const searchParams = useSearchParams();
  const isFreshFromStripe = searchParams?.get("ok") === "1";

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollAttempts, setPollAttempts] = useState(0);

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

  // Webhook-confirmation poll. Each tick: wait POLL_INTERVAL_MS, refetch
  // the row, increment attempts. The effect re-runs after each setState,
  // and gates itself on (still pending && under cap), so it stops the
  // moment status flips or we hit MAX_POLL_ATTEMPTS.
  useEffect(() => {
    if (!isFreshFromStripe) return;
    if (!purchase) return;
    if (purchase.status !== "pending") return;
    if (pollAttempts >= MAX_POLL_ATTEMPTS) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await authedFetch(`/api/share-purchase/${id}`);
        if (cancelled) return;
        if (res.ok) {
          const j = await res.json();
          setPurchase(j.purchase);
        }
      } catch {
        // Network blip — count the attempt and keep polling.
      } finally {
        if (!cancelled) setPollAttempts((n) => n + 1);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, isFreshFromStripe, purchase, pollAttempts]);

  const pollExhausted = pollAttempts >= MAX_POLL_ATTEMPTS;
  const showInterstitial =
    isFreshFromStripe && purchase !== null && purchase.status === "pending";
  const showWelcome =
    isFreshFromStripe &&
    purchase !== null &&
    (purchase.status === "paid" || purchase.status === "closed");

  if (showInterstitial && purchase) {
    return (
      <PaymentConfirmingView
        purchase={purchase}
        pollExhausted={pollExhausted}
      />
    );
  }

  if (showWelcome && purchase) {
    return <WelcomeView purchase={purchase} />;
  }

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

// Interstitial shown to Stripe-path buyers between Stripe success
// redirect and webhook landing. Prevents the "Awaiting payment
// confirmation" copy from greeting a member who just paid five or
// six figures. After MAX_POLL_ATTEMPTS the copy switches to a
// gentler "check your email" state but the polling stops.
function PaymentConfirmingView({
  purchase,
  pollExhausted,
}: {
  purchase: Purchase;
  pollExhausted: boolean;
}) {
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
          <p className="mt-6 text-xs text-mute">
            Buy-in {purchase.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            {assetName(purchase)}
          </h1>
        </div>
      </section>

      <section className="bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10 sm:py-28">
          {pollExhausted ? (
            <>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">
                This is taking longer than expected.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
                Don&apos;t worry — your payment is still being processed by
                Stripe. Check your email for a confirmation, or refresh this
                page in a few minutes to see updated status.
              </p>
              <Link
                href={`/share-purchase/${purchase.id}`}
                className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
              >
                View tracker
              </Link>
            </>
          ) : (
            <>
              <Spinner />
              <h2 className="mt-8 font-display text-3xl text-ink sm:text-4xl">
                Your payment is confirming…
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">
                Stripe is finalizing your payment. This usually takes a few
                seconds. We&apos;ll switch you to your welcome screen the
                moment it clears — no need to refresh.
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}

// Welcome screen shown after a Stripe-path buyer's payment lands.
// Mirrors the design pattern from the buy-flow ConfirmStep so the
// celebratory moment is consistent across funding paths (the
// non-Stripe intent paths reach ConfirmStep directly during the
// flow; Stripe-path buyers get this equivalent post-redirect).
function WelcomeView({ purchase }: { purchase: Purchase }) {
  const totalShares = assetTotalShares(purchase);
  const llcName = assetBareName(purchase);
  const statusText =
    purchase.status === "closed"
      ? "Member · welcome packet sent"
      : "Paid · LLC amendment in flight";

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
          <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-cream-2 text-3xl text-ink">
            ✓
          </div>
          <h1 className="mt-6 font-display text-4xl font-light text-ink sm:text-5xl">
            Welcome to RYDA.
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Your payment cleared. We&apos;ll send a confirmation email and a
            copy of your signed documents within the next few minutes.
          </p>
        </div>
      </section>

      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <div className="rounded-2xl border border-rule bg-surface p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-red">
              Your co-ownership
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <KvRow label="Asset" value={assetName(purchase)} />
              <KvRow
                label="Position"
                value={`${purchase.shares} of ${totalShares} shares`}
              />
              <KvRow
                label="Amount"
                value={formatUSD(purchase.total_cents / 100)}
              />
              <KvRow
                label="LLC"
                value={`${llcName} LLC, (member-managed)`}
              />
              <KvRow label="Status" value={statusText} />
            </dl>
          </div>

          <p className="mt-10 text-xs font-medium uppercase tracking-wider text-mute">
            What happens next
          </p>
          <ol className="mt-4 space-y-3">
            <Timeline
              n="01"
              title="Payment confirmed"
              body="Stripe verified your transfer. Funds are now held in the LLC's escrow account until your share is recorded."
            />
            <Timeline
              n="02"
              title="LLC amendment (1 business day)"
              body="RYDA legal amends the LLC's operating agreement to add you as a member, alongside your co-owners."
            />
            <Timeline
              n="03"
              title="Documents countersigned"
              body="The LLC's existing co-owners countersign your addition. The Management Services Agreement is executed between the LLC's members and RYDA."
            />
            <Timeline
              n="04"
              title="Share recorded; calendar opens"
              body="Your share is officially registered with the LLC. The asset appears in your portfolio and the booking calendar opens for your first reservation."
            />
            <Timeline
              n="05"
              title="Welcome packet"
              body="Membership certificate, signed Operating Agreement, and your entry in the LLC's member register, delivered by email."
            />
          </ol>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/account"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
            >
              View my purchases →
            </Link>
            <Link
              href={purchase.boat_slug ? "/boats/portfolio" : "/portfolio"}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
            >
              Back to markets
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-ink py-10 text-center text-cream/60">
        <p className="text-xs">
          Live tracker. Stripe-driven payment confirmations land here within
          a minute of clearing.
        </p>
      </section>
    </>
  );
}

function Spinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="mx-auto block h-12 w-12 animate-spin rounded-full border-2 border-rule border-t-red"
    />
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-mute">{label}</dt>
      <dd className="text-ink sm:text-right">{value}</dd>
    </div>
  );
}

function Timeline({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5 rounded-xl border border-rule bg-surface p-4">
      <span className="font-display text-sm text-red">{n}</span>
      <div>
        <p className="font-display text-base text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
    </li>
  );
}
