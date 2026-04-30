"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Cookie consent banner. Stores the choice in localStorage so it doesn't
// re-prompt across page navigations. Three actions:
//  - Accept all → analytics + functional
//  - Reject non-essential → strictly necessary only
//  - Customize → /legal/cookies (where the policy is described)
//
// We don't load any analytics SDKs server-side; this is the wiring point
// when we add them. The banner is rendered last so it sits above the
// footer; site-wide z-50 ensures it never covers an open mobile menu.

const STORAGE_KEY = "ryda-cookie-consent";
type Consent = "all" | "essential" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "all" || stored === "essential") {
        setConsent(stored);
      }
    } catch {
      // localStorage may be blocked in some embedded contexts; treat as
      // no-decision and show the banner.
    }
  }, []);

  function persist(choice: Exclude<Consent, null>) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Best-effort persistence — banner will re-appear next visit.
    }
    setConsent(choice);
  }

  // Avoid SSR/hydration mismatch — render nothing until we've checked
  // localStorage. Once a decision is made, the banner stays hidden.
  if (!mounted || consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-rule bg-surface p-4 shadow-lg sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-ink-soft">
            <p className="font-medium text-ink">
              We use cookies to make RYDA work better.
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Strictly necessary cookies keep the site running. Analytics
              cookies help us understand which vehicles members care about
              most. You can change your preferences anytime in our{" "}
              <Link
                href="/legal/cookies"
                className="underline hover:text-ink"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <button
              type="button"
              onClick={() => persist("essential")}
              className="inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => persist("all")}
              className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-xs font-medium text-cream transition-colors hover:bg-red"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
