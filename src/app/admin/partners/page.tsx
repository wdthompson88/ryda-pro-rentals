"use client";

// /admin/partners — operator network + Stripe Connect onboarding.
//
// Driven by /api/admin/partners (admin-gated via requireAdmin).
//
// Why this page exists: rental payments are fee-only via Stripe
// Connect DIRECT charges. The customer pays a Checkout link created
// on the operator's own Express account — the rental price settles
// straight to the operator and never enters RYDA's balance; RYDA's
// commission is collected automatically as an application fee
// (per-partner commission_rate, default 15%). Before a payment link
// can be sent from /admin/inquiries, the operator needs an Express
// account with Stripe onboarding completed. This page is where an
// admin manages that roster: add operators, edit commission rates,
// and create + send the Stripe onboarding link.
//
// Stripe state chip per row:
//   Not started     — no stripe_account_id yet
//   Onboarding sent — Express account created, operator hasn't
//                     finished Stripe's hosted onboarding
//   Ready           — stripe_onboarded_at set; payment links work
//
// Degrades cleanly without env: a 503 from the API renders as
// "Stripe not configured" (dev preview), and a missing partners
// table renders a "run migration 0041" hint. The code-level
// partner-contacts.ts map keeps routing inquiry emails until
// partners rows exist — this page is additive, not a prerequisite.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

type Partner = {
  id: string;
  name: string;
  contact_email: string | null;
  // Decimal share of the rental price (0.15 = 15%), applied as the
  // Checkout application fee. All math lives server-side in fees.ts —
  // this page only displays and edits the rate.
  commission_rate: number;
  stripe_account_id: string | null;
  stripe_onboarded_at: string | null;
  // 0041 status column: 'paused' blocks new payment links at the API.
  // Must be visible here — a paused operator showing a green "Ready"
  // chip sends the admin chasing phantom Stripe issues.
  status: "active" | "paused";
};

type StripeState = "not_started" | "onboarding_sent" | "ready";

function stripeState(p: Partner): StripeState {
  if (p.stripe_onboarded_at) return "ready";
  if (p.stripe_account_id) return "onboarding_sent";
  return "not_started";
}

const STRIPE_STATE_LABEL: Record<StripeState, string> = {
  not_started: "Not started",
  onboarding_sent: "Onboarding sent",
  ready: "Ready",
};

// Chip tones mirror the inquiries pipeline conventions — pending
// attention reads warn, done reads success, dormant reads mute.
const STRIPE_STATE_TONE: Record<StripeState, string> = {
  not_started: "bg-mute/10 text-mute border-rule",
  onboarding_sent: "bg-warn/15 text-warn-deep border-warn/40",
  ready: "bg-success/15 text-success-deep border-success/40",
};

// Supabase's error text when the partners relation is missing —
// either raw Postgres 42P01 or PostgREST's schema-cache variant.
// Used to distinguish "run the migration" from a real failure.
const MISSING_TABLE_RE = /does not exist|42P01|schema cache/i;

// Rate → "15%" without float noise (0.15 * 100 === 15.000000000000002).
function pctLabel(rate: number): string {
  const pct = Math.round(rate * 10000) / 100;
  return `${pct}%`;
}

