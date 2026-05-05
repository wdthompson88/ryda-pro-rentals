"use client";

// /admin/llc — list of all LLC formations RYDA has triggered. Shows
// vendor mode banner (mock vs sandbox vs live) so operators can see
// at a glance whether they're staging or about to spend real $.
//
// Same gating pattern as /admin: client checks user, server route
// gates by app_metadata.role === 'admin'. Non-admins see an empty
// state; no data leaks because the API 403s.

import { useEffect, useState } from "react";
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
  formation_date: string | null;
  formation_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Response = {
  rows: Row[];
  adapter: { provider: string; mode: "live" | "sandbox" | "mock" };
};

export default function LLCAdminList() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/admin/llc");
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as Response;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Admin · LLC formations
            </p>
            <h1 className="mt-2 font-display text-4xl text-ink">
              Single-purpose LLC ops
            </h1>
          </div>
          <Link
            href="/admin/llc/new"
            className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-red"
          >
            Form new LLC →
          </Link>
        </div>

        {data && <ModeBanner mode={data.adapter.mode} provider={data.adapter.provider} />}

        {error && (
          <div className="mt-6 rounded-xl border border-red/40 bg-red/5 p-4 text-sm text-ink">
            {error}
          </div>
        )}

        {!data && !error && (
          <p className="mt-8 text-sm text-mute">Loading...</p>
        )}

        {data && data.rows.length === 0 && (
          <div className="mt-10 rounded-2xl border border-rule bg-cream-2/40 p-12 text-center">
            <p className="font-display text-2xl text-ink">No LLCs yet</p>
            <p className="mt-2 text-sm text-mute">
              Click &quot;Form new LLC&quot; to spin up the first single-purpose
              entity for a vehicle or boat.
            </p>
          </div>
        )}

        {data && data.rows.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-rule">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-rule bg-cream-2/40 text-xs uppercase tracking-[0.14em] text-mute">
                <tr>
                  <Th>LLC name</Th>
                  <Th>Asset</Th>
                  <Th>State</Th>
                  <Th>Status</Th>
                  <Th>EIN</Th>
                  <Th>Provider</Th>
                  <Th>Created</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-rule/50 last:border-b-0 hover:bg-cream-2/30"
                  >
                    <Td>
                      <span className="font-medium text-ink">{r.llc_name}</span>
                    </Td>
                    <Td>{r.vehicle_symbol ?? r.boat_slug ?? "—"}</Td>
                    <Td>{r.state_of_formation}</Td>
                    <Td>
                      <StatusPill status={r.formation_status} />
                    </Td>
                    <Td>
                      <code className="text-[11px]">{r.ein ?? "—"}</code>
                    </Td>
                    <Td>
                      {r.formation_provider}
                      {r.provider_id && (
                        <span className="ml-2 text-[10px] text-mute">
                          {r.provider_id.slice(0, 12)}...
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-ink-soft">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/llc/${r.id}`}
                        className="text-xs font-medium text-red hover:underline"
                      >
                        Open →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function ModeBanner({
  mode,
  provider,
}: {
  mode: "live" | "sandbox" | "mock";
  provider: string;
}) {
  const styles = {
    live: "border-red/50 bg-red/10 text-ink",
    sandbox: "border-marine/50 bg-marine/10 text-ink",
    mock: "border-rule bg-cream-2 text-ink-soft",
  };
  const messages = {
    live: `LIVE MODE · ${provider} · Real LLC formations cost $399 + state fees per request.`,
    sandbox: `SANDBOX MODE · ${provider} · Free, fake state filings. Safe to experiment.`,
    mock: `MOCK MODE · No FIRSTBASE_API_KEY in env. Formations return mocked data without any network call.`,
  };
  return (
    <div className={`mt-6 rounded-xl border p-4 text-sm ${styles[mode]}`}>
      <p className="font-medium">{messages[mode]}</p>
    </div>
  );
}

function StatusPill({ status }: { status: Row["formation_status"] }) {
  const classes: Record<Row["formation_status"], string> = {
    draft: "bg-rule/40 text-mute",
    submitted: "bg-marine/15 text-marine",
    filed: "bg-marine/15 text-marine",
    approved: "bg-success/15 text-success-deep",
    completed: "bg-success/20 text-success-deep",
    failed: "bg-red/15 text-red",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}
