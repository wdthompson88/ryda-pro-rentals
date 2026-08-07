// Partner inquiry routing — maps a partner brand (partner-fleet.ts
// `partner` field) to the inbox that receives rental inquiries for
// that operator's vehicles.
//
// Real partner emails are filled in here as referral agreements are
// signed. Until an operator has a signed agreement AND a confirmed
// inquiry inbox, their leads route to the RYDA team inbox and get
// forwarded manually — a mis-routed lead to ourselves is recoverable,
// a lead sent to an unconfirmed address is gone.
//
// Server-only: partner contact details are ops data and must never
// reach the browser (customers only ever see "a vetted Miami
// operator", never the operator's name).

import "server-only";

// Single fallback, env-driven like notify.ts (RYDA_NOTIFY_TO is the
// team alias in production, unset in dev so email sends no-op).
const TEAM_FALLBACK = process.env.RYDA_NOTIFY_TO ?? "";

const PARTNER_INQUIRY_EMAILS: Record<string, string> = {
  // "GM LUXE": "…@gmluxe.net",  // pending signed referral agreement
};

/** Inbox that should receive an inquiry for the given partner. Null
 *  partner (RYDA fleet) and unsigned partners both fall back to the
 *  team inbox. Empty string means email is unconfigured — the caller's
 *  send wrapper treats that as a logged no-op. */
export function partnerInquiryEmail(partnerName: string | null): string {
  if (partnerName) {
    const direct = PARTNER_INQUIRY_EMAILS[partnerName];
    if (direct) return direct;
  }
  return TEAM_FALLBACK;
}
