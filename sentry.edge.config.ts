// Sentry edge config — runs on Vercel Edge / Middleware.
// Empty/conservative defaults; we don't currently ship significant
// edge code so this is mostly a placeholder for the day we do.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
  });
}
