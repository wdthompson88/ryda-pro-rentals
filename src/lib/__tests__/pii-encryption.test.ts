// Tests for AES-256-GCM PII encryption.
// Pure-function tests — uses a fixed test key so output is
// reproducible across runs (real prod key lives in Vercel env).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "crypto";
import {
  encryptJson,
  decryptJson,
  decryptVerifiedOutputs,
  isPiiEncryptionConfigured,
} from "../pii-encryption";

// 32-byte test key, base64-encoded. Deterministic so two test
// runs produce different ciphertexts (random IV) but the same
// roundtrip semantics.
const TEST_KEY_BASE64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe("pii-encryption", () => {
  const originalKey = process.env.KYC_PII_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.KYC_PII_ENCRYPTION_KEY = TEST_KEY_BASE64;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.KYC_PII_ENCRYPTION_KEY;
    } else {
      process.env.KYC_PII_ENCRYPTION_KEY = originalKey;
    }
  });

  describe("isPiiEncryptionConfigured", () => {
    it("returns true with a valid 32-byte base64 key", () => {
      expect(isPiiEncryptionConfigured()).toBe(true);
    });

    it("returns false when key env var is missing", () => {
      delete process.env.KYC_PII_ENCRYPTION_KEY;
      expect(isPiiEncryptionConfigured()).toBe(false);
    });

    it("returns false when key decodes to wrong length", () => {
      // 16-byte key (AES-128 instead of 256) — should fail the
      // length check.
      process.env.KYC_PII_ENCRYPTION_KEY = randomBytes(16).toString("base64");
      expect(isPiiEncryptionConfigured()).toBe(false);
    });
  });

  describe("encryptJson + decryptJson roundtrip", () => {
    it("roundtrips a typical verified_outputs payload", () => {
      const payload = {
        first_name: "Alice",
        last_name: "Member",
        dob: { day: 14, month: 3, year: 1984 },
        address: { line1: "1 Brickell", city: "Miami", state: "FL" },
        id_number: "X12345",
      };
      const ct = encryptJson(payload);
      expect(decryptJson(ct)).toEqual(payload);
    });

    it("produces a different ciphertext each call (random IV)", () => {
      const payload = { x: 1 };
      const a = encryptJson(payload);
      const b = encryptJson(payload);
      expect(a).not.toBe(b);
      // But both decrypt to the same value.
      expect(decryptJson(a)).toEqual(payload);
      expect(decryptJson(b)).toEqual(payload);
    });

    it("handles unicode without truncation (multi-byte UTF-8)", () => {
      const payload = { name: "李 王 — éàü 🚗" };
      expect(decryptJson(encryptJson(payload))).toEqual(payload);
    });

    it("roundtrips null + booleans + arrays + nested", () => {
      const payload = {
        n: null,
        b: true,
        f: false,
        arr: [1, "two", { three: 3 }],
        nested: { a: { b: { c: "deep" } } },
      };
      expect(decryptJson(encryptJson(payload))).toEqual(payload);
    });
  });

  describe("tamper detection (security contract)", () => {
    it("throws when ciphertext is truncated", () => {
      const ct = encryptJson({ foo: "bar" });
      const truncated = ct.slice(0, 20);
      expect(() => decryptJson(truncated)).toThrow();
    });

    it("throws when key version byte is wrong", () => {
      const ct = encryptJson({ foo: "bar" });
      const buf = Buffer.from(ct, "base64");
      buf[0] = 0xff; // unknown version
      const tampered = buf.toString("base64");
      expect(() => decryptJson(tampered)).toThrow(/key version/i);
    });

    it("throws when ciphertext byte is flipped (auth tag mismatch)", () => {
      const ct = encryptJson({ foo: "bar" });
      const buf = Buffer.from(ct, "base64");
      // Flip a byte in the ciphertext payload (after version + iv + tag).
      const lastByte = buf.length - 1;
      buf[lastByte] = buf[lastByte] ^ 0xff;
      expect(() => decryptJson(buf.toString("base64"))).toThrow();
    });

    it("throws when auth tag byte is flipped", () => {
      const ct = encryptJson({ foo: "bar" });
      const buf = Buffer.from(ct, "base64");
      // Tag is bytes [13..29).
      buf[20] = buf[20] ^ 0xff;
      expect(() => decryptJson(buf.toString("base64"))).toThrow();
    });

    it("throws when IV byte is flipped (changes decryption stream)", () => {
      const ct = encryptJson({ foo: "bar" });
      const buf = Buffer.from(ct, "base64");
      // IV is bytes [1..13).
      buf[5] = buf[5] ^ 0xff;
      expect(() => decryptJson(buf.toString("base64"))).toThrow();
    });
  });

  describe("decryptVerifiedOutputs", () => {
    it("returns the typed shape on success", () => {
      const payload = {
        first_name: "Alice",
        dob: { day: 1, month: 1, year: 1990 },
      };
      const ct = encryptJson(payload);
      const result = decryptVerifiedOutputs(ct);
      expect(result?.first_name).toBe("Alice");
      expect(result?.dob?.year).toBe(1990);
    });

    it("returns null for ciphertext of literal null", () => {
      const ct = encryptJson(null);
      expect(decryptVerifiedOutputs(ct)).toBeNull();
    });
  });

  describe("key configuration", () => {
    it("encryptJson throws when key is missing (fail fast at write)", () => {
      delete process.env.KYC_PII_ENCRYPTION_KEY;
      expect(() => encryptJson({ a: 1 })).toThrow(/not set/i);
    });

    it("decryptJson throws when key is missing (fail loud)", () => {
      const validCt = encryptJson({ a: 1 });
      delete process.env.KYC_PII_ENCRYPTION_KEY;
      expect(() => decryptJson(validCt)).toThrow();
    });

    it("decryptJson throws when wrong key is used (auth tag mismatch)", () => {
      const ct = encryptJson({ a: 1 });
      // Swap key.
      process.env.KYC_PII_ENCRYPTION_KEY = randomBytes(32).toString("base64");
      expect(() => decryptJson(ct)).toThrow();
    });
  });
});
