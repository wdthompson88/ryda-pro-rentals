"use client";

// /admin/partners — the partner program's single admin surface.
//
// Two tabs over one API (/api/admin/partners):
//
//   Applications — the front door. partner_accounts rows (0042)
//   created by /signup?as=partner or the /partner apply form.
//   Approve / decline / suspend with an ops note; every change is
//   audit-logged. APPROVAL IS THE BRIDGE: the API creates-or-finds
//   the company-keyed operator row from the application's company
//   details and links it via partner_accounts.partner_id — after a
//   refresh the new operator sits in the Operators tab, ready for
//   "Create + send onboarding link".
//
//   The join key is company_name, which the APPLICANT owns, so the
//   bridge is never implicit here: every approval PATCH carries the
//   company name this page displayed (the server rejects it if the
//   applicant has since changed it), and if that name already belongs
//   to an operator the API writes nothing and returns that operator's
//   Stripe state, commission, and payment history for a second,
//   explicit confirmation. Suspension likewise never pauses the linked
//   operator unless the admin ticks the opt-in — operators have a
//   lifecycle of their own.
//
//   Operators — the Stripe Connect roster (partners, 0041 + 0048).
//   Before a payment link can be sent from /admin/inquiries, the
//   operator needs an Express account with onboarding completed. This
//   tab manages that: add operators, set their FEE TERMS, pause /
//   resume, and create + send the Stripe onboarding link.
//
//   FEE TERMS (decision D2, migration 0048) are four levers, not one:
//   percent or flat, carried by the operator (deducted from their
//   payout) or by the renter (added on top of the price they see), with
//   an optional floor and cap. The editor previews every combination
//   against a $2,000 reference booking by calling computeRentalFee —
//   the same function the server charges with. It never re-derives a
//   fee in JSX; see the note above FeeTermsFields for the incident that
//   rule comes from.
//
//   WHICH RAIL THE FEE RIDES depends on which flow charged it, and this
//   tab is deliberately agnostic. The /admin/inquiries payment link is
//   a Connect DIRECT charge on the operator's own Express account,
//   where the fee is Stripe's application_fee_amount. The request-to-
//   book rental flow (decision D1, task 3B) charges on RYDA's own
//   platform account and pays the operator out by transfer after a
//   clean return. The terms set here describe what RYDA charges, not
//   which Stripe object carries it.
//
// Stripe state chip per operator row:
//   Not started     — no stripe_account_id yet
//   Onboarding sent — Express account created, operator hasn't
//                     finished Stripe's hosted onboarding
//   Ready           — stripe_onboarded_at set; payment links work
//
// Tab state is local component state kept in sync with ?tab= via
// history.replaceState (read once on mount — no useSearchParams, so
// the page stays Suspense-free), which makes /admin/partners?tab=operators
// linkable from /admin and /admin/inquiries; a return from Stripe
// onboarding (?onboarded=) lands there too. Both tabs carry a count
// badge so neither can look empty while the other holds the work.
// Degraded states, all preserved from both predecessors:
//   503 from the API      → "Backend not configured" (dev preview)
//   missing partners rel  → "run migration 0041" hint (whole page —
//                            0042 sequences after 0041)
//   applicationsError     → Applications tab only: "run migration
//                            0042" hint while the roster keeps working
// The code-level partner-contacts.ts map keeps routing inquiry emails
// until partners rows exist — this page is additive, not a
// prerequisite.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { useActionModal } from "@/components/admin/action-modal";
import type { PartnerAccount, PartnerStatus } from "@/lib/partner";
import {
  RENTAL_FEE_EXAMPLE_BASE_CENTS,
  computeRentalFee,
  type RentalFeeMode,
  type RentalFeePayer,
} from "@/lib/fees";
import {
  BLANK_FEE_FORM,
  MAX_PCT,
  dollarsFromCents,
  parseFeeForm,
  pctFromRate,
  usd,
  type FeeFormState,
} from "@/lib/partner-fee-form";

/** Passed down so both tabs confirm destructive actions the same way
 *  (and capture the same audit note) instead of one tab falling back
 *  to window.confirm. */
type ModalOpener = ReturnType<typeof useActionModal>["open"];

type Partner = {
  id: string;
  name: string;
  contact_email: string | null;
  // Decimal share of the rental price (0.15 = 15%). Live when
  // fee_mode = 'percent'; kept but dormant in flat mode (0041 declared
  // the column NOT NULL, so it cannot be cleared). The math itself
  // lives in fees.ts and is never re-derived here — this page reads
  // the terms and previews them through the very same function the
  // server charges with.
  commission_rate: number;
  // Fee terms, migration 0048 / decision D2. OPTIONAL on this type on
  // purpose: migrations are applied by a human, so there is a window in
  // which this page is deployed and the columns do not exist yet. The
  // API reports that as feeConfigReady and the editor degrades to the
  // commission-only control rather than POSTing an unknown column.
  fee_mode?: RentalFeeMode | null;
  fee_flat_cents?: number | null;
  fee_payer?: RentalFeePayer | null;
  fee_floor_cents?: number | null;
  fee_cap_cents?: number | null;
  stripe_account_id: string | null;
  stripe_onboarded_at: string | null;
  // 0041 status column: 'paused' blocks new payment links at the API.
  // Must be visible here — a paused operator showing a green "Ready"
  // chip sends the admin chasing phantom Stripe issues.
  status: "active" | "paused";
};

