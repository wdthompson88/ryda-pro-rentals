// MFA policy for RYDA.
//
// Why MFA matters (threat-modeling-expert agent attack-tree A):
// "$50-200 attacker investment yields full LLC share drain via no-
// MFA phishing → take over the member account → fraudulent share
// transfer." 12-month transfer holds eventually elapse, so this
// is a real path. With MFA enforced for members and admins, the
// account-takeover branch of the attack tree closes.
//
// Pre-launch policy:
//  - Admins: MFA REQUIRED. requireAdmin() in lib/admin-auth fails
//    if the session AAL (Authenticator Assurance Level) is not 'aal2'.
//  - Members: MFA RECOMMENDED but not required at launch. Members
//    can enroll voluntarily at /account/security. Forced MFA for
//    members lands once we have ≥1 month of "TOTP enrollment is
//    not a usability disaster" data; documented in LAUNCH_PLAN
//    backlog.
//
// Supabase Auth provides all the primitives (mfa.enroll,
// mfa.challenge, mfa.verify, getAuthenticatorAssuranceLevel). We
// use 'totp' as the factor type for v1; WebAuthn (FIDO2 hardware
// keys) is the post-launch enhancement for admins.
//
// This module is pure logic — boolean predicates over the
// Supabase Auth state. UI components consume it.

/** Authentication assurance levels Supabase tracks. */
export type AAL = "aal1" | "aal2" | null;

/** A signed-in user is admin if they have role=admin in
 *  app_metadata (service-role-only writable). */
export function isAdminUser(appMetadata: Record<string, unknown> | undefined): boolean {
  if (!appMetadata) return false;
  return appMetadata.role === "admin";
}

/** True iff the session has stepped up to AAL2 (passed an MFA
 *  challenge in this session). Supabase reports this via
 *  getAuthenticatorAssuranceLevel(). */
export function isAal2(currentLevel: AAL): boolean {
  return currentLevel === "aal2";
}

/** True iff this user is REQUIRED to use MFA. Admins must;
 *  members are voluntary at v1. */
export function mfaRequired(args: {
  appMetadata: Record<string, unknown> | undefined;
}): boolean {
  return isAdminUser(args.appMetadata);
}

/** Returns the policy verdict for the current session:
 *  - "ok"               → user is allowed to proceed
 *  - "enroll"           → user must enroll a factor (no factor on record)
 *  - "challenge"        → user has a factor; needs to pass the challenge to reach AAL2
 *  - "denied"           → required AAL2 + not enrolled + not admin (defensive)
 */
export type MfaVerdict = "ok" | "enroll" | "challenge" | "denied";

export function evaluateMfaPolicy(args: {
  appMetadata: Record<string, unknown> | undefined;
  currentLevel: AAL;
  hasEnrolledFactor: boolean;
}): MfaVerdict {
  const required = mfaRequired(args);
  const aal2 = isAal2(args.currentLevel);

  if (!required) {
    // Members at v1: any AAL is acceptable.
    return "ok";
  }
  // Required (admin path).
  if (aal2) return "ok";
  if (args.hasEnrolledFactor) return "challenge";
  return "enroll";
}
