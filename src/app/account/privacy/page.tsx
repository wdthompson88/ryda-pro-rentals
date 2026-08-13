"use client";

// /account/privacy — data export + account deletion.
//
// Both are REQUEST flows: the button POSTs to /api/account/data-request,
// which writes a contact_messages row and emails the team. No export is
// assembled and no account is deleted by any code in this repo. Copy on
// this page has to say that plainly — the previous version described an
// automatic ZIP with signed-agreement PDFs, a 24-hour cooling-off
// window, a 30-day purge and an LLC-share buyback "per your Operating
// Agreement", none of which exist. RYDA sells no shares and issues no
// K-1s; there is no membership to end.

import { useState } from "react";
import { authedFetch } from "@/lib/api-fetch";

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
          Ask for a copy of what we hold on you, or ask us to delete your
          account. Both go to our team as a request — a person actions them,
          nothing here happens automatically.
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
  const [error, setError] = useState<string | null>(null);

  async function onRequest() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/account/data-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "export" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status}).`);
      }
      setRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title="Request your data"
      hint="Your account details, the rental requests you've sent, any booking that came out of one, and your identity-verification record."
    >
      <p className="text-sm text-ink-soft">
        This sends a request to our team. There's no automatic export button
        behind it — someone puts the file together and replies to the email
        address on your account.
      </p>
      {error && (
        <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}
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
        <p className="rounded-xl border border-success/40 bg-success/5 px-4 py-3 text-sm text-success-deep">
          Request received. Someone from our team will reply to the email
          address on your account.
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
          desc="The Supabase Auth session that keeps you signed in."
          state="Required"
          tone="neutral"
        />
        <CookieRow
          name="Analytics"
          desc="Vercel Analytics counts page views on every page and sets no cookies. PostHog loads only if you chose to accept analytics in the cookie banner — and while you're signed in it is given your user ID and email, so those events are tied to your account rather than anonymous."
          state="Your banner choice"
          tone="on"
        />
        <CookieRow
          name="Marketing"
          desc="RYDA loads no advertising or remarketing scripts."
          state="None"
          tone="off"
        />
      </ul>
    </Card>
  );
}

// `state` is written out rather than derived from an on/off boolean:
// analytics is neither simply on nor simply off — Vercel Analytics
// always runs, PostHog runs only on an 'all' answer to the cookie
// banner — and a two-state pill could only have lied about one of them.
function CookieRow({
  name,
  desc,
  state,
  tone,
}: {
  name: string;
  desc: string;
  state: string;
  tone: "neutral" | "on" | "off";
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-rule pb-3 last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-mute">{desc}</p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${
          tone === "on"
            ? "bg-success/10 text-success-deep"
            : tone === "off"
              ? "bg-mute/10 text-mute"
              : "bg-mute/15 text-mute"
        }`}
      >
        {state}
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
  const [error, setError] = useState<string | null>(null);

  async function onRequest() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/account/data-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "delete" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status}).`);
      }
      setRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title="Delete account"
      hint="Sends our team a request to delete your RYDA account. There is no subscription to cancel."
    >
      <ul className="space-y-2 text-sm text-ink-soft">
        <li>
          · Deleting your RYDA account does not cancel a rental. Once a request
          has gone to an operator, the booking, the contract and any deposit
          are between you and them
        </li>
        <li>
          · Anything already sent to an operator has already left RYDA — we
          cannot take it back on your behalf
        </li>
        <li>
          · The request itself is recorded so we have a record of who asked and
          when
        </li>
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
          {error && (
            <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {error}
            </p>
          )}
        </div>
      )}
      {requested && (
        <p className="rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn-deep">
          Deletion request received. Nothing has been deleted yet — someone
          from our team actions this by hand and will reply to the email
          address on your account. You stay signed in until then.
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
