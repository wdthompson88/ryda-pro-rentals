"use client";

// /admin — read-only operational triage dashboard.
//
// Gating: client-side this page just checks supabase.auth.getUser()
// and bounces to /signin if anon. The TRUE gate is the
// /api/admin/overview server route (requireAdmin on
// app_metadata.role === 'admin' — service-role-only writable, so
// users can't self-promote). A non-admin who lands here sees a
// "no permission" empty state; no data leaks because the API call
// 403s before returning anything.
//
// Intentionally minimal: counts + 20 most-recent rows per category.
// Action buttons (resend, refund, mark KYC verified, ack transfer)
// land in subsequent passes.

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

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

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch the overview after every admin action so the UI
  // reflects the new state. Action components call reload() after
  // a successful mutation.
  async function reload() {
    try {
      const res = await authedFetch("/api/admin/overview");
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) throw new Error(`Lookup failed (${res.status}).`);
      const j = (await res.json()) as Overview;
      setData(j);
    } catch (e) {
      console.error("[admin · reload]", e);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/admin/overview");
        if (cancelled) return;
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
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
            Operational triage.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Read-only view of recent purchases, bookings, KYC checks, and
            share transfers. Action buttons land in subsequent passes — for
            now use the Supabase dashboard for state changes.
          </p>

          {/* Sub-route nav. Without this, the admin sub-routes
              (/admin/prospects, /admin/disputes, etc.) are invisible
              from the dashboard. Each is a separate workstream with
              its own state. Ordering: pre-customer (prospects) → live
              ops (disputes, LLC, audit, comparables, vehicle data)
              roughly mirrors the customer lifecycle. */}
          <nav className="mt-6 flex flex-wrap gap-2 text-xs">
            {[
              { href: "/admin", label: "Triage", note: "this page" },
              { href: "/admin/creative", label: "Creative", note: "marketing generation queue" },
              { href: "/admin/prospects", label: "Prospects", note: "founding cohort CRM" },
              { href: "/admin/disputes", label: "Disputes", note: "Stripe chargebacks" },
              { href: "/admin/llc", label: "LLCs", note: "formation + members" },
              { href: "/admin/comparables", label: "Comparables", note: "vehicle market data" },
              { href: "/admin/vehicle-enrichment", label: "Enrichment", note: "VIN decoder" },
              { href: "/admin/audit", label: "Audit", note: "admin actions log" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={link.note}
                className="rounded-full border border-rule bg-cream-2 px-3 py-1 font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

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
            {/* Counts strip */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
              <Stat label="Pending purchases" value={data.counts.purchases_pending} tone={data.counts.purchases_pending > 0 ? "warn" : "off"} />
              <Stat label="Failed purchases" value={data.counts.purchases_failed} tone={data.counts.purchases_failed > 0 ? "warn" : "off"} />
              <Stat label="Paid purchases" value={data.counts.purchases_paid} tone="ok" />
              <Stat label="Pending bookings" value={data.counts.bookings_pending} tone={data.counts.bookings_pending > 0 ? "warn" : "off"} />
              <Stat label="Open transfers" value={data.counts.transfers_open} tone={data.counts.transfers_open > 0 ? "warn" : "off"} />
            </section>

            <Section title="Recent share purchases">
              <Table
                columns={["Status", "Asset", "Shares", "Total", "Buyer", "Updated", ""]}
                rows={data.recent.purchases.map((p) => [
                  pill(p.status),
                  String(p.vehicle_symbol ?? p.boat_slug ?? "—"),
                  String(p.shares),
                  `$${(p.total_cents / 100).toLocaleString()}`,
                  p.email,
                  fmt(p.updated_at),
                  <PurchaseActions key={`act-${p.id}`} purchase={p} reload={reload} />,
                ])}
              />
            </Section>

            <Section title="Recent bookings">
              <Table
                columns={["Status", "Asset", "Mode", "Dates", "Created", ""]}
                rows={data.recent.bookings.map((b) => [
                  pill(b.status),
                  String(b.vehicle_symbol ?? b.boat_slug ?? "—"),
                  b.mode,
                  `${b.start_date} → ${b.end_date}`,
                  fmt(b.created_at),
                  <BookingActions key={`bact-${b.id}`} booking={b} reload={reload} />,
                ])}
              />
            </Section>

            <Section title="Recent KYC">
              <Table
                columns={["Status", "Failure", "User", "Updated", ""]}
                rows={data.recent.kyc.map((k) => [
                  pill(k.status),
                  k.failure_code
                    ? `${k.failure_code}${k.failure_reason ? ` · ${k.failure_reason}` : ""}`
                    : "—",
                  k.user_id.slice(0, 8),
                  fmt(k.updated_at),
                  <KycActions key={`kact-${k.id}`} kyc={k} reload={reload} />,
                ])}
              />
            </Section>

            <Section title="Recent share transfers">
              <Table
                columns={["Status", "Asset", "Shares", "From → To", "Expires", "Updated", ""]}
                rows={data.recent.transfers.map((t) => [
                  pill(t.status),
                  String(t.vehicle_symbol ?? t.boat_slug ?? "—"),
                  String(t.shares),
                  `${t.from_user_id.slice(0, 8)} → ${t.to_user_email}`,
                  fmt(t.expires_at),
                  fmt(t.updated_at),
                  <TransferActions key={`tact-${t.id}`} transfer={t} reload={reload} />,
                ])}
              />
            </Section>
          </>
        )}
      </section>
    </>
  );
}

// ── view primitives ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-ink">{title}</h2>
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
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-mute">No rows.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-rule bg-cream-2/40">
        <tr>
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
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-cream-2/40">
            {r.map((cell, j) => (
              <td key={j} className="px-4 py-3 text-ink">
                {cell}
              </td>
            ))}
          </tr>
        ))}
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
          ? "bg-amber-500/15 text-amber-700"
          : "bg-mute/15 text-mute";
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
// Each component prompts the admin for a confirmation note (via a
// browser prompt() — minimal but functional; richer modal can
// land later) and POSTs to the corresponding admin route. After
// success, reload() re-fetches the overview so the row reflects
// the new status without a manual refresh.

