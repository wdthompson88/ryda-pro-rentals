"use client";

// /admin/inquiries — the rental-first lead pipeline.
//
// Driven by /api/admin/inquiries (admin-gated via requireAdmin).
//
// Why this page exists: rentals are THE product. Every rental
// inquiry submitted through the public site lands in
// rental_inquiries as `new` and is worth real money — operators pay
// RYDA a referral commission on bookings we send them. This page is
// where an admin forwards the lead to the operator (`sent`) and
// records the outcome (`booked` = commission event, `lost`).
//
// Transition graph (enforced server-side in
// /api/admin/inquiries/[id] — booked and lost are terminal):
//   new → sent | lost
//   sent → booked | lost
//
// Payments: for a `sent` row, once the operator confirms availability
// and price off-platform, the admin issues a Stripe payment link here
// (POST /api/admin/inquiries/[id]/payment-link). Checkout is a DIRECT
// charge on the operator's Connect account — the rental price settles
// straight to the operator, RYDA's commission rides along as an
// application fee, and the Connect webhook flips the inquiry to
// `booked` when the customer pays. The Payment column renders only
// when the API includes a payment status for the row (see
// paymentStatus below).
//
// Distinct from /admin/prospects (outbound co-ownership CRM — parked
// with the founding-member waitlist) and from /admin bookings triage
// (paid RYDA-fleet customers). This is inbound rental demand.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { downloadCsv } from "@/components/admin/csv";

const STATUSES = ["new", "sent", "booked", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  sent: "Sent to operator",
  booked: "Booked",
  lost: "Lost",
};

// Color hint per status. Token washes only — new leads read as
// "needs attention" (warn), in-flight as a neutral rule/ink chip
// (matches the member-facing "With operator" chip; marine is the
// boats accent and never mixes into a cars-rental surface),
// closed-won as success, closed-lost as muted.
const STATUS_TONE: Record<Status, string> = {
  new: "bg-warn/15 text-warn-deep border-warn/40",
  sent: "bg-cream-2 text-ink-soft border-rule",
  booked: "bg-success/15 text-success-deep border-success/40",
  lost: "bg-mute/10 text-mute border-rule",
};

// Payment chip tones — pending warn, paid success, expired mute
// (mirrors STATUS_TONE). A status the API grows later that isn't in
// this map falls back to the neutral in-flight chip.
const PAYMENT_TONE: Record<string, string> = {
  pending: "bg-warn/15 text-warn-deep border-warn/40",
  paid: "bg-success/15 text-success-deep border-success/40",
  expired: "bg-mute/10 text-mute border-rule",
  canceled: "bg-mute/10 text-mute border-rule",
};

// Mirrors the server-side ALLOWED_TRANSITIONS map — the buttons only
// offer moves the API will accept.
const NEXT_MOVES: Record<Status, readonly Status[]> = {
  new: ["sent", "lost"],
  sent: ["booked", "lost"],
  booked: [],
  lost: [],
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  vehicle_slug: string;
  vehicle_label: string;
  fleet: "ryda" | "partner";
  partner_name: string | null;
  market: string;
  start_date: string;
  end_date: string;
  message: string | null;
  marketing_opt_in: boolean;
  status: Status;
  created_at: string;
  // Latest rental_payments status for the row, joined in by
  // GET /api/admin/inquiries (pending|paid|expired|canceled; null when
  // no link was ever minted, or pre-migration-0041). The UI tolerates
  // the field being absent/null and simply renders no chip.
  payment_status?: string | null;
};

type Counts = Record<Status, number>;

