"use client";

// /admin — operational console, rental triage.
//
// Gating: client-side this page just checks supabase.auth.getUser()
// and bounces to /signin if anon. The TRUE gate is the
// /api/admin/overview server route (requireAdmin on
// app_metadata.role === 'admin' — service-role-only writable, so
// users can't self-promote). A non-admin who lands here sees a
// "no permission" empty state; no data leaks because the API call
// 403s before returning anything.
//
// WHAT CHANGED IN THE RENTALS-FIRST STRIP
// This page used to be a co-ownership triage desk: counts and 20-row
// tables for share_purchases, bookings, kyc_verifications and
// share_transfers, each with per-row actions (mark paid, resend
// amendment, refund, force-verify KYC, approve/reject transfer) and
// bulk runners over the same. Every one of those endpoints belonged to
// the retired product and is gone, so the actions went with them rather
// than being left as buttons that 404.
//
// What replaced them is deliberately read-only. The rental funnel's
// write surface already exists and is better than anything this page
// had: /admin/inquiries owns lead triage and payment links,
// /admin/partners owns the operator roster and Stripe onboarding. This
// page is the thing neither of those can be — one screen that shows the
// whole funnel at once: a lead arrives (rental_inquiries), an operator
// answers it (rental_bookings), money moves (rental_payments).
//
// Capabilities:
//   - Counts strip across all three rental stages
//   - 20 most-recent rows per stage, each CSV-exportable
//   - Find-a-member lookup (email substring or UUID)
//   - Recent-admin-actions panel (last 10 audit-log entries)
//   - Manual refresh + auto-refresh toggle (30s cadence)
//   - Desktop notification when a new lead or booking request lands
//   - Sub-route nav

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { RefreshBar } from "@/components/admin/refresh-bar";
import { AuditSummary } from "@/components/admin/audit-summary";
import { UserLookup } from "@/components/admin/user-lookup";
import { downloadCsv } from "@/components/admin/csv";
import {
  useNewPendingNotifier,
  type NotifyChannel,
} from "@/components/admin/use-desktop-notifications";

type Counts = {
  inquiries_new: number;
  inquiries_sent: number;
  inquiries_booked: number;
  bookings_requested: number;
  bookings_open: number;
  payments_pending: number;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  vehicle_slug: string;
  vehicle_label: string;
  fleet: string;
  market: string | null;
  start_date: string;
  end_date: string;
  status: string;
  partner_id: string | null;
  created_at: string;
};

type Booking = {
  id: string;
  listing_id: string;
  listing_label: string | null;
  renter_user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  initiated_by: string;
  renter_total_cents: number;
  fee_cents: number;
  currency: string;
  expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  inquiry_id: string;
  partner_id: string;
  amount_cents: number;
  application_fee_cents: number;
  currency: string;
  status: string;
  pay_link_sent_at: string | null;
  paid_at: string | null;
  created_at: string;
};

type Overview = {
  counts: Counts;
  recent: {
    inquiries: Inquiry[];
    bookings: Booking[];
    payments: Payment[];
  };
};

