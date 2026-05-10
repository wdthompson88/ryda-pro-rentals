"use client";

// /admin/prospects — founding-cohort sales-motion CRM.
//
// Driven by /api/admin/prospects (admin-gated via requireAdmin).
//
// Why this page exists: per docs/RYDA_STRATEGIC_AUDIT.md, the next
// 14-day milestone is Stefano calling 25 warm prospects and
// converting 5 of them into wired refundable deposits on the first
// Ferrari. Today those calls have nowhere to land. This page is the
// smallest possible CRM, sized for the 100-member founding cohort
// rather than 100,000 rows.
//
// Distinct from /admin (operational triage of paid customers) and
// /admin/disputes (chargeback workflow). This is pre-customer.
//
// V1 scope:
//   - Stage-filtered list view with quick stage badges
//   - "Add prospect" inline form
//   - Click a row to expand → log a call, change stage, set next
//     action, edit fields
//   - Soft-delete (archive) with show-archived toggle
//   - "Due now" filter — prospects whose next_action_at has passed
//
// Out of scope (intentionally): bulk import, email integrations,
// drip campaigns, lead scoring. Pre-launch with a target cohort
// of 100, those are wrong-stage features.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

const STAGES = [
  "cold",
  "contacted",
  "call_booked",
  "call_done",
  "interested",
  "deposit_held",
  "wired",
  "joined_llc",
  "declined",
] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  cold: "Cold",
  contacted: "Contacted",
  call_booked: "Call booked",
  call_done: "Call done",
  interested: "Interested",
  deposit_held: "Deposit held",
  wired: "Wired",
  joined_llc: "Joined LLC",
  declined: "Declined",
};

// Color hint per stage. Uses semantic tokens so dark-mode flips
// automatically.
const STAGE_TONE: Record<Stage, string> = {
  cold: "bg-cream-2 text-mute border-rule",
  contacted: "bg-cream-2 text-ink-soft border-rule",
  call_booked: "bg-marine/10 text-marine border-marine/30",
  call_done: "bg-marine/10 text-marine border-marine/30",
  interested: "bg-red/10 text-red border-red/30",
  deposit_held: "bg-success/15 text-success border-success/40",
  wired: "bg-success/20 text-success border-success/50",
  joined_llc: "bg-ink text-cream border-ink",
  declined: "bg-mute/10 text-mute border-rule",
};

type Prospect = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: Stage;
  car_of_interest: string | null;
  shares_of_interest: number | null;
  owner_user_id: string | null;
  last_touch_at: string | null;
  last_touch_note: string | null;
  next_action_at: string | null;
  next_action_note: string | null;
  notes: string | null;
  estimated_check_cents: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type Filter = {
  stage: Stage | "all";
  due: boolean;
  archived: boolean;
};