// What the API discloses when an approval would attach an application
// to an operator that ALREADY exists (name collision on the
// applicant-controlled company_name). Mirrors the 409 payload of
// /api/admin/partners PATCH.
type OperatorDisclosure = {
  id: string;
  name: string;
  market: string;
  status: "active" | "paused";
  contact_email: string | null;
  commission_rate: number;
  stripe_account_id: string | null;
  stripeOnboarded: boolean;
  created_at: string;
  payments: { total: number; paid: number } | null;
  linkedApprovedApplications: number;
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

// Supabase's error text when a relation is missing — either raw
// Postgres 42P01 or PostgREST's schema-cache variant. Used to
// distinguish "run the migration" from a real failure.
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

type Tab = "applications" | "operators";

export default function AdminPartnersPage() {
  const [tab, setTab] = useState<Tab>("applications");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [applications, setApplications] = useState<PartnerAccount[]>([]);
  const [applicationsError, setApplicationsError] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState<Degraded>(null);
  const [showAdd, setShowAdd] = useState(false);
  // Reported by the API (see its GET). false until proven true, so an
  // older API build that does not send the flag degrades to the
  // commission-only editor rather than POSTing columns that may not
  // exist — the safe direction for a page that edits live money terms.
  const [feeConfigReady, setFeeConfigReady] = useState(false);
  // Result of the last review action, shown inline instead of a
  // window.alert. `tone` decides banner colour; "info" carries the
  // API's own report of what it did (linked vs created, paused or not).
  const [notice, setNotice] = useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);

  const { open: openModal, modal } = useActionModal();

  // Tab is addressable so /admin and the inquiries onboarding error can
  // deep-link the roster (?tab=operators), and a return from Stripe's
  // hosted onboarding (?onboarded=<id> on the return_url) lands there
  // too — the GET's best-effort refresh will show the fresh "Ready"
  // chip. Read once on mount; no useSearchParams, so the page stays
  // Suspense-free.
  useEffect(() => {
    const q = window.location.search;
    if (/[?&]onboarded=/.test(q) || /[?&]tab=operators\b/.test(q)) {
      setTab("operators");
    }
  }, []);

  // Keep the URL in step with the tab so the page can be bookmarked and
  // shared. replaceState, not a router push: no navigation, no
  // Suspense boundary, no history spam from tab flipping.
  const selectTab = useCallback((next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "operators") url.searchParams.set("tab", "operators");
    else url.searchParams.delete("tab");
    url.searchParams.delete("onboarded");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setError(null);
    setDegraded(null);
    setApplicationsError(null);
    try {
      const res = await authedFetch("/api/admin/partners");
      const body = (await res.json().catch(() => ({}))) as {
        partners?: Partner[];
        applications?: PartnerAccount[];
        applicationsError?: string | null;
        feeConfigReady?: boolean;
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
        setApplications([]);
        return;
      }
      if (!res.ok) {
        if (body.error && MISSING_TABLE_RE.test(body.error)) {
          setDegraded({ kind: "migration", detail: body.error });
          setPartners([]);
          setApplications([]);
          return;
        }
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setPartners(body.partners ?? []);
      setApplications(body.applications ?? []);
      setApplicationsError(body.applicationsError ?? null);
      setFeeConfigReady(body.feeConfigReady === true);
    } catch (err) {
      // Drop the data with the error. Anything still on screen under an
      // error banner is unverified: a stats row of zeros would assert
      // "no applications" the page never confirmed, and a stale roster
      // would keep offering Pause / onboarding buttons that now fail.
      setPartners([]);
      setApplications([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // One PATCH per review decision; a quiet reload afterwards refreshes
  // BOTH tabs from the single GET — an approval's freshly bridged
  // operator appears in the roster without a page reload.
  //
  // The approval bridge joins on company_name, which the APPLICANT owns
  // and can rewrite at any time. So the PATCH carries the name shown in
  // this modal (expectedCompanyName) and the server refuses if the row
  // has since changed; and if the name matches an operator that already
  // exists, the server refuses once, with that operator's full state,
  // and only links after a second, deliberate confirmation.
  async function setApplicationStatus(p: PartnerAccount, to: PartnerStatus) {
    // What suspension would do to the linked operator, computed from
    // the same GET that populated this table.
    const linkedOperator = p.partner_id
      ? (partners.find((o) => o.id === p.partner_id) ?? null)
      : null;
    const sharedWith = p.partner_id
      ? applications.filter(
          (a) =>
            a.partner_id === p.partner_id &&
            a.user_id !== p.user_id &&
            a.status === "approved",
        ).length
      : 0;

    const verbs: Record<
      string,
      {
        title: string;
        message: string;
        confirm: string;
        tone?: "danger";
        checkboxLabel?: string;
      }
    > = {
      approved: {
        title:
          p.status === "suspended" ? "Reinstate partner" : "Approve application",
        message:
          p.status === "suspended"
            ? `${p.company_name} regains the partner dashboard immediately. Their operator entry stays linked — if it was paused on suspension, resume bookings from the Operators tab.\n\nYour note goes to the audit log only.`
            : `${p.company_name} unlocks the partner dashboard and gets an operator entry in the Operators tab, ready for Stripe onboarding.\n\nIf an operator with this exact name already exists, nothing is written — you'll be shown that operator's Stripe state, commission, and payment history and asked to confirm the link separately.\n\nYour note goes to the audit log only — the partner never sees it.`,
        confirm: p.status === "suspended" ? "Reinstate" : "Approve",
      },
      suspended: {
        title:
          p.status === "pending" ? "Decline application" : "Suspend partner",
        message: `${p.company_name}'s dashboard shows a paused notice with your note — write it for the partner to read. They keep account access.${
          linkedOperator
            ? `\n\nLinked operator · ${linkedOperator.name}${
                linkedOperator.stripe_onboarded_at
                  ? ", Stripe ready"
                  : linkedOperator.stripe_account_id
                    ? ", Stripe onboarding sent"
                    : ", no Stripe account"
              }, ${pctLabel(linkedOperator.commission_rate)} commission. Operators are never deleted — they may hold payment history.${
                sharedWith > 0
                  ? `\n\nIt stays active either way: ${sharedWith} other approved application${
                      sharedWith === 1 ? "" : "s"
                    } still links to it. Pause it from the Operators tab if bookings must stop.`
                  : ""
              }`
            : ""
        }`,
        confirm: p.status === "pending" ? "Decline" : "Suspend",
        tone: "danger",
        // Opt-in and unchecked by default: an operator's lifecycle is
        // managed on the Operators tab and may predate every
        // application (ops can create operators directly, and 0041
        // seeds one), so a decline must not be able to halt an
        // established operator's revenue as a side effect. Offered only
        // when the pause could actually take effect.
        checkboxLabel:
          linkedOperator && sharedWith === 0
            ? `Also pause the operator “${linkedOperator.name}” — blocks every new payment link for it, including work ops has going independently of this application. One-way here; resume from the Operators tab.`
            : undefined,
      },
    };
    const v = verbs[to];
    const res = await openModal({
      title: v.title,
      message: v.message,
      confirmLabel: v.confirm,
      tone: v.tone,
      noteRequired: to === "suspended",
      checkboxLabel: v.checkboxLabel,
    });
    if (!res.confirmed) return;

    const send = async (extra: Record<string, unknown> = {}) =>
      authedFetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: p.user_id,
          status: to,
          note: res.note,
          // The name this admin actually reviewed — the server rejects
          // the approval if the applicant has since changed it.
          expectedCompanyName: p.company_name,
          pauseOperator: to === "suspended" ? res.checked : undefined,
          ...extra,
        }),
      });

    setNotice(null);
    try {
      let r = await send();
      let j = (await r.json().catch(() => ({}))) as {
        error?: string;
        requiresLinkConfirmation?: boolean;
        staleApplication?: boolean;
        operator?: OperatorDisclosure;
        bridge?: string | null;
        operatorPaused?: boolean;
        operatorPauseSkipped?: string | null;
      };

      // The collision: this application's company name already belongs
      // to an operator on the roster. Show exactly which one — and what
      // money is attached to it — before anything is written.
      if (r.status === 409 && j.requiresLinkConfirmation && j.operator) {
        const op = j.operator;
        const confirmLink = await openModal({
          title: "Link to an existing operator?",
          message:
            `“${p.company_name}” already exists on the Operators roster. Approving this application will attach this applicant's account to that EXISTING operator — the Stripe account its rental payments settle into. No new operator is created.\n\n` +
            `Operator · ${op.name} (${op.market}), added ${fmt(op.created_at)}\n` +
            `Stripe · ${
              op.stripeOnboarded
                ? `ready — live charges settle to ${op.stripe_account_id ?? "its connected account"}`
                : op.stripe_account_id
                  ? "onboarding sent, not finished"
                  : "no account yet — whoever completes the onboarding link owns the payouts"
            }\n` +
            `Commission · ${pctLabel(op.commission_rate)}${op.status === "paused" ? " · currently PAUSED" : ""}\n` +
            `Payments · ${
              op.payments
                ? `${op.payments.total} link${op.payments.total === 1 ? "" : "s"}, ${op.payments.paid} paid`
                : "unknown"
            }\n` +
            `Already linked to · ${op.linkedApprovedApplications} approved application${
              op.linkedApprovedApplications === 1 ? "" : "s"
            }\n\n` +
            `Only confirm if you have verified this applicant controls that company.`,
          confirmLabel: "Link to this operator",
          tone: "danger",
          noteRequired: true,
          noteLabel: "Why this applicant controls this operator · required",
          initialNote: res.note,
        });
        if (!confirmLink.confirmed) {
          setNotice({
            tone: "info",
            text: `Approval cancelled — nothing was written. “${p.company_name}” still belongs to the existing operator entry.`,
          });
          return;
        }
        r = await send({
          linkExistingOperatorId: op.id,
          note: confirmLink.note,
        });
        j = (await r.json().catch(() => ({}))) as typeof j;
      }

      if (!r.ok) {
        throw new Error(j.error || `Failed (${r.status}).`);
      }

      // Report what the API did rather than what the modal predicted.
      const bits: string[] = [];
      if (j.bridge === "created") bits.push("a new operator entry was created");
      if (j.bridge === "linked_confirmed")
        bits.push("linked to the existing operator entry");
      if (j.bridge === "existing_link")
        bits.push("their existing operator entry stayed linked");
      if (to === "suspended" && p.partner_id) {
        bits.push(
          j.operatorPaused
            ? "their operator entry was paused"
            : j.operatorPauseSkipped === "shared"
              ? "their operator entry stayed active — another approved application links to it"
              : "their operator entry stayed active",
        );
      }
      setNotice({
        tone: "info",
        text: `${p.company_name}: ${to === "approved" ? "approved" : "suspended"}${
          bits.length ? ` — ${bits.join("; ")}` : ""
        }.`,
      });
      await load({ quiet: true });
    } catch (e) {
      setNotice({
        tone: "error",
        text: e instanceof Error ? e.message : "Action failed.",
      });
      // A stale-application 409 means this page is out of date — pull
      // fresh rows so the admin re-reviews the real values.
      await load({ quiet: true });
    }
  }

  // Per-tab stats.
  const pending = applications.filter((p) => p.status === "pending").length;
  const approved = applications.filter((p) => p.status === "approved").length;
  const suspended = applications.length - pending - approved;

  const ready = partners.filter((p) => stripeState(p) === "ready").length;
  const sent = partners.filter(
    (p) => stripeState(p) === "onboarding_sent",
  ).length;
  const notStarted = partners.length - ready - sent;
  // Operators still needing attention before they can be paid — the
  // Operators-tab equivalent of the pending-applications badge, so a
  // roster full of un-onboarded operators can't hide behind an empty
  // Applications tab.
  const needsOnboarding = notStarted + sent;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Partner program
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Partners
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              One program, two stages. Operators apply through
              /signup?as=partner (<em>Applications</em>); approving an
              application creates their operator entry (<em>Operators</em>),
              where Stripe onboarding unlocks payment links from{" "}
              <Link
                href="/admin/inquiries"
                className="text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
              >
                Inquiries
              </Link>
              . Links charge the customer on the operator&apos;s own Stripe
              account — RYDA&apos;s commission is taken automatically as an
              application fee. Every review decision lands in{" "}
              <Link
                href="/admin/audit"
                className="text-ink underline decoration-rule underline-offset-2 hover:decoration-ink"
              >
                audit
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs font-medium text-ink-soft hover:text-ink"
            >
              ← Back to admin
            </Link>
            {tab === "operators" && (
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                disabled={degraded !== null}
                className="rounded-full border border-rule bg-surface px-5 py-2 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
              >
                {showAdd ? "Close" : "Add operator"}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-8 inline-flex rounded-full border border-rule bg-surface p-1">
          <TabButton
            active={tab === "applications"}
            onClick={() => selectTab("applications")}
          >
            Applications
            {pending > 0 && (
              <TabBadge active={tab === "applications"} value={pending} />
            )}
          </TabButton>
          <TabButton
            active={tab === "operators"}
            onClick={() => selectTab("operators")}
          >
            Operators
            {needsOnboarding > 0 && (
              <TabBadge active={tab === "operators"} value={needsOnboarding} />
            )}
          </TabButton>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red/30 bg-red/10 p-4 text-sm text-red-deep">
            {error}
          </div>
        )}

        {notice && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${
              notice.tone === "error"
                ? "border-red/30 bg-red/10 text-red-deep"
                : "border-rule bg-cream-2/60 text-ink"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{notice.text}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="shrink-0 text-xs font-medium text-ink-soft hover:text-ink"
              >
                Dismiss
              </button>
            </div>
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
              possibly Stripe), so partner review, onboarding, and payment
              links are disabled. Everything works in production and in a
              locally configured dev environment.
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
              payments) — and <code className="text-ink">0042</code> for
              applications — against this environment, then reload. Applying
              migrations requires operator approval — see AGENTS.md.
            </p>
            {degraded.detail && (
              <p className="mt-3 text-xs text-mute">{degraded.detail}</p>
            )}
          </div>
        )}

        {/* `error` gates the tabs as hard as `degraded` does: a failed
            load has no verified rows, so neither an empty state nor a
            stale table with live action buttons may render under the
            banner. */}
        {!loading && !degraded && !error && tab === "applications" && (
          <ApplicationsTab
            applications={applications}
            applicationsError={applicationsError}
            pending={pending}
            approved={approved}
            suspended={suspended}
            onReview={(p, to) => void setApplicationStatus(p, to)}
          />
        )}

        {!loading && !degraded && !error && tab === "operators" && (
          <OperatorsTab
            partners={partners}
            ready={ready}
            sent={sent}
            notStarted={notStarted}
            showAdd={showAdd}
            feeConfigReady={feeConfigReady}
            openModal={openModal}
            onAdded={() => {
              setShowAdd(false);
              void load({ quiet: true });
            }}
            onChanged={() => void load({ quiet: true })}
          />
        )}
      </main>

      {modal}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// Count badge inside a tab label. Both tabs carry one so neither can