const SUB_ROUTES = [
  { href: "/admin", label: "Triage", note: "this page" },
  { href: "/admin/inquiries", label: "Inquiries", note: "rental lead pipeline" },
  // ONE Partners entry. /admin/partners unified the two pre-merge pages
  // (applications + operator roster) behind a tab bar; two rows for the
  // same href collided on the nav's React key and implied two
  // destinations four chips apart.
  {
    href: "/admin/partners",
    label: "Partners",
    note: "applications + operators + Stripe onboarding",
  },
  { href: "/admin/creative", label: "Creative", note: "marketing generation queue" },
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

  // Desktop notifications. We pass the ids currently sitting in each
  // "needs a human" queue; the hook diffs them across refreshes and
  // fires only when an id it has never seen appears. Memoized because
  // the hook's effect depends on the array identity.
  const channels = useMemo<NotifyChannel[]>(
    () => [
      {
        ids:
          data?.recent.inquiries
            .filter((i) => i.status === "new")
            .map((i) => i.id) ?? [],
        noun: "rental lead",
        body: "An unrouted inquiry is waiting for an operator.",
      },
      {
        ids:
          data?.recent.bookings
            .filter((b) => b.status === "requested")
            .map((b) => b.id) ?? [],
        noun: "booking request",
        body: "An operator has not answered yet — these expire in 24h.",
      },
    ],
    [data],
  );
  const notifier = useNewPendingNotifier({
    channels,
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

  const counts = data?.counts;

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Admin
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Rental triage.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            The whole funnel on one screen — leads in, operator answers,
            money on the Connect rail. Act on a lead from{" "}
            <Link href="/admin/inquiries" className="text-red hover:text-red-deep">
              Inquiries
            </Link>
            .
          </p>
        </header>

        {/* Sub-route nav. */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {SUB_ROUTES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              title={r.note}
              className="inline-flex h-8 items-center rounded-full border border-rule px-4 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {r.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8">
          <RefreshBar
            onRefresh={reload}
            loading={refreshing}
            lastRefreshedAt={lastRefreshedAt}
            extra={
              notifier.permission === "unsupported" ? null : notifier.permission ===
                "granted" ? (
                <label className="inline-flex items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    className="accent-red"
                    checked={notifier.enabled}
                    onChange={(e) => notifier.setEnabled(e.target.checked)}
                  />
                  Desktop alerts
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => void notifier.request()}
                  className="text-xs text-ink-soft underline hover:text-ink"
                >
                  Enable desktop alerts
                </button>
              )
            }
          />
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-mute">Loading…</p>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-rule bg-surface p-6">
            <p className="text-sm text-ink-soft">{error}</p>
          </div>
        ) : (
          <>
            {/* Counts strip. */}
            <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Count
                label="Unrouted leads"
                value={counts?.inquiries_new ?? 0}
                tone={(counts?.inquiries_new ?? 0) > 0 ? "warn" : "default"}
              />
              <Count label="With operator" value={counts?.inquiries_sent ?? 0} />
              <Count label="Leads booked" value={counts?.inquiries_booked ?? 0} />
              <Count
                label="Awaiting answer"
                value={counts?.bookings_requested ?? 0}
                tone={(counts?.bookings_requested ?? 0) > 0 ? "warn" : "default"}
              />
              <Count label="Live bookings" value={counts?.bookings_open ?? 0} />
              <Count
                label="Unpaid links"
                value={counts?.payments_pending ?? 0}
                tone={(counts?.payments_pending ?? 0) > 0 ? "warn" : "default"}
              />
            </section>

            {/* Recent inquiries. */}
            <Panel
              title="Recent inquiries"
              subtitle="20 most recent · rental_inquiries"
              onExport={() =>
                downloadCsv({
                  filename: "rental-inquiries.csv",
                  columns: [
                    "id",
                    "created_at",
                    "name",
                    "email",
                    "vehicle_label",
                    "fleet",
                    "market",
                    "start_date",
                    "end_date",
                    "status",
                  ],
                  rows: (data?.recent.inquiries ?? []).map((i) => [
                    i.id,
                    i.created_at,
                    i.name,
                    i.email,
                    i.vehicle_label,
                    i.fleet,
                    i.market,
                    i.start_date,
                    i.end_date,
                    i.status,
                  ]),
                })
              }
              empty={(data?.recent.inquiries.length ?? 0) === 0}
              emptyText="No rental inquiries yet."
            >
              <Table head={["Received", "Renter", "Car", "Dates", "Status"]}>
                {(data?.recent.inquiries ?? []).map((i) => (
                  <tr key={i.id} className="border-t border-rule">
                    <Td>{shortDateTime(i.created_at)}</Td>
                    <Td>
                      <span className="text-ink">{i.name}</span>
                      <span className="block text-[11px] text-mute">{i.email}</span>
                    </Td>
                    <Td>
                      <span className="text-ink">{i.vehicle_label}</span>
                      <span className="block text-[11px] text-mute">
                        {i.fleet === "ryda" ? "RYDA fleet" : "Partner"}
                        {i.market ? ` · ${i.market}` : ""}
                      </span>
                    </Td>
                    <Td>
                      {shortDate(i.start_date)} – {shortDate(i.end_date)}
                    </Td>
                    <Td>
                      <Chip status={i.status} />
                    </Td>
                  </tr>
                ))}
              </Table>
            </Panel>

            {/* Recent bookings. */}
            <Panel
              title="Recent bookings"
              subtitle="20 most recent · rental_bookings"
              onExport={() =>
                downloadCsv({
                  filename: "rental-bookings.csv",
                  columns: [
                    "id",
                    "created_at",
                    "listing_id",
                    "listing_label",
                    "renter_user_id",
                    "start_date",
                    "end_date",
                    "status",
                    "initiated_by",
                    "renter_total_cents",
                    "fee_cents",
                    "currency",
                  ],
                  rows: (data?.recent.bookings ?? []).map((b) => [
                    b.id,
                    b.created_at,
                    b.listing_id,
                    b.listing_label,
                    b.renter_user_id,
                    b.start_date,
                    b.end_date,
                    b.status,
                    b.initiated_by,
                    b.renter_total_cents,
                    b.fee_cents,
                    b.currency,
                  ]),
                })
              }
              empty={(data?.recent.bookings.length ?? 0) === 0}
              emptyText="No rental bookings yet."
            >
              <Table
                head={["Created", "Car", "Dates", "Renter total", "Status"]}
              >
                {(data?.recent.bookings ?? []).map((b) => (
                  <tr key={b.id} className="border-t border-rule">
                    <Td>{shortDateTime(b.created_at)}</Td>
                    <Td>
                      <span className="text-ink">
                        {b.listing_label ?? b.listing_id.slice(0, 8)}
                      </span>
                      <span className="block text-[11px] text-mute">
                        opened by {b.initiated_by}
                      </span>
                    </Td>
                    <Td>
                      {shortDate(b.start_date)} – {shortDate(b.end_date)}
                    </Td>
                    <Td className="tabular-nums">
                      {money(b.renter_total_cents, b.currency)}
                      <span className="block text-[11px] text-mute">
                        fee {money(b.fee_cents, b.currency)}
                      </span>
                    </Td>
                    <Td>
                      <Chip status={b.status} />
                    </Td>
                  </tr>
                ))}
              </Table>
            </Panel>

            {/* Recent payments. */}
            <Panel
              title="Recent payments"
              subtitle="20 most recent · rental_payments (Connect direct charges)"
              onExport={() =>
                downloadCsv({
                  filename: "rental-payments.csv",
                  columns: [
                    "id",
                    "created_at",
                    "inquiry_id",
                    "partner_id",
                    "amount_cents",
                    "application_fee_cents",
                    "currency",
                    "status",
                    "pay_link_sent_at",
                    "paid_at",
                  ],
                  rows: (data?.recent.payments ?? []).map((p) => [
                    p.id,
                    p.created_at,
                    p.inquiry_id,
                    p.partner_id,
                    p.amount_cents,
                    p.application_fee_cents,
                    p.currency,
                    p.status,
                    p.pay_link_sent_at,
                    p.paid_at,
                  ]),
                })
              }
              empty={(data?.recent.payments.length ?? 0) === 0}
              emptyText="No payment links sent yet."
            >
              <Table
                head={["Created", "Inquiry", "Charge", "RYDA fee", "Status"]}
              >
                {(data?.recent.payments ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-rule">
                    <Td>{shortDateTime(p.created_at)}</Td>
                    <Td className="font-mono text-[11px]">
                      {p.inquiry_id.slice(0, 8)}
                    </Td>
                    <Td className="tabular-nums">
                      {money(p.amount_cents, p.currency)}
                    </Td>
                    <Td className="tabular-nums">
                      {money(p.application_fee_cents, p.currency)}
                    </Td>
                    <Td>
                      <Chip status={p.status} />
                    </Td>
                  </tr>
                ))}
              </Table>
            </Panel>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UserLookup />
              <AuditSummary refreshNonce={refreshNonce} />
            </div>
          </>
        )}
      </section>
    </>
  );
}

