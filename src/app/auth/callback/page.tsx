"use client";

// /auth/callback, landing page for Supabase magic-link / OAuth flows.
// The Supabase client picks up the auth credentials from the URL hash
// (PKCE flow) on mount, then we route the user back to the `next=`
// destination they came from (or /portfolio as a sane default).
//
// This page is intentionally minimal, it's a transient redirect, not
// a destination. If Supabase isn't configured, it just routes home so
// the demo never breaks.

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  // Sanitize `?next=` against open-redirect / javascript: scheme tricks.
  // Anything not a same-origin path falls back to /portfolio.
  const next = safeNext(params.get("next"), "/portfolio");
  const [status, setStatus] = useState<"verifying" | "ok" | "error">(
    "verifying",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // No Supabase configured, nothing to verify; just route to next.
      if (!supabase) {
        router.replace(next);
        return;
      }
      try {
        // The Supabase JS client auto-detects the auth credentials
        // from the URL hash on instantiation in browser environments
        // (detectSessionInUrl defaults to true). Just confirm we
        // ended up with a session and proceed.
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;
        if (data.session) {
          setStatus("ok");
          // Brief beat so the "Signed in" message paints, then route.
          setTimeout(() => router.replace(next), 250);
        } else {
          // No session yet, supabase-js sometimes needs a moment to
          // exchange the URL hash. Retry once after a short delay.
          await new Promise((r) => setTimeout(r, 600));
          const second = await supabase.auth.getSession();
          if (second.data.session) {
            setStatus("ok");
            setTimeout(() => router.replace(next), 250);
          } else {
            setStatus("error");
            setErrorMsg(
              "We couldn't verify your sign-in link. It may have expired or been used already.",
            );
          }
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[70vh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-10 text-center">
          {status === "verifying" && (
            <>
              <div className="mx-auto h-3 w-3 animate-pulse rounded-full bg-red" />
              <p className="mt-6 font-display text-2xl text-ink">
                Verifying your sign-in…
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                One moment. We&apos;ll route you back to where you were.
              </p>
            </>
          )}
          {status === "ok" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-2 text-2xl text-ink">
                ✓
              </div>
              <p className="mt-6 font-display text-2xl text-ink">
                Signed in.
              </p>
              <p className="mt-3 text-sm text-ink-soft">Redirecting…</p>
            </>
          )}
          {status === "error" && (
            <>
              <p className="font-display text-2xl text-ink">
                Sign-in link issue
              </p>
              <p className="mt-3 text-sm text-ink-soft">{errorMsg}</p>
              <Link
                href="/signin"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-red px-6 text-sm font-medium text-cream hover:bg-red-deep"
              >
                Request a new link →
              </Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
