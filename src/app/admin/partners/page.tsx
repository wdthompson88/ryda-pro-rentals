"use client";

// /admin/partners — Fleet Partner Program review queue.
//
// Roster of partner_accounts with approve / suspend / reinstate
// actions. Driven by /api/admin/partners (requireAdmin); every status
// change is audit-logged. Like the rest of the admin console, this
// page is a convenience shell — the API is the gate, so a non-admin
// just sees the 403 empty state.
//
// Degrades cleanly before migration 0038 is applied: the select error
// for a missing relation renders as a "run migration 0038" hint
// instead of a scary failure.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { useActionModal } from "@/components/admin/action-modal";
import type { PartnerAccount, PartnerStatus } from "@/lib/partner";

// Supabase's error text when the relation is missing — raw Postgres
// 42P01 or PostgREST's schema-cache variant.
const MISSING_TABLE_RE = /does not exist|42P01|schema cache/i;

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationHint, setMigrationHint] = useState(false);

  const { open: openModal, modal } = useActionModal();

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setError(null);
    setMigrationHint(false);
    try {
      const res = await authedFetch("/api/admin/partners");
      const body = (await res.json().catch(() => ({}))) as {
        partners?: PartnerAccount[];
        error?: string;
      };
      if (res.status === 401) throw new Error("Sign in required.");
      if (res.status === 403) {
        throw new Error(
          "Your account doesn't have admin access. Ask another admin to flip your role.",
        );
      }
      if (!res.ok) {
        if (body.error && MISSING_TABLE_RE.test(body.error)) {
          setMigrationHint(true);
          setPartners([]);
          return;
        }
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setPartners(body.partners ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(p: PartnerAccount, to: PartnerStatus) {
    const verbs: Record<string, { title: string; message: string; confirm: string; tone?: "danger" }> =
      {
        approved: {
          title: p.status === "suspended" ? "Reinstate partner" : "Approve partner",
          message: `${p.company_name} unlocks the partner dashboard and moves to listing setup. They see the change immediately.`,
          confirm: p.status === "suspended" ? "Reinstate" : "Approve",
        },
        suspended: {
          title: p.status === "pending" ? "Decline application" : "Suspend partner",
          message: `${p.company_name}'s dashboard shows a paused notice with your note. They keep account access.`,
          confirm: p.status === "pending" ? "Decline" : "Suspend",
          tone: "danger",
        },
      };
    const v = verbs[to];
    const res = await openModal({
      title: v.title,
      message: v.message,
      confirmLabel: v.confirm,
      tone: v.tone,
      noteRequired: to === "suspended",
    });
    if (!res.confirmed) return;
    try {
      const r = await authedFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: p.user_id, status: to, note: res.note }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Failed (${r.status}).`);
      }
      await load({ quiet: true });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Action failed.");
    }
  }

  const pending = partners.filter((p) => p.status === "pending").length;
  const approved = partners.filter((p) => p.status === "approved").length;
  const suspended = partners.length - pending - approved;

  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Admin · Fleet Partner Program
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Partners.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Applications from /signup?as=partner and the /partner apply
            form. Approving unlocks the partner dashboard; suspending
            pauses it with a note. Every change lands in{" "}
            <Link href="/admin/audit" className="text-marine hover:text-marine-deep">
              audit
            </Link>
            .
          </p>
          <div className="mt-6">
            <Link
              href="/admin"
              className="text-xs font-medium text-ink-soft hover:text-ink"
            >
              ← Back to admin
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Stat label="Partners" value={partners.length} cls="text-ink" />
          <Stat
            label="Pending review"
            value={pending}
            cls={pending > 0 ? "text-red" : "text-mute"}
          />
          <Stat
            label="Approved"
            value={approved}
            cls={approved > 0 ? "text-success-deep" : "text-mute"}
          />
          <Stat label="Suspended" value={suspended} cls="text-mute" />
        </section>

        {loading && <p className="mt-12 text-sm text-mute">Loading…</p>}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red/40 bg-red/5 p-6">
            <p className="text-sm text-red">{error}</p>
          </div>
        )}

        {!loading && migrationHint && (
          <div className="mt-8 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            <p className="font-display text-xl text-ink">
              Partner accounts table missing.
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Run migration <code className="text-ink">0038</code> against
              this environment, then reload. Applying migrations requires
              operator approval — see AGENTS.md.
            </p>
          </div>
        )}

        {!loading && !error && !migrationHint && partners.length === 0 && (
          <div className="mt-8 rounded-2xl border border-rule bg-cream-2/50 p-12 text-center">
            <p className="font-display text-xl text-ink">No applications yet.</p>
            <p className="mt-3 text-sm text-ink-soft">
              Partner signups land here the first time the applicant
              opens their dashboard.
            </p>
          </div>
        )}

        {!loading && !error && partners.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-rule bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-rule bg-cream-2/40">
                <tr>
                  {["Company", "Contact", "Fleet", "Market", "Status", "Applied", ""].map(
                    (c, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-mute"
                      >
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {partners.map((p) => (
                  <tr key={p.user_id} className="hover:bg-cream-2/40">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-ink">{p.company_name}</p>
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 block text-xs text-marine hover:text-marine-deep"
                        >
                          {p.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-ink-soft">
                      <p>{p.contact_name ?? "—"}</p>
                      <p className="text-mute">{p.contact_email ?? ""}</p>
                      <p className="text-mute">{p.phone ?? ""}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                      {p.fleet_size ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                      {p.market}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <StatusPill status={p.status} />
                      {p.status_note && (
                        <p
                          className="mt-1 max-w-[16rem] truncate text-xs text-mute"
                          title={p.status_note}
                        >
                          {p.status_note}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-ink-soft">
                      {fmt(p.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {p.status !== "approved" && (
                          <ActionBtn onClick={() => void setStatus(p, "approved")}>
                            {p.status === "suspended" ? "Reinstate" : "Approve"}
                          </ActionBtn>
                        )}
                        {p.status !== "suspended" && (
                          <ActionBtn
                            tone="danger"
                            onClick={() => void setStatus(p, "suspended")}
                          >
                            {p.status === "pending" ? "Decline" : "Suspend"}
                          </ActionBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal}
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
      <p className={`mt-2 font-display text-2xl tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: PartnerStatus }) {
  const cls =
    status === "approved"
      ? "bg-success/10 text-success-deep"
      : status === "suspended"
        ? "bg-red/10 text-red"
        : "bg-amber-500/15 text-amber-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
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
      className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] font-medium transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
