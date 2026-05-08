// Tests for the dispute-status helpers used by the dispute webhook
// route + refund route. Pure functions, no Stripe / Supabase mocks.

import { describe, it, expect } from "vitest";
import {
  blocksRefund,
  isTerminalDisputeStatus,
  outcomeFor,
  purchaseDisputeStatusFor,
  type StripeDisputeStatus,
} from "../dispute-status";

const ALL_STATUSES: StripeDisputeStatus[] = [
  "warning_needs_response",
  "warning_under_review",
  "warning_closed",
  "needs_response",
  "under_review",
  "won",
  "lost",
  "charge_refunded",
];

describe("purchaseDisputeStatusFor", () => {
  it("maps in-flight statuses to 'disputed'", () => {
    const inFlight: StripeDisputeStatus[] = [
      "warning_needs_response",
      "warning_under_review",
      "needs_response",
      "under_review",
    ];
    for (const s of inFlight) {
      expect(purchaseDisputeStatusFor(s)).toBe("disputed");
    }
  });

  it("maps 'won' to 'dispute_won' (refunds unblock again)", () => {
    expect(purchaseDisputeStatusFor("won")).toBe("dispute_won");
  });

  it("maps 'lost' to 'dispute_lost' (funds gone, refunds gated)", () => {
    expect(purchaseDisputeStatusFor("lost")).toBe("dispute_lost");
  });

  it("keeps warning_closed as 'disputed' (audit trail preserved)", () => {
    expect(purchaseDisputeStatusFor("warning_closed")).toBe("disputed");
  });

  it("treats charge_refunded as 'disputed' (we proactively refunded)", () => {
    expect(purchaseDisputeStatusFor("charge_refunded")).toBe("disputed");
  });
});

describe("isTerminalDisputeStatus", () => {
  it("returns true for terminal lifecycle states", () => {
    expect(isTerminalDisputeStatus("won")).toBe(true);
    expect(isTerminalDisputeStatus("lost")).toBe(true);
    expect(isTerminalDisputeStatus("charge_refunded")).toBe(true);
    expect(isTerminalDisputeStatus("warning_closed")).toBe(true);
  });

  it("returns false for in-flight states", () => {
    expect(isTerminalDisputeStatus("warning_needs_response")).toBe(false);
    expect(isTerminalDisputeStatus("warning_under_review")).toBe(false);
    expect(isTerminalDisputeStatus("needs_response")).toBe(false);
    expect(isTerminalDisputeStatus("under_review")).toBe(false);
  });

  it("partitions all statuses (every status is either terminal or not)", () => {
    for (const s of ALL_STATUSES) {
      expect(typeof isTerminalDisputeStatus(s)).toBe("boolean");
    }
  });
});

describe("outcomeFor", () => {
  it("returns 'won' for winning Stripe terminus", () => {
    expect(outcomeFor("won")).toBe("won");
  });

  it("returns 'lost' for both 'lost' and 'charge_refunded'", () => {
    // We treat charge_refunded as 'lost' because the funds left
    // our balance either way — for risk-modeling, both are losses.
    expect(outcomeFor("lost")).toBe("lost");
    expect(outcomeFor("charge_refunded")).toBe("lost");
  });

  it("returns 'withdrawn' for warning_closed (the issuer never opened a real dispute)", () => {
    expect(outcomeFor("warning_closed")).toBe("withdrawn");
  });

  it("returns null for in-flight statuses (they're not terminal)", () => {
    expect(outcomeFor("warning_needs_response")).toBeNull();
    expect(outcomeFor("under_review")).toBeNull();
    expect(outcomeFor("needs_response")).toBeNull();
  });
});

describe("blocksRefund", () => {
  it("blocks refund while disputed (Stripe will reject anyway; explicit guard)", () => {
    expect(blocksRefund("disputed")).toBe(true);
  });

  it("blocks refund after dispute_lost (funds already gone)", () => {
    expect(blocksRefund("dispute_lost")).toBe(true);
  });

  it("permits refund after dispute_won (e.g. goodwill refund)", () => {
    expect(blocksRefund("dispute_won")).toBe(false);
  });

  it("permits refund when no dispute (the common case)", () => {
    expect(blocksRefund(null)).toBe(false);
  });
});
