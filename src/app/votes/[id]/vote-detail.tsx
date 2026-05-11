"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";

// Per-vote detail view. Renders:
//   - The vote's title, type, full description, threshold, deadline
//   - Live tally bar (yes / no / abstain / unvoted) against the
//     outstanding-share denominator
//   - The caller's current ballot status + a form to cast or change
//   - All ballots cast (transparent — no secret ballots in an LLC),
//     with author name + share count + optional rationale

const RATIONALE_MAX = 2000;

type Vote = {
  id: string;
  llc_entity_id: string;
  vote_type: string;
  title: string;
  description: string;
  threshold_pct: number;
  eligible_share_total: number;
  opens_at: string;
  closes_at: string;
  status: "open" | "passed" | "failed" | "withdrawn";
};

type Tally = {
  yes_shares: number;
  no_shares: number;
  abstain_shares: number;
  // yes_pct_raw is the unrounded value the server compares to
  // threshold_pct; yes_pct_display is floor-of-tenths so the UI
  // can never lie ('75% yes / 75% needed but not met').
  yes_pct_raw: number;
  yes_pct_display: number;
  threshold_pct: number;
  threshold_met: boolean;
  shares_voted: number;
  shares_outstanding: number;
};

type Ballot = {
  id: string;
  user_id: string;
  choice: "yes" | "no" | "abstain";
  shares_at_ballot: number;
  submitted_at: string;
  rationale: string | null;
  author_name: string;
};

type Detail = {
  vote: Vote;
  tally: Tally;
  ballots: Ballot[];
  my_ballot: Ballot | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "no-auth" }
  | { kind: "no-supabase" }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; detail: Detail };

