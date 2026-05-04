"use client";

// /admin/audit — paginated viewer over admin_audit_log (migration 0018).
// Read-only, admin-gated (the GET route 403s non-admins). Filterable
// by admin_user_id, target_type, target_id, action enum.
//
// Used post-incident: "who flipped this purchase to paid", "show me
// every refund issued in the last week", "what did admin X do
// recently". The table itself doesn't paginate via offset on the
// row layout; we render in pages of 50 + a "load more" button.

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

type Row = {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type Page = {
  rows: Row[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    target_type: "",
    target_id: "",
    action: "",
    admin: "",
  });

  async function load(reset = true) {
    setLoading(true);
    setError(null);
    try {
      const nextOffset = reset ? 0 : offset + PAGE_SIZE;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
      });
      if (filters.target_type) params.set("target_type", filters.target_type);
      if (filters.target_id) params.set("target_id", filters.target_id);
      if (filters.action) params.set("action", filters.action);
      if (filters.admin) params.set("admin", filters.admin);

      const res = await authedFetch(`/api/admin/audit?${params.toString()}`);
      if (res.status === 403) {
        setError("You do not have admin permission.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error(`Lookup failed (${res.status}).`);
      }
      const j = (await res.json()) as Page;
      setRows(reset ? j.rows : [...rows, ...j.rows]);
      setTotal(j.total);
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Audit log
            </p>
            <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
              Who did what.
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Every admin mutation is recorded here — KYC overrides, refunds,
              transfer acks, booking cancellations. Read-only. Service-role
              writes only.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs font-medium uppercase tracking-wider text-mute hover:text-ink"
          >
            ← Admin overview
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-8 grid gap-3 rounded-2xl border border-rule bg-surface p-5 sm:grid-cols-4">
          <Filter
            label="Action"
            value={filters.action}
            options={[
              "",
              "kyc_override",
              "refund_issued",
              "transfer_ack",
              "transfer_reject",
              "resend_amendment",
              "booking_canceled",
              "purchase_marked_paid",
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
          />
          <FilterText
            label="Target type"
            placeholder="share_purchase"
            value={filters.target_type}
            onChange={(v) => setFilters((f) => ({ ...f, target_type: v }))}
          />
          <FilterText
            label="Target id"
            placeholder="uuid…"
            value={filters.target_id}
            onChange={(v) => setFilters((f) => ({ ...f, target_id: v }))}
          />
          <FilterText
            label="Admin user id"
            placeholder="uuid…"
            value={filters.admin}
            onChange={(v) => setFilters((f) => ({ ...f, admin: v }))}
          />
          <div className="sm:col-span-4 flex gap-3">
            <button
              type="button"
              onClick={() => void load(true)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-red"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters({ target_type: "", target_id: "", action: "", admin: "" });
                setTimeout(() => void load(true), 0);
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          {error && (
            <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {error}
            </p>
          )}
          {!error && (
            <>
              <p className="text-xs uppercase tracking-wider text-mute">
                {loading
                  ? "Loading…"
                  : `${rows.length} of ${total.toLocaleString()} ${total === 1 ? "row" : "rows"}`}
              </p>

              {rows.length === 0 && !loading ? (
                <p className="mt-4 text-sm text-mute">No matching rows.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-rule">
                  <table className="min-w-[900px] divide-y divide-rule text-left text-sm">
                    <thead className="bg-cream-2/40">
                      <tr>
                        <Th>When</Th>
                        <Th>Action</Th>
                        <Th>Target</Th>
                        <Th>Admin</Th>
                        <Th>Details</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule bg-surface">
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <Td mono>{new Date(r.created_at).toISOString().slice(0, 19).replace("T", " ")}</Td>
                          <Td>
                            <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-medium text-ink">
                              {r.action}
                            </span>
                          </Td>
                          <Td mono>
                            {r.target_type}
                            {r.target_id ? ` · ${r.target_id.slice(0, 8)}…` : ""}
                          </Td>
                          <Td mono>{r.admin_user_id?.slice(0, 8) ?? "—"}…</Td>
                          <Td>
                            <pre className="max-w-[400px] whitespace-pre-wrap break-all text-[11px] text-ink-soft">
                              {r.details
                                ? JSON.stringify(r.details, null, 2)
                                : "—"}
                            </pre>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {rows.length > 0 && rows.length < total && (
                <button
                  type="button"
                  onClick={() => void load(false)}
                  disabled={loading}
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
                >
                  {loading ? "Loading…" : `Load more (${total - rows.length} remaining)`}
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-mute">
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 align-top ${mono ? "font-mono text-[12px] tabular-nums" : ""}`}>
      {children}
    </td>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-mute">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 w-full rounded-xl border border-rule bg-cream px-3 text-sm text-ink focus:border-ink focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "Any"}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterText({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-mute">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 w-full rounded-xl border border-rule bg-cream px-3 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />
    </label>
  );
}
