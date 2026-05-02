"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/safe-next";

// /signin — primary path is email+password (shown by default).
// Magic-link is a secondary action below the form for members who
// don't want to remember a password OR forgot it. The `?next=` query
// param is preserved so a member who signs in from a gated CTA
// (e.g. "Reserve a share") returns to that exact page after auth.

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Sanitize `?next=` against open-redirect / javascript: scheme tricks.
  // Anything not a same-origin path falls back to /portfolio.
  const next = safeNext(searchParams.get("next"), "/portfolio");
  const reason = searchParams.get("reason"); // "rent" | "buy" | "checkout" — gives copy a hook

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingMagic, setSubmittingMagic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonCopy =
    reason === "rent"
      ? "Sign in to confirm your rental request."
      : reason === "buy"
        ? "Sign in to claim your share."
        : reason === "checkout"
          ? "Sign in to complete your reservation."
          : "Welcome back.";

  // Primary submit — email + password.
  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || password.length < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      if (supabase) {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        router.push(next);
      } else {
        // Supabase not configured — simulate success so the demo still
        // runs without env vars wired.
        await new Promise((r) => setTimeout(r, 500));
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // Secondary path — send a magic link to whatever email the user has
  // typed in the form. Doesn't require password. Used when the member
  // forgot their password or just doesn't want to type one.
  async function onMagicLink() {
    if (!email.includes("@")) {
      setError("Enter your email above first.");
      return;
    }
    setSubmittingMagic(true);
    setError(null);
    try {
      if (supabase) {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (err) throw err;
        setMagicSent(true);
      } else {
        await new Promise((r) => setTimeout(r, 500));
        setMagicSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmittingMagic(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[80vh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-8 shadow-sm sm:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-mute">
            Sign in
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">{reasonCopy}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Member sign-in for RYDA — co-owners, renters, and applicants.
          </p>

          {magicSent ? (
            <div className="mt-8 rounded-xl border border-rule bg-cream-2/40 p-5 text-sm">
              <p className="font-medium text-ink">Check your inbox.</p>
              <p className="mt-2 text-ink-soft">
                We sent a sign-in link to{" "}
                <span className="font-medium text-ink">{email}</span>. The
                link expires in 15 minutes.
              </p>
              <button
                type="button"
                onClick={() => setMagicSent(false)}
                className="mt-4 text-xs font-medium text-ink-soft hover:text-ink"
              >
                Use a different email →
              </button>
            </div>
          ) : (
            <>
              {/* Primary form — email + password together */}
              <form className="mt-7 space-y-4" onSubmit={onPasswordSubmit}>
                <Field
                  label="Email"
                  id="signin-email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  required
                />
                <Field
                  label="Password"
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  required
                />

                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-xs text-red"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={
                    submitting || submittingMagic || !email.includes("@") || password.length < 1
                  }
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-red bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep hover:border-red-deep active:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
              </form>

              {/* Magic link as secondary action below the form. Subtle
                  rule + tracked label so it reads as "another way" not
                  "competing primary action." Red default with subtle
                  highlight on hover/active per CEO request. */}
              <div className="mt-8 border-t border-rule pt-6 text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
                  Or
                </p>
                <button
                  type="button"
                  onClick={onMagicLink}
                  disabled={submitting || submittingMagic || !email.includes("@")}
                  className="mt-3 text-sm font-medium text-red underline-offset-4 transition-colors hover:text-red-deep hover:underline active:text-red-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingMagic ? "Sending…" : "Send me a magic link instead"}
                </button>
                <p className="mt-2 text-[11px] text-mute">
                  We&apos;ll email a one-tap sign-in link — no password
                  needed.
                </p>
              </div>
            </>
          )}

          <div className="mt-10 border-t border-rule pt-6 text-center text-sm text-ink-soft">
            New to RYDA?{" "}
            <Link
              href={`/signup${next !== "/portfolio" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-ink hover:text-red"
            >
              Create an account →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  id,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  id: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-medium uppercase tracking-[0.22em] text-mute"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-required={required}
        className="mt-2 h-12 w-full border-0 border-b border-rule bg-transparent px-1 text-[15px] text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-0"
      />
    </div>
  );
}
