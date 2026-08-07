// Fleet Partner Program — shared domain logic for partner accounts.
//
// A "partner" is a rental operator (the B2B side pitched on /partners)
// with a RYDA account. The account layer is one row in partner_accounts
// (migration 0042) keyed by auth user id, with an admin-approved status
// lifecycle:
//
//   pending   — applied (via /signup?as=partner or from /partner);
//               visible to admins on /admin/partners
//   approved  — admin approved; the /partner dashboard unlocks, and
//               the admin route bridges the application to a
//               company-keyed operators row (partners, 0041) via
//               partner_id — that row is where Stripe onboarding and
//               payment links live
//   suspended — declined or paused by an admin
//
// Trust model (mirrors admin-auth.ts): the signup form writes a
// partner_intent flag + company details to user_metadata, which is
// USER-EDITABLE — it is a request, never a grant. The server turns it
// into a partner_accounts row with status 'pending'; only the
// admin-gated /api/admin/partners route can change status. Client code
// may read partner_intent for UI affordances (header pill), but every
// load-bearing check reads the table server-side.
//
// This module is imported by client pages, API routes, and tests —
// keep it free of server-only imports.

export const PARTNER_STATUSES = ["pending", "approved", "suspended"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_FLEET_SIZES = ["1-5", "6-15", "16-40", "40+"] as const;
export type PartnerFleetSize = (typeof PARTNER_FLEET_SIZES)[number];

/** Row shape returned by /api/partner/me and /api/admin/partners. */
export type PartnerAccount = {
  user_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  fleet_size: string | null;
  market: string;
  status: PartnerStatus;
  status_note: string | null;
  approved_at: string | null;
  /** Approval bridge to the company-keyed operators row (partners,
   *  0041). Set by the admin route on approval; null before that. An
   *  opaque uuid — safe in the partner-facing payload, unlike the
   *  operator row itself (commission_rate / stripe_account_id stay
   *  server-side). */
  partner_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Editable application/profile fields (everything except status,
 *  which only admins may touch). */
export type PartnerApplicationInput = {
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  website: string | null;
  fleet_size: PartnerFleetSize | null;
  market: string;
};

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

/** Validate + normalize a partner application payload (signup metadata
 *  or a POST body). Returns a typed value or a human-readable error. */
export function validatePartnerApplication(
  raw: unknown,
):
  | { ok: true; value: PartnerApplicationInput }
  | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid application payload." };
  }
  const r = raw as Record<string, unknown>;

  const company = str(r.company_name, 120);
  if (!company || company.length < 2) {
    return { ok: false, error: "Company name is required (2+ characters)." };
  }

  let website = str(r.website, 200);
  if (website) {
    // Accept bare domains (with or without a port); store a browsable
    // URL. Reject explicit non-http schemes (javascript:, data:,
    // mailto:, …). A colon followed by digits is a port, not a scheme
    // ("gmluxe.net:8080"), so it must not trip the scheme check.
    if (!/^https?:\/\//i.test(website)) {
      if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(website)) {
        return { ok: false, error: "Website must be an http(s) URL." };
      }
      website = `https://${website}`;
    }
    // Must actually parse as a URL with a dotted host — catches junk
    // like a bare "https://" and smuggled credentials/ports that the
    // URL parser rejects.
    let host = "";
    try {
      host = new URL(website).hostname;
    } catch {
      host = "";
    }
    if (!host.includes(".")) {
      return {
        ok: false,
        error: "Enter a valid website address (e.g. gmluxe.net).",
      };
    }
  }

  const fleetRaw = str(r.fleet_size, 20);
  const fleet_size =
    fleetRaw && (PARTNER_FLEET_SIZES as readonly string[]).includes(fleetRaw)
      ? (fleetRaw as PartnerFleetSize)
      : null;

  return {
    ok: true,
    value: {
      company_name: company,
      contact_name: str(r.contact_name, 120),
      phone: str(r.phone, 40),
      website,
      fleet_size,
      market: str(r.market, 80) ?? "Miami",
    },
  };
}

/** Which admin status changes are legal. Rows never return to
 *  'pending' — that state means "not yet reviewed" and reviewing is
 *  one-way. Same-state writes are rejected as no-ops. */
export function canTransitionPartnerStatus(
  from: PartnerStatus,
  to: PartnerStatus,
): boolean {
  if (from === to) return false;
  return to === "approved" || to === "suspended";
}