function fmt(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Inclusive rental span in days (start == end is a 1-day rental,
// matching the public form's endDate >= startDate rule).
function spanDays(start: string, end: string): number {
  const ms =
    Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  if (!Number.isFinite(ms) || ms < 0) return 1;
  return Math.round(ms / 86_400_000) + 1;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [counts, setCounts] = useState<Counts>({
    new: 0,
    sent: 0,
    booked: 0,
    lost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Which row's send-payment-link panel is open. Separate from
  // expandedId so an admin can read the message while filling in the
  // confirmed price.
  const [payPanelId, setPayPanelId] = useState<string | null>(null);

  // `quiet` refreshes rows without unmounting the table — used after
  // creating a payment link so the success panel (with the link the
  // admin may still need to copy) survives the reload.
  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    try {
      const res = await authedFetch(`/api/admin/inquiries?${params}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        inquiries: Inquiry[];
        total: number;
        counts: Counts;
      };
      setInquiries(body.inquiries);
      setCounts(body.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = counts.new + counts.sent + counts.booked + counts.lost;

  async function transition(inquiry: Inquiry, next: Status) {
    // Terminal moves get a confirm — booked locks in the commission
    // event, lost closes the lead. Both are one-way at the API.
    const confirmMsg =
      next === "booked"
        ? `Mark ${inquiry.name}'s ${inquiry.vehicle_label} inquiry as booked? This records the referral-commission event and is terminal.`
        : next === "lost"
          ? `Mark ${inquiry.name}'s ${inquiry.vehicle_label} inquiry as lost? This is terminal — the row stays for conversion analysis but leaves the active pipeline.${
              inquiry.payment_status === "pending"
                ? " A live payment link is outstanding — it will be voided so the customer can no longer pay."
                : ""
            }`
          : null;
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setBusyId(inquiry.id);
    try {
      const res = await authedFetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    // Exports the current view (respects the status filter).
    downloadCsv({
      filename: "ryda-rental-inquiries.csv",
      columns: [
        "id",
        "created_at",
        "status",
        "name",
        "email",
        "phone",
        "vehicle_label",
        "vehicle_slug",
        "fleet",
        "partner_name",
        "start_date",
        "end_date",
        "days",
        "marketing_opt_in",
        "payment_status",
        "message",
      ],
      rows: inquiries.map((i) => [
        i.id,
        i.created_at,
        i.status,
        i.name,
        i.email,
        i.phone ?? "",
        i.vehicle_label,
        i.vehicle_slug,
        i.fleet,
        i.partner_name ?? "",
        i.start_date,
        i.end_date,
        spanDays(i.start_date, i.end_date),
        i.marketing_opt_in ? "yes" : "no",
        i.payment_status ?? "",
        i.message ?? "",
      ]),
    });
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · Rental pipeline
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Inquiries
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Every rental request from the public site lands here as{" "}
              <em>new</em>. Forward it to the operator (<em>sent</em>), then
              record the outcome — <em>booked</em> is the
              referral-commission event. Booked and lost are terminal.
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
              onClick={exportCsv}
              disabled={inquiries.length === 0}
              className="rounded-full border border-rule bg-surface px-5 py-2 text-sm font-medium text-ink hover:border-ink disabled:opacity-50"
            >
              Export CSV ↓
            </button>
          </div>
        </div>

        {/* Pipeline stat strip — whole-table totals, independent of
            the active filter. */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
          <Stat label="Total" value={total} cls="text-ink" />
          <Stat
            label="New"
            value={counts.new}
            cls={counts.new > 0 ? "text-warn-deep" : "text-mute"}
          />
          <Stat
            label="Sent to operator"
            value={counts.sent}
            cls={counts.sent > 0 ? "text-ink" : "text-mute"}
          />
          <Stat
            label="Booked"
            value={counts.booked}
            cls={counts.booked > 0 ? "text-success-deep" : "text-mute"}
          />
          <Stat label="Lost" value={counts.lost} cls="text-mute" />
        </section>

        {/* Status filter pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            count={total}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          {STATUSES.map((s) => (
            <FilterPill
              key={s}
              label={STATUS_LABEL[s]}
              count={counts[s]}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red/30 bg-red/10 p-4 text-sm text-red">
            {error}
          </div>
        )}

        {loading && (
          <p className="mt-12 text-center text-sm text-mute">Loading…</p>
        )}

        {!loading && !error && inquiries.length === 0 && (
          <div className="mt-12 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            <p className="font-display text-xl text-ink">No inquiries yet.</p>
            <p className="mt-3 text-sm text-ink-soft">
              {statusFilter !== "all"
                ? "No inquiries under the current filter."
                : "Rental requests from the public site will appear here the moment they're submitted."}
            </p>
          </div>
        )}

        {!loading && inquiries.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-rule bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-rule bg-cream-2/40">
                <tr>
                  {/* expand-toggle column */}
                  <th className="w-8 px-3 py-3" />
                  {[
                    "Created",
                    "Lead",
                    "Vehicle",
                    "Operator",
                    "Dates",
                    "Opt-in",
                    "Status",
                    "Payment",
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
                {inquiries.map((i) => (
                  <InquiryRow
                    key={i.id}
                    inquiry={i}
                    expanded={expandedId === i.id}
                    onToggle={() =>
                      setExpandedId((cur) => (cur === i.id ? null : i.id))
                    }
                    busy={busyId === i.id}
                    onTransition={(next) => void transition(i, next)}
                    payOpen={payPanelId === i.id}
                    onTogglePay={() =>
                      setPayPanelId((cur) => (cur === i.id ? null : i.id))
                    }
                    onPaymentCreated={() => void load({ quiet: true })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
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

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const MOVE_LABEL: Record<Status, string> = {
  new: "New", // never a move target — new is entry-only
  sent: "Mark sent",
  booked: "Booked",
  lost: "Lost",
};

function PaymentPill({ status }: { status: string }) {
  const tone = PAYMENT_TONE[status] ?? "bg-cream-2 text-ink-soft border-rule";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone}`}
    >
      {status}
    </span>
  );
}

function InquiryRow({
  inquiry: i,
  expanded,
  onToggle,
  busy,
  onTransition,
  payOpen,
  onTogglePay,
  onPaymentCreated,
}: {
  inquiry: Inquiry;
  expanded: boolean;
  onToggle: () => void;
  busy: boolean;
  onTransition: (next: Status) => void;
  payOpen: boolean;
  onTogglePay: () => void;
  onPaymentCreated: () => void;
}) {
  const moves = NEXT_MOVES[i.status];
  return (
    <>
      <tr className="hover:bg-cream-2/40">
        <td className="w-8 px-3 py-3 align-top">
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            aria-expanded={expanded}
            className="text-xs text-mute hover:text-ink"
          >
            {expanded ? "▾" : "▸"}
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-ink-soft">
          {fmt(i.created_at)}
        </td>
        <td className="px-4 py-3 align-top">
          <p className="font-medium text-ink">{i.name}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {i.email}
            {i.phone ? ` · ${i.phone}` : ""}
          </p>
        </td>
        <td className="px-4 py-3 align-top">
          <p className="text-ink">{i.vehicle_label}</p>
          <p className="mt-0.5 text-xs text-mute">
            {i.fleet === "partner" ? "Partner fleet" : "RYDA fleet"}
          </p>
        </td>
        <td className="px-4 py-3 align-top text-xs text-ink-soft">
          {/* Operator identity is admin-only — the public site only
              ever says "a vetted Miami operator". */}
          {i.partner_name ?? (i.fleet === "ryda" ? "RYDA" : "—")}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-ink-soft">
          {i.start_date} → {i.end_date}
          <span className="ml-1.5 text-mute">
            · {spanDays(i.start_date, i.end_date)}d
          </span>
        </td>
        <td className="px-4 py-3 align-top text-xs">
          {i.marketing_opt_in ? (
            <span className="text-success-deep">Yes</span>
          ) : (
            <span className="text-mute">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          <StatusPill status={i.status} />
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          {/* Rendered only when the API includes the joined payment
              status — absent field means no chip, not an error. */}
          {i.payment_status ? <PaymentPill status={i.payment_status} /> : null}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          {moves.length === 0 && i.status !== "sent" ? (
            <span className="text-xs text-mute">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {/* Payment links only exist on the partner direct-charge
                  rail — the API hard-409s inquiries without partner
                  attribution (RYDA fleet), so don't offer the button
                  where it can only fail. */}
              {i.status === "sent" && i.fleet === "partner" && i.partner_name && (
                <button
                  type="button"
                  onClick={onTogglePay}
                  disabled={busy}
                  className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    payOpen
                      ? "border-red bg-red text-cream"
                      : "border-red/40 text-red hover:bg-red hover:text-cream"
                  }`}
                >
                  {payOpen ? "Close payment" : "Send payment link"}
                </button>
              )}
              {moves.map((next) => (
                <button
                  key={next}
                  type="button"
                  onClick={() => onTransition(next)}
                  disabled={busy}
                  className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    next === "lost"
                      ? "border-rule text-mute hover:border-ink hover:text-ink"
                      : next === "booked"
                        ? "border-success/40 text-success-deep hover:bg-success hover:text-cream"
                        : "border-rule text-ink-soft hover:border-ink hover:text-ink"
                  }`}
                >
                  {busy ? "…" : MOVE_LABEL[next]}
                </button>
              ))}
            </div>
          )}
        </td>
      </tr>

      {payOpen && (
        <tr>
          <td colSpan={10} className="bg-cream-2/40 px-6 py-4">
            <PaymentLinkPanel inquiry={i} onCreated={onPaymentCreated} />
          </td>
        </tr>
      )}

      {expanded && (
        <tr>
          <td colSpan={10} className="bg-cream-2/40 px-6 py-4">
            <div className="grid gap-4 text-xs sm:grid-cols-2">
              <div className="space-y-2">
                <KV label="Market" value={i.market} />
                <KV label="Vehicle slug" value={i.vehicle_slug} />
                <KV
                  label="Received"
                  value={new Date(i.created_at).toISOString()}
                />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
                  Message
                </p>
                {i.message ? (
                  <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-ink-soft">
                    {i.message}
                  </p>
                ) : (
                  <p className="mt-1.5 text-mute">No message left.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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

// Inline send-payment-link panel for a `sent` row. The admin enters
// the price the operator confirmed off-platform; the API creates a
// Checkout Session as a DIRECT charge on the operator's Connect
// account (RYDA commission = application fee) and emails the link to
// the customer. The link is also shown here for manual follow-up.
function PaymentLinkPanel({
  inquiry: i,
  onCreated,
}: {
  inquiry: Inquiry;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    emailed: boolean;
    deduped: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const url = result?.url ?? null;

  // Dollars in the UI, integer cents on the wire — matches the
  // *_cents convention everywhere else. Fee math stays server-side
  // in fees.ts; the panel never computes the commission. The
  // [$50, $100,000] bound mirrors the API's MIN/MAX_AMOUNT_CENTS
  // rails so the panel never submits a value the server is
  // guaranteed to refuse.
  const MIN_USD = 50;
  const MAX_USD = 100_000;
  const cents = Math.round(Number(amount) * 100);
  const valid =
    amount.trim() !== "" &&
    Number.isFinite(cents) &&
    cents >= MIN_USD * 100 &&
    cents <= MAX_USD * 100;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(
        `/api/admin/inquiries/${i.id}/payment-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: cents,
            ...(note.trim() ? { note: note.trim() } : {}),
          }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        emailed?: boolean;
        deduped?: boolean;
        error?: string;
      };
      if (!res.ok) {
        // Surface the API's message verbatim — the onboarding-missing
        // and paused cases get a Partners link appended below.
        throw new Error(
          body.error ||
            (res.status === 503
              ? "Stripe not configured."
              : `HTTP ${res.status}`),
        );
      }
      if (typeof body.url !== "string" || !body.url) {
        throw new Error("Link created but the API returned no URL.");
      }
      setResult({
        url: body.url,
        emailed: body.emailed === true,
        deduped: body.deduped === true,
      });
      onCreated(); // quiet refresh — Payment chip flips to pending
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mute">
        Send payment link
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
        Checkout is created on the operator&apos;s Stripe account — the
        rental price settles straight to them and RYDA&apos;s commission is
        taken automatically. Enter the price the operator confirmed for{" "}
        {i.vehicle_label}, {i.start_date} → {i.end_date}.
      </p>

      <form
        onSubmit={submit}
        className="mt-3 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1 text-xs text-mute">
          Amount (USD, $50 – $100,000)
          <input
            type="number"
            min="50"
            max="100000"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2500.00"
            className="w-36 rounded-lg border border-rule bg-surface px-3 py-2 text-sm tabular-nums text-ink placeholder:text-mute focus:border-ink focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          Note (optional, shown on the Checkout line item)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Incl. delivery to Miami Beach"
            className="w-72 rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={!valid || busy}
          className="rounded-full bg-red px-5 py-2.5 text-sm font-medium text-cream hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create link + email customer"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-xs text-red">
          {error}
          {/onboard|paused/i.test(error) && (
            <>
              {" "}
              —{" "}
              <Link
                href="/admin/partners"
                className="underline underline-offset-2 hover:text-red-deep"
              >
                manage the operator in Partners
              </Link>
              .
            </>
          )}
        </p>
      )}

      {url && result && (
        <div
          className={`mt-3 rounded-xl border p-3 ${
            result.emailed
              ? "border-success/40 bg-success/10"
              : "border-warn/40 bg-warn/10"
          }`}
        >
          {/* The API reports exactly what happened — never claim an
              email went out when it didn't (emailed:false) or when an
              existing link was reused without sending one (deduped). */}
          {result.deduped ? (
            <p className="text-xs font-medium text-warn-deep">
              A live payment link already existed for this inquiry — reusing
              it. No new email was sent; copy the link below if the customer
              needs it again.
            </p>
          ) : result.emailed ? (
            <p className="text-xs font-medium text-success-deep">
              Payment link created and emailed to {i.email}.
            </p>
          ) : (
            <p className="text-xs font-medium text-warn-deep">
              Payment link created, but the email to {i.email} could NOT be
              sent — copy the link below and send it manually.
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs text-ink"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(url)
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
        </div>
      )}
    </div>
  );
}
