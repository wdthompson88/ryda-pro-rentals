// Tests for the rate-limit ADAPTER RESOLVER (lib/rate-limit/index).
// The unit tests for the in-memory adapter live alongside in
// rate-limit.test.ts and import isAllowedInMemory directly.
//
// What we pin:
//  - When UPSTASH env vars are absent, the resolver delegates to
//    in-memory (so dev + tests don't need Redis).
//  - clientIp extraction is adapter-agnostic and lives in the
//    resolver (re-pinning the security-critical XFF behavior here
//    means a future refactor that moves the helper can't silently
//    drop the trust-the-edge-proxy contract).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isAllowed,
  clientIp,
  isUpstashConfigured,
} from "../rate-limit";

describe("isUpstashConfigured", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    // CAREFUL: assigning `undefined` to process.env.X stores the
    // string "undefined", not deletes the var. Use `delete` for
    // proper cleanup so the resolver-fallback tests below see the
    // env in its original state.
    if (originalUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    }
    if (originalToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    }
  });

  it("returns false when both env vars are missing", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isUpstashConfigured()).toBe(false);
  });

  it("returns false when only URL is set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isUpstashConfigured()).toBe(false);
  });

  it("returns false when only token is set", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = "tk";
    expect(isUpstashConfigured()).toBe(false);
  });

  it("returns true when both are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tk";
    expect(isUpstashConfigured()).toBe(true);
  });
});

describe("isAllowed (resolver) — falls back to in-memory when Upstash unconfigured", () => {
  // Tests run in node env without Upstash env set, so the resolver
  // hits the in-memory path. Behavior should match in-memory tests.
  it("allows requests up to limit then blocks", async () => {
    const key = `resolver-${Math.random()}`;
    expect(await isAllowed(key, 2, 60_000)).toBe(true);
    expect(await isAllowed(key, 2, 60_000)).toBe(true);
    expect(await isAllowed(key, 2, 60_000)).toBe(false);
  });

  it("isolates buckets per key", async () => {
    const a = `resolver-a-${Math.random()}`;
    const b = `resolver-b-${Math.random()}`;
    await isAllowed(a, 1, 60_000);
    await isAllowed(b, 1, 60_000);
    expect(await isAllowed(a, 1, 60_000)).toBe(false);
    expect(await isAllowed(b, 1, 60_000)).toBe(false);
  });
});

describe("clientIp", () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request("https://example.com", { headers });
  }

  it("returns the leftmost x-forwarded-for entry", () => {
    const req = makeReq({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3",
    });
    expect(clientIp(req)).toBe("1.1.1.1");
  });

  it("trims whitespace in xff entries", () => {
    const req = makeReq({ "x-forwarded-for": "  1.1.1.1  , 2.2.2.2" });
    expect(clientIp(req)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip when xff missing", () => {
    const req = makeReq({ "x-real-ip": "5.5.5.5" });
    expect(clientIp(req)).toBe("5.5.5.5");
  });

  it("returns 'unknown' as fail-closed when no headers present", () => {
    const req = makeReq({});
    // 'unknown' shared bucket is intentional: under load, all
    // unknown-IP requests share a single bucket and exhaust it
    // quickly. Better than per-request unique bucket = no rate
    // limit at all.
    expect(clientIp(req)).toBe("unknown");
  });
});
