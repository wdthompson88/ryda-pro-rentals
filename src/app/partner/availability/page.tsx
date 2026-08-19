"use client";

// /partner/availability — pick one of your cars, block the days you can't
// serve. (RYDA_RENTAL_BUILD_LOOP.md task 2F.)
//
// The counterpart to /partner/requests: that page answers requests one at
// a time, this one prevents the requests an operator would only decline.
// Until it existed, 0046's default-open model had no off switch anywhere
// in the product — every seeded car advertised its full 180-day horizon
// and the inbox absorbed the difference.
//
// Auth is the /account pattern, not a layout gate: useAuthStatus starts at
// 'loading' and any redirect is a client effect, so there is a real frame
// in which this renders without a session. It gets an explicit signed-out
// state rather than firing a guaranteed 401 at the API.

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuthStatus } from "@/lib/use-auth-status";
import { authedFetch } from "@/lib/api-fetch";
import { FOCUS_RING } from "@/lib/rental-booking-display";
import {
  AvailabilityEditor,
  type EditorListing,
} from "@/components/partner/availability-editor";

type Listing = EditorListing & {
  dailyRateCents: number;
  market: string;
  instantBook: boolean;
};

function carName(l: Listing): string {
  return [l.year, l.make, l.model].filter(Boolean).join(" ");
}

export default function PartnerAvailabilityPage() {
  const { status: authStatus } = useAuthStatus();
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authed") return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await authedFetch("/api/partner/listings");
        const json: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Could not load your cars.",
          );
          setListings([]);
          return;
        }
        const rows = ((json as { listings?: Listing[] }).listings ?? []);
        setListings(rows);
        // Open straight into the only car rather than making a
        // one-item picker a step.
        if (rows.length === 1) setSelected(rows[0].id);
      } catch {
        if (!cancelled) {
          setError("Could not load your cars.");
          setListings([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const current = listings?.find((l) => l.id === selected) ?? null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
        <nav className="text-sm text-mute">
          <Link href="/partner" className={`underline hover:text-ink ${FOCUS_RING}`}>
            Partner dashboard
          </Link>
        </nav>

        <header className="mt-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Availability
          </p>
          <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
            Block the days you can&apos;t serve.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            Your cars are bookable on every open day inside their window.
            Anything you block here disappears from the public calendar
            straight away, so a renter can&apos;t ask for it.
          </p>
        </header>

        {authStatus === "loading" && (
          <p className="mt-10 text-sm text-mute">Loading…</p>
        )}

        {authStatus === "anon" && (
          <div className="mt-10 rounded-2xl border border-rule bg-cream-2 px-8 py-10">
            <p className="font-display text-2xl text-ink">Sign in to manage your fleet.</p>
            <Link
              href="/signin?next=/partner/availability"
              className={`mt-4 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red ${FOCUS_RING}`}
            >
              Sign in
            </Link>
          </div>
        )}

        {authStatus === "authed" && (
          <div className="mt-10 space-y-8">
            {error && (
              <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
                {error}
              </p>
            )}

            {listings === null && !error && (
              <p className="text-sm text-mute">Loading your cars…</p>
            )}

            {listings !== null && listings.length === 0 && !error && (
              <div className="rounded-2xl border border-rule bg-cream-2/50 p-8 text-center">
                <p className="font-display text-lg text-ink">No cars yet.</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                  Once your listings are live they&apos;ll appear here and you
                  can manage their calendars. Reach the partnerships team at{" "}
                  <a
                    href="mailto:partners@ryda.pro"
                    className="underline hover:text-ink"
                  >
                    partners@ryda.pro
                  </a>
                  .
                </p>
              </div>
            )}

            {listings !== null && listings.length > 1 && (
              <div>
                <label className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
                  Car
                </label>
                <select
                  value={selected ?? ""}
                  onChange={(e) => setSelected(e.target.value || null)}
                  className={`mt-2 block w-full rounded-xl border border-rule bg-cream px-4 py-3 text-sm text-ink sm:max-w-md ${FOCUS_RING}`}
                >
                  <option value="">Pick a car…</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {carName(l)}
                      {l.status !== "active" ? ` · ${l.status}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {current && (
              <section>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl text-ink">
                    {carName(current)}
                  </h2>
                  <Link
                    href={`/rent/${current.slug}`}
                    className={`text-sm text-mute underline transition-colors hover:text-ink ${FOCUS_RING}`}
                  >
                    View public listing →
                  </Link>
                </div>
                {current.status !== "active" && (
                  <p className="mt-2 text-xs text-mute">
                    This car is {current.status} — renters can&apos;t see it
                    right now, blocked days or not.
                  </p>
                )}
                <div className="mt-6">
                  <AvailabilityEditor listing={current} />
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
