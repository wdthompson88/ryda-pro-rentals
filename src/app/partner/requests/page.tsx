"use client";

// /partner/requests — the operator's booking-request inbox (build loop
// 2F, the "requests" half of the fleet dashboard).
//
// GATING IS /partner's, NOT A NEW ONE. The page asks /api/partner/me the
// same question the dashboard asks and trusts the same answer: only an
// APPROVED partner account sees the inbox. That is not a second role
// model — /api/rental-bookings resolves the caller's partners through
// loadPartnerStaffIds(), which reads partner_accounts.status =
// 'approved' exactly as 0044's is_partner_staff() does — it is the same
// fact, read once for presentation. The API is the boundary either way:
// it 401s and filters by partner before any row moves, and this page
// showing a panel it should not would still show an empty one.
//
// Client-side, like /partner and /account, because RYDA's auth is a
// bearer token from the browser's Supabase session: there is no
// @supabase/ssr and no middleware.ts, so a server component here could
// not tell who is asking. authedFetch attaches the token; the route
// does the rest.
//
// EVERY FAILURE DEGRADES. 0046 and 0047 are written and not applied to
// any database, so the honest normal state of this page today is an
// empty inbox: the route answers a missing table with `{ bookings: [] }`
// and a 200 rather than a 500, and the empty state below is written to
// be true in that world as well as in the one where the operator simply
// has no requests yet.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/api-fetch";
import type { PartnerAccount } from "@/lib/partner";
import { BookingRequestList } from "@/components/partner/booking-request-list";
import {
  fetchOperatorBookings,
  type OperatorBooking,
} from "@/lib/operator-bookings";
// The "waiting on you" predicate lives in the lib, not in the inbox
// component: /partner badges its fleet panel with the same count, and two
// definitions of whose turn it is would eventually disagree.
import {
  FOCUS_RING,
  countOperatorRequests,
} from "@/lib/rental-booking-display";

type ViewState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "anon" }
  /** Signed in, but not an approved operator — no application, still
   *  under review, or paused. `partner` is null in the first case. */
  | { status: "gated"; partner: PartnerAccount | null }
  | { status: "ready"; partner: PartnerAccount; bookings: OperatorBooking[] }
  | { status: "error"; message: string };

