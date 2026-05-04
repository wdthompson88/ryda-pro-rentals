// Next.js instrumentation hook — runs once per server runtime
// (nodejs, edge). We use it to wire Sentry init for server +
// edge contexts. The browser config is loaded automatically via
// sentry.client.config.ts.
//
// When SENTRY_DSN isn't set the configs are no-ops.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
