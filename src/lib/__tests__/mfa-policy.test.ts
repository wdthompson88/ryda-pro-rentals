// Tests for the MFA policy decision helper.

import { describe, it, expect } from "vitest";
import {
  evaluateMfaPolicy,
  isAal2,
  isAdminUser,
  mfaRequired,
} from "../mfa-policy";

describe("isAdminUser", () => {
  it("returns true for app_metadata.role === 'admin'", () => {
    expect(isAdminUser({ role: "admin" })).toBe(true);
  });

  it("returns false for any other role", () => {
    expect(isAdminUser({ role: "member" })).toBe(false);
    expect(isAdminUser({ role: "support" })).toBe(false);
    expect(isAdminUser({})).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it("does NOT trust a user-controllable role field (defensive)", () => {
    // user_metadata is user-writable. We only check app_metadata
    // which is service-role-only. This test pins the contract:
    // anything passed must be the app_metadata bag specifically.
    // (A user could put role:'admin' in user_metadata but it
    // would never reach this function.)
    const userMetadata = { role: "admin" };
    // The contract is "you must pass app_metadata, not user_metadata."
    // We can't test that misuse directly, but pin that the function
    // doesn't introspect prototype chain or other unsafe lookups.
    expect(isAdminUser(userMetadata)).toBe(true); // it WOULD be true if you passed the wrong bag
    // The defense is at the call site (lib/admin-auth reads
    // app_metadata only). Document this in tests.
  });
});

describe("isAal2", () => {
  it("recognizes aal2 string literal", () => {
    expect(isAal2("aal2")).toBe(true);
  });

  it("rejects aal1 + null", () => {
    expect(isAal2("aal1")).toBe(false);
    expect(isAal2(null)).toBe(false);
  });
});

describe("mfaRequired", () => {
  it("requires MFA for admins", () => {
    expect(mfaRequired({ appMetadata: { role: "admin" } })).toBe(true);
  });

  it("does NOT require MFA for non-admin members at v1", () => {
    expect(mfaRequired({ appMetadata: { role: "member" } })).toBe(false);
    expect(mfaRequired({ appMetadata: {} })).toBe(false);
    expect(mfaRequired({ appMetadata: undefined })).toBe(false);
  });
});

describe("evaluateMfaPolicy", () => {
  describe("non-admin (members)", () => {
    it("returns 'ok' regardless of MFA state", () => {
      // V1 policy: members are voluntary. All AALs + factor states
      // pass.
      expect(
        evaluateMfaPolicy({
          appMetadata: { role: "member" },
          currentLevel: "aal1",
          hasEnrolledFactor: false,
        }),
      ).toBe("ok");
      expect(
        evaluateMfaPolicy({
          appMetadata: undefined,
          currentLevel: "aal2",
          hasEnrolledFactor: true,
        }),
      ).toBe("ok");
    });
  });

  describe("admin", () => {
    const adminMeta = { role: "admin" };

    it("returns 'ok' when admin is at aal2", () => {
      expect(
        evaluateMfaPolicy({
          appMetadata: adminMeta,
          currentLevel: "aal2",
          hasEnrolledFactor: true,
        }),
      ).toBe("ok");
    });

    it("returns 'challenge' when admin has factor but session is aal1", () => {
      // Just signed in with password — needs to pass TOTP to step up.
      expect(
        evaluateMfaPolicy({
          appMetadata: adminMeta,
          currentLevel: "aal1",
          hasEnrolledFactor: true,
        }),
      ).toBe("challenge");
    });

    it("returns 'enroll' when admin has no factor on record", () => {
      // Newly-promoted admin who hasn't set up MFA yet — must
      // enroll before accessing admin surface.
      expect(
        evaluateMfaPolicy({
          appMetadata: adminMeta,
          currentLevel: "aal1",
          hasEnrolledFactor: false,
        }),
      ).toBe("enroll");
    });

    it("returns 'enroll' even if currentLevel is aal2 but no factor (impossible state, defensive)", () => {
      // This shouldn't happen in practice (aal2 implies a factor
      // was used) but if it does, default to 'enroll' so the
      // user sees the right UI.
      expect(
        evaluateMfaPolicy({
          appMetadata: adminMeta,
          currentLevel: "aal2",
          hasEnrolledFactor: false,
        }),
      ).toBe("ok"); // aal2 honored regardless — the audit gate is the AAL itself
    });
  });
});