export default function PartnerRequestsPage() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  // A failed REFETCH is not a failed page. Kept apart from `state` so it
  // can be shown without throwing the inbox away — see refresh().
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Preview deploys have no Supabase env, so /api/partner/me would
    // 401 and send the visitor into a sign-in loop. Branch up front,
    // same posture as /partner and /account.
    if (!supabase) {
      setState({ status: "unconfigured" });
      return;
    }
    try {
      const res = await authedFetch("/api/partner/me");
      if (res.status === 401) {
        setState({ status: "anon" });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        partner?: PartnerAccount | null;
        error?: string;
      };
      if (!res.ok) {
        setState({
          status: "error",
          message: body.error || `Could not load (${res.status}).`,
        });
        return;
      }
      const partner = body.partner ?? null;
      if (!partner || partner.status !== "approved") {
        setState({ status: "gated", partner });
        return;
      }

      const list = await fetchOperatorBookings();
      if (!list.ok) {
        setState({ status: "error", message: list.error });
        return;
      }
      setState({ status: "ready", partner, bookings: list.bookings });
    } catch {
      setState({
        status: "error",
        message: "Could not load. Check your connection.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Re-read the list without tearing the page down.
   *
   * Every decision the list sends changes what is true — an approval
   * reserves dates, a counter-offer creates a row and closes another,
   * and a refusal usually means somebody else already moved the row.
   * Refetching in place keeps the cards honest while leaving the
   * operator where they were; setState({loading}) would throw the whole
   * inbox away to say so.
   *
   * AND THE FAILURE PATH HAS TO HONOUR THAT TOO. This used to answer a
   * failed refetch with setState({status:'error'}), which discarded the
   * whole ready state — so an approval the server had already committed
   * (dates reserved, booking confirmed) read to the operator as "Too
   * many requests" or "Sign in required" with a Retry button and no
   * confirmed card anywhere. The decision succeeded; only the READ after
   * it failed, and the two are not the same news. The rate limit makes
   * this ordinary rather than exotic: /api/rental-bookings shares a
   * 30/min per-IP read window, spent by /partner's badge fetch plus one
   * refetch per decision from a single office NAT.
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const list = await fetchOperatorBookings();
    setRefreshing(false);
    if (!list.ok) {
      setRefreshError(
        `${list.error} Your last decision was saved — this is the refresh that failed.`,
      );
      // A page that never reached `ready` has nothing to preserve, so a
      // first-load failure still gets the full error state.
      setState((prev) =>
        prev.status === "ready" ? prev : { status: "error", message: list.error },
      );
      return;
    }
    setRefreshError(null);
    setState((prev) =>
      prev.status === "ready" ? { ...prev, bookings: list.bookings } : prev,
    );
  }, []);

  const pending =
    state.status === "ready"
      ? countOperatorRequests(state.bookings, Date.now())
      : 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Fleet Partner Program
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-3xl font-light text-ink sm:text-4xl">
              Booking requests.
            </h1>
            {state.status === "ready" && (
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className={`inline-flex h-9 items-center rounded-full border border-rule bg-surface px-4 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Renters ask for specific dates on your cars; you approve, decline,
            or offer different dates. A request runs out 24 hours after it is
            sent.
          </p>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-mute">
            Approving reserves the dates on the car — nothing else. No card is
            collected, no total is charged and no deposit is held: RYDA&apos;s
            rental payment rail isn&apos;t live yet.
          </p>
          <p className="mt-4 text-xs text-mute">
            <Link
              href="/partner"
              className={`rounded-sm underline hover:text-ink ${FOCUS_RING}`}
            >
              ← Back to the partner dashboard
            </Link>
          </p>
        </header>

        {state.status === "loading" && (
          <p className="mt-12 text-sm text-mute">Loading…</p>
        )}

        {state.status === "unconfigured" && (
          <div className="mt-10 rounded-2xl border border-rule bg-cream-2/50 p-10 text-center">
            <p className="font-display text-xl text-ink">Preview environment.</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
              This deploy has no backend configured, so partner accounts and
              booking requests are disabled. Everything works in production and
              in a locally configured dev environment.
            </p>
          </div>
        )}

        {state.status === "anon" && (
          <div className="mt-10 rounded-2xl border border-rule bg-surface p-8 sm:p-10">
            <h2 className="font-display text-xl text-ink">
              Sign in to see your booking requests.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              Requests for your cars live behind your partner account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signin?next=%2Fpartner%2Frequests"
                className={`inline-flex h-11 items-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
              >
                Sign in →
              </Link>
              <Link
                href="/signup?as=partner"
                className={`inline-flex h-11 items-center rounded-full border border-rule px-6 text-sm font-medium text-ink transition-colors hover:border-ink ${FOCUS_RING}`}
              >
                Apply as a partner
              </Link>
            </div>
          </div>
        )}

        {state.status === "gated" && <GateNotice partner={state.partner} />}

        {state.status === "error" && (
          <div className="mt-10 rounded-2xl border border-red/40 bg-red/5 p-6">
            <p className="text-sm text-red-deep">{state.message}</p>
            <button
              type="button"
              onClick={() => {
                setState({ status: "loading" });
                void load();
              }}
              className={`mt-4 rounded-full border border-rule bg-surface px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink ${FOCUS_RING}`}
            >
              Retry
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <div className="mt-10">
            <p className="sr-only" aria-live="polite">
              {pending === 0
                ? "No requests are waiting on you."
                : `${pending} request${pending === 1 ? "" : "s"} waiting on you.`}
            </p>
            {refreshError && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-warn/40 bg-warn/5 p-4"
              >
                <p className="text-sm leading-relaxed text-ink-soft">
                  {refreshError}
                </p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                  className={`mt-3 inline-flex h-9 items-center rounded-full border border-rule bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            )}
            <BookingRequestList
              bookings={state.bookings}
              onChanged={() => void refresh()}
            />
          </div>
        )}
      </main>
    </>
  );
}

/**
 * Signed in, but not an approved operator.
 *
 * Three different reasons, and they are worth telling apart: an
 * application that does not exist yet, one still in review, and one that
 * has been paused. All three send the operator back to /partner, which
 * is the surface that owns the application and its status — this page
 * never writes either.
 */
function GateNotice({ partner }: { partner: PartnerAccount | null }) {
  const heading = !partner
    ? "Booking requests open once you're an approved partner."
    : partner.status === "suspended"
      ? "Your partner account is paused."
      : "Your application is still in review.";

  const body = !partner
    ? "List your fleet with RYDA first — the application takes about a minute, and we respond personally within 3 business days."
    : partner.status === "suspended"
      ? "Nothing new can be booked while the account is paused, so this inbox stays closed. The dashboard has the details."
      : "As soon as your fleet passes review, requests from renters land here.";

  return (
    <div className="mt-10 rounded-2xl border border-rule bg-surface p-8 sm:p-10">
      <h2 className="font-display text-xl text-ink">{heading}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        {body}
      </p>
      <div className="mt-6">
        <Link
          href="/partner"
          className={`inline-flex h-11 items-center rounded-full bg-red px-6 text-sm font-medium text-cream transition-colors hover:bg-red-deep ${FOCUS_RING}`}
        >
          Go to the partner dashboard →
        </Link>
      </div>
    </div>
  );
}
