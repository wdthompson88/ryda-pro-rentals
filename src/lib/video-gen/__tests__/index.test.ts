// Smoke tests for the video-gen subsystem.
//
// We don't hit fal.ai or OpenAI in tests — that would burn money
// on CI and be flaky. The mock adapter writes a tiny MP4 to disk,
// which is enough to exercise the dispatcher + status helpers.
// Real-network paths (seedance.ts, openai-sora.ts) are exercised
// manually via the daily-spot orchestrator with FAL_KEY set.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  generateClip,
  getAdapter,
  getDefaultAdapter,
  videoVendorStatus,
} from "../index";

let tmpDir: string;
const ENV_KEYS_TO_PRESERVE = ["FAL_KEY", "OPENAI_API_KEY"];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ryda-vidgen-"));
  // Snapshot env so individual tests can mutate freely.
  for (const k of ENV_KEYS_TO_PRESERVE) savedEnv[k] = process.env[k];
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  for (const k of ENV_KEYS_TO_PRESERVE) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("getAdapter", () => {
  it("returns the seedance adapter by name", () => {
    expect(getAdapter("seedance")?.vendor).toBe("seedance");
  });

  it("returns the openai-sora legacy adapter by name", () => {
    expect(getAdapter("openai-sora")?.vendor).toBe("openai-sora");
  });

  it("returns the mock adapter by name", () => {
    expect(getAdapter("mock")?.vendor).toBe("mock");
  });

  it("returns null for vendors not yet wired", () => {
    expect(getAdapter("runway")).toBeNull();
    expect(getAdapter("luma")).toBeNull();
    expect(getAdapter("kling")).toBeNull();
  });
});

describe("getDefaultAdapter (vendor preference)", () => {
  it("returns null when no API keys are set (no auto-fallback to mock)", () => {
    delete process.env.FAL_KEY;
    delete process.env.OPENAI_API_KEY;
    expect(getDefaultAdapter()).toBeNull();
  });

  it("prefers seedance when FAL_KEY is present", () => {
    process.env.FAL_KEY = "fal-test-fake";
    delete process.env.OPENAI_API_KEY;
    expect(getDefaultAdapter()?.vendor).toBe("seedance");
  });

  it("falls back to openai-sora when only OPENAI_API_KEY is set", () => {
    delete process.env.FAL_KEY;
    process.env.OPENAI_API_KEY = "sk-test-fake";
    expect(getDefaultAdapter()?.vendor).toBe("openai-sora");
  });

  it("prefers seedance over sora when BOTH keys are present", () => {
    process.env.FAL_KEY = "fal-test-fake";
    process.env.OPENAI_API_KEY = "sk-test-fake";
    expect(getDefaultAdapter()?.vendor).toBe("seedance");
  });
});

describe("generateClip with mock vendor", () => {
  it("writes an MP4 to disk and returns the path", async () => {
    const result = await generateClip(
      { prompt: "anything", durationSec: 5 },
      tmpDir,
      "test-output.mp4",
      { vendor: "mock" },
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.vendor).toBe("mock");
    expect(result.costCents).toBe(0);
    expect(result.durationSec).toBe(5);
    const stat = await fs.stat(result.path);
    expect(stat.isFile()).toBe(true);
  });

  it("appends .mp4 if filename lacks the extension", async () => {
    const result = await generateClip(
      { prompt: "anything", durationSec: 5 },
      tmpDir,
      "no-extension",
      { vendor: "mock" },
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.path.endsWith(".mp4")).toBe(true);
  });
});

describe("generateClip with seedance vendor (no key)", () => {
  it("returns not_configured listing FAL_KEY when key is unset", async () => {
    delete process.env.FAL_KEY;
    const result = await generateClip(
      { prompt: "anything", durationSec: 5 },
      tmpDir,
      "x.mp4",
      { vendor: "seedance" },
    );
    expect(result.kind).toBe("not_configured");
    if (result.kind !== "not_configured") return;
    expect(result.missingEnv).toContain("FAL_KEY");
  });
});

describe("generateClip with openai-sora vendor (no key)", () => {
  it("returns not_configured listing OPENAI_API_KEY when key is unset", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await generateClip(
      { prompt: "anything", durationSec: 5 },
      tmpDir,
      "x.mp4",
      { vendor: "openai-sora" },
    );
    expect(result.kind).toBe("not_configured");
    if (result.kind !== "not_configured") return;
    expect(result.missingEnv).toContain("OPENAI_API_KEY");
  });
});

describe("videoVendorStatus", () => {
  it("reports seedance as configured iff FAL_KEY is set", () => {
    delete process.env.FAL_KEY;
    let status = videoVendorStatus();
    let s = status.find((x) => x.vendor === "seedance");
    expect(s?.configured).toBe(false);

    process.env.FAL_KEY = "fal-test-fake";
    status = videoVendorStatus();
    s = status.find((x) => x.vendor === "seedance");
    expect(s?.configured).toBe(true);
  });

  it("always reports mock as configured", () => {
    const status = videoVendorStatus();
    expect(status.find((x) => x.vendor === "mock")?.configured).toBe(true);
  });

  it("reports unwired vendors (runway, luma, kling) as not configured", () => {
    const status = videoVendorStatus();
    expect(status.find((x) => x.vendor === "runway")?.configured).toBe(false);
    expect(status.find((x) => x.vendor === "luma")?.configured).toBe(false);
    expect(status.find((x) => x.vendor === "kling")?.configured).toBe(false);
  });
});
