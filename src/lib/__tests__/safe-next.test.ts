// safe-next.ts unit tests — pre-launch test harness item #2 per
// CODEX-CHALLENGE. This function guards every auth redirect in the
// application (signin, signup, auth/callback, kyc/start). It is
// described in its own comment as "classic phishing vector"
// protection. The regex on line 49 and percent-encoding check on
// line 57 are subtle and highly susceptible to regression.

import { describe, it, expect } from "vitest";
import { safeNext } from "../safe-next";

describe("safeNext — happy paths", () => {
  it("allows bare /", () => {
    expect(safeNext("/")).toBe("/");
  });

  it("allows /account", () => {
    expect(safeNext("/account")).toBe("/account");
  });

  it("allows /portfolio/f458", () => {
    expect(safeNext("/portfolio/f458")).toBe("/portfolio/f458");
  });

  it("allows query-only paths /?ref=miami", () => {
    expect(safeNext("/?ref=miami")).toBe("/?ref=miami");
  });

  it("allows fragment-only paths /#section", () => {
    expect(safeNext("/#section")).toBe("/#section");
  });

  it("trims whitespace before validation", () => {
    expect(safeNext("  /account  ")).toBe("/account");
  });
});

describe("safeNext — open-redirect attack vectors", () => {
  it("rejects protocol-relative URL //evil.com", () => {
    expect(safeNext("//evil.com")).toBe("/account");
  });

  it("rejects absolute https URL", () => {
    expect(safeNext("https://evil.com")).toBe("/account");
  });

  it("rejects absolute http URL", () => {
    expect(safeNext("http://evil.com")).toBe("/account");
  });

  it("rejects javascript: scheme", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/account");
  });

  it("rejects data: scheme", () => {
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBe("/account");
  });

  it("rejects vbscript: scheme", () => {
    expect(safeNext("vbscript:msgbox(1)")).toBe("/account");
  });
});

describe("safeNext — backslash + encoded tricks", () => {
  it("rejects backslash anywhere /\\evil.com", () => {
    expect(safeNext("/\\evil.com")).toBe("/account");
  });

  it("rejects percent-encoded backslash %5C", () => {
    expect(safeNext("/%5Cevil.com")).toBe("/account");
  });

  it("rejects percent-encoded backslash uppercase %5C", () => {
    expect(safeNext("/%5cevil.com")).toBe("/account");
  });

  it("rejects double-encoded // %2F%2F", () => {
    expect(safeNext("%2F%2Fevil.com")).toBe("/account");
  });

  it("rejects mixed-case double-encoded %2f%2F", () => {
    expect(safeNext("%2f%2Fevil.com")).toBe("/account");
  });
});

describe("safeNext — type + length safety", () => {
  it("rejects null", () => {
    expect(safeNext(null)).toBe("/account");
  });

  it("rejects undefined", () => {
    expect(safeNext(undefined)).toBe("/account");
  });

  it("rejects empty string", () => {
    expect(safeNext("")).toBe("/account");
  });

  it("rejects string over 512 chars", () => {
    const long = "/" + "a".repeat(512);
    expect(safeNext(long)).toBe("/account");
  });

  it("accepts string at exactly 512 chars", () => {
    const ok = "/" + "a".repeat(511);
    expect(safeNext(ok)).toBe(ok);
  });

  it("uses provided fallback when input is unsafe", () => {
    expect(safeNext("https://evil.com", "/signin")).toBe("/signin");
  });
});

describe("safeNext — control + Unicode bidi spoofing", () => {
  it("rejects control character \\x00", () => {
    expect(safeNext("/account\x00evil")).toBe("/account");
  });

  it("rejects control character \\x1F", () => {
    expect(safeNext("/account\x1Fevil")).toBe("/account");
  });

  it("rejects DEL character \\x7F", () => {
    expect(safeNext("/account\x7Fevil")).toBe("/account");
  });

  it("rejects right-to-left override U+202E", () => {
    expect(safeNext("/account‮evil")).toBe("/account");
  });

  it("rejects zero-width space U+200B", () => {
    expect(safeNext("/account​evil")).toBe("/account");
  });

  it("rejects byte-order mark U+FEFF", () => {
    expect(safeNext("/account﻿evil")).toBe("/account");
  });
});
