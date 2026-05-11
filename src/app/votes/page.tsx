"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";

// /votes — member voting dashboard.
//
// Shows every vote across every LLC the member belongs to, sorted
// open-first by deadline. Audit Finding #8 (member journey): the
// OA specifies 75% supermajority for material decisions but there's
// no surface for members to actually vote. This is that surface.

type Vote = {
  id: string;
  llc_entity_id: string;
  llc_name: string;
  vote_type: string;
  title: string;
  threshold_pct: number;
  eligible_share_total: number;
  opens_at: string;
  closes_at: string;
  status: "open" | "passed" | "failed" | "withdrawn";
  my_ballot_choice: "yes" | "no" | "abstain" | null;
};

export default function VotesPage() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "no-auth" }
    | { kind: "no-supabase" }
    | { kind: "ready"; votes: Vote[] }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) setState({ kind: "no-supabase" });
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (!cancelled) setState({ kind: "no-auth" });
        return;
      }
      try {
        const r = await authedFetch("/api/account/votes");
        if (r.status === 401) {
          if (!cancelled) setState({ kind: "no-auth" });
          return;
        }
        if (!r.ok) {
          if (!cancelled)
            setState({
              kind: "error",
              message: `Failed to load votes (${r.status}).`,
            });
          return;
        }
        const json = (await r.json()) as { votes: Vote[] };
        if (!cancelled) setState({ kind: "ready", votes: json.votes });
      } catch (err) {
        if (!cancelled)
          setState({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Could not reach the server.",
          });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Member votes
        </p>
        <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
          LLC governance votes.
        </h1>
        <p className="mt-4 text-base text-ink-soft">
          Material decisions on each LLC you co-own — sale, replacement,
          modification, or deficit assessment — pass when 75% of
          outstanding shares vote yes (per the Operating Agreement).
          Cast or change your ballot at any time before the deadline.
        </p>
        <p className="mt-3 text-xs text-mute">
          Ballots are not secret — every co-owner of the LLC can see
          who voted what. Share transfers mid-vote do not retroactively
          change ballots; the holder at ballot-time votes with whatever
          they currently hold.
        </p>

        <div className="mt-10">
          {state.kind === "loading" && (
            <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
              Loading your votes…
            </div>
          )}

          {state.kind === "no-auth" && (
            <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-center">
              <p className="text-sm text-ink-soft">
                Sign in to see open votes for your LLCs.
              </p>
              <Link
                href="/signin?next=/votes"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                Sign in →
              </Link>
            </div>
          )}

          {state.kind === "no-supabase" && (
            <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
              Voting requires the live backend.
            </div>
          )}

          {state.kind === "error" && (
            <div className="rounded-2xl border border-red/40 bg-red/5 p-6 text-sm text-red">
              {state.message}
            </div>
          )}

          {state.kind === "ready" && state.votes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-rule bg-cream-2/40 p-8 text-center">
              <p className="text-sm text-ink-soft">
                No active votes. When a co-owner or RYDA proposes a
                supermajority decision on one of your LLCs, it shows
                up here.
              </p>
            </div>
          )}

          {state.kind === "ready" && state.votes.length > 0 && (
            <ul className="space-y-3">
              {state.votes.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/votes/${v.id}`}
                    className="group block rounded-2xl border border-rule bg-surface p-5 transition-colors hover:border-ink"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                          {v.llc_name}
                          {" · "}
                          {voteTypeLabel(v.vote_type)}
                        </p>
                        <h2 className="mt-1 font-display text-lg text-ink">
                          {v.title}
                        </h2>
                      </div>
                      <StatusPill status={v.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-ink-soft">
                      <span>
                        {v.threshold_pct}% supermajority required
                      </span>
                      <span>•</span>
                      <span>
                        {v.eligible_share_total} eligible shares
                      </span>
                      <span>•</span>
                      <span>
                        {v.status === "open"
                          ? `Closes ${formatDeadline(v.closes_at)}`
                          : `Closed ${formatDeadline(v.closes_at)}`}
                      </span>
                      <span>•</span>
                      <span className={ballotPillClass(v.my_ballot_choice)}>
                        {v.my_ballot_choice
                          ? `Your ballot: ${v.my_ballot_choice}`
                          : "Not voted yet"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function StatusPill({ status }: { status: Vote["status"] }) {
  const map: Record<Vote["status"], string> = {
    open: "bg-red/10 text-red",
    passed: "bg-marine/15 text-marine-deep",
    failed: "bg-cream-2 text-ink-soft",
    withdrawn: "bg-cream-2 text-mute",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full ${map[status]} px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider`}
    >
      {status}
    </span>
  );
}

function voteTypeLabel(t: string): string {
  switch (t) {
    case "sale":
      return "Sale";
    case "replacement":
      return "Replacement";
    case "modification":
      return "Modification";
    case "deficit_assessment":
      return "Deficit assessment";
    default:
      return "General";
  }
}

function ballotPillClass(choice: Vote["my_ballot_choice"]): string {
  if (choice === "yes") return "font-medium text-marine-deep";
  if (choice === "no") return "font-medium text-red";
  if (choice === "abstain") return "font-medium text-mute";
  return "text-mute";
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
