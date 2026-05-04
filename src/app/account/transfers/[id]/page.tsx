"use client";

// /account/transfers/[id] — recipient page for an incoming share
// transfer. The sender's email goes out via /api/share-transfer/
// request and includes a link to this URL. Recipient sees:
//   - what's being transferred (asset + share count)
//   - sender + member note
//   - their KYC status (must be 'verified' to accept)
//   - Accept / Decline buttons that call /respond
//
// Auth: the AccountLayout already gates anon visitors with a
// redirect to /signin?next=<this path>, so by the time we render
// here we've got an authed session.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type Transfer = {
  id: string;
  status: string;
  shares: number;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  member_note: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  to_user_email: string;
};

type KycStatus = "verified" | "processing" | "requires_action" | "not_started" | "other";

function assetLabel(t: Pick<Transfer, "vehicle_symbol" | "boat_slug">): string {
  if (t.vehicle_symbol) {
    const v = VEHICLES.find((x) => x.symbol === t.vehicle_symbol);
    return v ? `${v.year} ${v.name}` : `RYDA ${t.vehicle_symbol}`;
  }
  if (t.boat_slug) {
    const b = BOATS.find((x) => x.slug === t.boat_slug);
    return b ? `${b.year} ${b.name}` : `RYDA ${t.boat_slug.toUpperCase()}`;
  }
  return "RYDA share";
}

export default function TransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>("not_started");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);

  // Load transfer + KYC. RLS on share_transfers (migration 0016) lets
  // the recipient read by `to_user_email` matching their JWT email;
  // the row returns null for non-recipients (page shows a 404-ish state).
  // RLS on kyc_verifications (migration 0010) scopes by user_id =
  // auth.uid(), but we add an explicit `.eq("user_id", user.id)`
  // filter here as defense-in-depth so a future RLS-policy mistake
  // doesn't fail open.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError("Backend not configured.");
      return;
    }
    let cancelled = false;
    (async () => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id ?? null;
      const [xferRes, kycRes] = await Promise.all([
        supabase
          .from("share_transfers")
          .select(
            "id, status, shares, vehicle_symbol, boat_slug, member_note, expires_at, created_at, updated_at, to_user_email",
          )
          .eq("id", id)
          .maybeSingle(),
        userId
          ? supabase
              .from("kyc_verifications")
              .select("status")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setTransfer((xferRes.data as Transfer | null) ?? null);
      const ks = kycRes.data?.status;
      setKycStatus(
        ks === "verified" ||
          ks === "processing" ||
          ks === "requires_action"
          ? (ks as KycStatus)
          : ks
            ? "other"
            : "not_started",
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function respond(action: "accept" | "reject") {
    if (submitting) return;
    setSubmitting(action);
    setError(null);
    try {
      const res = await authedFetch(`/api/share-transfer/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.kycRequired) {
          setError(
            "Identity verification required. Visit /account/verification first.",
          );
          return;
        }
        throw new Error(j.error || `Request failed (${res.status}).`);
      }
      setDone(action === "accept" ? "accepted" : "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-mute">Loading transfer…</p>;
  }

  if (!transfer) {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Transfer
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Transfer not found.
          </h1>
        </header>
        <p className="text-sm text-ink-soft">
          This transfer link may be expired, already actioned, or addressed to
          a different email. If you believe this is an error,{" "}
          <Link href="/contact?type=Transfer" className="text-red hover:text-red-deep">
            contact RYDA legal
          </Link>
          .
        </p>
      </div>
    );
  }

  const expired = new Date(transfer.expires_at).getTime() < Date.now();
  const isOpen = transfer.status === "requested" && !expired;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Incoming share transfer
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          {assetLabel(transfer)} · {transfer.shares} share
          {transfer.shares > 1 ? "s" : ""}
        </h1>
        <p className="mt-2 text-sm text-mute">
          Status: <strong>{transfer.status}</strong>
          {expired && transfer.status === "requested" ? " (expired)" : ""}
        </p>
      </header>

      {transfer.member_note && (
        <section className="rounded-2xl border border-rule bg-cream-2/40 p-5">
          <p className="text-xs uppercase tracking-wider text-mute">
            Note from sender
          </p>
          <p className="mt-2 text-sm text-ink">{transfer.member_note}</p>
        </section>
      )}

      <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
        <h2 className="font-display text-lg text-ink">What happens if you accept</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          <li>
            ·{" "}
            <strong>RYDA legal acknowledges every transfer</strong> before the
            share moves — your accept here flips status to{" "}
            <code>pending_ryda_review</code>, not <code>completed</code>.
          </li>
          <li>· You take on the ongoing per-share annual contributions.</li>
          <li>
            · You inherit the LLC's Operating Agreement provisions that govern
            transfers (12-month minimum hold from acquisition, etc.).
          </li>
          <li>· No payment moves through RYDA in this flow — peer transfers are zero-cash on our side.</li>
        </ul>
      </section>

      {/* KYC gate notice */}
      {kycStatus !== "verified" && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <p className="text-sm font-medium text-amber-700">
            Identity verification required.
          </p>
          <p className="mt-2 text-sm text-amber-700">
            We can't accept a share transfer until your identity is on file.{" "}
            <Link
              href="/account/verification"
              className="font-medium underline hover:text-amber-900"
            >
              Verify now →
            </Link>
          </p>
        </section>
      )}

      {/* Action area */}
      {done ? (
        <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
          <p className="font-medium text-emerald-700">
            {done === "accepted"
              ? "Accepted. RYDA legal will acknowledge within 1–2 business days, then we move the share into your member-area."
              : "Declined. The sender has been notified."}
          </p>
        </section>
      ) : !isOpen ? (
        <p className="text-sm text-mute">
          This transfer is no longer actionable.
        </p>
      ) : (
        <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
          <h2 className="font-display text-lg text-ink">Your decision</h2>
          <label className="mt-5 block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Optional note for ops + the sender
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="mt-2 w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              placeholder="Anything you'd like the sender or RYDA legal to know."
            />
          </label>
          {error && (
            <p className="mt-4 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => respond("accept")}
              disabled={submitting !== null || kycStatus !== "verified"}
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting === "accept" ? "Accepting…" : "Accept transfer"}
            </button>
            <button
              type="button"
              onClick={() => respond("reject")}
              disabled={submitting !== null}
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting === "reject" ? "Declining…" : "Decline"}
            </button>
          </div>
          {kycStatus !== "verified" && (
            <p className="mt-3 text-xs text-mute">
              Accept is disabled until your KYC is verified.
            </p>
          )}
        </section>
      )}

      <p className="text-xs text-mute">
        Reference: <code>{transfer.id}</code>
      </p>
    </div>
  );
}
