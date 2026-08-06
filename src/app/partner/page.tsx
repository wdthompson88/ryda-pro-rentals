"use client";

// /partner — Fleet Partner Program dashboard.
//
// The signed-in home for rental operators. Driven entirely by
// /api/partner/me (bearer-authenticated), which is also what turns a
// partner signup's metadata intent into a real pending application on
// first visit. Client-side auth here is presentation only — the API
// 401s before any data moves, same posture as /account.
//
// States:
//   unconfigured — no Supabase env (preview deploy): explainer card
//   anon      — sign-in prompt (deep-links back here)
//   none      — no application yet: inline apply form (any signed-in
//               member can apply without re-registering)
//   pending   — application received: review timeline + editable
//               company profile
//   approved  — live-ready: fleet panel (listing setup is white-glove,
//               so it's an empty state until ops wires inventory) +
//               editable company profile
//   suspended — paused/declined notice + contact
//
// Status is admin-owned (/admin/partners). This page never writes it.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import {
  PARTNER_FLEET_SIZES,
  type PartnerAccount,
} from "@/lib/partner";

type ViewState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "anon" }
  | { status: "none"; intent: boolean }
  | { status: "ready"; partner: PartnerAccount }
  | { status: "error"; message: string };

export default function PartnerDashboardPage() {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  const load = useCallback(async () => {
    // Preview deploys without Supabase env: /signup simulates success,
    // /signin simulates success, and this API would 401 — sending the
    // visitor into a signup → sign-in → dashboard loop. Branch on the
    // missing client up front instead, same posture as /account.
    if (!supabase) {
      setState({ status: "unconfigured" });
      return;
    }
    try {
      const res = await authedFetch("/api/partner/me");
      if (res.status === 401) {
        setState({ status: "anon" });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        partner?: PartnerAccount | null;
        intent?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setState({
          status: "error",
          message: body.error || `Could not load (${res.status}).`,
        });
        return;
      }
      if (body.partner) {
        setState({ status: "ready", partner: body.partner });
      } else {
        setState({ status: "none", intent: body.intent === true });
      }
    } catch {
      setState({ status: "error", message: "Could not load. Check your connection." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Fleet Partner Program
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Partner dashboard.
          </h1>
        </header>

        {state.status === "loading" && (
          <p className="mt-12 text-sm text-mute">Loading…</p>
        )}

        {state.status === "unconfigured" && (
          <div className="mt-10 rounded-2xl border border-rule bg-cream-2/50 p-10 text-center">
            <p className="font-display text-xl text-ink">
              Preview environment.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
              This deploy has no backend configured, so partner accounts
              are disabled. Everything works in production and in a
              locally configured dev environment.
            </p>
          </div>
        )}

        {state.status === "anon" && <SignInPrompt />}

        {state.status === "error" && (
          <div className="mt-10 rounded-2xl border border-red/40 bg-red/5 p-6">
            <p className="text-sm text-red">{state.message}</p>
            <button
              type="button"
              onClick={() => {
                setState({ status: "loading" });
                void load();
              }}
              className="mt-4 rounded-full border border-rule bg-surface px-5 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              Retry
            </button>
          </div>
        )}

        {state.status === "none" && (
          <ApplySection
            intent={state.intent}
            onApplied={(partner) => {
              // Stamp the (user-editable, affordance-only) flag the
              // header Partner pill reads, so inline applicants get
              // the same nav back to this page that signup-path
              // partners do. Best-effort — the dashboard itself is
              // API-gated either way.
              void supabase?.auth
                .updateUser({ data: { partner_intent: true } })
                .catch(() => {});
              setState({ status: "ready", partner });
            }}
          />
        )}

        {state.status === "ready" && (
          <Dashboard partner={state.partner} onSaved={load} />
        )}
      </main>
    </>
  );
}

function SignInPrompt() {
  return (
    <div className="mt-10 rounded-2xl border border-rule bg-surface p-8 sm:p-10">
      <h2 className="font-display text-xl text-ink">
        Sign in to see your partner dashboard.
      </h2>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Your application status and company profile live behind your
        account. New here? Partner signup takes about a minute.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/signin?next=%2Fpartner"
          className="inline-flex h-11 items-center rounded-full bg-red px-6 text-sm font-medium text-cream hover:bg-red-deep"
        >
          Sign in →
        </Link>
        <Link
          href="/signup?as=partner"
          className="inline-flex h-11 items-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
        >
          Apply as a partner
        </Link>
      </div>
    </div>
  );
}

// ── apply (signed-in member, no application yet) ────────────────

function ApplySection({
  intent,
  onApplied,
}: {
  /** True when signup metadata carried partner intent but the details
   *  were unusable — the server saw them try to apply already. */
  intent: boolean;
  onApplied: (p: PartnerAccount) => void;
}) {
  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-rule bg-surface p-8 sm:p-10">
        <h2 className="font-display text-xl text-ink">
          {intent
            ? "Almost there — tell us about your company."
            : "List your fleet with RYDA."}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          {intent
            ? "You signed up as a fleet partner. Add your company details below and your application goes straight into review — we respond personally within 3 business days."
            : "Tell us about your company. We respond to every application personally within 3 business days, and this page tracks the review from the moment you submit."}
        </p>
        <PartnerForm
          submitLabel="Submit application →"
          onSaved={onApplied}
        />
      </div>
      <p className="mt-4 text-xs text-mute">
        Curious what partners get?{" "}
        <Link href="/partners" className="underline hover:text-ink">
          Read about the program
        </Link>
        .
      </p>
    </div>
  );
}

// ── the dashboard proper ────────────────────────────────────────

function Dashboard({
  partner,
  onSaved,
}: {
  partner: PartnerAccount;
  onSaved: () => void;
}) {
  return (
    <div className="mt-8 space-y-6">
      <StatusCard partner={partner} />
      {partner.status === "approved" && <FleetPanel />}
      <ProfileCard partner={partner} onSaved={onSaved} />
      <p className="text-xs text-mute">
        Questions? Reach the partnerships team at{" "}
        <a
          href="mailto:partners@ryda.pro"
          className="underline hover:text-ink"
        >
          partners@ryda.pro
        </a>
        .
      </p>
    </div>
  );
}

const REVIEW_STEPS = [
  { title: "Apply", body: "Application received." },
  {
    title: "Fleet review",
    body: "We confirm which vehicles meet RYDA's standards.",
  },
  {
    title: "Listing setup",
    body: "Photos, specs, pricing, and availability — together.",
  },
  { title: "Live", body: "Your fleet goes live. Enquiries reach you directly." },
];

function StatusCard({ partner }: { partner: PartnerAccount }) {
  const applied = new Date(partner.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">
            {partner.company_name}
          </h2>
          <p className="mt-1 text-xs text-mute">
            Applied {applied} · {partner.market}
          </p>
        </div>
        <StatusPill status={partner.status} />
      </div>

      {partner.status === "pending" && (
        <ol className="mt-6 grid grid-cols-1 gap-5 border-t border-rule pt-6 sm:grid-cols-4">
          {REVIEW_STEPS.map((s, i) => {
            // Step 0 is done the moment a row exists; review (step 1)
            // is where a pending application sits.
            const done = i === 0;
            const current = i === 1;
            return (
              <li key={s.title}>
                <p
                  className={`font-display text-lg ${
                    done || current ? "text-red" : "text-mute"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    done || current ? "text-ink" : "text-mute"
                  }`}
                >
                  {s.title}
                  {done && " ✓"}
                  {current && " · in progress"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {s.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {partner.status === "approved" && (
        <p className="mt-4 border-t border-rule pt-4 text-sm text-ink-soft">
          Your fleet passed review — welcome aboard. The partnerships
          team will work with you on listing setup below.
        </p>
      )}

      {partner.status === "suspended" && (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-sm text-ink-soft">
            Your partner account is currently paused
            {partner.status_note ? (
              <>
                {" "}
                — <span className="text-ink">{partner.status_note}</span>
              </>
            ) : (
              "."
            )}{" "}
            If you think this is a mistake or want to revisit it, email{" "}
            <a
              href="mailto:partners@ryda.pro"
              className="underline hover:text-ink"
            >
              partners@ryda.pro
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: PartnerAccount["status"] }) {
  const cls =
    status === "approved"
      ? "bg-success/10 text-success-deep"
      : status === "suspended"
        ? "bg-red/10 text-red"
        : "bg-amber-500/15 text-amber-700";
  const label =
    status === "approved"
      ? "Approved"
      : status === "suspended"
        ? "Paused"
        : "Under review";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${cls}`}
    >
      {label}
    </span>
  );
}

// Listing setup is white-glove (an ops conversation, not a self-serve
// upload), so the approved fleet panel is an honest empty state until
// inventory exists in the system.
function FleetPanel() {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        Your fleet
      </p>
      <div className="mt-4 rounded-xl border border-rule bg-cream-2/50 p-8 text-center">
        <p className="font-display text-lg text-ink">
          Listing setup starts with a conversation.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          We work with you directly on photos, specs, pricing, and
          availability so your cars are presented the way they deserve.
          The partnerships team will reach out — or get ahead of them at{" "}
          <a
            href="mailto:partners@ryda.pro"
            className="underline hover:text-ink"
          >
            partners@ryda.pro
          </a>
          .
        </p>
      </div>
    </section>
  );
}

// ── company profile (create + edit share one form) ──────────────

function ProfileCard({
  partner,
  onSaved,
}: {
  partner: PartnerAccount;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Company profile
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-ink-soft hover:text-ink"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <PartnerForm
          initial={partner}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onSaved();
          }}
        />
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <ProfileRow label="Company" value={partner.company_name} />
          <ProfileRow label="Contact" value={partner.contact_name} />
          <ProfileRow label="Email" value={partner.contact_email} />
          <ProfileRow label="Phone" value={partner.phone} />
          <ProfileRow label="Website" value={partner.website} />
          <ProfileRow label="Fleet size" value={partner.fleet_size} />
        </dl>
      )}
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
      <dd className="mt-1 text-sm text-ink">
        {value || <span className="text-mute">—</span>}
      </dd>
    </div>
  );
}

const INPUT_CLS =
  "mt-2 h-11 w-full rounded-lg border border-rule bg-cream px-3.5 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20";

// Shared apply/edit form. POSTs detail fields to /api/partner/me —
// the server never lets this touch status.
function PartnerForm({
  initial,
  submitLabel,
  onSaved,
  onCancel,
}: {
  initial?: PartnerAccount;
  submitLabel: string;
  onSaved: (p: PartnerAccount) => void;
  onCancel?: () => void;
}) {
  const [company, setCompany] = useState(initial?.company_name ?? "");
  const [contact, setContact] = useState(initial?.contact_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [fleetSize, setFleetSize] = useState(initial?.fleet_size ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (company.trim().length < 2) {
      setErr("Company name is required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch("/api/partner/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company,
          contact_name: contact,
          phone,
          website,
          fleet_size: fleetSize,
          market: initial?.market ?? "Miami",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        partner?: PartnerAccount;
        error?: string;
      };
      if (!res.ok || !body.partner) {
        throw new Error(body.error || `Save failed (${res.status}).`);
      }
      onSaved(body.partner);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        Company
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Your rental company"
          required
          className={INPUT_CLS}
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        Contact name
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Who we should ask for"
          className={INPUT_CLS}
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        Phone
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (305) 555-0100"
          className={INPUT_CLS}
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        Website
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="yourfleet.com"
          className={INPUT_CLS}
        />
      </label>
      <label className="block text-xs font-medium uppercase tracking-wider text-mute">
        Fleet size
        <select
          value={fleetSize}
          onChange={(e) => setFleetSize(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Prefer not to say</option>
          {PARTNER_FLEET_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} vehicles
            </option>
          ))}
        </select>
      </label>

      {err && (
        <p
          role="alert"
          className="sm:col-span-2 rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red"
        >
          {err}
        </p>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center rounded-full bg-red px-6 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