export function VoteDetail({ voteId }: { voteId: string }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [draftChoice, setDraftChoice] = useState<
    "yes" | "no" | "abstain" | ""
  >("");
  const [draftRationale, setDraftRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!supabase) {
      setState({ kind: "no-supabase" });
      return;
    }
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setState({ kind: "no-auth" });
      return;
    }
    try {
      const r = await authedFetch(
        `/api/account/votes/${encodeURIComponent(voteId)}`,
      );
      if (r.status === 401) {
        setState({ kind: "no-auth" });
        return;
      }
      if (r.status === 403) {
        setState({ kind: "forbidden" });
        return;
      }
      if (r.status === 404) {
        setState({ kind: "not-found" });
        return;
      }
      if (!r.ok) {
        setState({
          kind: "error",
          message: `Failed to load vote (${r.status}).`,
        });
        return;
      }
      const json = (await r.json()) as Detail;
      setState({ kind: "ready", detail: json });
      // Pre-fill the form with the existing ballot (if any) so the
      // member can see what they previously voted before changing.
      if (json.my_ballot) {
        setDraftChoice(json.my_ballot.choice);
        setDraftRationale(json.my_ballot.rationale ?? "");
      }
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not reach the server.",
      });
    }
  }, [voteId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (draftChoice === "") return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const r = await authedFetch(
          `/api/account/votes/${encodeURIComponent(voteId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              choice: draftChoice,
              rationale:
                draftRationale.trim().length > 0
                  ? draftRationale.trim()
                  : null,
            }),
          },
        );
        if (!r.ok) {
          const errBody = await r.json().catch(() => ({ error: "Failed." }));
          setSubmitError(
            (errBody as { error?: string }).error ??
              `Submission failed (${r.status}).`,
          );
          return;
        }
        // Refresh to pick up the new ballot in the tally + list.
        await reload();
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Could not reach the server.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [voteId, draftChoice, draftRationale, reload],
  );

  if (state.kind === "loading") {
    return (
      <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
        Loading vote…
      </div>
    );
  }
  if (state.kind === "no-supabase") {
    return (
      <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
        Voting requires the live backend.
      </div>
    );
  }
  if (state.kind === "no-auth") {
    return (
      <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
        Sign-in required.{" "}
        <a
          className="underline hover:text-ink"
          href={`/signin?next=/votes/${encodeURIComponent(voteId)}`}
        >
          Sign in
        </a>
        .
      </div>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
        You aren&apos;t a current member of this LLC.
      </div>
    );
  }
  if (state.kind === "not-found") {
    return (
      <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
        Vote not found.
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="mt-6 rounded-2xl border border-red/40 bg-red/5 p-6 text-sm text-red">
        {state.message}
      </div>
    );
  }

  const { vote, tally, ballots, my_ballot } = state.detail;
  const isOpen =
    vote.status === "open" && new Date(vote.closes_at).getTime() > Date.now();

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
          {voteTypeLabel(vote.vote_type)} · {vote.threshold_pct}% supermajority
        </p>
        <StatusPill status={vote.status} />
      </div>
      <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
        {vote.title}
      </h1>
      <p className="mt-2 text-xs text-mute">
        Opened {formatDate(vote.opens_at)} · {isOpen ? "Closes" : "Closed"}{" "}
        {formatDate(vote.closes_at)} · {vote.eligible_share_total} eligible
        shares
      </p>
      <p className="mt-5 whitespace-pre-wrap text-sm text-ink-soft">
        {vote.description}
      </p>

      {/* Tally */}
      <div className="mt-8 rounded-2xl border border-rule bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
            Tally
          </p>
          <p className="text-xs text-mute">
            {tally.yes_pct_display}% yes / {tally.threshold_pct}% needed
          </p>
        </div>
        <TallyBar tally={tally} />
        <ul className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <li>
            <p className="text-[11px] uppercase tracking-wider text-mute">
              Yes
            </p>
            <p className="mt-1 font-medium text-marine-deep">
              {tally.yes_shares}{" "}
              <span className="text-mute">
                / {tally.shares_outstanding}
              </span>
            </p>
          </li>
          <li>
            <p className="text-[11px] uppercase tracking-wider text-mute">
              No
            </p>
            <p className="mt-1 font-medium text-red">
              {tally.no_shares}{" "}
              <span className="text-mute">
                / {tally.shares_outstanding}
              </span>
            </p>
          </li>
          <li>
            <p className="text-[11px] uppercase tracking-wider text-mute">
              Abstain
            </p>
            <p className="mt-1 font-medium text-ink-soft">
              {tally.abstain_shares}{" "}
              <span className="text-mute">
                / {tally.shares_outstanding}
              </span>
            </p>
          </li>
        </ul>
        <p className="mt-4 text-xs text-mute">
          {tally.shares_voted} of {tally.shares_outstanding} eligible shares
          have voted ({Math.round((tally.shares_voted / Math.max(1, tally.shares_outstanding)) * 100)}% turnout).
          {tally.threshold_met
            ? " Threshold met — vote passes if it remains so at close."
            : " Below threshold."}
        </p>
      </div>

      {/* Ballot form */}
      {isOpen ? (
        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-2xl border border-rule bg-surface p-5"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            {my_ballot ? "Change your ballot" : "Cast your ballot"}
          </p>
          {my_ballot ? (
            <p className="mt-2 text-xs text-mute">
              Current ballot: <strong className="text-ink">{my_ballot.choice}</strong> ·{" "}
              {my_ballot.shares_at_ballot} share
              {my_ballot.shares_at_ballot === 1 ? "" : "s"} · submitted{" "}
              {formatDate(my_ballot.submitted_at)}. Re-submitting overwrites it.
            </p>
          ) : null}

          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Choose a ballot option</legend>
            {(["yes", "no", "abstain"] as const).map((c) => (
              <label
                key={c}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                  draftChoice === c
                    ? "border-red bg-cream-2/60"
                    : "border-rule bg-cream-2/20"
                }`}
              >
                <input
                  type="radio"
                  name="choice"
                  value={c}
                  checked={draftChoice === c}
                  onChange={() => setDraftChoice(c)}
                  className="mt-0.5 h-4 w-4 accent-red"
                />
                <span className="capitalize text-ink">{c}</span>
              </label>
            ))}
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor="ballot-rationale"
              className="block text-xs font-medium uppercase tracking-wider text-mute"
            >
              Rationale (optional)
            </label>
            <textarea
              id="ballot-rationale"
              value={draftRationale}
              onChange={(e) => setDraftRationale(e.target.value)}
              maxLength={RATIONALE_MAX}
              rows={3}
              placeholder="Useful for documenting a 'no' vote so co-owners understand the objection."
              className="mt-2 w-full resize-y rounded-xl border border-rule bg-cream-2/40 p-3 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
            />
            <p className="mt-1 text-[11px] text-mute">
              {draftRationale.length} / {RATIONALE_MAX}
            </p>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || draftChoice === ""}
              className="inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting…"
                : my_ballot
                  ? "Update ballot →"
                  : "Cast ballot →"}
            </button>
          </div>
          {submitError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red/40 bg-red/5 px-3 py-2 text-xs text-red"
            >
              {submitError}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-rule bg-cream-2/40 p-5 text-sm text-mute">
          Voting is closed. Final result: {vote.status}.
        </div>
      )}

      {/* Ballots cast — transparent member list */}
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
          Ballots cast ({ballots.length})
        </p>
        <ul className="mt-3 space-y-2">
          {ballots.length === 0 && (
            <li className="rounded-xl border border-dashed border-rule bg-cream-2/30 p-4 text-sm text-mute">
              No ballots cast yet.
            </li>
          )}
          {ballots.map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-rule bg-surface p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">{b.author_name}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    b.choice === "yes"
                      ? "bg-marine/15 text-marine-deep"
                      : b.choice === "no"
                        ? "bg-red/10 text-red"
                        : "bg-cream-2 text-mute"
                  }`}
                >
                  {b.choice} · {b.shares_at_ballot} share
                  {b.shares_at_ballot === 1 ? "" : "s"}
                </span>
              </div>
              {b.rationale ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                  {b.rationale}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] text-mute">
                {formatDate(b.submitted_at)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TallyBar({ tally }: { tally: Tally }) {
  // Stacked bar showing yes / no / abstain / unvoted as fractions
  // of outstanding shares. Threshold marker rendered as a thin
  // vertical line.
  const total = Math.max(1, tally.shares_outstanding);
  const yesPct = (tally.yes_shares / total) * 100;
  const noPct = (tally.no_shares / total) * 100;
  const abstainPct = (tally.abstain_shares / total) * 100;
  return (
    <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-cream-2">
      <div
        className="absolute inset-y-0 left-0 bg-marine"
        style={{ width: `${yesPct}%` }}
        aria-label={`Yes: ${tally.yes_shares} shares`}
      />
      <div
        className="absolute inset-y-0 bg-red"
        style={{ left: `${yesPct}%`, width: `${noPct}%` }}
        aria-label={`No: ${tally.no_shares} shares`}
      />
      <div
        className="absolute inset-y-0 bg-mute"
        style={{ left: `${yesPct + noPct}%`, width: `${abstainPct}%` }}
        aria-label={`Abstain: ${tally.abstain_shares} shares`}
      />
      {/* Threshold marker — vertical line at threshold_pct */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 w-px bg-ink"
        style={{ left: `${tally.threshold_pct}%` }}
        title={`${tally.threshold_pct}% threshold`}
      />
    </div>
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