function PurchaseActions({
  purchase,
  reload,
}: {
  purchase: Purchase;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function call(path: string, label: string) {
    if (busy) return;
    const note = window.prompt(`${label}\n\nOptional ops note:`);
    if (note === null) return; // cancel
    setBusy(label);
    try {
      const res = await authedFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status}).`);
      }
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {purchase.status === "pending" && (
        <ActionBtn
          onClick={() =>
            call(`/api/admin/purchase/${purchase.id}/mark-paid`, "Mark paid")
          }
          busy={busy === "Mark paid"}
        >
          Mark paid
        </ActionBtn>
      )}
      {purchase.status === "paid" && (
        <ActionBtn
          onClick={() =>
            call(
              `/api/share-purchase/${purchase.id}/resend-amendment`,
              "Resend amendment",
            )
          }
          busy={busy === "Resend amendment"}
        >
          Resend
        </ActionBtn>
      )}
      {(purchase.status === "paid" || purchase.status === "pending") && (
        <ActionBtn
          tone="danger"
          onClick={() =>
            call(`/api/share-purchase/${purchase.id}/refund`, "Refund / cancel")
          }
          busy={busy === "Refund / cancel"}
        >
          Refund
        </ActionBtn>
      )}
    </div>
  );
}

function BookingActions({
  booking,
  reload,
}: {
  booking: Booking;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (busy) return;
    if (
      !window.confirm(
        `Cancel booking on ${booking.vehicle_symbol ?? booking.boat_slug ?? "asset"} (${booking.start_date} → ${booking.end_date})?`,
      )
    )
      return;
    const note = window.prompt("Optional ops note:") ?? "";
    setBusy(true);
    try {
      const res = await authedFetch(`/api/admin/booking/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status}).`);
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
  reload,
}: {
  kyc: Kyc;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function override(status: string, label: string) {
    if (busy) return;
    if (
      !window.confirm(
        `Manually flip KYC for user ${kyc.user_id.slice(0, 8)} → ${status}?`,
      )
    )
      return;
    const note = window.prompt("Optional ops note:") ?? "";
    setBusy(label);
    try {
      const res = await authedFetch("/api/admin/kyc/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: kyc.user_id, status, note }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status}).`);
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
  reload,
}: {
  transfer: Transfer;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function ack(action: "approve" | "reject") {
    if (busy) return;
    if (
      !window.confirm(
        `${action === "approve" ? "APPROVE" : "REJECT"} transfer ${transfer.id.slice(0, 8)}?\n\nApproval moves the share to ${transfer.to_user_email}.`,
      )
    )
      return;
    const note = window.prompt("Required ops note:") ?? "";
    if (!note) {
      window.alert("Note required for transfer ack.");
      return;
    }
    setBusy(action);
    try {
      const res = await authedFetch("/api/admin/transfer/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId: transfer.id, action, note }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status}).`);
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
