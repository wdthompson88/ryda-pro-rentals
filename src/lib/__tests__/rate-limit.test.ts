// rate-limit.ts unit tests — pre-launch test harness item #3.
// In-memory token bucket protects every public-write endpoint. The
// LRU eviction at MAX_KEYS is non-trivial logic and the clientIp
// extraction has security implications (relies on Vercel xff rewrite).
//
// LRU eviction at MAX_KEYS=5000 is intentionally NOT covered here:
// it requires synthesising 5k+ unique keys which is brittle in a fast
// unit test and gives little real-world signal. Post-launch backlog:
// integration test against the eviction edge using a higher-cadence
// load shape, or migrate to Upstash Redis (architecture finding).

import { describe, it, expect } from "vitest";
import { isAllowed, clientIp } from "../rate-limit";

describe("isAllowed — basic token bucket", () => {
  // Use unique keys per test to avoid module-scoped Map pollution.

  it("allows requests up to limit", () => {
    const key = `t1-${Math.random()}`;
    expect(isAllowed(key, 3, 60_000)).toBe(true);
    expect(isAllowed(key, 3, 60_000)).toBe(true);
    expect(isAllowed(key, 3, 60_000)).toBe(true);
  });

  it("blocks request after limit reached", () => {
    const key = `t2-${Math.random()}`;
    isAllowed(key, 2, 60_000);
    isAllowed(key, 2, 60_000);
    expect(isAllowed(key, 2, 60_000)).toBe(false);
  });

  it("different keys have independent buckets", () => {
    const a = `t3a-${Math.random()}`;
    const b = `t3b-${Math.random()}`;
    isAllowed(a, 1, 60_000);
    expect(isAllowed(a, 1, 60_000)).toBe(false);
    expect(isAllowed(b, 1, 60_000)).toBe(true);
  });

  it("blocks 2nd call when limit=1 (first call seeds bucket count=1)", () => {
    // Documenting actual behavior: bucket creation always returns true
    // (count starts at 1). The limit gates only subsequent requests.
    // limit=0 is a degenerate case — first call still passes because
    // `b.count <= limit` is only checked on the increment path.
    const key = `t4-${Math.random()}`;
    expect(isAllowed(key, 1, 60_000)).toBe(true);
    expect(isAllowed(key, 1, 60_000)).toBe(false);
  });

  it("resets bucket after windowMs elapses", () => {
    // Core token-bucket semantic — without window expiry the limiter
    // never recovers and would permanently block legit users after
    // the first burst. The reset path lives in the bucket-creation
    // branch (b.resetAt <= now triggers fresh bucket).
    const key = `t5-${Math.random()}`;
    // Use a 1ms window so we can wait past it deterministically.
    expect(isAllowed(key, 1, 1)).toBe(true);
    expect(isAllowed(key, 1, 1)).toBe(false);
    // Wait past the window. setTimeout(0) doesn't advance Date.now;
    // a small sleep is reliable for this assertion.
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(isAllowed(key, 1, 1)).toBe(true);
        resolve();
      }, 5),
    );
  });
});

describe("clientIp — xff and fallback chain", () => {
  function reqWith(headers: Record<string, string>): Request {
    return new Request("https://example.com/", { headers });
  }

  it("returns first value from x-forwarded-for", () => {
    const req = reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from xff value", () => {
    const req = reqWith({ "x-forwarded-for": "  1.2.3.4  , 5.6.7.8" });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when xff absent", () => {
    const req = reqWith({ "x-real-ip": "9.9.9.9" });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when neither header present", () => {
    const req = reqWith({});
    expect(clientIp(req)).toBe("unknown");
  });

  it("xff takes precedence over x-real-ip", () => {
    const req = reqWith({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "9.9.9.9",
    });
    expect(clientIp(req)).toBe("1.1.1.1");
  });
});
