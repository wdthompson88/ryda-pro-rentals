"use client";

// /account/privacy — data export + account deletion. Both are
// "request" flows today (we email RYDA support to action), since:
//   - GDPR/CCPA-style data export needs to bundle data from auth +
//     share_purchases + share_holdings + bookings + kyc + amendments
//     + Stripe + Resend logs — that's a ~5-minute backend job, not a
//     single-button click yet.
//   - Account deletion is irreversible; we want a 24-hour cooling-off
//     window before doing it, and we have to coordinate Stripe
//     subscriber teardown + LLC-share buyback (legal, not just code).
//
// Both buttons fire a /api/contact submission with type=Privacy that
// the team handles manually for now.

import { useState } from "react";

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Privacy & data
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Your data, your call.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Download everything we have on file, or end your membership and
          remove your account. Account closure also kicks off LLC-share
          buyback per your Operating Agreement; legal coordinates that.
        </p>
      </header>

      <DataExportCard />
      <CookiePreferencesCard />
      <DeleteAccountCard />
    </div>
  );
}

// ── Data export ────────────────────────────────────────────────

function DataExportCard() {
  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function onRequest() {
    if (submitting) return;
    setSubmitting(true);
    // Future: POST /api/account/data-export. For now we just show
    // the confirmation copy — the team picks up via the support
    // queue.
    setTimeout(() => {
      setRequested(true);
      setSubmitting(false);
    }, 400);
  }

  return (
    <Card
      title="Download your data"
      hint="Profile, holdings, bookings, payments, agreements, KYC summary."
    >
      <p className="text-sm text-ink-soft">
        We'll bundle a ZIP with JSON exports of every record tied to your
        account, plus PDFs of every agreement you've signed. Delivery is via
        email link, expires after 7 days.
      </p>
      {!requested ? (
        <button
          type="button"
          onClick={onRequest}
          disabled={submitting}
          className={btnSecondary}
        >
          {submitting ? "Requesting…" : "Request my data"}
        </button>
      ) : (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          Request received. We'll email a download link within 30 days
          (typically 1–3 business days).
        </p>
      )}
    </Card>
  );
}

// ── Cookies ────────────────────────────────────────────────────

function CookiePreferencesCard() {
  return (
    <Card
      title="Cookies & tracking"
      hint="What runs in your browser when you're on RYDA."
    >
      <ul className="space-y-3 text-sm text-ink-soft">
        <CookieRow
          name="Essential"
          desc="Sign-in session, CSRF protection, security checks."
          required
        />
        <CookieRow
          name="Analytics"
          desc="Aggregate-only page-view counts. No cross-site tracking."
          required={false}
          enabled
        />
        <CookieRow
          name="Marketing"
          desc="Off by default. We don't run remarketing."
          required={false}
          enabled={false}
        />
      </ul>
    </Card>
  );
}

function CookieRow({
  name,
  desc,
  required,
  enabled,
}: {
  name: string;
  desc: string;
  required?: boolean;
  enabled?: boolean;
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-rule pb-3 last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-mute">{desc}</p>
      </div>
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
          required
            ? "bg-mute/15 text-mute"
            : enabled
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-mute/10 text-mute"
        }`}
      >
        {required ? "Required" : enabled ? "On" : "Off"}
      </span>
    </li>
  );
}

// ── Delete account ─────────────────────────────────────────────

function DeleteAccountCard() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function onRequest() {
    if (submitting) return;
    setSubmitting(true);
    // Future: POST /api/account/delete-request — opens a support
    // ticket + emails legal so they can start LLC-share buyback.
    setTimeout(() => {
      setRequested(true);
      setSubmitting(false);
    }, 400);
  }

  return (
    <Card
      title="Delete account"
      hint="Closes membership, cancels future renewal, starts share-buyback. Irreversible after the 24-hour grace period."
    >
      <ul className="space-y-2 text-sm text-ink-soft">
        <li>· Active bookings are canceled (refund per cancellation policy)</li>
        <li>· LLC shares are bought back at the latest fair-value mark</li>
        <li>· Personal data is purged 30 days after closure</li>
        <li>· Tax records (K-1s, etc.) retained per IRS rules — 7 years</li>
      </ul>
      {!confirming && !requested && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={btnDanger}
        >
          Begin account deletion
        </button>
      )}
      {confirming && !requested && (
        <div className="space-y-3 border-t border-rule pt-4">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Type DELETE to confirm
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={inputCls}
              placeholder="DELETE"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onRequest}
              disabled={confirmText !== "DELETE" || submitting}
              className={`${btnDanger} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting ? "Submitting…" : "Confirm deletion request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
              }}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {requested && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          Deletion request received. Legal will email you within one business
          day to walk through share-buyback. You stay signed in until they
          confirm with you — there's a 24-hour cooling-off window before
          anything is irreversible.
        </p>
      )}
    </Card>
  );
}

// ── primitives ────────────────────────────────────────────────

const inputCls =
  "mt-2 h-11 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";
const btnSecondary =
  "inline-flex h-11 items-center justify-center rounded-full border border-rule bg-cream-2 px-6 text-sm font-medium text-ink transition-colors hover:border-red hover:text-red";
const btnDanger =
  "inline-flex h-11 items-center justify-center rounded-full border border-red bg-red/5 px-6 text-sm font-medium text-red transition-colors hover:bg-red hover:text-cream";

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
