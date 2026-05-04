// Sentry server config — runs in Node.js function invocations.
// Captures unhandled exceptions in API routes + server components.
//
// DSN comes from SENTRY_DSN. When unset, Sentry init is skipped.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
    // Strip Authorization headers + cookie + bodies from server
    // events — they routinely contain JWTs and can leak PII.
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["set-cookie"];
      }
      if (event.request) {
        delete event.request.data;
      }
      return event;
    },
  });
}
