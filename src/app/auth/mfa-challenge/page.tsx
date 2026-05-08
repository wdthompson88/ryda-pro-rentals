"use client";

// /auth/mfa-challenge — TOTP step-up challenge after sign-in.
//
// Flow:
//  1. User signs in at /signin with password
//  2. If they have an enrolled TOTP factor, /signin redirects here
//     with ?next=<destination>
//  3. This page lists their factors, prompts for a 6-digit code,
//     calls supabase.auth.mfa.challenge + verify
//  4. On success the JWT is reissued with aal=aal2 and we redirect
//     to ?next
//
// Bypass attempt: a user who navigates straight here at aal1
// without passing the password step will get an empty factor list
// (mfa.listFactors() requires being signed in) — they're bounced
// to /signin.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

function ChallengeInner() {
  const router = useRouter();
  const params = useSearchParams();
  // safeNext rejects open-redirects (external hosts, javascript:,
  // data:, etc.) and returns a safe relative path. Codex round-1
  // catch on the MFA flow.
  const next = safeNext(params.get("next"), "/account");

  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Auth client not configured.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase.auth.mfa
      .listFactors()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        const verified = data?.totp?.find((f) => f.status === "verified");
        if (!verified) {
          // No verified factor — kick back to sign-in (likely a
          // direct nav by an unauthenticated user).
          router.replace("/signin");
          return;
        }
        setFactorId(verified.id);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Load failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !factorId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error || !challenge.data) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;
      // Verified — JWT is now at aal2. Send them where they came from.
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16 sm:py-24">
      <div className="rounded-2xl border border-rule bg-surface p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Sign-in · 2FA
        </p>
        <h1 className="mt-3 font-display text-2xl text-ink">
          Enter your 6-digit code
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Open your authenticator app (Google Authenticator, 1Password,
          Authy) and enter the code for RYDA.
        </p>

        {loading && (
          <p className="mt-6 text-sm text-mute">Loading…</p>
        )}

        {!loading && (
          <form onSubmit={onVerify} className="mt-6 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-rule px-4 py-3 text-center font-mono text-xl tracking-widest"
            />
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Verify and continue"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-xs text-red">{error}</p>
        )}

        <p className="mt-6 text-[11px] text-mute">
          Lost access to your authenticator?{" "}
          <Link
            href="/contact"
            className="text-marine hover:underline"
          >
            Contact support
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <ChallengeInner />
    </Suspense>
  );
}
