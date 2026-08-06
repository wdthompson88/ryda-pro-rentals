"use client";

// /admin — operational console.
//
// Gating: client-side this page just checks supabase.auth.getUser()
// and bounces to /signin if anon. The TRUE gate is the
// /api/admin/overview server route (requireAdmin on
// app_metadata.role === 'admin' — service-role-only writable, so
// users can't self-promote). A non-admin who lands here sees a
// "no permission" empty state; no data leaks because the API call
// 403s before returning anything.
//
// Capabilities (all wired to admin-gated API routes):
//   - Counts strip + 20 most-recent rows per category (purchases,
//     bookings, KYC, share transfers)
//   - Per-row actions: mark purchase paid, resend amendment, refund,
//     cancel booking, force-verify KYC, cancel KYC, approve/reject
//     pending share transfer
//   - Find-a-member lookup (email substring or UUID) with full picture
//   - Recent-admin-actions panel (last 10 audit-log entries)
//   - Manual refresh + auto-refresh toggle (30s cadence)
//   - CSV export per table
//   - Sub-route nav (prospects, disputes, LLC formation, comparables,
//     vehicle enrichment, creative queue, audit log)

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { useActionModal } from "@/components/admin/action-modal";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { AuditSummary } from "@/components/admin/audit-summary";
import { UserLookup } from "@/components/admin/user-lookup";
import { downloadCsv } from "@/components/admin/csv";
import {
  BulkProgress,
  BulkToolbar,
  runBulk,
  useBulkSelection,
} from "@/components/admin/bulk-actions";
import { useNewPendingNotifier } from "@/components/admin/use-desktop-notifications";

type Counts = {
  purchases_pending: number;
  purchases_failed: number;
  purchases_paid: number;
  bookings_pending: number;
  transfers_open: number;
};

type Purchase = {
  id: string;
  user_id: string;
  email: string;
  status: string;
  shares: number;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  total_cents: number;
  fulfilled_at: string | null;
  updated_at: string;
};

type Booking = {
  id: string;
  user_id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  mode: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
};

type Kyc = {
  id: string;
  user_id: string;
  status: string;
  failure_code: string | null;
  failure_reason: string | null;
  updated_at: string;
};

type Transfer = {
  id: string;
  from_user_id: string;
  to_user_email: string;
  to_user_id: string | null;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  shares: number;
  status: string;
  expires_at: string;
  updated_at: string;
};

type Overview = {
  counts: Counts;
  recent: {
    purchases: Purchase[];
    bookings: Booking[];
    kyc: Kyc[];
    transfers: Transfer[];
  };
};

