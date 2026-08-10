// The operator-rename guard, extracted from /api/admin/partners so the
// decision is unit-testable without a live PostgREST.
//
// Renaming a roster row used to be blocked outright because partner_name
// WAS the join key. Migration 0045 moved identity onto partner_id, so the
// guard now blocks only what the FK genuinely cannot cover, and blocks it
// as a CONFIRMATION rather than a wall — same idiom as the approval
// bridge's linkExistingOperatorId: never automatic, always possible.
//
// Two things are still name-coupled:
//   (1) CODE. partner-fleet.ts hard-codes the operator name on every
//       vehicle and partner-contacts.ts keys its inbox map on the same
//       string, so a rename that the code does not follow makes every
//       NEW lead land unresolvable. Requires an explicit confirmation.
//   (2) LEGACY ROWS. Inquiries carrying this name with NO partner_id —
//       captured before 0045, or while the operator was off the roster.
//       Those are relinkable here, by exactly the join 0045's backfill
//       uses, so the admin gets an affordance instead of an instruction
//       they cannot follow.

import { isColumnMissing, type LookupError } from "./partner-resolution";
import type { SupabaseClient } from "@supabase/supabase-js";

/** A PostgREST count response, as much of it as the guard reads. */
export type CountResult = { count: number | null; error: LookupError };

export type LegacyCountVerdict =
  /** The count is trustworthy — 0 means nothing would orphan. */
  | { kind: "counted"; count: number }
  /** rental_inquiries.partner_id does not exist here: pre-0045. */
  | { kind: "pre_fk" }
  /** Something else broke; the rename must not proceed on a guess. */
  | { kind: "lookup_failed"; message: string };

/**
 * Count the rows a rename would orphan: this name, no partner_id.
 *
 * NOT `head: true`. A head request is issued as HTTP HEAD, and a HEAD
 * response carries no body — so postgrest-js's error path reads `""`,
 * fails to JSON.parse it and hands back `{ message: "" }`. The pre-0045
 * fallback below keys off that message, so with `head: true` it could
 * never match: every rename during the pre-migration window this branch
 * exists to survive would 500 with an empty diagnostic. `count: "exact"`
 * on a normal GET is just as cheap here — the total arrives in
 * Content-Range and `.limit(1)` keeps the body to a single id.
 */
export async function countLegacyInquiries(
  db: SupabaseClient,
  oldName: string,
): Promise<CountResult> {
  const res = await db
    .from("rental_inquiries")
    .select("id", { count: "exact" })
    .eq("partner_name", oldName)
    .is("partner_id", null)
    .limit(1);
  return { count: res.count ?? null, error: res.error };
}

/**
 * Pre-0045 count: every row bearing the name, because without the FK
 * every one of them is name-coupled. Same no-head reasoning as above.
 */
export async function countInquiriesByName(
  db: SupabaseClient,
  oldName: string,
): Promise<CountResult> {
  const res = await db
    .from("rental_inquiries")
    .select("id", { count: "exact" })
    .eq("partner_name", oldName)
    .limit(1);
  return { count: res.count ?? null, error: res.error };
}

/** Interpret the count response. Pure — this is the branch finding 1 hid. */
export function classifyLegacyCount(res: CountResult): LegacyCountVerdict {
  if (res.error) {
    if (isColumnMissing(res.error, "partner_id")) return { kind: "pre_fk" };
    return {
      kind: "lookup_failed",
      // An error with no message at all still has to read as a failure,
      // never as "0 rows" and never as an empty sentence.
      message: res.error.message?.trim() || "the database returned no diagnostic",
    };
  }
  return { kind: "counted", count: res.count ?? 0 };
}

/**
 * Link the legacy rows to the operator being renamed — the 0045 backfill
 * join (`p.name = i.partner_name`, guarded on `partner_id is null`),
 * scoped to this one operator and run at the moment it is needed.
 *
 * Correct by the same argument the migration makes: an exact name match
 * is what the pay-link route was already resolving these rows by, so this
 * links precisely the rows that already resolved and nothing more. It
 * runs BEFORE the name changes, so the match is still the live one.
 */
export async function relinkLegacyInquiries(
  db: SupabaseClient,
  oldName: string,
  operatorId: string,
): Promise<{ error: LookupError }> {
  const res = await db
    .from("rental_inquiries")
    .update({ partner_id: operatorId })
    .eq("partner_name", oldName)
    .is("partner_id", null);
  return { error: res.error };
}
