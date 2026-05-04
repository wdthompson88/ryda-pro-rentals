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
    // Strip auth headers + cookies + bodies from server events —
    // they routinely contain JWTs and can leak PII. Header keys
    // are case-insensitive in HTTP but JS object keys aren't, so
    // iterate to catch Authorization / authorization /
    // AUTHORIZATION etc. instead of relying on Sentry's storage
    // casing.
    beforeSend(event) {
      if (event.request?.headers) {
        const sensitive = new Set(["authorization", "cookie", "set-cookie"]);
        for (const k of Object.keys(event.request.headers)) {
          if (sensitive.has(k.toLowerCase())) {
            delete event.request.headers[k];
          }
        }
      }
      if (event.request) {
        delete event.request.data;
      }
      return event;
    },
  });
}
