import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  executeMuapiWorkflow,
  extractMuapiOutputUrl,
  isMuapiConfigured,
  runMuapiPrediction,
} from "../muapi";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.MUAPI_API_KEY = "muapi-test";
  process.env.MUAPI_BASE_URL = "https://muapi.test";
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("isMuapiConfigured", () => {
  it("is true iff MUAPI_API_KEY is present", () => {
    expect(isMuapiConfigured()).toBe(true);
    delete process.env.MUAPI_API_KEY;
    expect(isMuapiConfigured()).toBe(false);
  });
});

describe("extractMuapiOutputUrl", () => {
  it("extracts common Open Generative AI output shapes", () => {
    expect(extractMuapiOutputUrl({ outputs: ["https://x.test/a.png"] })).toBe(
      "https://x.test/a.png",
    );
    expect(extractMuapiOutputUrl({ output: { url: "https://x.test/b.mp4" } })).toBe(
      "https://x.test/b.mp4",
    );
    expect(extractMuapiOutputUrl({ data: { url: "https://x.test/c.png" } })).toBe(
      "https://x.test/c.png",
    );
  });
});

describe("runMuapiPrediction", () => {
  it("submits, polls, and returns the output URL", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ request_id: "req_123" }))
      .mockResolvedValueOnce(
        jsonResponse({ status: "completed", outputs: ["https://cdn.test/out.png"] }),
      );

    const result = await runMuapiPrediction(
      "qwen-image",
      { prompt: "hello" },
      { maxAttempts: 1, intervalMs: 0 },
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://muapi.test/api/v1/qwen-image",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://muapi.test/api/v1/predictions/req_123/result",
      expect.any(Object),
    );
    expect(result.requestId).toBe("req_123");
    expect(result.outputUrl).toBe("https://cdn.test/out.png");
  });

  it("surfaces failed generations", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ request_id: "req_123" }))
      .mockResolvedValueOnce(jsonResponse({ status: "failed", error: "bad prompt" }));

    await expect(
      runMuapiPrediction("qwen-image", { prompt: "hello" }, { maxAttempts: 1, intervalMs: 0 }),
    ).rejects.toThrow("bad prompt");
  });
});

describe("executeMuapiWorkflow", () => {
  it("submits workflow inputs and polls outputs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ run_id: "run_123" }))
      .mockResolvedValueOnce(
        jsonResponse({ status: "completed", output: { url: "https://cdn.test/out.mp4" } }),
      );

    const result = await executeMuapiWorkflow(
      "workflow_1",
      { prompt: "ryda ad" },
      { maxAttempts: 1, intervalMs: 0 },
    );

    expect(result.runId).toBe("run_123");
    expect(result.outputUrl).toBe("https://cdn.test/out.mp4");
  });
});
