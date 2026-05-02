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
      // Best-effort persistence, banner will re-appear next visit.
    }
    setConsent(choice);
  }

  // Avoid SSR/hydration mismatch, render nothing until we've checked
  // localStorage. Once a decision is made, the banner stays hidden.
  if (!mounted || consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-cream/95 backdrop-blur"
    >
      {/* Quiet bottom strip, no shadow, no card frame, no pill buttons.
          Legal chrome should disappear, not announce itself. */}
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p className="text-xs leading-relaxed text-ink-soft">
          We use cookies to keep RYDA running. Read the{" "}
          <Link href="/legal/cookies" className="underline-offset-2 hover:text-ink hover:underline">
            policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-5 text-xs">
          <button
            type="button"
            onClick={() => persist("essential")}
            className="text-ink-soft transition-colors hover:text-ink"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => persist("all")}
            className="font-medium text-ink transition-colors hover:text-red"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
