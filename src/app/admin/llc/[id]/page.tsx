"use client";

// /admin/llc/[id] — single LLC formation detail + status timeline.
//
// Polls the GET /api/admin/llc list filtered by id (no per-id route
// yet; can add later). Shows the lifecycle timeline + EIN +
// registered agent + recent webhook events.

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";

type Row = {
  id: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  llc_name: string;
  state_of_formation: string;
  formation_provider: string;
  provider_id: string | null;
  formation_status:
    | "draft"
    | "submitted"
    | "filed"
    | "approved"
    | "completed"
    | "failed";
  ein: string | null;
  registered_agent_name: string | null;
  registered_agent_address: Record<string, string> | null;
  formation_date: string | null;
  formation_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_ORDER: Row["formation_status"][] = [
  "draft",
  "submitted",
  "filed",
  "approved",
  "completed",
];

export default function LLCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll every 4s while status isn't terminal so the UI reflects
  // mock-mode auto-advance + real-mode webhook updates.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      try {
        const res = await authedFetch("/api/admin/llc");
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { rows: Row[] };
        const found = json.rows.find((r) => r.id === id);
        if (cancelled) return;
        if (!found) {
          setError("LLC not found");
          return;
        }
        setRow(found);
        // Re-poll if still in progress.
        if (
          found.formation_status !== "completed" &&
          found.formation_status !== "failed"
        ) {
          timer = setTimeout(fetchOnce, 4_000);
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
        <Link
          href="/admin/llc"
          className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
        >
          ← Back to LLCs
        </Link>

        {error && (
          <div className="mt-6 rounded-xl border border-red/40 bg-red/5 p-4 text-sm text-ink">
            {error}
          </div>
        )}

        {!row && !error && (
          <p className="mt-8 text-sm text-mute">Loading...</p>
        )}

        {row && (
          <div className="mt-6 space-y-8">
            {/* Header */}
            <div>
              <h1 className="font-display text-4xl text-ink">{row.llc_name}</h1>
              <p className="mt-2 text-sm text-ink-soft">
                {row.state_of_formation} · {row.vehicle_symbol ?? row.boat_slug}{" "}
                · {row.formation_provider}
              </p>
            </div>

            {/* Lifecycle timeline */}
            <section className="rounded-2xl border border-rule bg-surface p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
                Lifecycle
              </p>
              <div className="mt-5 grid grid-cols-5 gap-3">
                {STATUS_ORDER.map((s, i) => {
                  const currentIdx = STATUS_ORDER.indexOf(row.formation_status);
                  const failed = row.formation_status === "failed";
                  const reached = i <= currentIdx && !failed;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={s} className="text-center">
                      <span
                        className={`mx-auto block h-2 w-2 rounded-full ${
                          failed
                            ? "bg-red"
                            : reached
                              ? "bg-success-deep"
                              : "bg-rule"
                        }`}
                      />
                      <p
                        className={`mt-2 text-[11px] font-medium uppercase tracking-wider ${
                          isCurrent
                            ? "text-ink"
                            : reached
                              ? "text-ink-soft"
                              : "text-mute"
                        }`}
                      >
                        {s}
                      </p>
                    </div>
                  );
                })}
              </div>
              {row.formation_status === "failed" && (
                <p className="mt-4 text-xs text-red">
                  Formation failed at the provider. Check Firstbase dashboard
                  for details and retry from /admin/llc/new with a new
                  idempotency key.
                </p>
              )}
            </section>

            {/* Identity facts */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Fact
                label="EIN"
                value={row.ein ?? "Pending"}
                pending={!row.ein}
              />
              <Fact
                label="Provider ID"
                value={row.provider_id ?? "—"}
                mono
              />
              <Fact
                label="State of formation"
                value={row.state_of_formation}
              />
              <Fact
                label="Formation date"
                value={row.formation_date ?? "Pending"}
                pending={!row.formation_date}
              />
              <Fact
                label="Registered agent"
                value={row.registered_agent_name ?? "Pending"}
                pending={!row.registered_agent_name}
              />
              <Fact
                label="Provider"
                value={row.formation_provider}
              />
            </section>

            {/* Registered agent address */}
            {row.registered_agent_address && (
              <section className="rounded-2xl border border-rule bg-cream-2/40 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-mute">
                  Registered agent address
                </p>
                <p className="mt-2 text-sm text-ink">
                  {row.registered_agent_address.line1}
                  {row.registered_agent_address.line2 ? (
                    <>
                      <br />
                      {row.registered_agent_address.line2}
                    </>
                  ) : null}
                  <br />
                  {row.registered_agent_address.city},{" "}
                  {row.registered_agent_address.state}{" "}
                  {row.registered_agent_address.postalCode}
                </p>
              </section>
            )}

            {/* Audit timestamps */}
            <section className="rounded-xl border border-rule p-4 text-xs text-mute">
              <p>
                Created {new Date(row.created_at).toLocaleString()} · Updated{" "}
                {new Date(row.updated_at).toLocaleString()}
                {row.formation_completed_at && (
                  <>
                    {" "}
                    · Completed{" "}
                    {new Date(row.formation_completed_at).toLocaleString()}
                  </>
                )}
              </p>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Fact({
  label,
  value,
  pending,
  mono,
}: {
  label: string;
  value: string;
  pending?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${pending ? "italic text-mute" : "text-ink"} ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
