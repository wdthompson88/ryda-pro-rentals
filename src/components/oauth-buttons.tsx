"use client";

// Social sign-in buttons for /signup and /signin.
//
// Providers are enabled per environment via NEXT_PUBLIC_AUTH_PROVIDERS
// (comma list, e.g. "google,facebook,azure") so a button only renders
// once its provider is actually configured in the Supabase dashboard —
// no dead buttons in the meantime. Microsoft sign-in is Supabase's
// "azure" provider.
//
// The OAuth round-trip lands on /auth/callback?next=…, the same PKCE
// hand-off email confirmation uses, so downstream routing (onboarding,
// partner dashboard, gated actions) is identical no matter how the
// user chose to sign in. Profile facts arrive in user_metadata
// (name/full_name/email) and are prefilled — never re-asked — in the
// onboarding Basic step.

import { supabase } from "@/lib/supabase";

type Provider = "google" | "facebook" | "azure";

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google",
  facebook: "Facebook",
  azure: "Microsoft",
};

function configuredProviders(): Provider[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((p): p is Provider => p in PROVIDER_LABELS);
}

export function OAuthButtons({
  next,
  verb = "Continue",
}: {
  /** Same-origin path to land on after /auth/callback. */
  next: string;
  /** Button verb: "Continue" (signin) or "Sign up" (signup). */
  verb?: string;
}) {
  const providers = configuredProviders();
  if (!supabase || providers.length === 0) return null;

  async function signIn(provider: Provider) {
    if (!supabase) return;
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <div>
      <div className="space-y-3">
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => void signIn(p)}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-rule bg-surface text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            {verb} with {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>
      {/* "or continue with email", not a bare "or" — /signin already
          has an "Or" separator before its magic-link action, and two
          identical "or"s on one card read as a glitch. */}
      <div className="my-5 flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-rule" />
        <span className="whitespace-nowrap text-xs uppercase tracking-[0.16em] text-mute">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-rule" />
      </div>
    </div>
  );
}
