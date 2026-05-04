"use client";

// Lightweight analytics shim around PostHog. Honors the cookie
// banner: posthog only loads if the user opted in (or if no banner
// has been answered yet AND the env opts the project into the
// "default-on" path).
//
// We keep this thin so swapping providers later is a one-file
// change.

import posthog from "posthog-js";

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return;

  // Cookie-banner consent gate. The banner stores 'all' (accept
  // analytics + functional) or 'essential' (strictly necessary
  // only). We only initialize PostHog on 'all'. Legacy/empty value
  // → don't load until the user answers the banner.
  const consent =
    typeof window !== "undefined"
      ? window.localStorage.getItem("ryda-cookie-consent")
      : null;
  if (consent !== "all") return;

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we send pageviews manually below
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage",
    person_profiles: "identified_only",
  });
  initialized = true;
}

// Identify the signed-in member with their auth.uid + email so
// events stitch to a user. Safe to call multiple times.
export function identifyMember(
  userId: string,
  email?: string | null,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.identify(userId, { email: email ?? undefined, ...properties });
}

// Reset on sign-out so subsequent events don't carry the prior user.
export function resetMember(): void {
  if (!initialized) return;
  posthog.reset();
}

// Pageview helper — call from a client effect on route change.
export function pageview(path: string): void {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: path });
}

// Generic event capture.
export function track(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// Tear-down — for the "user opted out via banner" path.
export function teardown(): void {
  if (!initialized) return;
  posthog.opt_out_capturing();
  initialized = false;
}
