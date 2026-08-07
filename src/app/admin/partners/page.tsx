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
//   Operators — the Stripe Connect roster (partners, 0041). Rental
//   payments are fee-only via DIRECT charges: the customer pays a
//   Checkout link created on the operator's own Express account — the
//   rental price settles straight to the operator and never enters
//   RYDA's balance; RYDA's commission is collected automatically as
//   an application fee (per-partner commission_rate, default 15%).
//   Before a payment link can be sent from /admin/inquiries, the
//   operator needs an Express account with onboarding completed. This
//   tab manages that: add operators, edit commission rates, pause /
//   resume, and create + send the Stripe onboarding link.
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

/** Passed down so both tabs confirm destructive actions the same way
 *  (and capture the same audit note) instead of one tab falling back
 *  to window.confirm. */
type ModalOpener = ReturnType<typeof useActionModal>["open"];

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
  openModal,
  onAdded,
  onChanged,
}: {
  partners: Partner[];
  ready: number;
  sent: number;
  notStarted: number;
  showAdd: boolean;
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

      {showAdd && <AddPartnerForm onSaved={onAdded} />}

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
          Payment links resolve the operator by the{" "}
          <code className="text-ink-soft">partner_name</code> snapshotted on
          each inquiry, which comes from the code-level fleet
          (src/lib/partner-fleet.ts). An operator can only be sent a payment
          link once their vehicles are listed there under this exact name —
          a green &ldquo;Ready&rdquo; chip means Stripe is done, not that
          inquiries can reach them yet.
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
  openModal,
  onChanged,
}: {
  partner: Partner;
  openModal: ModalOpener;
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
  // One error channel for the whole row, rendered in the expansion
  // below — the tab used to fire window.alert for these while the
  // Applications tab one tab over used the design-system modal.
  const [rowErr, setRowErr] = useState<string | null>(null);

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
      setRowErr(
        "Commission % is required — enter 0 explicitly for a no-commission operator.",
      );
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) {
      setRowErr("Commission must be between 0 and 50%.");
      return;
    }
    // A commission change is a commercial term on every future charge:
    // same confirm-with-note treatment as an application review, and
    // the note lands in the audit log with the before/after.
    const res = await openModal({
      title: "Change commission",
      message: `${p.name}: ${pctLabel(p.commission_rate)} → ${pctLabel(rate)}.\n\nApplies to payment links created from now on. Links already sent keep the fee frozen at creation time.`,
      confirmLabel: "Save commission",
      noteRequired: true,
      noteLabel: "Why · required (audit log)",
    });
    if (!res.confirmed) return;
    setSavingRate(true);
    setRowErr(null);
    try {
      // The partners POST is an upsert — send the full row identity so
      // only the rate changes.
      const r = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          name: p.name,
          contact_email: p.contact_email,
          commission_rate: rate,
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
      setSavingRate(false);
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

      {(link || rowErr) && (
        <tr>
          <td colSpan={5} className="bg-cream-2/40 px-6 py-4">
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
