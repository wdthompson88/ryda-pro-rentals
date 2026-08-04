"use client";

// /account/transfers — index of incoming + outgoing share-transfer
// rows for the signed-in member. RLS scopes the query to:
//   - rows where from_user_id = auth.uid() (outgoing)
//   - rows where to_user_id = auth.uid() OR lower(to_user_email) =
//     lower(jwt.email) (incoming)
//
// One open outgoing transfer per holding is enforced at the DB
// level; we don't need to dedupe here. Cancel button on outgoing
// rows hits /api/share-transfer/[id]/cancel.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

type TransferRow = {
  id: string;
  from_user_id: string;
  to_user_id: string | null;
  to_user_email: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  shares: number;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

function assetLabel(t: Pick<TransferRow, "vehicle_symbol" | "boat_slug">): string {
  if (t.vehicle_symbol) {
    const v = VEHICLES.find((x) => x.symbol === t.vehicle_symbol);
    return v ? `${v.year} ${v.name}` : `RYDA ${t.vehicle_symbol}`;
  }
  if (t.boat_slug) {
    const b = BOATS.find((x) => x.slug === t.boat_slug);
    return b ? `${b.year} ${b.name}` : `RYDA ${t.boat_slug.toUpperCase()}`;
  }
  return "RYDA share";
}

export default function TransfersIndexPage() {
  const [outgoing, setOutgoing] = useState<TransferRow[]>([]);
  const [incoming, setIncoming] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const userId = userData.user.id;
    const userEmail = (userData.user.email ?? "").toLowerCase();

    const [out, inc] = await Promise.all([
      supabase
        .from("share_transfers")
        .select(
          "id, from_user_id, to_user_id, to_user_email, vehicle_symbol, boat_slug, shares, status, expires_at, created_at, updated_at",
        )
        .eq("from_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("share_transfers")
        .select(
          "id, from_user_id, to_user_id, to_user_email, vehicle_symbol, boat_slug, shares, status, expires_at, created_at, updated_at",
        )
        .or(`to_user_id.eq.${userId},to_user_email.eq.${userEmail}`)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setOutgoing((out.data as TransferRow[]) ?? []);
    setIncoming((inc.data as TransferRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function cancel(id: string) {
    if (canceling) return;
    setCanceling(id);
    setError(null);
    try {
      const res = await authedFetch(`/api/share-transfer/${id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Cancel failed (${res.status}).`);
      }
      // Refresh list.
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setCanceling(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Share transfers
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Move shares between members.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Per the Operating Agreement: 12-month minimum hold, recipient must
          have verified identity, and RYDA legal acknowledges every transfer
          before it completes. Open one transfer per share at a time.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </p>
      )}

      <Section title="Incoming">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : incoming.length === 0 ? (
          <Empty>
            No incoming transfers. If a current member sends one, the link
            from the email lands here.
          </Empty>
        ) : (
          <ul className="divide-y divide-rule">
            {incoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {assetLabel(t)} · {t.shares} share
                    {t.shares > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-mute">
                    From{" "}
                    <code className="font-mono">
                      {t.from_user_id.slice(0, 8)}
                    </code>{" "}
                    · {pillFor(t.status)} ·{" "}
                    {t.status === "requested" ? "expires " : "updated "}
                    {fmt(t.status === "requested" ? t.expires_at : t.updated_at)}
                  </p>
                </div>
                <Link
                  href={`/account/transfers/${t.id}`}
                  className="text-xs font-medium text-red hover:text-red-deep"
                >
                  {t.status === "requested" ? "Review →" : "Open →"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Outgoing">
        {loading ? (
          <Empty>Loading…</Empty>
        ) : outgoing.length === 0 ? (
          <Empty>
            No outgoing transfers. Initiate one from{" "}
            <Link
              href="/account/membership"
              className="text-red hover:text-red-deep"
            >
              your membership page
            </Link>{" "}
            once you've held a share for at least 12 months.
          </Empty>
        ) : (
          <ul className="divide-y divide-rule">
            {outgoing.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {assetLabel(t)} · {t.shares} share
                    {t.shares > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-mute">
                    To <strong>{t.to_user_email}</strong> · {pillFor(t.status)}{" "}
                    ·{" "}
                    {t.status === "requested" ? "expires " : "updated "}
                    {fmt(t.status === "requested" ? t.expires_at : t.updated_at)}
                  </p>
                </div>
                {t.status === "requested" ? (
                  <button
                    type="button"
                    onClick={() => cancel(t.id)}
                    disabled={canceling !== null}
                    className="text-xs font-medium text-ink-soft hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {canceling === t.id ? "Canceling…" : "Cancel"}
                  </button>
                ) : (
                  <span className="text-xs text-mute">No action</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ── view primitives ────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-rule bg-cream-2/40 p-5 text-center text-sm text-ink-soft">
      {children}
    </div>
  );
}

function pillFor(status: string) {
  const tone =
    status === "completed"
      ? "ok"
      : status === "rejected" || status === "expired"
        ? "warn"
        : status === "requested"
          ? "info"
          : status === "pending_ryda_review" || status === "accepted"
            ? "info"
            : "off";
  const cls =
    tone === "ok"
      ? "bg-success/10 text-success-deep"
      : tone === "warn"
        ? "bg-red/10 text-red"
        : tone === "info"
          ? "bg-warn/15 text-warn-deep"
          : "bg-mute/15 text-mute";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function fmt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
