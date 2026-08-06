"use client";

// User-lookup card: search by email or UUID, render matching members
// with their full operational state inline (KYC, recent purchases,
// recent bookings, open transfers, total shares held, role).
//
// Lives on the main /admin page so an operator can pull up a specific
// member without leaving triage — instead of scrolling the recent-20
// lists for a name they remember.

import { useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import { useActionModal } from "@/components/admin/action-modal";

type Hit = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: Record<string, unknown> | null;
  user_metadata: Record<string, unknown> | null;
  kyc: {
    status: string;
    failure_code: string | null;
    failure_reason: string | null;
    updated_at: string;
  } | null;
  purchases: Array<{
    id: string;
    status: string;
    shares: number;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    total_cents: number;
    updated_at: string;
  }>;
  bookings: Array<{
    id: string;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    mode: string;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
  }>;
  transfers: Array<{
    id: string;
    direction: "from" | "to";
    counterparty: string;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    shares: number;
    status: string;
    expires_at: string;
    updated_at: string;
  }>;
  total_shares_held: number;
};

export function UserLookup() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { open: openModal, modal } = useActionModal();

  async function rerun() {
    const q = query.trim();
    if (q.length < 3) return;
    try {
      const res = await authedFetch(
        `/api/admin/users/search?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) return;
      const j = (await res.json()) as { hits: Hit[] };
      setHits(j.hits ?? []);
    } catch {
      /* swallow — the user can re-submit */
    }
  }

  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setError("Need at least 3 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(
        `/api/admin/users/search?q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Lookup failed (${res.status}).`);
      }
      const j = (await res.json()) as { hits: Hit[] };
      setHits(j.hits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
      setHits(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg text-ink">Find a member</h2>
        <span className="text-xs text-mute">
          Email substring or full UUID
        </span>
      </div>

      <form onSubmit={search} className="mt-3 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ryan@ryda.pro · 2561af95-…"
          className="h-10 min-w-0 flex-1 rounded-full border border-rule bg-cream-2 px-4 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center rounded-full border border-ink bg-ink px-5 text-sm font-medium text-cream transition-colors hover:bg-red hover:border-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red">{error}</p>
      )}

      {hits && hits.length === 0 && !loading && (
        <p className="mt-4 text-sm text-mute">
          No members matched that query.
        </p>
      )}

      {hits && hits.length > 0 && (
        <div className="mt-5 space-y-5">
          {hits.map((h) => (
            <UserCard
              key={h.id}
              hit={h}
              openModal={openModal}
              onChanged={rerun}
            />
          ))}
        </div>
      )}
      {modal}
    </section>
  );
}

function UserCard({
  hit,
  openModal,
  onChanged,
}: {
  hit: Hit;
  openModal: ReturnType<typeof useActionModal>["open"];
  onChanged: () => Promise<void>;
}) {
  const role = (hit.app_metadata?.role as string | undefined) ?? "member";
  const isAdmin = role === "admin";
  const [busy, setBusy] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  async function toggleRole() {
    if (busy) return;
    const action = isAdmin ? "revoke" : "grant";
    const res = await openModal({
      title: isAdmin ? "Revoke admin" : "Grant admin",
      message: isAdmin
        ? `Remove admin from ${hit.email}? They keep their account and any shares; they just lose /admin access.`
        : `Grant admin to ${hit.email}? They'll see the /admin console on next sign-in or session refresh.`,
      confirmLabel: isAdmin ? "Revoke admin" : "Grant admin",
      tone: isAdmin ? "danger" : "default",
      noteRequired: true,
    });
    if (!res.confirmed) return;
    setBusy("role");
    try {
      const r = await authedFetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: hit.id, action, note: res.note }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      await onChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Role update failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-xl border border-rule bg-cream-2/40 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{hit.email ?? "(no email)"}</p>
          <p className="font-mono text-[11px] text-mute">{hit.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium ${
              isAdmin
                ? "bg-marine/15 text-marine-deep"
                : "bg-mute/15 text-ink-soft"
            }`}
          >
            {role}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium ${
              hit.email_confirmed_at
                ? "bg-success/10 text-success-deep"
                : "bg-warn/15 text-warn-deep"
            }`}
          >
            {hit.email_confirmed_at ? "email verified" : "email unverified"}
          </span>
          <span className="text-mute">
            joined {fmtDate(hit.created_at)}
            {hit.last_sign_in_at
              ? ` · last sign-in ${fmtDate(hit.last_sign_in_at)}`
              : ""}
          </span>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleRole}
          disabled={busy === "role"}
          className={`inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isAdmin
              ? "border-red/40 text-red hover:bg-red hover:text-cream"
              : "border-rule text-ink-soft hover:border-marine hover:text-marine"
          }`}
        >
          {busy === "role" ? "…" : isAdmin ? "Revoke admin" : "Grant admin"}
        </button>
        <button
          type="button"
          onClick={() => setComposeOpen((s) => !s)}
          disabled={!hit.email}
          className="inline-flex h-7 items-center rounded-full border border-rule px-3 text-[11px] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {composeOpen ? "Close email" : "Send email"}
        </button>
      </div>

      {composeOpen && hit.email && (
        <EmailComposer
          to={hit.email}
          userId={hit.id}
          onClose={() => setComposeOpen(false)}
        />
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat
          label="KYC"
          value={hit.kyc?.status ?? "—"}
          tone={
            hit.kyc?.status === "verified"
              ? "ok"
              : hit.kyc?.status === "failed" || hit.kyc?.status === "canceled"
                ? "warn"
                : "off"
          }
        />
        <Stat label="Total shares" value={String(hit.total_shares_held)} />
        <Stat
          label="Open purchases"
          value={String(
            hit.purchases.filter((p) => p.status === "pending").length,
          )}
        />
        <Stat
          label="Open transfers"
          value={String(
            hit.transfers.filter(
              (t) =>
                t.status === "requested" ||
                t.status === "pending_ryda_review" ||
                t.status === "accepted",
            ).length,
          )}
        />
      </dl>

      {hit.kyc?.failure_code && (
        <p className="mt-3 rounded-lg bg-red/5 px-3 py-2 text-xs text-red">
          KYC failure: <strong>{hit.kyc.failure_code}</strong>
          {hit.kyc.failure_reason ? ` · ${hit.kyc.failure_reason}` : ""}
        </p>
      )}

      <MiniTable
        title="Recent purchases"
        empty="No purchases yet."
        columns={["Status", "Asset", "Shares", "Total", "Updated"]}
        rows={hit.purchases.map((p) => [
          p.status,
          p.vehicle_symbol ?? p.boat_slug ?? "—",
          String(p.shares),
          `$${(p.total_cents / 100).toLocaleString()}`,
          fmtDate(p.updated_at),
        ])}
      />

      <MiniTable
        title="Recent bookings"
        empty="No bookings."
        columns={["Status", "Asset", "Mode", "Dates", "Created"]}
        rows={hit.bookings.map((b) => [
          b.status,
          b.vehicle_symbol ?? b.boat_slug ?? "—",
          b.mode,
          `${b.start_date} → ${b.end_date}`,
          fmtDate(b.created_at),
        ])}
      />

      <MiniTable
        title="Recent transfers"
        empty="No transfers."
        columns={["Direction", "Status", "Asset", "Shares", "Counterparty", "Updated"]}
        rows={hit.transfers.map((t) => [
          t.direction === "from" ? "out" : "in",
          t.status,
          t.vehicle_symbol ?? t.boat_slug ?? "—",
          String(t.shares),
          t.counterparty,
          fmtDate(t.updated_at),
        ])}
      />
    </article>
  );
}