// look empty while the other holds the work.
function TabBadge({ active, value }: { active: boolean; value: number }) {
  return (
    <span
      className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums ${
        active ? "bg-cream text-ink" : "bg-red text-cream"
      }`}
    >
      {value}
    </span>
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

// ── Applications tab (review queue) ──────────────────────────────────

function ApplicationsTab({
  applications,
  applicationsError,
  pending,
  approved,
  suspended,
  onReview,
}: {
  applications: PartnerAccount[];
  applicationsError: string | null;
  pending: number;
  approved: number;
  suspended: number;
  onReview: (p: PartnerAccount, to: PartnerStatus) => void;
}) {
  // The roster (0041) loaded but partner_accounts (0042) didn't —
  // degrade this tab alone; the Operators tab keeps working.
  if (applicationsError && MISSING_TABLE_RE.test(applicationsError)) {
    return (
      <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
        <p className="font-display text-xl text-ink">
          Partner applications table missing.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Run migration <code className="text-ink">0042</code> (partner
          accounts) against this environment, then reload. Applying
          migrations requires operator approval — see AGENTS.md.
        </p>
        <p className="mt-3 text-xs text-mute">{applicationsError}</p>
      </div>
    );
  }
  if (applicationsError) {
    return (
      <div className="mt-8 rounded-2xl border border-red/30 bg-red/10 p-4 text-sm text-red-deep">
        Could not load applications: {applicationsError}
      </div>
    );
  }

  return (
    <>
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Applications" value={applications.length} cls="text-ink" />
        <Stat
          label="Pending review"
          value={pending}
          cls={pending > 0 ? "text-red" : "text-mute"}
        />
        <Stat
          label="Approved"
          value={approved}
          cls={approved > 0 ? "text-success-deep" : "text-mute"}
        />
        {/* One enum, two outcomes — the label has to name both or the
            count reads as "approved partners we later cut off". */}
        <Stat label="Declined / suspended" value={suspended} cls="text-mute" />
      </section>

      {applications.length === 0 && (
        <div className="mt-8 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
          <p className="font-display text-xl text-ink">No applications yet.</p>
          <p className="mt-3 text-sm text-ink-soft">
            Partner signups land here the first time the applicant opens
            their dashboard. Approving one creates its operator entry in
            the Operators tab.
          </p>
        </div>
      )}

      {applications.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-rule bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-rule bg-cream-2/40">
              <tr>
                {[
                  "Company",
                  "Contact",
                  "Fleet",
                  "Market",
                  "Status",
                  "Applied",
                  "",
                ].map((c, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-mute"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {applications.map((p) => (
                <tr key={p.user_id} className="hover:bg-cream-2/40">
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-ink">{p.company_name}</p>
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block text-xs text-ink-soft underline decoration-rule underline-offset-2 hover:decoration-ink"
                      >
                        {p.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-ink-soft">
                    <p>{p.contact_name ?? "—"}</p>
                    <p className="text-mute">{p.contact_email ?? ""}</p>
                    <p className="text-mute">{p.phone ?? ""}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                    {p.fleet_size ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                    {p.market}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <ApplicationStatusPill
                      status={p.status}
                      approvedAt={p.approved_at}
                    />
                    {/* The bridge, made visible: an approved
                        application's operator lives one tab over. */}
                    {p.partner_id && (
                      <p className="mt-1 text-xs text-success-deep">
                        Operator linked
                      </p>
                    )}
                    {p.status_note && (
                      <p
                        className="mt-1 max-w-[16rem] truncate text-xs text-mute"
                        title={p.status_note}
                      >
                        {p.status_note}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-ink-soft">
                    {fmt(p.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {p.status !== "approved" && (
                        <ActionBtn onClick={() => onReview(p, "approved")}>
                          {p.status === "suspended" ? "Reinstate" : "Approve"}
                        </ActionBtn>
                      )}
                      {p.status !== "suspended" && (
                        <ActionBtn
                          tone="danger"
                          onClick={() => onReview(p, "suspended")}
                        >
                          {p.status === "pending" ? "Decline" : "Suspend"}
                        </ActionBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Same chip grammar as StripeChip below (bordered, uppercase, 10px) so
// the two tabs read as one system rather than two apps behind a tab
// bar. Labels are the admin's own verbs, not the raw DB enum: the
// button says "Decline" and the modal says "Decline application", so
// the resulting row must not say "suspended". The enum stores both
// outcomes in one state; approved_at is what tells them apart.
function ApplicationStatusPill({
  status,
  approvedAt,
}: {
  status: PartnerStatus;
  approvedAt: string | null;
}) {
  const cls =
    status === "approved"
      ? "bg-success/15 text-success-deep border-success/40"
      : status === "suspended"
        ? "bg-red/10 text-red-deep border-red/40"
        : "bg-warn/15 text-warn-deep border-warn/40";
  const label =
    status === "approved"
      ? "Approved"
      : status === "suspended"
        ? approvedAt
          ? "Suspended"
          : "Declined"
        : "Pending";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-red/40 text-red hover:bg-red hover:text-cream"
      : "border-rule text-ink-soft hover:border-ink hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] font-medium transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Operators tab (Stripe roster) ────────────────────────────────────

function OperatorsTab({
  partners,
  ready,
  sent,
  notStarted,
  showAdd,
  feeConfigReady,
  openModal,
  onAdded,
  onChanged,
}: {
  partners: Partner[];
  ready: number;
  sent: number;
  notStarted: number;
  showAdd: boolean;
  /** Whether migration 0048 is applied here — see the Partner type. */
  feeConfigReady: boolean;
  openModal: ModalOpener;
  onAdded: () => void;
  onChanged: () => void;
}) {
  return (
    <>
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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

      {showAdd && (
        <AddPartnerForm feeConfigReady={feeConfigReady} onSaved={onAdded} />
      )}

      {partners.length === 0 && (
        <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
          <p className="font-display text-xl text-ink">No operators yet.</p>
          <p className="mt-3 text-sm text-ink-soft">
            Approve an application (or add an operator directly), then
            create + send their Stripe onboarding link. Until rows exist
            here, inquiry emails keep routing through the code-level
            fallback map.
          </p>
        </div>
      )}

      {partners.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-rule bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-rule bg-cream-2/40">
              <tr>
                {["Operator", "Contact", "Fee terms", "Stripe", ""].map(
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
                  feeConfigReady={feeConfigReady}
                  openModal={openModal}
                  onChanged={onChanged}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {partners.length > 0 && (
        // Stays visible once rows exist. The empty state used to be the
        // only place this was said, so the moment one operator was added
        // the caveat vanished — while a green "Ready" chip implies the
        // operator can be paid, which is only true once their vehicles
        // carry their name.
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-mute">
          Inquiries link to an operator by{" "}
          <code className="text-ink-soft">partner_id</code> (migration 0045),
          stamped at capture from the name in the code-level fleet
          (src/lib/partner-fleet.ts). Renaming an operator no longer breaks
          leads already in flight — but one whose vehicles are not listed
          there under this exact name receives no leads at all, so a green
          &ldquo;Ready&rdquo; chip means Stripe is done, not that inquiries
          can reach them yet.
        </p>
      )}
    </>
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

// focus:outline-none must always be paired with a visible ring —
// these fields include the commission editor, the one control on the
// page that changes a live commercial term, and a keyboard admin
// tabbing through them can't be left hunting for a 1px hairline.
// Matches the action modal's textarea and every other form in the flow.
const INPUT_CLS =
  "rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";

// ── operator fee terms (decision D2 / migration 0048) ────────────────
//
// Four levers instead of one: percent or flat, carried by the operator
// or added on top for the renter, with an optional floor and cap.
//
// TWO RULES GOVERN THIS WHOLE BLOCK.
//
// 1. The preview calls computeRentalFee — the SAME function the server
//    charges with. It never re-derives a fee from a rate. fees.ts's
//    header records why: a client preview and a server charge that each
//    computed "the fee" their own way once disagreed by $13,500 on a
//    single boat share, and the audit that caught it is the reason all
//    money math lives in one module. An operator-terms screen that
//    multiplies by 0.15 in JSX would recreate that exact bug, one
//    surface over.
//
// 2. Dollars on screen, CENTS on the wire — and parseFeeForm is the
//    only place the x100 crossing happens. The preview and the POST
//    body are both built from its output, so what the admin is shown is
//    arithmetically the same object the server is asked to store.

// The pure half — form state, the dollars↔cents crossing and
// parseFeeForm — lives in src/lib/partner-fee-form.ts so it can be unit
// tested without rendering a client component. What stays here is the
// rendering and the Partner-typed summaries.

function feeFormFromPartner(p: Partner): FeeFormState {
  return {
    pct: String(pctFromRate(p.commission_rate)),
    mode: p.fee_mode ?? "percent",
    flat: dollarsFromCents(p.fee_flat_cents),
    payer: p.fee_payer ?? "operator",
    floor: dollarsFromCents(p.fee_floor_cents),
    cap: dollarsFromCents(p.fee_cap_cents),
  };
}

/** One-line terms for the roster cell. */
function feeTermsSummary(p: Partner): string {
  const mode = p.fee_mode ?? "percent";
  return mode === "flat" && p.fee_flat_cents != null
    ? `${usd(p.fee_flat_cents)} flat`
    : pctLabel(p.commission_rate);
}

function feePayerSummary(p: Partner): string {
  const parts = [
    (p.fee_payer ?? "operator") === "renter"
      ? "renter pays on top"
      : "from operator payout",
  ];
  if (p.fee_floor_cents != null) parts.push(`min ${usd(p.fee_floor_cents)}`);
  if (p.fee_cap_cents != null) parts.push(`max ${usd(p.fee_cap_cents)}`);
  return parts.join(" · ");
}

/** Radio rendered as a design-system pill. sr-only input + peer-styled
 *  span keeps native radio semantics (arrow keys, one tab stop per
 *  group, screen-reader announcement) while looking like the rest of
 *  the page; peer-focus-visible restores the ring the sr-only input
 *  would otherwise take with it. */
function ChoicePill({
  name,
  value,
  checked,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <span className="inline-flex h-8 items-center rounded-full border border-rule bg-surface px-3.5 text-[11px] font-medium text-mute transition-colors hover:border-ink hover:text-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-cream peer-focus-visible:ring-2 peer-focus-visible:ring-ink/25">
        {children}
      </span>
    </label>
  );
}

function FieldGroup({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs text-mute">{legend}</legend>
      <div className="flex gap-1.5">{children}</div>
    </fieldset>
  );
}

function FeeTermsFields({
  value,
  onChange,
  idPrefix,
}: {
  value: FeeFormState;
  onChange: (next: FeeFormState) => void;
  idPrefix: string;
}) {
  const set = (patch: Partial<FeeFormState>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <FieldGroup legend="Fee basis">
        <ChoicePill
          name={`${idPrefix}-mode`}
          value="percent"
          checked={value.mode === "percent"}
          onSelect={() => set({ mode: "percent" })}
        >
          Percent
        </ChoicePill>
        <ChoicePill
          name={`${idPrefix}-mode`}
          value="flat"
          checked={value.mode === "flat"}
          onSelect={() => set({ mode: "flat" })}
        >
          Flat
        </ChoicePill>
      </FieldGroup>

      {/* Commission % is rendered in BOTH modes on purpose. parseFeeForm
          requires it in both — commission_rate is NOT NULL on partners
          and keeps its value while an operator is on flat terms — so
          hiding it in flat mode produced a save the admin could not
          unblock: "Commission % is required" naming a field that was not
          on screen, fixable only by switching back to percent, retyping
          the rate, and switching to flat again. */}
      <label className="flex flex-col gap-1 text-xs text-mute">
        Commission %
        <input
          type="number"
          min="0"
          max={MAX_PCT}
          step="0.1"
          value={value.pct}
          onChange={(e) => set({ pct: e.target.value })}
          className={`w-24 tabular-nums ${INPUT_CLS}`}
        />
      </label>

      {value.mode === "flat" && (
        <label className="flex flex-col gap-1 text-xs text-mute">
          Flat fee (USD)
          <input
            type="number"
            min="0"
            step="1"
            value={value.flat}
            onChange={(e) => set({ flat: e.target.value })}
            placeholder="250"
            className={`w-28 tabular-nums ${INPUT_CLS}`}
          />
        </label>
      )}

      <FieldGroup legend="Who pays it">
        <ChoicePill
          name={`${idPrefix}-payer`}
          value="operator"
          checked={value.payer === "operator"}
          onSelect={() => set({ payer: "operator" })}
        >
          Operator
        </ChoicePill>
        <ChoicePill
          name={`${idPrefix}-payer`}
          value="renter"
          checked={value.payer === "renter"}
          onSelect={() => set({ payer: "renter" })}
        >
          Renter
        </ChoicePill>
      </FieldGroup>

      <label className="flex flex-col gap-1 text-xs text-mute">
        Min fee (USD)
        <input
          type="number"
          min="0"
          step="1"
          value={value.floor}
          onChange={(e) => set({ floor: e.target.value })}
          placeholder="none"
          className={`w-28 tabular-nums ${INPUT_CLS}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-mute">
        Max fee (USD)
        <input
          type="number"
          min="0"
          step="1"
          value={value.cap}
          onChange={(e) => set({ cap: e.target.value })}
          placeholder="none"
          className={`w-28 tabular-nums ${INPUT_CLS}`}
        />
      </label>

      {value.mode === "flat" && (
        <p className="w-full text-xs leading-relaxed text-mute">
          The flat fee is what RYDA charges. The commission % above stays on the
          operator&rsquo;s row and applies again if you switch back to percent —
          it is not deleted, just dormant, so it still has to be a rate you would
          stand behind.
        </p>
      )}
    </div>
  );
}

function PreviewLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "text-ink" : "text-ink-soft"}>{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "font-medium text-ink" : "text-ink-soft"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The terms, worked through one concrete booking, live as the admin
 * types. This is the acceptance criterion for task 3A in visible form:
 * the number on this card and the number the server charges come out of
 * the same call to the same function, so they cannot disagree.
 */
function FeePreview({ state }: { state: FeeFormState }) {
  const parsed = parseFeeForm(state);
  let result: ReturnType<typeof computeRentalFee> | null = null;
  let error: string | null = parsed.ok ? null : parsed.error;
  if (parsed.ok) {
    try {
      result = computeRentalFee(RENTAL_FEE_EXAMPLE_BASE_CENTS, parsed.config);
    } catch (e) {
      // The engine refuses an operator-paid fee larger than the booking
      // (it would make the payout negative, which 0047 CHECKs against).
      // Showing it here is the point — the alternative is a booking that
      // 500s months later on a cheap rental.
      error = (e instanceof Error ? e.message : String(e)).replace(
        /^computeRentalFee:\s*/,
        "",
      );
    }
  }

  return (
    <div className="mt-4 max-w-md rounded-xl border border-rule bg-cream-2/50 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        Worked example · {usd(RENTAL_FEE_EXAMPLE_BASE_CENTS)} booking
      </p>
      {error && <p className="mt-2 text-xs leading-relaxed text-red-deep">{error}</p>}
      {result && (
        <>
          <dl className="mt-3 space-y-1.5 text-xs">
            <PreviewLine
              label="Operator's price"
              value={usd(result.baseAmountCents)}
            />
            <PreviewLine
              label={
                result.config.mode === "percent"
                  ? `RYDA fee · ${pctLabel(result.config.rate)}`
                  : "RYDA fee · flat"
              }
              value={usd(result.feeCents)}
            />
            <div className="border-t border-rule" />
            <PreviewLine label="Renter pays" value={usd(result.renterTotalCents)} strong />
            <PreviewLine
              label="Operator receives"
              value={usd(result.operatorNetCents)}
              strong
            />
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            {result.feePayer === "renter"
              ? "The renter pays the operator's price plus RYDA's fee. The operator receives their full price."
              : "The renter pays the operator's price. RYDA's fee comes out of the operator's payout."}
            {result.clampedBy === "floor" &&
              ` The ${usd(result.rawFeeCents)} computed fee was raised to the ${usd(
                result.config.floorCents ?? 0,
              )} minimum.`}
            {result.clampedBy === "cap" &&
              ` The ${usd(result.rawFeeCents)} computed fee was capped at ${usd(
                result.config.capCents ?? 0,
              )}.`}
          </p>
        </>
      )}
    </div>
  );
}

/** The same worked example as plain text, for the confirm modal and the
 *  audit note — so the sentence the admin approves is the sentence the
 *  log records. Returns null when the terms do not compute (the form
 *  blocks the save in that case anyway). */
function feeExampleSentence(state: FeeFormState): string | null {
  const parsed = parseFeeForm(state);
  if (!parsed.ok) return null;
  try {
    const r = computeRentalFee(RENTAL_FEE_EXAMPLE_BASE_CENTS, parsed.config);
    return `On a ${usd(r.baseAmountCents)} booking: renter pays ${usd(
      r.renterTotalCents,
    )}, operator receives ${usd(r.operatorNetCents)}, RYDA keeps ${usd(r.feeCents)}.`;
  } catch {
    return null;
  }
}

function AddPartnerForm({
  feeConfigReady,
  onSaved,
}: {
  feeConfigReady: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Dollars/percent in the UI, cents/decimal on the wire — parseFeeForm
  // owns that crossing for both this form and the row editor.
  const [fee, setFee] = useState<FeeFormState>(BLANK_FEE_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Operator name is required.");
      return;
    }
    const parsed = parseFeeForm(fee);
    if (!parsed.ok) {
      setErr(parsed.error);
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
          // Without 0048 applied the fee_* columns do not exist, so send
          // only the rate — the same body this form sent before D2.
          ...(feeConfigReady
            ? parsed.payload
            : { commission_rate: parsed.payload.commission_rate }),
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
        {!feeConfigReady && (
          <label className="flex flex-col gap-1 text-xs text-mute">
            Commission %
            <input
              type="number"
              min="0"
              max={MAX_PCT}
              step="0.1"
              value={fee.pct}
              onChange={(e) => setFee({ ...fee, pct: e.target.value })}
              className={`w-24 tabular-nums ${INPUT_CLS}`}
            />
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-red px-5 py-2.5 text-sm font-medium text-cream hover:bg-red-deep disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save operator"}
        </button>
      </div>

      {feeConfigReady ? (
        <div className="mt-5 border-t border-rule pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
            Fee terms
          </p>
          <div className="mt-3">
            <FeeTermsFields value={fee} onChange={setFee} idPrefix="add" />
          </div>
          <FeePreview state={fee} />
        </div>
      ) : (
        <FeeSchemaNotice />
      )}

      {err && <p className="mt-3 text-xs text-red">{err}</p>}
    </form>
  );
}

/** Shown wherever the fee-terms editor would be if migration 0048 were
 *  applied. The page's existing 0041/0042 degradation idiom: say which
 *  migration, say that applying it needs a human, keep working. */
function FeeSchemaNotice() {
  return (
    <p className="mt-4 max-w-2xl text-xs leading-relaxed text-mute">
      Flat fees, renter-paid terms and fee floors/caps need migration{" "}
      <code className="text-ink-soft">0048</code> (partner fee config), which is
      not applied in this environment yet — so only the commission % is
      editable here. Applying migrations requires operator approval; see
      AGENTS.md.
    </p>
  );
}

function PartnerRow({
  partner: p,
  feeConfigReady,
  openModal,
  onChanged,
}: {
  partner: Partner;
  feeConfigReady: boolean;
  openModal: ModalOpener;
  onChanged: () => void;
}) {
  const state = stripeState(p);
  const paused = p.status === "paused";

  // Fee-terms edit. Opens the row's expansion panel rather than editing
  // in the cell: there are five levers now, and a worked example beside
  // them is what makes the terms legible to whoever is setting them.
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState<FeeFormState>(BLANK_FEE_FORM);
  const [savingTerms, setSavingTerms] = useState(false);

  // Pause / resume — the API 409s payment links for paused partners,
  // so the roster must both SHOW paused and offer the way back.
  const [statusBusy, setStatusBusy] = useState(false);

  // Onboarding-link creation + reveal
  const [linkBusy, setLinkBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  // One error channel for the whole row, rendered in the expansion
  // below — the tab used to fire window.alert for these while the
  // Applications tab one tab over used the design-system modal.
  const [rowErr, setRowErr] = useState<string | null>(null);

  function startEdit() {
    setFee(feeFormFromPartner(p));
    setRowErr(null);
    setEditing(true);
  }

  async function saveFeeTerms() {
    const parsed = parseFeeForm(fee);
    if (!parsed.ok) {
      setRowErr(parsed.error);
      return;
    }
    // Fee terms are a commercial term on every future booking: same
    // confirm-with-note treatment as an application review, and the note
    // lands in the audit log with the before/after. The modal quotes the
    // SAME worked example the preview above it showed — computed by the
    // same computeRentalFee call — so the sentence the admin approves is
    // the sentence the log records.
    const example = feeExampleSentence(fee);
    const next: Partner = { ...p, ...parsed.payload };
    const res = await openModal({
      title: "Change fee terms",
      message:
        `${p.name}\n\n` +
        `From: ${feeTermsSummary(p)} · ${feePayerSummary(p)}\n` +
        `To:   ${feeTermsSummary(next)} · ${feePayerSummary(next)}\n` +
        (example ? `\n${example}\n` : "") +
        `\nApplies to bookings and payment links quoted from now on. Anything already quoted keeps its fee frozen at that moment.`,
      confirmLabel: "Save fee terms",
      noteRequired: true,
      noteLabel: "Why · required (audit log)",
    });
    if (!res.confirmed) return;
    setSavingTerms(true);
    setRowErr(null);
    try {
      // The partners POST is an upsert — send the full row identity so
      // only the terms change.
      const r = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          name: p.name,
          contact_email: p.contact_email,
          ...(feeConfigReady
            ? parsed.payload
            : { commission_rate: parsed.payload.commission_rate }),
          note: res.note,
        }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      setEditing(false);
      onChanged();
    } catch (e) {
      setRowErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingTerms(false);
    }
  }

  async function toggleStatus() {
    const next = paused ? "active" : "paused";
    const res = await openModal({
      title: next === "paused" ? "Pause operator" : "Resume bookings",
      message:
        next === "paused"
          ? `Pause ${p.name}?\n\nNew payment links are blocked while paused. Existing live links are unaffected.`
          : `Resume ${p.name}?\n\nPayment links can be sent again immediately.`,
      confirmLabel: next === "paused" ? "Pause" : "Resume",
      tone: next === "paused" ? "danger" : undefined,
      noteRequired: true,
      noteLabel: "Why · required (audit log)",
    });
    if (!res.confirmed) return;
    setStatusBusy(true);
    setRowErr(null);
    try {
      const r = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          name: p.name,
          status: next,
          note: res.note,
        }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      onChanged();
    } catch (e) {
      setRowErr(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function sendOnboarding() {
    setLinkBusy(true);
    setRowErr(null);
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
      setRowErr(e instanceof Error ? e.message : String(e));
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
        {/* Not whitespace-nowrap: the payer + clamp line can run long
            ("renter pays on top · min $25.00 · max $500.00") and a
            nowrap cell would push the Stripe and action columns off
            into the horizontal scroll for every row. */}
        <td className="px-4 py-3 align-top">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="tabular-nums text-ink">{feeTermsSummary(p)}</span>
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : startEdit())}
              aria-expanded={editing}
              className="text-[11px] font-medium text-ink-soft hover:text-ink"
            >
              {editing ? "Close" : "Edit"}
            </button>
          </span>
          <p className="mt-0.5 text-xs text-mute">{feePayerSummary(p)}</p>
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

      {(editing || link || rowErr) && (
        <tr>
          <td colSpan={5} className="bg-cream-2/40 px-6 py-4">
            {editing && (
              <div className="mb-4 max-w-4xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                  Fee terms · {p.name}
                </p>
                {feeConfigReady ? (
                  <>
                    <div className="mt-3">
                      <FeeTermsFields
                        value={fee}
                        onChange={setFee}
                        idPrefix={`row-${p.id}`}
                      />
                    </div>
                    <FeePreview state={fee} />
                  </>
                ) : (
                  <>
                    <label className="mt-3 flex w-32 flex-col gap-1 text-xs text-mute">
                      Commission %
                      <input
                        type="number"
                        min="0"
                        max={MAX_PCT}
                        step="0.1"
                        value={fee.pct}
                        onChange={(e) => setFee({ ...fee, pct: e.target.value })}
                        className={`tabular-nums ${INPUT_CLS}`}
                      />
                    </label>
                    <FeeSchemaNotice />
                  </>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveFeeTerms()}
                    disabled={savingTerms}
                    className="inline-flex h-8 items-center rounded-full border border-success/40 px-4 text-[11px] font-medium text-success-deep hover:bg-success hover:text-cream disabled:opacity-50"
                  >
                    {savingTerms ? "Saving…" : "Save fee terms"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex h-8 items-center rounded-full border border-rule px-4 text-[11px] font-medium text-mute hover:border-ink hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {rowErr && (
              <p className="text-xs text-red-deep">
                {rowErr}
                {/* Substring match — the API's actual message is
                    "Stripe not configured. Set STRIPE_SECRET_KEY to
                    onboard operators.", so an exact === can never
                    fire. */}
                {/stripe not configured/i.test(rowErr) &&
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