const SUB_ROUTES = [
  { href: "/admin", label: "Triage", note: "this page" },
  { href: "/admin/inquiries", label: "Inquiries", note: "rental lead pipeline" },
  { href: "/admin/partners", label: "Partners", note: "operators + Stripe onboarding" },
  { href: "/admin/calendar", label: "Calendar", note: "booking calendar" },
  { href: "/admin/creative", label: "Creative", note: "marketing generation queue" },
  { href: "/admin/documents", label: "Documents", note: "sample packet + legal templates" },
  { href: "/admin/prospects", label: "Prospects", note: "founding cohort CRM" },
  { href: "/admin/disputes", label: "Disputes", note: "Stripe chargebacks" },
  { href: "/admin/llc", label: "LLCs", note: "formation + members" },
  { href: "/admin/comparables", label: "Comparables", note: "vehicle market data" },
  { href: "/admin/vehicle-enrichment", label: "Enrichment", note: "VIN decoder" },
  { href: "/admin/audit", label: "Audit", note: "admin actions log" },
];

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const initialLoad = useRef(true);

  const { open: openModal, modal } = useActionModal();

  const purchaseSel = useBulkSelection();
  const bookingSel = useBulkSelection();
  const transferSel = useBulkSelection();
  const [bulkProgress, setBulkProgress] = useState<{
    section: "purchases" | "bookings" | "transfers" | null;
    done: number;
    total: number;
    failed: number;
  }>({ section: null, done: 0, total: 0, failed: 0 });

  // Desktop notifications. We pass in the current pending id sets;
  // the hook diffs them across refreshes and fires when new ids appear.
  const notifier = useNewPendingNotifier({
    pendingPurchaseIds:
      data?.recent.purchases
        .filter((p) => p.status === "pending")
        .map((p) => p.id) ?? [],
    pendingTransferIds:
      data?.recent.transfers
        .filter(
          (t) =>
            t.status === "requested" ||
            t.status === "pending_ryda_review" ||
            t.status === "accepted",
        )
        .map((t) => t.id) ?? [],
    armed: !initialLoad.current,
  });

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await authedFetch("/api/admin/overview");
      if (res.status === 401) {
        setError("Sign in required.");
        return;
      }
      if (res.status === 403) {
        setError(
          "Your account doesn't have admin access. Ask another admin to flip your role.",
        );
        return;
      }
      if (!res.ok) {
        throw new Error(`Lookup failed (${res.status}).`);
      }
      const j = (await res.json()) as Overview;
      setData(j);
      setError(null);
      setLastRefreshedAt(new Date());
      setRefreshNonce((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load.");
    } finally {
      setRefreshing(false);
      if (initialLoad.current) {
        setLoading(false);
        initialLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Bulk-action runner closure factory. Each call returns an async fn
  // that prompts for a single ops note (applied to every row in the
  // batch), POSTs each selected id, and surfaces progress + errors.
  const runBulkAction = useCallback(
    async (cfg: {
      section: "purchases" | "bookings" | "transfers";
      ids: string[];
      modalTitle: string;
      modalMessage: string;
      confirmLabel: string;
      tone?: "default" | "danger";
      runOne: (id: string, note: string) => Promise<void>;
      onDone: () => void;
    }) => {
      if (cfg.ids.length === 0) return;
      const res = await openModal({
        title: cfg.modalTitle,
        message: cfg.modalMessage,
        confirmLabel: `${cfg.confirmLabel} (${cfg.ids.length})`,
        tone: cfg.tone,
        noteRequired: true,
      });
      if (!res.confirmed) return;
      setBulkProgress({
        section: cfg.section,
        done: 0,
        total: cfg.ids.length,
        failed: 0,
      });
      const summary = await runBulk(
        cfg.ids,
        (id) => cfg.runOne(id, res.note),
        {
          concurrency: 3,
          onProgress: (done, total, failed) =>
            setBulkProgress({ section: cfg.section, done, total, failed }),
        },
      );
      setBulkProgress({ section: null, done: 0, total: 0, failed: 0 });
      cfg.onDone();
      if (summary.failed > 0) {
        window.alert(
          `${summary.ok} succeeded · ${summary.failed} failed.\n\n${summary.errors.slice(0, 5).join("\n")}${summary.errors.length > 5 ? `\n… +${summary.errors.length - 5} more` : ""}`,
        );
      }
      await reload();
    },
    [openModal, reload],
  );

  // Per-row endpoint dispatchers used by bulk actions. These mirror
  // the single-row handler components below.
  const postOne = useCallback(async (path: string, note: string) => {
    const r = await authedFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || `${r.status}`);
    }
  }, []);

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Admin
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Operational console.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Cross-user view of purchases, bookings, KYC, and share transfers
            with inline actions. Per-row buttons hit the same admin-gated API
            routes as the deeper sub-pages — every action is logged to{" "}
            <Link
              href="/admin/audit"
              className="text-marine hover:text-marine-deep"
            >
              audit
            </Link>
            .
          </p>

          <nav className="mt-6 flex flex-wrap gap-2 text-xs">
            {SUB_ROUTES.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={link.note}
                aria-current={link.href === "/admin" ? "page" : undefined}
                className={`rounded-full border px-3 py-1 font-medium transition-colors ${
                  link.href === "/admin"
                    ? "border-ink bg-ink text-cream"
                    : "border-rule bg-cream-2 text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        {/* User lookup is at the top because admins land here knowing
            who they need to look up far more often than scrolling the
            recent-20 list. */}
        <UserLookup />

        {loading ? (
          <p className="text-sm text-mute">Loading…</p>
        ) : error ? (
          <div className="rounded-2xl border border-red/40 bg-red/5 p-6">
            <p className="text-sm text-red">{error}</p>
            <Link
              href="/account"
              className="mt-3 inline-flex text-xs text-ink-soft hover:text-ink"
            >
              ← Back to my account
            </Link>
          </div>
        ) : !data ? null : (
          <>
            <div className="mb-4">
              <RefreshBar
                onRefresh={reload}
                loading={refreshing}
                lastRefreshedAt={lastRefreshedAt}
                extra={
                  notifier.permission === "unsupported" ? null : notifier.permission === "granted" ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-mute">
                      <input
                        type="checkbox"
                        checked={notifier.enabled}
                        onChange={(e) => notifier.setEnabled(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-rule accent-marine"
                      />
                      Desktop alerts on new pending
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void notifier.request()}
                      className="inline-flex h-7 items-center rounded-full border border-rule bg-surface px-3 text-[11px] font-medium text-marine hover:border-marine"
                    >
                      {notifier.permission === "denied"
                        ? "Notifications blocked — enable in browser"
                        : "Enable desktop alerts"}
                    </button>
                  )
                }
              />
            </div>

            {/* Counts strip */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
              <Stat
                label="Pending purchases"
                value={data.counts.purchases_pending}
                tone={data.counts.purchases_pending > 0 ? "warn" : "off"}
              />
              <Stat
                label="Failed purchases"
                value={data.counts.purchases_failed}
                tone={data.counts.purchases_failed > 0 ? "warn" : "off"}
              />
              <Stat
                label="Paid purchases"
                value={data.counts.purchases_paid}
                tone="ok"
              />
              <Stat
                label="Pending bookings"
                value={data.counts.bookings_pending}
                tone={data.counts.bookings_pending > 0 ? "warn" : "off"}
              />
              <Stat
                label="Open transfers"
                value={data.counts.transfers_open}
                tone={data.counts.transfers_open > 0 ? "warn" : "off"}
              />
            </section>

            <Section
              title="Recent share purchases"
              onExport={() =>
                downloadCsv({
                  filename: "ryda-admin-purchases.csv",
                  columns: [
                    "id",
                    "status",
                    "asset",
                    "shares",
                    "total_usd",
                    "buyer_email",
                    "updated_at",
                  ],
                  rows: data.recent.purchases.map((p) => [
                    p.id,
                    p.status,
                    p.vehicle_symbol ?? p.boat_slug ?? "",
                    p.shares,
                    (p.total_cents / 100).toFixed(2),
                    p.email,
                    p.updated_at,
                  ]),
                })
              }
            >
              <BulkToolbar
                rows={data.recent.purchases}
                selection={purchaseSel}
                actions={[
                  {
                    label: "Mark paid selected",
                    canRun: (rows) => rows.some((p) => p.status === "pending"),
                    onClick: async (ids) => {
                      const eligible = data.recent.purchases.filter(
                        (p) => ids.includes(p.id) && p.status === "pending",
                      );
                      await runBulkAction({
                        section: "purchases",
                        ids: eligible.map((p) => p.id),
                        modalTitle: "Bulk mark paid",
                        modalMessage: `Flip ${eligible.length} pending purchase${eligible.length === 1 ? "" : "s"} to paid. Amendments generate downstream for each.`,
                        confirmLabel: "Mark paid",
                        runOne: (id, note) =>
                          postOne(`/api/admin/purchase/${id}/mark-paid`, note),
                        onDone: () => purchaseSel.clear(),
                      });
                    },
                  },
                  {
                    label: "Refund selected",
                    tone: "danger",
                    canRun: (rows) =>
                      rows.some(
                        (p) => p.status === "paid" || p.status === "pending",
                      ),
                    onClick: async (ids) => {
                      const eligible = data.recent.purchases.filter(
                        (p) =>
                          ids.includes(p.id) &&
                          (p.status === "paid" || p.status === "pending"),
                      );
                      await runBulkAction({
                        section: "purchases",
                        ids: eligible.map((p) => p.id),
                        modalTitle: "Bulk refund",
                        modalMessage: `Refund ${eligible.length} purchase${eligible.length === 1 ? "" : "s"} and cancel their LLC seats. Total $${(eligible.reduce((a, p) => a + p.total_cents, 0) / 100).toLocaleString()}. Irreversible.`,
                        confirmLabel: "Refund",
                        tone: "danger",
                        runOne: (id, note) =>
                          postOne(`/api/share-purchase/${id}/refund`, note),
                        onDone: () => purchaseSel.clear(),
                      });
                    },
                  },
                ]}
              />
              {bulkProgress.section === "purchases" && (
                <BulkProgress
                  done={bulkProgress.done}
                  total={bulkProgress.total}
                  failed={bulkProgress.failed}
                />
              )}
              <Table
                columns={["Status", "Asset", "Shares", "Total", "Buyer", "Updated", ""]}
                rowIds={data.recent.purchases.map((p) => p.id)}
                selection={purchaseSel}
                rows={data.recent.purchases.map((p) => [
                  pill(p.status),
                  String(p.vehicle_symbol ?? p.boat_slug ?? "—"),
                  String(p.shares),
                  `$${(p.total_cents / 100).toLocaleString()}`,
                  p.email,
                  fmt(p.updated_at),
                  <PurchaseActions
                    key={`act-${p.id}`}
                    purchase={p}
                    openModal={openModal}
                    reload={reload}
                  />,
                ])}
              />
            </Section>

            <Section
              title="Recent bookings"
              onExport={() =>
                downloadCsv({
                  filename: "ryda-admin-bookings.csv",
                  columns: [
                    "id",
                    "status",
                    "asset",
                    "mode",
                    "start_date",
                    "end_date",
                    "user_id",
                    "created_at",
                  ],
                  rows: data.recent.bookings.map((b) => [
                    b.id,
                    b.status,
                    b.vehicle_symbol ?? b.boat_slug ?? "",
                    b.mode,
                    b.start_date,
                    b.end_date,
                    b.user_id,
                    b.created_at,
                  ]),
                })
              }
            >
              <BulkToolbar
                rows={data.recent.bookings}
                selection={bookingSel}
                actions={[
                  {
                    label: "Cancel selected",
                    tone: "danger",
                    canRun: (rows) =>
                      rows.some(
                        (b) =>
                          b.status === "pending" || b.status === "confirmed",
                      ),
                    onClick: async (ids) => {
                      const eligible = data.recent.bookings.filter(
                        (b) =>
                          ids.includes(b.id) &&
                          (b.status === "pending" || b.status === "confirmed"),
                      );
                      await runBulkAction({
                        section: "bookings",
                        ids: eligible.map((b) => b.id),
                        modalTitle: "Bulk cancel bookings",
                        modalMessage: `Cancel ${eligible.length} booking${eligible.length === 1 ? "" : "s"}. Members are notified and slots return to the calendar.`,
                        confirmLabel: "Cancel",
                        tone: "danger",
                        runOne: (id, note) =>
                          postOne(`/api/admin/booking/${id}/cancel`, note),
                        onDone: () => bookingSel.clear(),
                      });
                    },
                  },
                ]}
              />
              {bulkProgress.section === "bookings" && (
                <BulkProgress
                  done={bulkProgress.done}
                  total={bulkProgress.total}
                  failed={bulkProgress.failed}
                />
              )}
              <Table
                columns={["Status", "Asset", "Mode", "Dates", "Created", ""]}
                rowIds={data.recent.bookings.map((b) => b.id)}
                selection={bookingSel}
                rows={data.recent.bookings.map((b) => [
                  pill(b.status),
                  String(b.vehicle_symbol ?? b.boat_slug ?? "—"),
                  b.mode,
                  `${b.start_date} → ${b.end_date}`,
                  fmt(b.created_at),
                  <BookingActions
                    key={`bact-${b.id}`}
                    booking={b}
                    openModal={openModal}
                    reload={reload}
                  />,
                ])}
              />
            </Section>

            <Section
              title="Recent KYC"
              onExport={() =>
                downloadCsv({
                  filename: "ryda-admin-kyc.csv",
                  columns: [
                    "user_id",
                    "status",
                    "failure_code",
                    "failure_reason",
                    "updated_at",
                  ],
                  rows: data.recent.kyc.map((k) => [
                    k.user_id,
                    k.status,
                    k.failure_code ?? "",
                    k.failure_reason ?? "",
                    k.updated_at,
                  ]),
                })
              }
            >
              <Table
                columns={["Status", "Failure", "User", "Updated", ""]}
                rows={data.recent.kyc.map((k) => [
                  pill(k.status),
                  k.failure_code
                    ? `${k.failure_code}${k.failure_reason ? ` · ${k.failure_reason}` : ""}`
                    : "—",
                  k.user_id.slice(0, 8),
                  fmt(k.updated_at),
                  <KycActions
                    key={`kact-${k.id}`}
                    kyc={k}
                    openModal={openModal}
                    reload={reload}
                  />,
                ])}
              />
            </Section>

            <Section
              title="Recent share transfers"
              onExport={() =>
                downloadCsv({
                  filename: "ryda-admin-transfers.csv",
                  columns: [
                    "id",
                    "status",
                    "asset",
                    "shares",
                    "from_user_id",
                    "to_user_email",
                    "expires_at",
                    "updated_at",
                  ],
                  rows: data.recent.transfers.map((t) => [
                    t.id,
                    t.status,
                    t.vehicle_symbol ?? t.boat_slug ?? "",
                    t.shares,
                    t.from_user_id,
                    t.to_user_email,
                    t.expires_at,
                    t.updated_at,
                  ]),
                })
              }
            >
              <BulkToolbar
                rows={data.recent.transfers}
                selection={transferSel}
                actions={[
                  {
                    label: "Approve selected",
                    canRun: (rows) =>
                      rows.some((t) => t.status === "pending_ryda_review"),
                    onClick: async (ids) => {
                      const eligible = data.recent.transfers.filter(
                        (t) =>
                          ids.includes(t.id) &&
                          t.status === "pending_ryda_review",
                      );
                      await runBulkAction({
                        section: "transfers",
                        ids: eligible.map((t) => t.id),
                        modalTitle: "Bulk approve transfers",
                        modalMessage: `Approve ${eligible.length} pending share transfer${eligible.length === 1 ? "" : "s"}. Cap tables update; all parties notified.`,
                        confirmLabel: "Approve",
                        runOne: async (id, note) => {
                          const r = await authedFetch(
                            "/api/admin/transfer/ack",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                transferId: id,
                                action: "approve",
                                note,
                              }),
                            },
                          );
                          if (!r.ok) {
                            const j = await r.json().catch(() => ({}));
                            throw new Error(j.error || `${r.status}`);
                          }
                        },
                        onDone: () => transferSel.clear(),
                      });
                    },
                  },
                  {
                    label: "Reject selected",
                    tone: "danger",
                    canRun: (rows) =>
                      rows.some((t) => t.status === "pending_ryda_review"),
                    onClick: async (ids) => {
                      const eligible = data.recent.transfers.filter(
                        (t) =>
                          ids.includes(t.id) &&
                          t.status === "pending_ryda_review",
                      );
                      await runBulkAction({
                        section: "transfers",
                        ids: eligible.map((t) => t.id),
                        modalTitle: "Bulk reject transfers",
                        modalMessage: `Reject ${eligible.length} pending share transfer${eligible.length === 1 ? "" : "s"}. Originating members retain their shares; all parties notified.`,
                        confirmLabel: "Reject",
                        tone: "danger",
                        runOne: async (id, note) => {
                          const r = await authedFetch(
                            "/api/admin/transfer/ack",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                transferId: id,
                                action: "reject",
                                note,
                              }),
                            },
                          );
                          if (!r.ok) {
                            const j = await r.json().catch(() => ({}));
                            throw new Error(j.error || `${r.status}`);
                          }
                        },
                        onDone: () => transferSel.clear(),
                      });
                    },
                  },
                ]}
              />
              {bulkProgress.section === "transfers" && (
                <BulkProgress
                  done={bulkProgress.done}
                  total={bulkProgress.total}
                  failed={bulkProgress.failed}
                />
              )}
              <Table
                columns={[
                  "Status",
                  "Asset",
                  "Shares",
                  "From → To",
                  "Expires",
                  "Updated",
                  "",
                ]}
                rowIds={data.recent.transfers.map((t) => t.id)}
                selection={transferSel}
                rows={data.recent.transfers.map((t) => [
                  pill(t.status),
                  String(t.vehicle_symbol ?? t.boat_slug ?? "—"),
                  String(t.shares),
                  `${t.from_user_id.slice(0, 8)} → ${t.to_user_email}`,
                  fmt(t.expires_at),
                  fmt(t.updated_at),
                  <TransferActions
                    key={`tact-${t.id}`}
                    transfer={t}
                    openModal={openModal}
                    reload={reload}
                  />,
                ])}
              />
            </Section>

            <AuditSummary refreshNonce={refreshNonce} />
          </>
        )}
      </section>

      {modal}
    </>
  );
}

// ── view primitives ────────────────────────────────────────────

function Section({
  title,
  children,
  onExport,
}: {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="text-xs font-medium text-marine hover:text-marine-deep"
          >
            Export CSV ↓
          </button>
        )}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-rule bg-surface">
        {children}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "off";
}) {
  const cls =
    tone === "ok"
      ? "text-success-deep"
      : tone === "warn"
        ? "text-red"
        : "text-mute";
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className={`mt-2 font-display text-2xl tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function Table({
  columns,
  rows,
  selection,
  rowIds,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  /** When provided, prepends a checkbox column wired to the selection
   *  state. rowIds must be parallel-aligned with rows. */
  selection?: {
    has: (id: string) => boolean;
    toggle: (id: string) => void;
    all: (ids: { id: string }[]) => boolean;
    toggleAll: (ids: { id: string }[]) => void;
  };
  rowIds?: string[];
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-mute">No rows.</p>;
  }
  const showCheck = selection && rowIds && rowIds.length === rows.length;
  const idObjs = showCheck ? rowIds!.map((id) => ({ id })) : [];
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-rule bg-cream-2/40">
        <tr>
          {showCheck && (
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={selection!.all(idObjs)}
                onChange={() => selection!.toggleAll(idObjs)}
                className="h-3.5 w-3.5 rounded border-rule accent-marine"
              />
            </th>
          )}
          {columns.map((c) => (
            <th
              key={c}
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-mute"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map((r, i) => {
          const id = showCheck ? rowIds![i] : null;
          return (
            <tr key={id ?? i} className="hover:bg-cream-2/40">
              {showCheck && id && (
                <td className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select row ${i + 1}`}
                    checked={selection!.has(id)}
                    onChange={() => selection!.toggle(id)}
                    className="h-3.5 w-3.5 rounded border-rule accent-marine"
                  />
                </td>
              )}
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function pill(status: string) {
  const tone =
    status === "paid" || status === "verified" || status === "completed"
      ? "ok"
      : status === "failed" ||
          status === "rejected" ||
          status === "expired" ||
          status === "canceled"
        ? "warn"
        : status === "pending" ||
            status === "requested" ||
            status === "pending_ryda_review" ||
            status === "processing"
          ? "info"
          : "off";
  const cls =
    tone === "ok"
      ? "bg-success/10 text-success-deep"
      : tone === "warn"
        ? "bg-red/10 text-red"
        : tone === "info"
          ? "bg-warn/15 text-warn-deep"
          : "bg-mute/15 text-ink-soft";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

function fmt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Admin action buttons ───────────────────────────────────────
//
// Each component drives the row's action surface. The modal opener
// is plumbed in from the page so confirmations are styled + multi-line
// rather than the legacy window.prompt() / window.confirm() flow.

type ModalOpener = ReturnType<typeof useActionModal>["open"];

function PurchaseActions({
  purchase,
  openModal,
  reload,
}: {
  purchase: Purchase;
  openModal: ModalOpener;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(
    label: string,
    path: string,
    cfg: {
      title: string;
      message: string;
      confirmLabel: string;
      tone?: "default" | "danger";
      noteRequired?: boolean;
    },
  ) {
    if (busy) return;
    const res = await openModal({ ...cfg });
    if (!res.confirmed) return;
    setBusy(label);
    try {
      const r = await authedFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: res.note }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  const asset = purchase.vehicle_symbol ?? purchase.boat_slug ?? "asset";

  return (
    <div className="flex flex-wrap gap-1">
      {purchase.status === "pending" && (
        <ActionBtn
          onClick={() =>
            run("mark-paid", `/api/admin/purchase/${purchase.id}/mark-paid`, {
              title: "Mark purchase paid",
              message: `Flip ${purchase.shares} ${asset} share${purchase.shares === 1 ? "" : "s"} for ${purchase.email} to paid? Amendment generation triggers downstream.`,
              confirmLabel: "Mark paid",
            })
          }
          busy={busy === "mark-paid"}
        >
          Mark paid
        </ActionBtn>
      )}
      {purchase.status === "paid" && (
        <ActionBtn
          onClick={() =>
            run("resend", `/api/share-purchase/${purchase.id}/resend-amendment`, {
              title: "Resend amendment",
              message: `Re-deliver the LLC amendment to ${purchase.email}.`,
              confirmLabel: "Resend",
            })
          }
          busy={busy === "resend"}
        >
          Resend
        </ActionBtn>
      )}
      {(purchase.status === "paid" || purchase.status === "pending") && (
        <ActionBtn
          tone="danger"
          onClick={() =>
            run("refund", `/api/share-purchase/${purchase.id}/refund`, {
              title: "Refund / cancel",
              message: `Refund $${(purchase.total_cents / 100).toLocaleString()} for ${purchase.shares} ${asset} share${purchase.shares === 1 ? "" : "s"} and cancel the LLC seat. This is irreversible.`,
              confirmLabel: "Refund",
              tone: "danger",
              noteRequired: true,
            })
          }
          busy={busy === "refund"}
        >
          Refund
        </ActionBtn>
      )}
    </div>
  );
}

function BookingActions({
  booking,
  openModal,
  reload,
}: {
  booking: Booking;
  openModal: ModalOpener;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (busy) return;
    const asset = booking.vehicle_symbol ?? booking.boat_slug ?? "asset";
    const res = await openModal({
      title: "Cancel booking",
      message: `Cancel ${asset} booking ${booking.start_date} → ${booking.end_date}? Member is notified; slot returns to the calendar.`,
      confirmLabel: "Cancel booking",
      tone: "danger",
    });
    if (!res.confirmed) return;
    setBusy(true);
    try {
      const r = await authedFetch(`/api/admin/booking/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: res.note }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return <span className="text-xs text-mute">—</span>;
  }
  return (
    <ActionBtn tone="danger" onClick={cancel} busy={busy}>
      Cancel
    </ActionBtn>
  );
}

function KycActions({
  kyc,
  openModal,
  reload,
}: {
  kyc: Kyc;
  openModal: ModalOpener;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function override(status: string, label: string) {
    if (busy) return;
    const res = await openModal({
      title: status === "verified" ? "Force-verify KYC" : "Cancel KYC",
      message: `Manually flip KYC for user ${kyc.user_id.slice(0, 8)} → ${status}. Bypasses the verification provider.`,
      confirmLabel: status === "verified" ? "Force verify" : "Cancel KYC",
      tone: status === "verified" ? "default" : "danger",
      noteRequired: true,
    });
    if (!res.confirmed) return;
    setBusy(label);
    try {
      const r = await authedFetch("/api/admin/kyc/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: kyc.user_id, status, note: res.note }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Override failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {kyc.status !== "verified" && (
        <ActionBtn
          onClick={() => override("verified", "verify")}
          busy={busy === "verify"}
        >
          Force verify
        </ActionBtn>
      )}
      {kyc.status !== "canceled" && (
        <ActionBtn
          tone="danger"
          onClick={() => override("canceled", "cancel")}
          busy={busy === "cancel"}
        >
          Cancel
        </ActionBtn>
      )}
    </div>
  );
}

function TransferActions({
  transfer,
  openModal,
  reload,
}: {
  transfer: Transfer;
  openModal: ModalOpener;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function ack(action: "approve" | "reject") {
    if (busy) return;
    const asset = transfer.vehicle_symbol ?? transfer.boat_slug ?? "asset";
    const res = await openModal({
      title:
        action === "approve" ? "Approve share transfer" : "Reject share transfer",
      message:
        action === "approve"
          ? `Move ${transfer.shares} ${asset} share${transfer.shares === 1 ? "" : "s"} to ${transfer.to_user_email}. Originating member is notified; cap table updates.`
          : `Reject the transfer to ${transfer.to_user_email}. Originating member retains the shares; both parties are notified.`,
      confirmLabel: action === "approve" ? "Approve" : "Reject",
      tone: action === "approve" ? "default" : "danger",
      noteRequired: true,
    });
    if (!res.confirmed) return;
    setBusy(action);
    try {
      const r = await authedFetch("/api/admin/transfer/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferId: transfer.id,
          action,
          note: res.note,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Ack failed.");
    } finally {
      setBusy(null);
    }
  }

  if (transfer.status !== "pending_ryda_review") {
    return <span className="text-xs text-mute">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      <ActionBtn onClick={() => ack("approve")} busy={busy === "approve"}>
        Approve
      </ActionBtn>
      <ActionBtn
        tone="danger"
        onClick={() => ack("reject")}
        busy={busy === "reject"}
      >
        Reject
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  busy,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
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
      disabled={busy}
      className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {busy ? "…" : children}
    </button>
  );
}