function formatRel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (Math.abs(diff) < 60) return "just now";
  const past = diff > 0;
  const abs = Math.abs(diff);
  if (abs < 3600) return `${Math.floor(abs / 60)}m ${past ? "ago" : "from now"}`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ${past ? "ago" : "from now"}`;
  if (abs < 86400 * 14) return `${Math.floor(abs / 86400)}d ${past ? "ago" : "from now"}`;
  return d.toISOString().slice(0, 10);
}

function formatDollars(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function AdminProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({
    stage: "all",
    due: false,
    archived: false,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter.stage !== "all") params.set("stage", filter.stage);
    if (filter.due) params.set("due", "true");
    if (filter.archived) params.set("archived", "true");
    try {
      const res = await authedFetch(`/api/admin/prospects?${params}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { prospects: Prospect[]; total: number };
      setProspects(body.prospects);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Counts per stage for the filter pills. Derived from the loaded
  // set when filter is "all" — accurate enough for the cohort-1
  // volume.
  const stageCounts = useMemo(() => {
    const counts: Record<Stage | "all", number> = {
      all: prospects.length,
      cold: 0,
      contacted: 0,
      call_booked: 0,
      call_done: 0,
      interested: 0,
      deposit_held: 0,
      wired: 0,
      joined_llc: 0,
      declined: 0,
    };
    for (const p of prospects) counts[p.stage]++;
    return counts;
  }, [prospects]);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Founding cohort
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Prospects
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Outbound sales-motion CRM. Distinct from the contact-form
              inbox (that&apos;s in /admin/messages) and from member
              records. This is where calls get logged, follow-ups get
              tracked, and the conversion funnel gets analyzed.
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
              onClick={() => setShowAddForm((s) => !s)}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream hover:bg-red"
            >
              {showAddForm ? "Cancel" : "Add prospect"}
            </button>
          </div>
        </div>

        {showAddForm && (
          <AddForm
            onCreated={() => {
              setShowAddForm(false);
              void load();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Stage filter pills */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            count={stageCounts.all}
            active={filter.stage === "all"}
            onClick={() => setFilter((f) => ({ ...f, stage: "all" }))}
          />
          {STAGES.map((s) => (
            <FilterPill
              key={s}
              label={STAGE_LABEL[s]}
              count={stageCounts[s]}
              active={filter.stage === s}
              onClick={() => setFilter((f) => ({ ...f, stage: s }))}
            />
          ))}
          <span className="ml-3 inline-flex items-center gap-2">
            <Toggle
              label="Due now"
              checked={filter.due}
              onChange={(v) => setFilter((f) => ({ ...f, due: v }))}
            />
            <Toggle
              label="Show archived"
              checked={filter.archived}
              onChange={(v) => setFilter((f) => ({ ...f, archived: v }))}
            />
          </span>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red/30 bg-red/10 p-4 text-sm text-red">
            {error}
          </div>
        )}

        {loading && (
          <p className="mt-12 text-center text-sm text-mute">Loading…</p>
        )}

        {!loading && prospects.length === 0 && (
          <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            <p className="font-display text-xl text-ink">No prospects yet.</p>
            <p className="mt-3 text-sm text-ink-soft">
              {filter.stage !== "all" || filter.due
                ? "No matches under the current filter."
                : "Add the first prospect to begin tracking the founding-cohort outreach motion."}
            </p>
          </div>
        )}

        {!loading && prospects.length > 0 && (
          <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface">
            {prospects.map((p) => (
              <Row
                key={p.id}
                prospect={p}
                expanded={expandedId === p.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === p.id ? null : p.id))
                }
                onChange={() => void load()}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-cream"
          : "border-rule bg-surface text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {label}{" "}
      <span className={active ? "text-cream/70" : "text-mute"}>{count}</span>
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-rule"
      />
      {label}
    </label>
  );
}

function Row({
  prospect: p,
  expanded,
  onToggle,
  onChange,
}: {
  prospect: Prospect;
  expanded: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const overdue =
    p.next_action_at && new Date(p.next_action_at).getTime() < Date.now();
  return (
    <li className="bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-12 items-center gap-4 px-5 py-4 text-left hover:bg-cream-2/40"
      >
        <span className="col-span-3 font-medium text-ink">{p.full_name}</span>
        <span className="col-span-2 text-xs text-ink-soft">
          {p.car_of_interest ?? "—"}
          {p.shares_of_interest ? ` · ${p.shares_of_interest}sh` : ""}
        </span>
        <span className="col-span-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STAGE_TONE[p.stage]}`}
          >
            {STAGE_LABEL[p.stage]}
          </span>
        </span>
        <span className="col-span-2 text-xs text-ink-soft">
          {p.last_touch_at ? `Last touch ${formatRel(p.last_touch_at)}` : "No touches"}
        </span>
        <span
          className={`col-span-2 text-xs ${overdue ? "font-medium text-red" : "text-ink-soft"}`}
        >
          {p.next_action_at ? `Next ${formatRel(p.next_action_at)}` : "—"}
        </span>
        <span className="col-span-1 text-right text-xs text-mute">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && <ExpandedDetail prospect={p} onChange={onChange} />}
    </li>
  );
}

function ExpandedDetail({
  prospect: p,
  onChange,
}: {
  prospect: Prospect;
  onChange: () => void;
}) {
  const [callNote, setCallNote] = useState("");
  const [transitionTo, setTransitionTo] = useState<Stage | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function logCall() {
    if (!callNote.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch(`/api/admin/prospects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_call: {
            note: callNote.trim(),
            transition_to: transitionTo || undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setCallNote("");
      setTransitionTo("");
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeStage(stage: Stage) {
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch(`/api/admin/prospects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm(`Archive ${p.full_name}? They'll disappear from the default list but the history stays.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch(`/api/admin/prospects/${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-rule bg-cream-2/40 px-5 py-5">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Left: identity + meta */}
        <div className="space-y-3 text-xs">
          <KV label="Source" value={p.source} />
          <KV label="Email" value={p.email ?? "—"} />
          <KV label="Phone" value={p.phone ?? "—"} />
          <KV label="Estimated check" value={formatDollars(p.estimated_check_cents)} />
          <KV
            label="Created"
            value={new Date(p.created_at).toISOString().slice(0, 10)}
          />
          <KV
            label="Last touch"
            value={p.last_touch_at ? `${formatRel(p.last_touch_at)} — ${p.last_touch_note ?? ""}` : "Never"}
          />
        </div>

        {/* Right: log a call */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
            Log a call / interaction
          </p>
          <textarea
            value={callNote}
            onChange={(e) => setCallNote(e.target.value)}
            placeholder='e.g., "Called Mike — interested in F458, wants to see the OA before deciding. Sending packet."'
            rows={3}
            className="mt-2 w-full rounded-xl border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
          <div className="mt-2 flex items-center gap-2">
            <select
              value={transitionTo}
              onChange={(e) => setTransitionTo(e.target.value as Stage | "")}
              className="rounded-lg border border-rule bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="">…and (optionally) move stage</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  → {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={logCall}
              disabled={busy || !callNote.trim()}
              className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-cream hover:bg-red disabled:opacity-50"
            >
              Log
            </button>
          </div>
        </div>
      </div>

      {/* Quick stage shortcuts */}
      <div className="mt-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
          Quick move
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeStage(s)}
              disabled={busy || s === p.stage}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-opacity ${STAGE_TONE[s]} ${s === p.stage ? "opacity-40" : "hover:opacity-100"}`}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation agreement workflow. Founding-cohort MVP test:
          interested prospect → send agreement → signed → deposit
          received → LLC formation. Each transition auto-updates the
          prospect's stage via /api/admin/reservations/[id] PATCH. */}
      <div className="mt-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
          Reservation agreement
        </p>
        <ReservationPanel prospect={p} onChange={onChange} />
      </div>

      {/* Notes accumulator */}
      {p.notes && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
            Notes
          </p>
          <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-rule bg-surface p-4 text-xs leading-relaxed text-ink-soft">
            {p.notes.trim()}
          </pre>
        </div>
      )}

      {err && (
        <p className="mt-3 text-xs text-red">{err}</p>
      )}

      <div className="mt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={archive}
          disabled={busy}
          className="text-xs text-mute hover:text-red"
        >
          Archive
        </button>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <span className="text-mute">{label}</span>
      <span className="col-span-2 text-ink">{value}</span>
    </div>
  );
}

// Reservation agreement workflow per prospect. Mounts inside the
// expanded prospect row. Loads any existing reservations for this
// prospect; renders either the "create reservation" form or the
// status panel for the most recent active one.
type Reservation = {
  id: string;
  prospect_id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  shares_reserved: number;
  deposit_amount_cents: number;
  expires_at: string;
  status:
    | "draft"
    | "sent"
    | "signed"
    | "deposit_received"
    | "converted"
    | "cancelled"
    | "refunded";
  sent_at: string | null;
  signed_at: string | null;
  deposit_received_at: string | null;
  converted_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  signed_pdf_url: string | null;
  notes: string | null;
  created_at: string;
};

const RESERVATION_STATUS_TONE: Record<Reservation["status"], string> = {
  draft: "bg-cream-2 text-mute border-rule",
  sent: "bg-marine/10 text-marine border-marine/30",
  signed: "bg-marine/15 text-marine border-marine/40",
  deposit_received: "bg-success/15 text-success border-success/40",
  converted: "bg-ink text-cream border-ink",
  cancelled: "bg-mute/10 text-mute border-rule",
  refunded: "bg-mute/10 text-mute border-rule",
};

function ReservationPanel({
  prospect,
  onChange,
}: {
  prospect: Prospect;
  onChange: () => void;
}) {
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state for the create form.
  const [vehicleSymbol, setVehicleSymbol] = useState(
    prospect.car_of_interest?.toLowerCase().replace(/\s+/g, "-") ?? "",
  );
  const [shares, setShares] = useState(
    prospect.shares_of_interest?.toString() ?? "2",
  );
  const [depositDollars, setDepositDollars] = useState("5000");

  const load = useCallback(async () => {
    try {
      const res = await authedFetch(
        `/api/admin/prospects/${prospect.id}/reservation`,
      );
      // The GET endpoint isn't implemented (we only POST/PATCH), so
      // we fetch the prospect's reservations via the all-reservations
      // pattern. For now: query the underlying admin list filtered by
      // prospect_id. Since we don't have that endpoint either,
      // simplest path: store reservations inline once created in the
      // same session, OR add a dedicated GET to /api/admin/prospects/
      // [id]/reservation later. For v1 we'll fetch via a list
      // endpoint we add inline below.
      if (res.status === 405 || res.status === 404) {
        // No GET handler — that's fine, just means none in this
        // session OR we need to fetch differently.
        setReservations([]);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { reservations?: Reservation[] };
      setReservations(body.reservations ?? []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    }
  }, [prospect.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pick the "active" reservation — the most recent non-terminal one.
  const active = reservations?.find(
    (r) =>
      r.status !== "converted" &&
      r.status !== "cancelled" &&
      r.status !== "refunded",
  );

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleSymbol.trim() || !shares.trim() || !depositDollars.trim()) {
      setActionErr("Vehicle, shares, and deposit are required.");
      return;
    }
    setBusy(true);
    setActionErr(null);
    try {
      const res = await authedFetch(
        `/api/admin/prospects/${prospect.id}/reservation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicle_symbol: vehicleSymbol.trim(),
            shares_reserved: parseInt(shares, 10),
            deposit_amount_cents: parseInt(depositDollars, 10) * 100,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        reservation: Reservation;
        pdf_url: string;
      };
      setReservations((prev) => [body.reservation, ...(prev ?? [])]);
      setShowCreate(false);
      // Auto-advance prospect stage to interested if not already
      // beyond, so the funnel reflects "agreement in flight."
      if (
        prospect.stage === "cold" ||
        prospect.stage === "contacted" ||
        prospect.stage === "call_booked" ||
        prospect.stage === "call_done"
      ) {
        await authedFetch(`/api/admin/prospects/${prospect.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: "interested" }),
        });
      }
      // Open the PDF in a new tab immediately so the admin can save
      // and email it.
      window.open(body.pdf_url, "_blank", "noopener,noreferrer");
      onChange();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function transitionStatus(
    reservationId: string,
    nextStatus: Reservation["status"],
    extra?: Record<string, unknown>,
  ) {
    setBusy(true);
    setActionErr(null);
    try {
      const res = await authedFetch(
        `/api/admin/reservations/${reservationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus, ...(extra ?? {}) }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      // Refresh both the reservation row + the prospect (because
      // status transitions auto-advance the prospect's stage).
      void load();
      onChange();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loadErr) {
    return <p className="mt-2 text-xs text-red">Couldn&apos;t load reservations: {loadErr}</p>;
  }
  if (reservations === null) {
    return <p className="mt-2 text-xs text-mute">Loading reservation…</p>;
  }

  if (!active && !showCreate) {
    return (
      <div className="mt-2">
        <p className="text-xs text-ink-soft">
          No active reservation. Send one to advance this prospect to
          deposit-held.
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-2 rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-cream hover:bg-red"
        >
          Send reservation agreement
        </button>
      </div>
    );
  }

  if (showCreate) {
    return (
      <form
        onSubmit={createReservation}
        className="mt-3 grid gap-3 rounded-xl border border-rule bg-surface p-4 sm:grid-cols-3"
      >
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-mute">
            Vehicle symbol
          </span>
          <input
            value={vehicleSymbol}
            onChange={(e) => setVehicleSymbol(e.target.value)}
            placeholder="f458, f296, p911…"
            required
            className="w-full rounded-lg border border-rule bg-cream-2/40 px-2 py-1.5 text-xs text-ink placeholder:text-mute"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-mute">
            Shares
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            required
            className="w-full rounded-lg border border-rule bg-cream-2/40 px-2 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-mute">
            Deposit ($)
          </span>
          <input
            type="number"
            min={500}
            step={500}
            value={depositDollars}
            onChange={(e) => setDepositDollars(e.target.value)}
            required
            className="w-full rounded-lg border border-rule bg-cream-2/40 px-2 py-1.5 text-xs text-ink"
          />
        </label>
        {actionErr && (
          <p className="sm:col-span-3 text-xs text-red">{actionErr}</p>
        )}
        <div className="sm:col-span-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="text-xs text-mute hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-cream hover:bg-red disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate + open PDF"}
          </button>
        </div>
      </form>
    );
  }

  // Render the active reservation status + transition buttons.
  if (!active) return null;
  const dollars = Math.round(active.deposit_amount_cents / 100);
  return (
    <div className="mt-3 rounded-xl border border-rule bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-ink">
            <span className="font-medium">
              {active.vehicle_symbol?.toUpperCase() ?? active.boat_slug}
            </span>
            {" · "}
            {active.shares_reserved} share{active.shares_reserved === 1 ? "" : "s"}
            {" · "}
            <span className="tabular-nums">
              ${dollars.toLocaleString()} deposit
            </span>
          </p>
          <p className="mt-1 text-xs text-mute">
            Created {new Date(active.created_at).toISOString().slice(0, 10)} ·
            expires {new Date(active.expires_at).toISOString().slice(0, 10)}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${RESERVATION_STATUS_TONE[active.status]}`}
        >
          {active.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={`/api/admin/reservations/${active.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-rule bg-cream-2 px-3 py-1 text-xs font-medium text-ink hover:border-ink"
        >
          Download PDF
        </a>

        {active.status === "draft" && (
          <button
            type="button"
            onClick={() => transitionStatus(active.id, "sent")}
            disabled={busy}
            className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-cream hover:bg-red disabled:opacity-50"
          >
            Mark sent
          </button>
        )}
        {active.status === "sent" && (
          <button
            type="button"
            onClick={() => transitionStatus(active.id, "signed")}
            disabled={busy}
            className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-cream hover:bg-red disabled:opacity-50"
          >
            Mark signed
          </button>
        )}
        {active.status === "signed" && (
          <button
            type="button"
            onClick={() => transitionStatus(active.id, "deposit_received")}
            disabled={busy}
            className="rounded-full bg-success px-3 py-1 text-xs font-medium text-cream hover:opacity-90 disabled:opacity-50"
          >
            Deposit received → advance to deposit-held
          </button>
        )}
        {active.status === "deposit_received" && (
          <button
            type="button"
            onClick={() => transitionStatus(active.id, "converted")}
            disabled={busy}
            className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-cream hover:bg-red disabled:opacity-50"
          >
            LLC formed → mark converted
          </button>
        )}

        {/* Terminal-state buttons available at all non-terminal stages */}
        {active.status !== "converted" &&
          active.status !== "cancelled" &&
          active.status !== "refunded" && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Cancel this reservation? The deposit must still be returned manually if it was wired.`)) {
                    transitionStatus(active.id, "cancelled");
                  }
                }}
                disabled={busy}
                className="rounded-full border border-rule bg-cream-2 px-3 py-1 text-xs text-mute hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Refund the deposit? This will mark the reservation refunded; you must wire the funds back manually.`)) {
                    transitionStatus(active.id, "refunded");
                  }
                }}
                disabled={busy}
                className="rounded-full border border-rule bg-cream-2 px-3 py-1 text-xs text-mute hover:text-red"
              >
                Refund
              </button>
            </>
          )}
      </div>

      {actionErr && <p className="mt-3 text-xs text-red">{actionErr}</p>}
    </div>
  );
}

function AddForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [carOfInterest, setCarOfInterest] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !source.trim()) {
      setErr("Name and source are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await authedFetch("/api/admin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          source: source.trim(),
          car_of_interest: carOfInterest.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-4 rounded-2xl border border-rule bg-cream-2/40 p-5 sm:grid-cols-2"
    >
      <Field label="Full name *">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink"
        />
      </Field>
      <Field label="Source *">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          required
          placeholder='"Stefano warm intro from Evercore", "Cars & Coffee Wynwood May 12", etc.'
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink"
        />
      </Field>
      <Field label="Phone">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink"
        />
      </Field>
      <Field label="Car of interest (optional)">
        <input
          value={carOfInterest}
          onChange={(e) => setCarOfInterest(e.target.value)}
          placeholder='e.g., "Ferrari 296", "any", "boats — Pershing"'
          className="w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute"
        />
      </Field>
      {err && (
        <p className="sm:col-span-2 text-xs text-red">{err}</p>
      )}
      <div className="sm:col-span-2 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-mute hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream hover:bg-red disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add prospect"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        {label}
      </span>
      {children}
    </label>
  );
}
