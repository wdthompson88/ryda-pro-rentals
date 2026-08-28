// Where a signed-in renter's name and phone live, and which copy wins.
//
// A member's contact details get written from four different places,
// and none of them is the single source of truth:
//
//   user_profiles.full_name / .phone    /account/profile ("Legal name —
//                                       as shown on your ID"). Saved
//                                       there, and synced best-effort
//                                       into rental_profiles.
//   rental_profiles.full_name / .phone  Upserted by the inquiry API from
//                                       whatever was typed on the last
//                                       request (0040).
//   auth user_metadata                  The onboarding Basic step writes
//                                       first_name / last_name / name /
//                                       phone. OAuth providers arrive
//                                       with name and/or full_name.
//
// The inquiry form used to read rental_profiles plus user_metadata.name
// and nothing else, so a member who had set their name on
// /account/profile, or signed in with Google, or finished onboarding
// without ever sending a request, was shown an empty "Full name" box
// while signed in. This module is the one precedence rule — pure, so
// the hook and the form cannot disagree and it can be unit-tested.
//
// Precedence: user_profiles → rental_profiles → user_metadata. The legal
// name a member maintains on their profile page beats whatever they
// last typed into a request box, and both beat what a provider guessed
// at signup. Empty strings never win over a value further down.

type Meta = Record<string, unknown> | null | undefined;

/** A row from user_profiles or rental_profiles — only the two columns
 *  this module cares about, typed loosely because the browser client
 *  is untyped and either table may be absent on a fresh database. */
export type ContactRowLike =
  | { full_name?: unknown; phone?: unknown }
  | null
  | undefined;

export type RenterContact = { name: string; phone: string };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Display name from auth user_metadata: `name` (onboarding, most OAuth
 * providers) → `full_name` (Google) → `first_name` + `last_name`
 * (onboarding writes all three; a partial row can hold just these).
 */
export function metadataName(meta: Meta): string {
  if (!meta) return "";
  const direct = str(meta.name) || str(meta.full_name);
  if (direct) return direct;
  return [str(meta.first_name), str(meta.last_name)].filter(Boolean).join(" ");
}

/** Phone from auth user_metadata (the onboarding Basic step's `phone`). */
export function metadataPhone(meta: Meta): string {
  return meta ? str(meta.phone) : "";
}

/**
 * Resolve the name and phone to prefill for a signed-in renter. Each
 * field resolves independently — a member with a profile-page name but
 * an onboarding-only phone gets both.
 */
export function resolveRenterContact(input: {
  userProfile?: ContactRowLike;
  rentalProfile?: ContactRowLike;
  metadata?: Meta;
}): RenterContact {
  return {
    name:
      str(input.userProfile?.full_name) ||
      str(input.rentalProfile?.full_name) ||
      metadataName(input.metadata),
    phone:
      str(input.userProfile?.phone) ||
      str(input.rentalProfile?.phone) ||
      metadataPhone(input.metadata),
  };
}
