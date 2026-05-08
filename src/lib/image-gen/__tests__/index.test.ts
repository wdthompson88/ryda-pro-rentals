// Smoke tests for the image-gen subsystem.
//
// We don't hit OpenAI in tests — that would (a) burn money on CI
// and (b) be flaky. The mock adapter writes a 1x1 PNG to disk, which
// is enough to exercise the dispatcher + status helpers. The real
// network path (openai-images.ts) is covered manually via the
// /api/admin/generate-image route in dev with OPENAI_API_KEY set.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  generateImage,
  getAdapter,
  getDefaultAdapter,
  imageVendorStatus,
} from "../index";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ryda-imggen-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("getAdapter", () => {
  it("returns the openai-images adapter by name", () => {
    const adapter = getAdapter("openai-images");
    expect(adapter?.vendor).toBe("openai-images");
  });

  it("returns the mock adapter by name", () => {
    const adapter = getAdapter("mock");
    expect(adapter?.vendor).toBe("mock");
  });

  it("returns null for vendors that aren't wired", () => {
    expect(getAdapter("recraft")).toBeNull();
    expect(getAdapter("stability")).toBeNull();
  });
});

describe("getDefaultAdapter", () => {
  it("returns null when OPENAI_API_KEY is unset (does NOT fall through to mock)", () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      expect(getDefaultAdapter()).toBeNull();
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });

  it("returns openai-images adapter when OPENAI_API_KEY is set", () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-fake";
    try {
      const adapter = getDefaultAdapter();
      expect(adapter?.vendor).toBe("openai-images");
    } finally {
      if (prev === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = prev;
      }
    }
  });
});

describe("generateImage with mock vendor", () => {
  it("writes a real PNG file to disk and returns its path", async () => {
    const result = await generateImage(
      { prompt: "anything; mock ignores this" },
      tmpDir,
      "test-output.png",
      { vendor: "mock" },
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.vendor).toBe("mock");
    expect(result.costCents).toBe(0);
    const stat = await fs.stat(result.path);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("appends .png if filename lacks the extension", async () => {
    const result = await generateImage(
      { prompt: "anything" },
      tmpDir,
      "no-extension",
      { vendor: "mock" },
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.path.endsWith(".png")).toBe(true);
  });

  it("creates outDir if it doesn't exist", async () => {
    const nested = path.join(tmpDir, "deep", "nested", "dir");
    const result = await generateImage(
      { prompt: "anything" },
      nested,
      "x.png",
      { vendor: "mock" },
    );
    expect(result.kind).toBe("ok");
    const stat = await fs.stat(nested);
    expect(stat.isDirectory()).toBe(true);
  });
});

describe("generateImage with openai-images vendor (no key)", () => {
  it("returns not_configured when OPENAI_API_KEY is unset", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await generateImage(
        { prompt: "anything" },
        tmpDir,
        "x.png",
        { vendor: "openai-images" },
      );
      expect(result.kind).toBe("not_configured");
      if (result.kind !== "not_configured") return;
      expect(result.missingEnv).toContain("OPENAI_API_KEY");
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });
});

describe("imageVendorStatus", () => {
  it("reports openai-images as configured iff OPENAI_API_KEY is set", () => {
    const prev = process.env.OPENAI_API_KEY;

    delete process.env.OPENAI_API_KEY;
    let status = imageVendorStatus();
    let oai = status.find((s) => s.vendor === "openai-images");
    expect(oai?.configured).toBe(false);

    process.env.OPENAI_API_KEY = "sk-test-fake";
    status = imageVendorStatus();
    oai = status.find((s) => s.vendor === "openai-images");
    expect(oai?.configured).toBe(true);

    if (prev === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = prev;
    }
  });

  it("always reports mock as configured", () => {
    const status = imageVendorStatus();
    const m = status.find((s) => s.vendor === "mock");
    expect(m?.configured).toBe(true);
  });

  it("reports recraft and stability as not configured (placeholders)", () => {
    const status = imageVendorStatus();
    expect(status.find((s) => s.vendor === "recraft")?.configured).toBe(false);
    expect(status.find((s) => s.vendor === "stability")?.configured).toBe(false);
  });
});
