"use client";

// /account/requests — the member's rental-request history, backed by
// GET /api/rental-inquiry (session-gated; own rows only, newest first).
// Renders inside the shared /account layout (sidebar + auth gate), so
// this page only worries about the list itself.
//
// Status chips map DB pipeline states to member-honest labels:
//   new    → "Sent"           (we have it, routing to an operator)
//   sent   → "With operator"  (a vetted Miami operator is on it)
//   booked → "Booked"         (commission earned — the model working)
//   lost   → "Closed"         (didn't convert; keep it quiet, not red)

import Link from "next/link";
import { useAuthStatus } from "@/lib/use-auth-status";
import {
  useRentalProfile,
  type RentalInquiry,
} from "@/lib/use-rental-profile";

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  new: { label: "Sent", cls: "bg-warn/15 text-warn-deep" },
  sent: { label: "With operator", cls: "border border-rule bg-cream-2 text-ink-soft" },
  booked: { label: "Booked", cls: "bg-success/15 text-success-deep" },
  lost: { label: "Closed", cls: "bg-cream-2 text-mute" },
};

function chipFor(status: string) {
  // Unknown status (future pipeline states) degrades to the neutral
  // chip with the raw label rather than crashing or hiding the row.
  return (
    STATUS_CHIP[status] ?? {
      label: status,
      cls: "border border-rule bg-cream-2 text-ink-soft",
    }
  );
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function prettyTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RequestsPage() {
  const { status: authStatus } = useAuthStatus();
  // The layout already gates auth, but authStatus starts as 'loading';
  // only fire the fetch once we know a session exists.
  const { loading, inquiries, error, refresh } = useRentalProfile(
    authStatus === "authed",
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Rental requests
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          One request. A named operator. The keys.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Every request you&apos;ve sent and where it stands. A vetted Miami
          operator replies directly — your price is always the operator&apos;s
          price.
        </p>
      </header>

      {authStatus === "loading" || loading ? (
        <p className="text-sm text-mute">Loading your requests…</p>
      ) : error ? (
        <div className="rounded-2xl border border-rule bg-surface p-5">
          <p className="text-sm text-ink-soft">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Try again
          </button>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-2xl border border-rule bg-cream-2 px-8 py-10">
          <p className="font-display text-2xl text-ink">No requests yet.</p>
          <p className="mt-3 max-w-md text-sm text-ink-soft">
            Miami&apos;s most-wanted exotics are one request away — no card, no
            payment, an operator replies directly.
          </p>
          {/* / is the canonical rental grid — /rent only 308s there. */}
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep"
          >
            Browse the fleet →
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <RequestCard key={q.id} inquiry={q} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ inquiry }: { inquiry: RentalInquiry }) {
  const chip = chipFor(inquiry.status);
  return (
    <li className="rounded-2xl border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl text-ink leading-tight">
            {inquiry.vehicle_label}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {prettyDate(inquiry.start_date)} – {prettyDate(inquiry.end_date)}
            {inquiry.market ? ` · ${inquiry.market}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${chip.cls}`}
        >
          {chip.label}
        </span>
      </div>
      {inquiry.message ? (
        <p className="mt-3 border-t border-rule pt-3 text-sm leading-relaxed text-ink-soft">
          {inquiry.message}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-mute">
        Sent {prettyTimestamp(inquiry.created_at)}
      </p>
    </li>
  );
}