// ── Formatting ───────────────────────────────────────────────────

// Date-only strings render at noon so a UTC parse can't roll them back
// a day in a western timezone.
function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

// ── Presentational ───────────────────────────────────────────────

function Count({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "warn" ? "border-warn/40 bg-warn/5" : "border-rule bg-surface"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink tabular-nums">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  onExport,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle: string;
  onExport: () => void;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <p className="mt-1 text-xs text-mute">{subtitle}</p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-8 items-center rounded-full border border-rule px-4 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Export CSV
          </button>
        )}
      </div>
      {empty ? (
        <div className="mt-4 rounded-xl border border-dashed border-rule bg-cream-2/40 p-6 text-center">
          <p className="text-sm text-ink-soft">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-rule bg-surface">
          {children}
        </div>
      )}
    </section>
  );
}

function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-mute"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top text-ink-soft ${className}`}>
      {children}
    </td>
  );
}

// Status chip. Covers all three vocabularies on this page — inquiry
// (new/sent/booked/lost), booking (requested/confirmed/in_progress/
// completed/declined/expired/cancelled — note the two-L rental
// spelling) and payment (pending/paid/expired/canceled, one L). An
// unrecognized state degrades to the neutral chip with its raw label
// rather than being hidden.
const CHIP_TONE: Record<string, string> = {
  new: "bg-warn/15 text-warn-deep",
  requested: "bg-warn/15 text-warn-deep",
  pending: "bg-warn/15 text-warn-deep",
  sent: "border border-rule bg-cream-2 text-ink-soft",
  confirmed: "bg-success/15 text-success-deep",
  in_progress: "bg-success/15 text-success-deep",
  booked: "bg-success/15 text-success-deep",
  completed: "bg-success/15 text-success-deep",
  paid: "bg-success/15 text-success-deep",
  lost: "bg-cream-2 text-mute",
  declined: "bg-cream-2 text-mute",
  expired: "bg-cream-2 text-mute",
  cancelled: "bg-cream-2 text-mute",
  canceled: "bg-cream-2 text-mute",
};

function Chip({ status }: { status: string }) {
  const cls = CHIP_TONE[status] ?? "border border-rule bg-cream-2 text-ink-soft";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
