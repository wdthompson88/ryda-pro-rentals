"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { authedFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";

// /messages — co-owner threads, one per LLC the member is part of.
//
// Replaces the prior 64-line "coming soon" placeholder. Audit
// Finding #7 (member journey): pre-launch was OK with a placeholder,
// Miami launch needs real co-owner coordination (rolling stop,
// peak-week handoff, "I dinged the bumper" disclosure).
//
// This page lists the LLCs the member belongs to and links into the
// per-LLC thread at /messages/[llcId]. The membership list comes
// from /api/account/llcs which already exists.
//
// Pre-auth: if the user isn't signed in, redirect to /signin?next=/messages.
// Post-auth, no LLCs: render an empty state pointing at /portfolio.

type LlcRow = {
  id: string;
  llc_name: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
};

export default function MessagesPage() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "no-auth" }
    | { kind: "no-supabase" }
    | { kind: "ready"; llcs: LlcRow[] }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) setState({ kind: "no-supabase" });
        return;
      }
      // Confirm session before hitting the API — saves a wasted
      // 401 round-trip and lets us render a clean sign-in CTA.
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (!cancelled) setState({ kind: "no-auth" });
        return;
      }
      try {
        const r = await authedFetch("/api/account/llcs");
        if (r.status === 401) {
          if (!cancelled) setState({ kind: "no-auth" });
          return;
        }
        if (!r.ok) {
          if (!cancelled)
            setState({
              kind: "error",
              message: `Failed to load LLCs (${r.status}).`,
            });
          return;
        }
        const json = (await r.json()) as { llcs: LlcRow[] };
        if (!cancelled) setState({ kind: "ready", llcs: json.llcs });
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
          Messages
        </p>
        <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
          Co-owner threads.
        </h1>
        <p className="mt-4 text-base text-ink-soft">
          One thread per LLC you co-own. Use it to coordinate
          handoffs, surface ops issues, or disclose anything a co-owner
          should know. Append-only by design — what you post stays in
          the record.
        </p>

        <div className="mt-10">
          {state.kind === "loading" && (
            <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
              Loading your threads…
            </div>
          )}

          {state.kind === "no-auth" && (
            <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-center">
              <p className="text-sm text-ink-soft">
                Sign in to see your co-owner threads.
              </p>
              <Link
                href="/signin?next=/messages"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red"
              >
                Sign in →
              </Link>
            </div>
          )}

          {state.kind === "no-supabase" && (
            <div className="rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-mute">
              Messaging requires the live backend. This deploy isn&apos;t
              configured for it yet.
            </div>
          )}

          {state.kind === "error" && (
            <div className="rounded-2xl border border-red/40 bg-red/5 p-6 text-sm text-red">
              {state.message}
            </div>
          )}

          {state.kind === "ready" && state.llcs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-rule bg-cream-2/40 p-8 text-center">
              <p className="text-sm text-ink-soft">
                You aren&apos;t in an LLC yet, so there are no threads to
                show. Once you claim a share, the thread for that LLC
                appears here.
              </p>
              <Link
                href="/portfolio"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
              >
                Browse the fleet →
              </Link>
            </div>
          )}

          {state.kind === "ready" && state.llcs.length > 0 && (
            <ul className="space-y-3">
              {state.llcs.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/messages/${l.id}`}
                    className="group flex items-center justify-between rounded-2xl border border-rule bg-surface p-5 transition-colors hover:border-ink"
                  >
                    <div>
                      <p className="font-display text-lg text-ink">
                        {l.llc_name}
                      </p>
                      <p className="mt-1 text-xs text-mute">
                        {l.vehicle_symbol
                          ? `Vehicle · ${l.vehicle_symbol}`
                          : l.boat_slug
                            ? `Boat · ${l.boat_slug}`
                            : "LLC"}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-sm text-mute transition-colors group-hover:text-ink"
                    >
                      Open thread →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-10 text-xs text-mute">
          Need to reach the RYDA team directly?{" "}
          <Link href="/contact" className="underline hover:text-ink">
            Open a support thread →
          </Link>
        </p>
      </section>
    </>
  );
}
