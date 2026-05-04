"use client";

// Bootstraps analytics on the client. Lives in the root layout so
// every page mounts it once. The hook chain:
//   1. On mount: try to init (no-op if no consent yet)
//   2. Listen for cookie-banner consent change (storage event +
//      custom 'ryda-consent-change' event from the banner)
//   3. Re-init when consent flips to 'all'
//   4. On every route change: send a pageview
//   5. On signin/out: identify or reset
//
// Importing this in the root layout means PostHog only loads when
// the bundle reaches an actual user session — server-rendered
// pages don't pull in analytics until hydration.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, pageview, identifyMember, resetMember } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";

export function AnalyticsBootstrap() {
  const pathname = usePathname();

  // First mount + consent listener.
  useEffect(() => {
    initAnalytics();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "ryda-cookie-consent") initAnalytics();
    };
    window.addEventListener("storage", onStorage);
    // Custom event so the banner can fire it locally (storage events
    // don't fire in the same tab that wrote the value).
    const onConsent = () => initAnalytics();
    window.addEventListener("ryda-consent-change", onConsent);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ryda-consent-change", onConsent);
    };
  }, []);

  // Pageview on every pathname change.
  useEffect(() => {
    if (pathname) pageview(pathname);
  }, [pathname]);

  // Identify on auth state change.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      identifyMember(data.user.id, data.user.email);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identifyMember(session.user.id, session.user.email);
      } else if (event === "SIGNED_OUT") {
        resetMember();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
