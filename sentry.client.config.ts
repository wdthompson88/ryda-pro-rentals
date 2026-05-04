// Sentry client config — runs in the browser. We deliberately keep
// the integration list small and tracesSampleRate low so we don't
// burn the free-tier event quota on noisy navigations. Errors are
// the high-value signal.
//
// DSN comes from NEXT_PUBLIC_SENTRY_DSN. When unset (preview
// deploys / local dev without Sentry), the SDK initializes as a
// no-op and incurs zero overhead.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Only sample 10% of transactions for performance. Errors are
    // 100%. Bump this if traces become useful for triage.
    tracesSampleRate: 0.1,
    // Don't replay sessions on free tier (paid feature). When we
    // upgrade, set replaysOnErrorSampleRate: 1.0.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // Don't ship the entire request body to Sentry — could leak PII.
    beforeSend(event) {
      // Strip query strings and request bodies.
      if (event.request) {
        delete event.request.data;
        if (typeof event.request.url === "string") {
          event.request.url = event.request.url.split("?")[0];
        }
      }
      return event;
    },
  });
}
