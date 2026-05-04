// Sentry edge config — runs on Vercel Edge / Middleware.
// Mirrors server config's PII filtering since the cookie + auth
// header surface area is the same as the Node runtime.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development",
    beforeSend(event) {
      // Strip auth headers + cookies + bodies from edge events —
      // they routinely contain JWTs and can leak PII. Header keys
      // are case-insensitive in HTTP but JS object keys aren't,
      // so iterate to catch Authorization / authorization /
      // AUTHORIZATION etc.
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
