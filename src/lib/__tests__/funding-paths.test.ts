// Tests for the pre-launch funding-path gate. The gate is the single
// source of truth for which payment methods can flow through the
// API + the UI. Pre-launch we have crypto + finance gated off (see
// lib/funding-paths.ts comments for the rationale).
//
// These tests pin the current gate state so a future "oops, just
// re-enable crypto" PR has to confront the regulatory rationale
// explicitly (the test fails, the developer reads why before
// flipping the flag).

import { describe, it, expect } from "vitest";
import {
  FUNDING_PATHS,
  enabledFundingMethods,
  isFundingMethodEnabled,
  type FundingMethod,
} from "../funding-paths";

describe("FUNDING_PATHS gate", () => {
  it("knows the full universe of funding methods", () => {
    expect(Object.keys(FUNDING_PATHS).sort()).toEqual([
      "ach",
      "card",
      "crypto",
      "finance",
      "liquidity",
      "wire",
    ]);
  });

  it("has the expected pre-launch enabled set (ach/wire/card/liquidity)", () => {
    // Pin the state. If you intentionally flip a flag in
    // funding-paths.ts, update this list AND make sure the relevant
    // compliance/legal item from .launch-prep/LAUNCH_PLAN.md is
    // closed first.
    expect(enabledFundingMethods().sort()).toEqual([
      "ach",
      "card",
      "liquidity",
      "wire",
    ]);
  });

  it("keeps crypto gated off pre-launch (no regulated exchange partner yet)", () => {
    expect(FUNDING_PATHS.crypto.enabled).toBe(false);
    expect(FUNDING_PATHS.crypto.comingSoonNote).toMatch(/exchange partner/i);
  });

  it("keeps finance gated off pre-launch (lending-license exposure)", () => {
    expect(FUNDING_PATHS.finance.enabled).toBe(false);
    expect(FUNDING_PATHS.finance.comingSoonNote).toMatch(/Florida counsel/i);
  });
});

describe("isFundingMethodEnabled", () => {
  it("accepts strings that are open methods", () => {
    expect(isFundingMethodEnabled("ach")).toBe(true);
    expect(isFundingMethodEnabled("wire")).toBe(true);
    expect(isFundingMethodEnabled("card")).toBe(true);
    expect(isFundingMethodEnabled("liquidity")).toBe(true);
  });

  it("rejects strings that are gated methods", () => {
    expect(isFundingMethodEnabled("crypto")).toBe(false);
    expect(isFundingMethodEnabled("finance")).toBe(false);
  });

  it("rejects garbage (defends the API route from unknown values)", () => {
    expect(isFundingMethodEnabled("")).toBe(false);
    expect(isFundingMethodEnabled("zelle")).toBe(false);
    expect(isFundingMethodEnabled("ACH")).toBe(false); // case-sensitive
    expect(isFundingMethodEnabled("__proto__")).toBe(false);
    expect(isFundingMethodEnabled("constructor")).toBe(false);
  });

  it("acts as a type guard at the type level", () => {
    const userInput: string = "wire";
    if (isFundingMethodEnabled(userInput)) {
      // userInput is now FundingMethod; this should compile.
      const m: FundingMethod = userInput;
      expect(m).toBe("wire");
    }
  });
});
