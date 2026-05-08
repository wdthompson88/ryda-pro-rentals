// Tests for the dropbox-sign claim-then-mark state machine.
// Pure-function tests: no Supabase, no Next.js, no time mocking.
// We pass `now` explicitly so timing edges are deterministic.

import { describe, it, expect } from "vitest";
import {
  decideClaimAction,
  STALE_CLAIM_MS,
  type ExistingClaim,
} from "../dropbox-sign-claims";

const NOW = new Date("2026-05-08T12:00:00Z");

function rowAt(receivedAtIso: string, processedAtIso: string | null = null): ExistingClaim {
  return { received_at: receivedAtIso, processed_at: processedAtIso };
}

describe("decideClaimAction", () => {
  it("returns claim_and_process when no row exists", () => {
    expect(decideClaimAction(null, NOW)).toEqual({ action: "claim_and_process" });
  });

  it("returns already_processed when processed_at is set", () => {
    const row = rowAt("2026-05-08T11:59:00Z", "2026-05-08T11:59:30Z");
    expect(decideClaimAction(row, NOW)).toEqual({ action: "already_processed" });
  });

  it("returns in_flight for an unprocessed claim within stale window", () => {
    // Claimed 1 minute ago, no processed_at yet.
    const row = rowAt("2026-05-08T11:59:00Z", null);
    const decision = decideClaimAction(row, NOW);
    expect(decision.action).toBe("in_flight");
    if (decision.action === "in_flight") {
      expect(decision.ageMs).toBe(60_000);
    }
  });

  it("returns take_over for an unprocessed claim past stale window", () => {
    // Claimed 6 minutes ago — STALE_CLAIM_MS is 5 minutes.
    const row = rowAt("2026-05-08T11:54:00Z", null);
    const decision = decideClaimAction(row, NOW);
    expect(decision.action).toBe("take_over");
    if (decision.action === "take_over") {
      expect(decision.ageMs).toBe(6 * 60_000);
    }
  });

  it("returns take_over exactly at the stale-window boundary (>=)", () => {
    // Claimed exactly STALE_CLAIM_MS ago.
    const claimedAt = new Date(NOW.getTime() - STALE_CLAIM_MS);
    const row = rowAt(claimedAt.toISOString(), null);
    expect(decideClaimAction(row, NOW).action).toBe("take_over");
  });

  it("returns in_flight 1ms before the stale boundary", () => {
    const claimedAt = new Date(NOW.getTime() - STALE_CLAIM_MS + 1);
    const row = rowAt(claimedAt.toISOString(), null);
    expect(decideClaimAction(row, NOW).action).toBe("in_flight");
  });

  it("treats unparseable received_at as definitely stale (defensive)", () => {
    // Corrupt row from some future bug — fall through to take_over
    // rather than block forever on an in_flight verdict we can't
    // trust.
    const row = rowAt("garbage", null);
    const decision = decideClaimAction(row, NOW);
    expect(decision.action).toBe("take_over");
  });

  it("respects custom staleMs override (used by tests)", () => {
    // 100 ms stale window.
    const row = rowAt(new Date(NOW.getTime() - 50).toISOString(), null);
    expect(decideClaimAction(row, NOW, 100).action).toBe("in_flight");
    const row2 = rowAt(new Date(NOW.getTime() - 200).toISOString(), null);
    expect(decideClaimAction(row2, NOW, 100).action).toBe("take_over");
  });

  it("future-dated received_at (clock skew) returns in_flight (negative age)", () => {
    // Defensive: if a worker on a clock-ahead instance claims and
    // we look it up from a clock-behind instance, ageMs is
    // negative. Treat as in_flight (don't take over a "claim from
    // the future").
    const futureClaim = rowAt(
      new Date(NOW.getTime() + 30_000).toISOString(),
      null,
    );
    expect(decideClaimAction(futureClaim, NOW).action).toBe("in_flight");
  });
});
