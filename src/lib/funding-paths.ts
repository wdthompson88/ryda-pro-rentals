// Single source of truth for which share-purchase funding paths are
// open vs gated. Both the buy-flow UI (renders disabled "Coming soon"
// tiles for gated paths) and the API routes (reject 400 if the
// requested method is gated) read from here.
//
// Pre-launch gate decisions (see .launch-prep/LAUNCH_PLAN.md Week 1):
//   - crypto: NO named regulated exchange partner; no FinCEN MSB
//     confirmation for partner; no on-chain settlement evidence
//     column on share_purchases. Re-enable once partner signed +
//     `chain_txid` migration ships + AML program covers RYDA flow.
//   - finance: unlicensed-lending risk. RYDA must NOT facilitate
//     loan origination without a broker-dealer / state lending
//     license. Current code is correctly human-handoff only, but
//     surfacing the option in the UI is misleading + creates a
//     regulatory exposure. Re-enable only after Florida transactional
//     counsel signs off in writing.
//
// Re-enabling: flip the `enabled` field below to true, redeploy.
// No DB migration needed; the API + UI both pick up the change.

export type FundingMethod =
  | "ach"
  | "wire"
  | "card"
  | "crypto"
  | "liquidity"
  | "finance";

export type FundingPathConfig = {
  /** True if the path can be selected by users + accepted by APIs. */
  enabled: boolean;
  /** Optional message shown on the disabled tile. */
  comingSoonNote?: string;
};

/**
 * Pre-launch funding-path gate. Edit this object to open / close
 * paths globally. Effect propagates to both UI and API on next
 * deploy — no DB migration required.
 */
export const FUNDING_PATHS: Record<FundingMethod, FundingPathConfig> = {
  ach: { enabled: true },
  wire: { enabled: true },
  card: { enabled: true },
  liquidity: { enabled: true },
  crypto: {
    enabled: false,
    comingSoonNote:
      "Crypto funding opens once our regulated US exchange partner is named and our on-chain settlement workflow is live.",
  },
  finance: {
    enabled: false,
    comingSoonNote:
      "Lender-financing referrals open once Florida counsel confirms our intermediary posture is licensed-exempt.",
  },
};

/** Whitelist of currently-accepted funding methods. */
export function enabledFundingMethods(): FundingMethod[] {
  return (Object.keys(FUNDING_PATHS) as FundingMethod[]).filter(
    (m) => FUNDING_PATHS[m].enabled,
  );
}

/** True if the user-supplied method is currently open.
 *  Uses Object.hasOwn so prototype-chain props (`__proto__`,
 *  `constructor`, `toString`) can't slip past the gate. */
export function isFundingMethodEnabled(method: string): method is FundingMethod {
  if (!Object.hasOwn(FUNDING_PATHS, method)) return false;
  return FUNDING_PATHS[method as FundingMethod].enabled;
}
