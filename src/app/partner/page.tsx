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
//   approved  — live-ready: fleet panel (the booking-request inbox at
//               /partner/requests, badged with what's waiting; listing
//               setup stays white-glove, so inventory is still an empty
//               state until ops wires it) + editable company profile
//   suspended — paused/declined notice + contact
//
// Status is admin-owned (/admin/partners). This page never writes it.

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import {
  PARTNER_FLEET_SIZES,
  type PartnerAccount,
} from "@/lib/partner";
// From the lib, NOT from the inbox component: that module is "use
// client" and imports RentalDatePicker, the admin action modal and the
// quote engine at module scope, and this page renders none of them — it
// renders a count badge. See src/lib/operator-bookings.ts.
import { fetchOperatorBookings } from "@/lib/operator-bookings";
import {
  FOCUS_RING,
  countOperatorRequests,
} from "@/lib/rental-booking-display";

// Admin approval bridges an application (partner_accounts) to a Stripe
// operator (partners row). /api/partner/me surfaces that link as an
// `operator` field: null until the bridge exists, then linked with the
// Stripe onboarding + pause state. Older API deploys omit the field
// entirely — `undefined` here — and the Payments card hides itself.
type OperatorLink = {
  linked: true;
  stripeOnboarded: boolean;
  paused: boolean;
};

type ViewState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "anon" }
  | { status: "none"; intent: boolean }
  | { status: "ready"; partner: PartnerAccount; operator?: OperatorLink | null }
  | { status: "error"; message: string };

export default function PartnerDashboardPage() {
  // Suspense boundary because the inner page reads useSearchParams
  // (Next 16 requires it).
  return (
    <Suspense fallback={null}>
      <PartnerDashboardInner />
    </Suspense>
  );
}