function EmailComposer({
  to,
  userId,
  onClose,
}: {
  to: string;
  userId: string;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const r = await authedFetch("/api/admin/users/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subject, body }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      setOk(true);
      setSubject("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={send}
      className="mt-3 space-y-2 rounded-lg border border-rule bg-surface p-3"
    >
      <p className="text-[11px] text-mute">
        To <span className="font-mono">{to}</span> · reply-to is your admin
        address
      </p>
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        maxLength={200}
        required
        className="w-full rounded-lg border border-rule bg-cream-2 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body — plain text, line breaks preserved"
        rows={5}
        maxLength={20_000}
        required
        className="w-full rounded-lg border border-rule bg-cream-2 px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
      />
      {error && <p className="text-xs text-red">{error}</p>}
      {ok && (
        <p className="text-xs text-success-deep">
          Sent. Audit logged.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center rounded-full border border-rule bg-cream-2 px-3 text-xs font-medium text-ink-soft hover:border-ink hover:text-ink"
        >
          Close
        </button>
        <button
          type="submit"
          disabled={sending || subject.length < 2 || body.length < 4}
          className="inline-flex h-8 items-center rounded-full border border-ink bg-ink px-4 text-xs font-medium text-cream hover:bg-red hover:border-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "off";
}) {
  const cls =
    tone === "ok"
      ? "text-success-deep"
      : tone === "warn"
        ? "text-red"
        : "text-ink";
  return (
    <div className="rounded-lg border border-rule bg-surface px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-mute">
        {label}
      </dt>
      <dd className={`mt-0.5 font-display text-base tabular-nums ${cls}`}>
        {value}
      </dd>
    </div>
  );
}

function MiniTable({
  title,
  columns,
  rows,
  empty,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-mute">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-1.5 text-xs text-mute">{empty}</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-lg border border-rule bg-surface">
          <table className="w-full text-xs">
            <thead className="border-b border-rule bg-cream-2/40">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="px-3 py-2 text-left font-medium uppercase tracking-wider text-mute"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}
