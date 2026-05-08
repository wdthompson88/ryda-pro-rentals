// Storyboard logic tests. The Sora driver + ffmpeg composer have
// real-world dependencies (browser + binaries) that we don't unit
// test here; this file locks in the deterministic prompt-building
// + vehicle-rotation logic so a refactor can't silently break it.

import { describe, it, expect } from "vitest";
import {
  buildStoryboard,
  pickTodaysVehicle,
  LAUNCH_INVENTORY,
  type SpotInput,
} from "../storyboard";

const sample: SpotInput = {
  vehicleType: "car",
  name: "458 Italia",
  vehicleDescription: "2014 Ferrari 458 Italia in Rosso Corsa",
  setting: "a sunlit garage",
  hook: "$32K for 1/10",
  cta: "RYDA · Q3 launch",
};

describe("buildStoryboard", () => {
  it("returns three 5-second shots adding up to 15s", () => {
    const sb = buildStoryboard(sample);
    expect(sb.totalDurationSec).toBe(15);
    expect(sb.shots).toHaveLength(3);
    const total = sb.shots.reduce((sum, s) => sum + s.durationSec, 0);
    expect(total).toBe(15);
  });

  it("places shots at consecutive start times", () => {
    const sb = buildStoryboard(sample);
    expect(sb.shots[0].startSec).toBe(0);
    expect(sb.shots[1].startSec).toBe(5);
    expect(sb.shots[2].startSec).toBe(10);
  });

  it("assigns the right overlay text per shot", () => {
    const sb = buildStoryboard(sample);
    expect(sb.shots[0].overlay).toBe("458 Italia");
    expect(sb.shots[1].overlay).toBe("$32K for 1/10");
    expect(sb.shots[2].overlay).toBe("RYDA · Q3 launch");
  });

  it("includes the vehicle description in every shot prompt", () => {
    const sb = buildStoryboard(sample);
    for (const shot of sb.shots) {
      expect(shot.prompt).toContain("Ferrari 458");
    }
  });

  it("references the setting in shot 1 (hero)", () => {
    const sb = buildStoryboard(sample);
    expect(sb.shots[0].prompt).toContain("sunlit garage");
  });

  it("uses car-specific kinetic phrasing for cars", () => {
    const sb = buildStoryboard(sample);
    expect(sb.shots[2].prompt).toMatch(/driving|coastal road/i);
    expect(sb.shots[2].prompt).not.toMatch(/wake|on the water/i);
  });

  it("uses boat-specific kinetic phrasing for boats", () => {
    const boat: SpotInput = {
      ...sample,
      vehicleType: "boat",
      name: "Riva Aquariva",
      vehicleDescription: "Riva Aquariva 33ft",
      setting: "Miami marina at sunrise",
    };
    const sb = buildStoryboard(boat);
    expect(sb.shots[2].prompt).toMatch(/wake|underway|on open water/i);
    expect(sb.shots[2].prompt).not.toMatch(/coastal road|driving/i);
  });

  it("respects detailOverride for shot 2", () => {
    const sb = buildStoryboard({
      ...sample,
      detailOverride: "A custom shot description here",
    });
    expect(sb.shots[1].prompt).toContain("A custom shot description here");
  });

  it("composes a caption that includes name, hook, CTA", () => {
    const sb = buildStoryboard(sample);
    expect(sb.caption).toContain("458 Italia");
    expect(sb.caption).toContain("$32K for 1/10");
    expect(sb.caption).toContain("RYDA · Q3 launch");
  });

  it("includes the cinematic style preamble in every shot", () => {
    const sb = buildStoryboard(sample);
    for (const shot of sb.shots) {
      // Style preamble specifically forbids on-screen text — locks
      // in the no-AI-text-overlay rule the post pipeline depends on.
      expect(shot.prompt).toMatch(/no on-screen text/i);
    }
  });
});

describe("LAUNCH_INVENTORY", () => {
  it("contains at least one car and one boat", () => {
    const cars = LAUNCH_INVENTORY.filter((v) => v.vehicleType === "car");
    const boats = LAUNCH_INVENTORY.filter((v) => v.vehicleType === "boat");
    expect(cars.length).toBeGreaterThan(0);
    expect(boats.length).toBeGreaterThan(0);
  });

  it("every entry has all required fields", () => {
    for (const v of LAUNCH_INVENTORY) {
      expect(v.name).toBeTruthy();
      expect(v.vehicleDescription).toBeTruthy();
      expect(v.setting).toBeTruthy();
      expect(v.hook).toBeTruthy();
      expect(v.cta).toBeTruthy();
    }
  });

  it("hooks fit within 24 chars (overlay budget)", () => {
    for (const v of LAUNCH_INVENTORY) {
      expect(v.hook.length).toBeLessThanOrEqual(24);
    }
  });

  it("CTAs fit within 32 chars (overlay budget)", () => {
    for (const v of LAUNCH_INVENTORY) {
      expect(v.cta.length).toBeLessThanOrEqual(32);
    }
  });
});

describe("pickTodaysVehicle", () => {
  it("returns a real entry from LAUNCH_INVENTORY", () => {
    const v = pickTodaysVehicle();
    expect(LAUNCH_INVENTORY).toContain(v);
  });

  it("is deterministic for a given date (idempotent same-day)", () => {
    const d = new Date("2026-05-08T12:00:00Z");
    expect(pickTodaysVehicle(d)).toBe(pickTodaysVehicle(d));
  });

  it("rotates through inventory across consecutive days", () => {
    const day1 = new Date("2026-05-08T12:00:00Z");
    const day2 = new Date("2026-05-09T12:00:00Z");
    const v1 = pickTodaysVehicle(day1);
    const v2 = pickTodaysVehicle(day2);
    // Adjacent days produce adjacent inventory indices, so the
    // chosen vehicles differ unless the inventory has only 1 entry.
    expect(v1).not.toBe(v2);
  });

  it("cycles back after one full inventory rotation", () => {
    const start = new Date("2026-05-08T12:00:00Z");
    const cycleLater = new Date(start);
    cycleLater.setDate(start.getDate() + LAUNCH_INVENTORY.length);
    expect(pickTodaysVehicle(start)).toBe(pickTodaysVehicle(cycleLater));
  });
});
