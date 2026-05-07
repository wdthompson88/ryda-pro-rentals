// fees.ts unit tests — pre-launch test harness item #1 per
// CODEX-CHALLENGE. The fees module's own header comment documents
// a real production divergence between client and server (the client
// showed flat $1,500 while the server charged 5%, $13,500 discrepancy
// on a $300k boat share). These tests would have caught that exact
// bug at the function level.

import { describe, it, expect } from "vitest";
import { ACQUISITION_FEE_PCT, computeFees } from "../fees";

describe("computeFees", () => {
  it("buyIn equals pricePerShare * shares", () => {
    expect(computeFees(34_000, 2).buyIn).toBe(68_000);
  });

  it("acquisitionFee is 5% of buyIn (rounded)", () => {
    const { buyIn, acquisitionFee } = computeFees(34_000, 2);
    expect(acquisitionFee).toBe(Math.round(buyIn * 0.05));
    expect(acquisitionFee).toBe(3_400);
  });

  it("total equals buyIn + acquisitionFee", () => {
    const { buyIn, acquisitionFee, total } = computeFees(34_000, 2);
    expect(total).toBe(buyIn + acquisitionFee);
  });

  it("matches ACQUISITION_FEE_PCT constant exactly", () => {
    expect(ACQUISITION_FEE_PCT).toBe(5);
    const { buyIn, acquisitionFee } = computeFees(100_000, 1);
    expect(acquisitionFee).toBe(Math.round(buyIn * (ACQUISITION_FEE_PCT / 100)));
  });

  it("handles minimum shares (2-share doctrine)", () => {
    const result = computeFees(50_000, 2);
    expect(result.buyIn).toBe(100_000);
    expect(result.acquisitionFee).toBe(5_000);
    expect(result.total).toBe(105_000);
  });

  it("handles maximum shares (10-share LLC cap)", () => {
    const result = computeFees(50_000, 10);
    expect(result.buyIn).toBe(500_000);
    expect(result.acquisitionFee).toBe(25_000);
    expect(result.total).toBe(525_000);
  });

  it("handles fractional cent rounding correctly", () => {
    // $33,333 * 5% = $1,666.65 -> rounds to $1,667
    const result = computeFees(33_333, 1);
    expect(result.acquisitionFee).toBe(1_667);
    expect(result.total).toBe(35_000);
  });

  it("would catch the documented $1,500-flat-vs-5%-pct bug", () => {
    // The historical bug: client showed $1,500 flat regardless of
    // share size, server charged 5%. For a $300K boat share that's
    // $1,500 vs $15,000. This test asserts no flat fallback.
    const expensive = computeFees(300_000, 1);
    expect(expensive.acquisitionFee).not.toBe(1_500);
    expect(expensive.acquisitionFee).toBe(15_000);
  });

  it("handles zero shares (edge case — should not divide by zero)", () => {
    const result = computeFees(34_000, 0);
    expect(result.buyIn).toBe(0);
    expect(result.acquisitionFee).toBe(0);
    expect(result.total).toBe(0);
  });
});
