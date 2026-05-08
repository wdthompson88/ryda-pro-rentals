// Pure-logic tests for the Content-Length validator used by the
// CSP report sink. The route handler at src/app/api/csp-report/
// route.ts imports the same `isAcceptableContentLength` from
// lib/content-length, so this test pins the predicate directly
// (codex round-4 caught that earlier draft duplicated the regex
// in-test; that didn't prove the route stayed in sync).
//
// Codex rounds 1-3 caught a chain of bypasses on the size cap:
// - R1: req.text() called BEFORE size check — buffered the whole
//   body before rejecting.
// - R2: Content-Length missing or chunked-encoded skipped the check.
// - R3: Number() coerces "", "1.5", "0x10", "1e3" to finite numbers
//   that pass naive isFinite/>=0 checks.

import { describe, it, expect } from "vitest";
import { isAcceptableContentLength } from "../content-length";

describe("CSP report sink Content-Length validator", () => {
  describe("accepts legitimate browser-sent values", () => {
    it.each([
      "0",
      "1",
      "256",
      "1024",
      "8192", // exactly at cap
    ])("accepts %s", (val) => {
      expect(isAcceptableContentLength(val)).toBe(true);
    });
  });

  describe("rejects oversized values", () => {
    it.each([
      "8193",
      "10000",
      "1000000",
      "999999999999",
    ])("rejects %s", (val) => {
      expect(isAcceptableContentLength(val)).toBe(false);
    });
  });

  describe("rejects missing or malformed headers (codex R2 + R3)", () => {
    it.each([
      [null, "null header"],
      ["", "empty string"],
      ["   ", "whitespace only"],
      ["1.5", "decimal"],
      ["1e3", "scientific notation"],
      ["0x10", "hex"],
      ["-1", "negative"],
      ["+5", "plus prefix"],
      ["abc", "alphabetic"],
      ["100abc", "trailing junk"],
      ["abc100", "leading junk"],
      ["100,200", "comma-separated (chunked-style)"],
      [" 100 200 ", "space-separated"],
      ["NaN", "NaN literal"],
      ["Infinity", "Infinity literal"],
      ["null", "null literal"],
      ["undefined", "undefined literal"],
    ])("rejects %s (%s)", (val, _label) => {
      expect(isAcceptableContentLength(val as string | null)).toBe(false);
    });
  });

  describe("size-cap edge cases", () => {
    it("trims whitespace before validating", () => {
      // Browsers don't send whitespace-padded headers, but be lenient
      // on accidental proxy normalization.
      expect(isAcceptableContentLength("  100  ")).toBe(true);
    });

    it("treats leading zeros as valid (e.g. '0008192')", () => {
      // Conservative: integer regex allows it; parseInt drops zeros.
      expect(isAcceptableContentLength("00100")).toBe(true);
      expect(isAcceptableContentLength("00008192")).toBe(true);
    });

    it("rejects values that overflow MAX_REPORT_BYTES (regression for the chained bypass)", () => {
      // Specifically the values codex round-3 called out.
      expect(isAcceptableContentLength("99999")).toBe(false);
      expect(isAcceptableContentLength("18446744073709551615")).toBe(false);
    });
  });
});
