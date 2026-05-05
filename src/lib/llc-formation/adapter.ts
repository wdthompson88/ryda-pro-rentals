// Provider-agnostic LLC formation adapter interface.
//
// Every concrete provider (./firstbase.ts, ./mock.ts, eventually
// ./atlas.ts, ./northwest.ts) implements this. Call sites — the
// admin trigger, the webhook handler, automated formation flows —
// only depend on this interface.
//
// Why this exists: research shows we'll likely outgrow Firstbase
// at ~50 LLCs/year and want to negotiate directly with Northwest
// Registered Agent. This adapter is the seam that makes that
// migration a one-file change.

import type {
  CreateFormationInput,
  FormationCreatedResponse,
  FormationDetails,
  FormationProvider,
  FormationWebhookEvent,
} from "./types";

export interface LLCFormationAdapter {
  /** Identifier for the underlying provider — used for logging + DB. */
  readonly provider: FormationProvider;

  /** Whether this adapter will hit a live API or returns mocks only. */
  readonly mode: "live" | "sandbox" | "mock";

  /**
   * Submit a new LLC formation. Returns synchronously after the
   * provider accepts the request; actual filing is async (poll or
   * await webhook for status).
   *
   * Throws if:
   *  - API credentials not configured
   *  - Provider returns a hard error (validation, name conflict, etc.)
   *  - Idempotency key was already used with different input
   */
  createFormation(
    input: CreateFormationInput,
  ): Promise<FormationCreatedResponse>;

  /**
   * Fetch current status for a formation. Used for admin "refresh"
   * button and for verification before sensitive operations (e.g.,
   * before issuing a member-onboarding email, confirm the LLC is
   * actually completed).
   */
  getFormation(providerId: string): Promise<FormationDetails>;

  /**
   * List all formations the provider knows about. Used for admin
   * reconciliation / drift detection. Optional — providers without
   * a list endpoint can throw "not_supported" and we'll fall back
   * to per-row getFormation calls.
   */
  listFormations?(): Promise<FormationDetails[]>;

  /**
   * Verify a webhook delivery's signature against the provider's
   * shared secret. Returns the parsed event on success, throws
   * otherwise. Caller passes raw body + headers; adapter extracts
   * the right header (e.g. Firstbase-Signature) per vendor.
   */
  verifyAndParseWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): FormationWebhookEvent;
}

/**
 * Resolve the active adapter based on environment. The selection rules:
 *
 *   1. If FIRSTBASE_API_KEY is set AND FIRSTBASE_MODE === "live", use the
 *      live Firstbase adapter.
 *   2. If FIRSTBASE_API_KEY is set AND FIRSTBASE_MODE !== "live"
 *      (default: "sandbox"), use the sandbox Firstbase adapter against
 *      api-sandbox.firstbase.io.
 *   3. Otherwise, use the mock adapter — returns plausible-shaped data
 *      so the admin UI renders, no network calls.
 *
 * The "live" gate is intentionally explicit: an env var typo or a
 * stray production deploy with sandbox keys won't accidentally form
 * a real LLC. Live mode requires FIRSTBASE_MODE="live" + a valid
 * key + the corresponding webhook secret.
 */
export function resolveAdapter(): LLCFormationAdapter {
  // Lazy import to keep the mock module out of the live bundle path
  // when not needed. Server-only code anyway.
  const apiKey = process.env.FIRSTBASE_API_KEY;
  const mode = process.env.FIRSTBASE_MODE ?? "sandbox";

  if (!apiKey) {
    // No credentials → mock. Logs a warning ONCE per cold-start so
    // the team notices in dev/preview if they expected live.
    if (typeof globalThis !== "undefined" && !(globalThis as Record<string, unknown>).__rydaLlcMockWarned) {
      console.warn(
        "[llc-formation] FIRSTBASE_API_KEY not set — using mock adapter. Real LLCs will NOT be formed.",
      );
      (globalThis as Record<string, unknown>).__rydaLlcMockWarned = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAdapter } = require("./mock");
    return mockAdapter;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createFirstbaseAdapter } = require("./firstbase");
  return createFirstbaseAdapter({
    apiKey,
    mode: mode === "live" ? "live" : "sandbox",
    webhookSecret: process.env.FIRSTBASE_WEBHOOK_SECRET ?? "",
  });
}
