// Server-side PostHog client. Companion to lib/analytics.ts (which
// is the client-side shim with cookie-consent gating).
//
// Use this in:
//   - API routes (e.g. /api/share-purchase/webhook → fire
//     `share_purchase_completed`)
//   - Server components / actions (e.g. KYC verification → fire
//     `kyc_verified`)
//   - Vercel cron jobs (e.g. social-publisher → fire `post_published`)
//
// Why a separate file instead of `analytics.ts`: the client shim
// is cookie-consent gated. Server events fire regardless of the
// user's cookie preference because they're tracking server-state
// transitions, not browser activity. They never set a cookie.
//
// IMPORTANT: server events bypass cookie consent. Only use them
// for events tied to operator/system actions (purchase completed,
// webhook received, cron tick), NOT for tracking the user's
// browsing behavior. Browsing always goes through the client shim
// where consent is enforced.

import "server-only";
import { PostHog } from "posthog-node";

let cached: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  // Match the client shim: no key in env → return null instead of
  // throwing. Lets the calling code do `posthog?.capture(...)` and
  // skip silently in environments without analytics wired (preview
  // deploys, local dev without PostHog).
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (cached) return cached;

  cached = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Flush after every event for serverless. PostHog's default
    // batching assumes a long-running process; in Vercel functions
    // the process can exit immediately after the handler returns,
    // dropping batched events. flushAt:1 + flushInterval:0 forces
    // an immediate send.
    flushAt: 1,
    flushInterval: 0,
    // Silent in production; verbose in dev for debugging.
    disabled: false,
  });
  return cached;
}

/** Fire-and-forget server event. Wraps the PostHog client in a
 *  try/catch so analytics failure never crashes the calling
 *  handler. Returns true on capture, false on skip/error.
 *
 *  Use this from API routes for state-transition events:
 *    - signup_completed (after auth + KYC)
 *    - share_purchase_completed (Stripe webhook)
 *    - kyc_verified (KYC webhook)
 *    - llc_formation_completed (Firstbase webhook)
 *    - share_transferred (member-to-member share xfer)
 *    - dispute_opened (Stripe dispute webhook)
 *
 *  distinctId should be the Supabase auth.users.id when known,
 *  fall back to email if pre-signup, or a stable identifier like
 *  the share_purchase.id for system events.
 */
export async function trackServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<boolean> {
  const ph = getPostHogServer();
  if (!ph) return false;
  try {
    ph.capture({ distinctId, event, properties });
    // Awaited so the event leaves the function before Vercel
    // tears down the runtime. Otherwise serverless cold starts
    // can drop in-flight events.
    await ph.flush();
    return true;
  } catch (err) {
    // Sentry will pick this up if wired; we don't re-throw because
    // analytics failure should never block a Stripe webhook.
    console.error("[posthog-server] capture failed:", err);
    return false;
  }
}

/** Identify a user with properties from a server context. Use when
 *  a user transitions through a key state and you want their
 *  PostHog person profile updated (e.g., kyc_status changed,
 *  member_since added). The client shim does this for browsing;
 *  use this for server-state changes. */
export async function identifyServer(
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<boolean> {
  const ph = getPostHogServer();
  if (!ph) return false;
  try {
    ph.identify({ distinctId, properties });
    await ph.flush();
    return true;
  } catch (err) {
    console.error("[posthog-server] identify failed:", err);
    return false;
  }
}