function PartnerDashboardInner() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const searchParams = useSearchParams();
  // /signup routes partners here with ?from=signup. Email+password
  // signups already carry partner_intent in metadata; OAuth signups
  // CAN'T (the provider redirect carries no metadata), so the query
  // param is how their partner choice survives the round-trip.
  const fromSignup = searchParams.get("from") === "signup";
  const stamped = useRef(false);

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
        operator?: OperatorLink | null;
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
        setState({
          status: "ready",
          partner: body.partner,
          operator: body.operator,
        });
      } else {
        if (fromSignup && !stamped.current) {
          stamped.current = true;
          // Stamp the partner choice that the OAuth redirect couldn't
          // carry (idempotent for email+password signups, which wrote
          // it at signUp), and record the lead the signup form's
          // waitlist POST never fired for OAuth users. Both
          // best-effort — the apply form below is the real surface.
          void supabase?.auth
            .updateUser({
              data: { account_type: "partner", partner_intent: true },
            })
            .catch(() => {});
          void supabase?.auth.getSession().then(({ data }) => {
            const em = data.session?.user.email;
            if (!em) return;
            void fetch("/api/waitlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: em,
                market: "Miami",
                source: "signup:partner",
              }),
            }).catch(() => {});
          });
        }
        setState({
          status: "none",
          intent: body.intent === true || fromSignup,
        });
      }
    } catch {
      setState({ status: "error", message: "Could not load. Check your connection." });
    }
  }, [fromSignup]);

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
            onApplied={(partner, operator) => {
              // Stamp the (user-editable, affordance-only) flag the
              // header Partner pill reads, so inline applicants get
              // the same nav back to this page that signup-path
              // partners do. Best-effort — the dashboard itself is
              // API-gated either way.
              void supabase?.auth
                .updateUser({ data: { partner_intent: true } })
                .catch(() => {});
              // operator rides along from the POST response (null for
              // a fresh pending application) so the Payments card
              // renders immediately, matching what a GET would show.
              setState({ status: "ready", partner, operator });
            }}
          />
        )}

        {state.status === "ready" && (
          <Dashboard
            partner={state.partner}
            operator={state.operator}
            onSaved={load}
          />
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
  onApplied: (p: PartnerAccount, operator?: OperatorLink | null) => void;
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
  operator,
  onSaved,
}: {
  partner: PartnerAccount;
  /** undefined = API predates the operator bridge — hide the card. */
  operator?: OperatorLink | null;
  onSaved: () => void;
}) {
  return (
    <div className="mt-8 space-y-6">
      <StatusCard partner={partner} />
      {operator !== undefined && (
        <PaymentsCard operator={operator} status={partner.status} />
      )}
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

// Mirrors the four steps on /partners plus the one that page used to
// omit: before any money can move the operator must finish Stripe
// Express onboarding (identity, business details, bank account). Landing
// an approved operator on a KYC gate the journey never mentioned is how
// a "days not months" promise turns into a complaint.
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
  {
    title: "Activate payments",
    body: "We send a Stripe link; Stripe verifies your business and bank details so payouts reach you directly.",
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
        <ol className="mt-6 grid grid-cols-1 gap-5 border-t border-rule pt-6 sm:grid-cols-3 lg:grid-cols-5">
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
  // -deep text on every tinted wash: `text-red` on `bg-red/10` measures
  // ~4.3:1, under the 4.5:1 AA floor, and this is the pill that tells a
  // partner their account is paused.
  const cls =
    status === "approved"
      ? "bg-success/10 text-success-deep"
      : status === "suspended"
        ? "bg-red/10 text-red-deep"
        : "bg-warn/15 text-warn-deep";
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

// ── payments (Stripe operator bridge, admin-owned) ──────────────
//
// Status only — nothing here is partner-actionable. Admin approval
// creates-or-links the Stripe operator row; onboarding links are sent
// by RYDA, not self-served.
//
// The ACCOUNT's status leads. `operator` alone can't tell the story:
// a declined application never gets bridged, so operator is null —
// which used to print "your application is under review" directly under
// StatusCard's red Paused banner and the decline note. And a suspended
// partner whose operator stayed active (another approved application
// shares it) would read "Payments active" under the same banner. Both
// are contradictions the partner has no way to resolve, so the card
// answers for the account first and the operator second.
//
// Within an approved account, precedence is paused → onboarded →
// pending (a paused operator that finished Stripe is still paused).
function PaymentsCard({
  operator,
  status,
}: {
  operator: OperatorLink | null;
  status: PartnerAccount["status"];
}) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        Payments
      </p>
      {status === "suspended" ? (
        <div className="mt-4 rounded-xl bg-warn/15 px-4 py-3 text-sm text-warn-deep">
          Payments are off while your account is paused. Nothing new can be
          booked or charged through RYDA — see the note above.
        </div>
      ) : status === "pending" ? (
        <p className="mt-4 text-sm text-ink-soft">
          Your application is under review. On approval you&apos;ll complete
          Stripe onboarding, and payments unlock from there.
        </p>
      ) : operator === null ? (
        // Approved but not yet bridged — a transient window between the
        // approval and its operator row.
        <p className="mt-4 text-sm text-ink-soft">
          You&apos;re approved — we&apos;re setting up your operator entry.
          Your Stripe onboarding link follows shortly.
        </p>
      ) : operator.paused ? (
        <div className="mt-4 rounded-xl bg-warn/15 px-4 py-3 text-sm text-warn-deep">
          Payments paused — contact RYDA.
        </div>
      ) : operator.stripeOnboarded ? (
        <div className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success-deep">
          Payments active — you receive bookings directly; RYDA&apos;s
          commission is deducted automatically.
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          RYDA will send your Stripe onboarding link — payouts go
          directly to your account.
        </p>
      )}
    </section>
  );
}

// Listing setup is white-glove (an ops conversation, not a self-serve
// upload), so the approved fleet panel is still an honest empty state
// where INVENTORY is concerned. What it is no longer empty about is
// BOOKINGS: build loop 2F puts the request inbox at /partner/requests,
// and an operator has 24 hours to answer a request (open default O5),
// so the count of what is waiting on them belongs on the page they
// actually land on rather than behind a link they have no reason to
// click.
//
// The count comes from the SAME fetch and the SAME predicate the inbox
// itself uses — fetchOperatorBookings() + countOperatorRequests(),
// which reads awaitsDecisionFrom (whose turn it is, per
// rentalBookingDecider) and lazily expires anything past its window.
// Two definitions of "waiting on you" would eventually disagree, and
// the one on this page would be the one nobody notices is wrong.
//
// Best-effort: a failed load leaves the count unknown and the panel
// simply does not badge it. The inbox is one click away and answers for
// itself; a partner dashboard must not break because a booking table is
// not applied yet.
function FleetPanel() {
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchOperatorBookings();
      if (cancelled || !res.ok) return;
      setPending(countOperatorRequests(res.bookings, Date.now()));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
        Your fleet
      </p>

      <Link
        href="/partner/requests"
        className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-cream-2/50 px-5 py-4 transition-colors hover:border-ink ${FOCUS_RING}`}
      >
        <span>
          <span className="block font-display text-lg text-ink">
            Booking requests
          </span>
          <span className="mt-1 block text-sm text-ink-soft">
            {pending === null
              ? "Renters asking for dates on your cars."
              : pending === 0
                ? "Nothing waiting on you right now."
                : "Answer within 24 hours or the request expires."}
          </span>
        </span>
        <span className="flex items-center gap-3">
          {pending !== null && pending > 0 && (
            <span className="inline-flex items-center rounded-full bg-red px-3 py-1 text-xs font-medium tabular-nums text-cream">
              {pending} waiting
            </span>
          )}
          <span className="text-sm font-medium text-ink">Open inbox →</span>
        </span>
      </Link>

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
  /** operator passes the POST response's bridge summary through
   *  (undefined when an older API omits the field) — the apply path
   *  needs it so the Payments card matches a fresh GET. */
  onSaved: (p: PartnerAccount, operator?: OperatorLink | null) => void;
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
        operator?: OperatorLink | null;
        error?: string;
      };
      if (!res.ok || !body.partner) {
        throw new Error(body.error || `Save failed (${res.status}).`);
      }
      onSaved(body.partner, body.operator);
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
