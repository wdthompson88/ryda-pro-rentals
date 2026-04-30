"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

// /signin — passwordless-or-password member sign-in. Front-end only for now;
// real auth (Supabase Auth + magic-link) wires in at Miami launch. The
// `?next=` query param is preserved so a member who signs in from a gated
// CTA (e.g. "Reserve a share") returns to that exact page after auth.

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
  const next = searchParams.get("next") || "/portfolio";
  const reason = searchParams.get("reason"); // "rent" | "buy" | "checkout" — gives copy a hook

  const [mode, setMode] = useState<"password" | "magic">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reasonCopy =
    reason === "rent"
      ? "Sign in to confirm your rental request."
      : reason === "buy"
        ? "Sign in to claim your share."
        : reason === "checkout"
          ? "Sign in to complete your reservation."
          : "Welcome back.";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitting(true);
    // Front-end only for now — simulates the auth call. Real auth ships
    // with the Miami launch (Supabase Auth + magic-link).
    setTimeout(() => {
      setSubmitting(false);
      if (mode === "magic") {
        setSubmitted(true);
      } else {
        // Password path: assume success → return to next
        router.push(next);
      }
    }, 700);
  }

  return (
    <>
      <SiteHeader />
      <section className="flex min-h-[80vh] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-rule bg-surface p-8 sm:p-10 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Sign in
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">{reasonCopy}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Member sign-in for RYDA — co-owners, renters, and applicants.
          </p>

          {submitted ? (
            <div className="mt-8 rounded-xl border border-rule bg-cream-2/40 p-5 text-sm">
              <p className="font-medium text-ink">Check your inbox.</p>
              <p className="mt-2 text-ink-soft">
                We sent a sign-in link to{" "}
                <span className="font-medium text-ink">{email}</span>. The link
                expires in 15 minutes.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 text-xs font-medium text-red hover:text-red-deep"
              >
                Use a different email →
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="mt-7 grid grid-cols-2 gap-1 rounded-full border border-rule bg-cream-2/40 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className={`h-9 rounded-full transition-colors ${
                    mode === "magic"
                      ? "bg-ink text-cream"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Magic link
                </button>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className={`h-9 rounded-full transition-colors ${
                    mode === "password"
                      ? "bg-ink text-cream"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Password
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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

                {mode === "password" && (
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
                )}

                <button
                  type="submit"
                  disabled={submitting || !email.includes("@")}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-red px-7 text-sm font-medium text-cream transition-colors hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Sending…"
                    : mode === "magic"
                      ? "Email me a sign-in link"
                      : "Sign in"}
                </button>
              </form>

              {mode === "password" ? (
                <div className="mt-4 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("magic")}
                    className="text-ink-soft hover:text-ink"
                  >
                    Forgot password? Use magic link
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-mute">
                  We'll email you a link — no password to remember.
                </p>
              )}
            </>
          )}

          <div className="mt-10 border-t border-rule pt-6 text-center text-sm text-ink-soft">
            New to RYDA?{" "}
            <Link
              href={`/signup${next !== "/portfolio" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-red hover:text-red-deep"
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
        className="block text-xs font-medium uppercase tracking-wider text-mute"
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
        className="mt-2 h-12 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
      />
    </div>
  );
}