type Degraded =
  | { kind: "stripe"; detail: string | null }
  | { kind: "migration"; detail: string | null }
  | null;

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState<Degraded>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setError(null);
    setDegraded(null);
    try {
      const res = await authedFetch("/api/admin/partners");
      const body = (await res.json().catch(() => ({}))) as {
        partners?: Partner[];
        error?: string;
      };
      if (res.status === 401) {
        throw new Error("Sign in required.");
      }
      if (res.status === 403) {
        throw new Error(
          "Your account doesn't have admin access. Ask another admin to flip your role.",
        );
      }
      if (res.status === 503) {
        setDegraded({ kind: "stripe", detail: body.error ?? null });
        setPartners([]);
        return;
      }
      if (!res.ok) {
        if (body.error && MISSING_TABLE_RE.test(body.error)) {
          setDegraded({ kind: "migration", detail: body.error });
          setPartners([]);
          return;
        }
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setPartners(body.partners ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = partners.filter((p) => stripeState(p) === "ready").length;
  const sent = partners.filter(
    (p) => stripeState(p) === "onboarding_sent",
  ).length;
  const notStarted = partners.length - ready - sent;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Operator network
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Partners
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Operators who fulfill rental inquiries. Payment links from{" "}
              <Link
                href="/admin/inquiries"
                className="text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
              >
                Inquiries
              </Link>{" "}
              charge the customer on the operator&apos;s own Stripe account —
              RYDA&apos;s commission is taken automatically as an application
              fee. An operator must be <em>Ready</em> before a link can be
              sent.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs font-medium text-ink-soft hover:text-ink"
            >
              ← Back to admin
            </Link>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              disabled={degraded !== null}
              className="rounded-full border border-rule bg-surface px-5 py-2 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
            >
              {showAdd ? "Close" : "Add operator"}
            </button>
          </div>
        </div>

        {/* Roster stat strip */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Stat label="Operators" value={partners.length} cls="text-ink" />
          <Stat
            label="Ready"
            value={ready}
            cls={ready > 0 ? "text-success-deep" : "text-mute"}
          />
          <Stat
            label="Onboarding sent"
            value={sent}
            cls={sent > 0 ? "text-warn-deep" : "text-mute"}
          />
          <Stat label="Not started" value={notStarted} cls="text-mute" />
        </section>

        {showAdd && !degraded && (
          <AddPartnerForm
            onSaved={() => {
              setShowAdd(false);
              void load({ quiet: true });
            }}
          />
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red/30 bg-red/10 p-4 text-sm text-red">
            {error}
          </div>
        )}

        {loading && (
          <p className="mt-12 text-center text-sm text-mute">Loading…</p>
        )}

        {!loading && degraded?.kind === "stripe" && (
          <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            {/* The API's only 503 means backend env (Supabase) is
                absent — headline that, not Stripe, so a broken deploy
                points the admin at the right env vars. The detail line
                below carries the API's exact message. */}
            <p className="font-display text-xl text-ink">
              Backend not configured.
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              This environment is missing backend keys (Supabase, and
              possibly Stripe), so partner onboarding and payment links are
              disabled. Everything works in production and in a locally
              configured dev environment.
            </p>
            {degraded.detail && (
              <p className="mt-3 text-xs text-mute">{degraded.detail}</p>
            )}
          </div>
        )}

        {!loading && degraded?.kind === "migration" && (
          <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            <p className="font-display text-xl text-ink">
              Partners table missing.
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Run migration <code className="text-ink">0041</code> (rental
              payments) against this environment, then reload. Applying
              migrations requires operator approval — see AGENTS.md.
            </p>
            {degraded.detail && (
              <p className="mt-3 text-xs text-mute">{degraded.detail}</p>
            )}
          </div>
        )}

        {!loading && !error && !degraded && partners.length === 0 && (
          <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            <p className="font-display text-xl text-ink">No operators yet.</p>
            <p className="mt-3 text-sm text-ink-soft">
              Add an operator, then create + send their Stripe onboarding
              link. Until rows exist here, inquiry emails keep routing
              through the code-level fallback map.
            </p>
          </div>
        )}

        {!loading && !degraded && partners.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-rule bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-rule bg-cream-2/40">
                <tr>
                  {["Operator", "Contact", "Commission", "Stripe", ""].map(
                    (c, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-mute"
                      >
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {partners.map((p) => (
                  <PartnerRow
                    key={p.id}
                    partner={p}
                    onChanged={() => void load({ quiet: true })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className={`mt-2 font-display text-2xl tabular-nums ${cls}`}>
        {value}
      </p>
    </div>
  );
}

function StripeChip({ state }: { state: StripeState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STRIPE_STATE_TONE[state]}`}
    >
      {STRIPE_STATE_LABEL[state]}
    </span>
  );
}

const INPUT_CLS =
  "rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none";

function AddPartnerForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Percent in the UI, decimal on the wire — default matches the
  // fee module's 15% standard commission.
  const [pct, setPct] = useState("15");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(pct) / 100;
    if (!name.trim()) {
      setErr("Operator name is required.");
      return;
    }
    // An emptied input would coerce to Number('') === 0 and silently
    // save a 0%-commission operator — require an explicit value
    // instead (typing 0 deliberately still works).
    if (!pct.trim()) {
      setErr("Commission % is required — enter 0 explicitly for a no-commission operator.");
      return;
    }
    // [0, 50%] mirrors the API's [0, 0.5] bound and the 0041 check
    // constraint — reject here so the admin never round-trips a value
    // the server is guaranteed to refuse.
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      setErr("Commission must be between 0 and 50%.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact_email: email.trim() || null,
          commission_rate: rate,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-rule bg-surface p-5"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        Add operator
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mute">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="GM LUXE"
            className={`w-56 ${INPUT_CLS}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          Contact email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ops@operator.com"
            className={`w-64 ${INPUT_CLS}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          Commission %
          <input
            type="number"
            min="0"
            max="50"
            step="0.5"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className={`w-24 tabular-nums ${INPUT_CLS}`}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-red px-5 py-2.5 text-sm font-medium text-cream hover:bg-red-deep disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save operator"}
        </button>
      </div>
      {err && <p className="mt-3 text-xs text-red">{err}</p>}
    </form>
  );
}

function PartnerRow({
  partner: p,
  onChanged,
}: {
  partner: Partner;
  onChanged: () => void;
}) {
  const state = stripeState(p);
  const paused = p.status === "paused";

  // Inline commission edit
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  // Pause / resume — the API 409s payment links for paused partners,
  // so the roster must both SHOW paused and offer the way back.
  const [statusBusy, setStatusBusy] = useState(false);

  // Onboarding-link creation + reveal
  const [linkBusy, setLinkBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);

  function startEdit() {
    setPct(String(Math.round(p.commission_rate * 10000) / 100));
    setEditing(true);
  }

  async function saveRate() {
    const rate = Number(pct) / 100;
    // Same rails as the add form: an emptied input must not coerce to
    // a silent 0% (Number('') === 0), and the [0, 50%] bound mirrors
    // the API / DB constraint.
    if (!pct.trim()) {
      window.alert(
        "Commission % is required — enter 0 explicitly for a no-commission operator.",
      );
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      window.alert("Commission must be between 0 and 50%.");
      return;
    }
    setSavingRate(true);
    try {
      // The partners POST is an upsert — send the full row identity so
      // only the rate changes.
      const res = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          name: p.name,
          contact_email: p.contact_email,
          commission_rate: rate,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setEditing(false);
      onChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingRate(false);
    }
  }

  async function toggleStatus() {
    const next = paused ? "active" : "paused";
    if (
      next === "paused" &&
      !window.confirm(
        `Pause ${p.name}? New payment links are blocked while paused. Existing live links are unaffected.`,
      )
    ) {
      return;
    }
    setStatusBusy(true);
    try {
      const res = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, name: p.name, status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function sendOnboarding() {
    setLinkBusy(true);
    setLinkErr(null);
    try {
      const res = await authedFetch(
        `/api/admin/partners/${p.id}/onboarding-link`,
        { method: "POST" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          body.error ||
            (res.status === 503
              ? "Stripe not configured."
              : `HTTP ${res.status}`),
        );
      }
      if (typeof body.url !== "string" || !body.url) {
        throw new Error("API returned no onboarding URL.");
      }
      setLink(body.url);
      onChanged(); // stripe_account_id may have just been created
    } catch (e) {
      setLinkErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLinkBusy(false);
    }
  }

  // mailto with the onboarding link pre-filled — the admin's mail
  // client is the send channel so the operator email comes from a
  // human address, not a noreply.
  const mailto =
    link && p.contact_email
      ? `mailto:${p.contact_email}?subject=${encodeURIComponent(
          `RYDA — activate payments for ${p.name}`,
        )}&body=${encodeURIComponent(
          `Hi,\n\nTo receive rental payments through RYDA, please complete your Stripe onboarding here:\n\n${link}\n\nThe link expires after a short window, so it's best to complete it today. Payouts go directly to your account; RYDA's commission is handled automatically.\n\n— RYDA`,
        )}`
      : null;

  return (
    <>
      <tr className="hover:bg-cream-2/40">
        <td className="px-4 py-3 align-top">
          <p className="font-medium text-ink">{p.name}</p>
          {p.stripe_account_id && (
            <p className="mt-0.5 text-xs text-mute">{p.stripe_account_id}</p>
          )}
        </td>
        <td className="px-4 py-3 align-top text-xs text-ink-soft">
          {p.contact_email ?? <span className="text-mute">—</span>}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          {editing ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className={`w-20 !py-1 text-xs tabular-nums ${INPUT_CLS}`}
              />
              <button
                type="button"
                onClick={() => void saveRate()}
                disabled={savingRate}
                className="inline-flex h-7 items-center rounded-full border border-success/40 px-3 text-[11px] font-medium text-success-deep hover:bg-success hover:text-cream disabled:opacity-50"
              >
                {savingRate ? "…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex h-7 items-center rounded-full border border-rule px-3 text-[11px] font-medium text-mute hover:border-ink hover:text-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="tabular-nums text-ink">
                {pctLabel(p.commission_rate)}
              </span>
              <button
                type="button"
                onClick={startEdit}
                className="text-[11px] font-medium text-ink-soft hover:text-ink"
              >
                Edit
              </button>
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <StripeChip state={state} />
            {/* Paused overrides the operational read of "Ready" — the
                API blocks new payment links regardless of Stripe
                state, so the roster must say so. */}
            {paused && (
              <span className="inline-flex items-center rounded-full border border-warn/40 bg-warn/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warn-deep">
                Paused
              </span>
            )}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          <div className="flex flex-wrap gap-1">
            {state !== "ready" && (
              <button
                type="button"
                onClick={() => void sendOnboarding()}
                disabled={linkBusy}
                className="inline-flex h-7 items-center rounded-full border border-rule px-3 text-[11px] font-medium text-ink-soft hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {linkBusy
                  ? "…"
                  : state === "onboarding_sent"
                    ? "Resend onboarding link"
                    : "Create + send onboarding link"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleStatus()}
              disabled={statusBusy}
              className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                paused
                  ? "border-success/40 text-success-deep hover:bg-success hover:text-cream"
                  : "border-rule text-mute hover:border-ink hover:text-ink"
              }`}
            >
              {statusBusy ? "…" : paused ? "Resume bookings" : "Pause"}
            </button>
          </div>
        </td>
      </tr>

      {(link || linkErr) && (
        <tr>
          <td colSpan={5} className="bg-cream-2/40 px-6 py-4">
            {linkErr && (
              <p className="text-xs text-red">
                {linkErr}
                {/* Substring match — the API's actual message is
                    "Stripe not configured. Set STRIPE_SECRET_KEY to
                    onboard operators.", so an exact === can never
                    fire. */}
                {/stripe not configured/i.test(linkErr) &&
                  " Payment features are disabled in this environment."}
              </p>
            )}
            {link && (
              <div className="max-w-2xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                  Onboarding link · expires soon, send it promptly
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <CopyField value={link} />
                  {mailto && (
                    <a
                      href={mailto}
                      className="inline-flex h-8 shrink-0 items-center rounded-full border border-rule bg-surface px-3 text-[11px] font-medium text-ink-soft hover:border-ink hover:text-ink"
                    >
                      Email to {p.contact_email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex w-full items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs text-ink"
      />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            .writeText(value)
            .then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {});
        }}
        className="inline-flex h-8 shrink-0 items-center rounded-full border border-rule bg-surface px-3 text-[11px] font-medium text-ink-soft hover:border-ink hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
