// Which operator owns a rental inquiry — the single decider.
//
// Before migration 0045 a lead carried only `partner_name` (the operator's
// roster name as it read at capture time) and the pay-link route
// re-resolved the operator with an exact string match on partners.name.
// Renaming an operator orphaned every in-flight lead, so the admin route
// had to block renames outright. 0045 adds rental_inquiries.partner_id and
// this module is the one place that decides, from a lead, which operator
// it belongs to: partner_id when present, the name only as a legacy
// fallback (rows written before 0045, or rows the backfill could not
// prove, or rows whose operator was not on the roster at capture time).
//
// The name fallback is NEVER reached for a lead that once had an id:
// 0045's FK is `on delete restrict`, so an operator with leads cannot be
// deleted out from under them and no write path nulls partner_id back.
// That is what stops a recycled roster name from re-pointing an old lead
// at a different company's Stripe account.
//
// Deliberately free of Supabase and server-only imports: callers hand in
// plain fetcher functions, so the precedence rule is unit-testable without
// mocking a query builder — and there is exactly one copy of it. The
// Supabase-backed fetchers are built by partnerFetchers() below (type-only
// import of SupabaseClient, so tests never load the client).

import type { SupabaseClient } from "@supabase/supabase-js";

/** The two attribution columns on rental_inquiries. Both optional so a
 *  pre-0045 row (no partner_id in the select at all) satisfies the type. */
export type InquiryOperatorRef = {
  partner_id?: string | null;
  partner_name?: string | null;
};

/** Which column the lookup will use. `partner_name` here always means
 *  "this lead predates the FK, or its operator was never on the roster". */
export type OperatorLookupVia = "partner_id" | "partner_name";

export type OperatorLookupKey = { via: OperatorLookupVia; value: string };

/** Shape of a PostgREST error as far as this module cares. */
export type LookupError = { message?: string; code?: string } | null;

export type PartnerFetchResult<T> =
  | { ok: true; partner: T | null }
  | { ok: false; error: LookupError };

export type PartnerFetch<T> = (value: string) => Promise<PartnerFetchResult<T>>;

export type OperatorResolution<T> =
  | { ok: true; partner: T; via: OperatorLookupVia }
  /** The lead names no operator at all. Every lead captured today does
   *  (the RYDA-owned rail that produced unattributed leads is gone), so
   *  this is a legacy row from before the strip. */
  | { ok: false; reason: "no_attribution" }
  /** We knew what to look for and it is not on the roster. */
  | { ok: false; reason: "not_found"; via: OperatorLookupVia; value: string }
  /** The lookup itself failed (schema not ready, DB error). */
  | { ok: false; reason: "lookup_failed"; via: OperatorLookupVia; error: LookupError };

function trimmed(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

/**
 * Decide WHICH key identifies this lead's operator. Pure: the whole
 * precedence rule in one testable function.
 *
 * partner_id wins whenever it is set — that is the entire point of 0045,
 * and it is what makes a rename survivable. The name is consulted only
 * when there is no id, and a resolution via the name is always a legacy
 * resolution, never the intended path for a new lead.
 */
export function planOperatorLookup(
  inquiry: InquiryOperatorRef,
): OperatorLookupKey | null {
  const id = trimmed(inquiry.partner_id);
  if (id) return { via: "partner_id", value: id };
  const name = trimmed(inquiry.partner_name);
  if (name) return { via: "partner_name", value: name };
  return null;
}

/**
 * Resolve the operator row that owns an inquiry.
 *
 * A dangling partner_id does NOT fall back to the name: the FK is
 * `on delete restrict`, so "id set but no row" cannot happen through the
 * delete path at all and means something wrote an id we cannot account
 * for — reporting not_found beats silently resolving a different operator
 * by a stale label, which is precisely the failure mode 0045 exists to
 * end.
 */
export async function resolveInquiryOperator<T>(
  inquiry: InquiryOperatorRef,
  fetchers: { byId: PartnerFetch<T>; byName: PartnerFetch<T> },
): Promise<OperatorResolution<T>> {
  const key = planOperatorLookup(inquiry);
  if (!key) return { ok: false, reason: "no_attribution" };

  const fetch = key.via === "partner_id" ? fetchers.byId : fetchers.byName;
  const res = await fetch(key.value);
  if (!res.ok) {
    return { ok: false, reason: "lookup_failed", via: key.via, error: res.error };
  }
  if (!res.partner) {
    return { ok: false, reason: "not_found", via: key.via, value: key.value };
  }
  return { ok: true, partner: res.partner, via: key.via };
}

/**
 * Supabase-backed fetchers over `partners`. `columns` is the select list
 * the caller needs — the two fetchers MUST read the same columns so the
 * resolved row has one shape regardless of which key found it.
 */
export function partnerFetchers<T>(
  db: SupabaseClient,
  columns: string,
): { byId: PartnerFetch<T>; byName: PartnerFetch<T> } {
  const on = (column: "id" | "name"): PartnerFetch<T> =>
    async (value: string) => {
      const res = await db
        .from("partners")
        .select(columns)
        .eq(column, value)
        .maybeSingle();
      if (res.error) return { ok: false, error: res.error };
      return { ok: true, partner: (res.data as T | null) ?? null };
    };
  return { byId: on("id"), byName: on("name") };
}

/**
 * "No such column" detection, generalized from the rental-inquiry route's
 * isUserIdColumnMissing. Optional columns arrive with migrations that need
 * operator approval to apply, so every query touching one must degrade
 * during the pre-migration window instead of 500ing a live funnel.
 *
 * PostgREST reports these as either a column error or a schema-cache miss
 * depending on where it fails, hence both spellings.
 */
export function isColumnMissing(error: LookupError, column: string): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes(column.toLowerCase()) &&
    (msg.includes("column") || msg.includes("schema cache"))
  );
}

/**
 * The first optional column present on `row` that `error` says the schema
 * does not have — i.e. which key to strip before retrying the insert.
 * Returns null when the error is about something else entirely.
 */
export function missingOptionalColumn(
  error: LookupError,
  row: Record<string, unknown>,
  optional: readonly string[],
): string | null {
  for (const column of optional) {
    if (column in row && isColumnMissing(error, column)) return column;
  }
  return null;
}

/**
 * "That foreign key no longer resolves" detection (Postgres 23503).
 *
 * The referenced row can disappear between the lookup that produced the
 * id and the insert that writes it — an operator deleted by ops, or the
 * approval bridge rolling back a roster row it had just created. The id
 * is then unwritable, but it is only ATTRIBUTION: the row it hangs off
 * is still worth keeping.
 */
export function isForeignKeyViolation(
  error: LookupError,
  column: string,
): boolean {
  if ((error?.code ?? "") !== "23503") return false;
  return (error?.message ?? "").toLowerCase().includes(column.toLowerCase());
}

/**
 * The first optional column on `row` that `error` blames and that can be
 * dropped to make the write succeed — either the schema does not have it
 * yet (pre-migration window) or its foreign key no longer resolves.
 *
 * Both are recoverable by stripping that one key and retrying. Anything
 * else returns null so a real failure still surfaces.
 */
export function droppableOptionalColumn(
  error: LookupError,
  row: Record<string, unknown>,
  optional: readonly string[],
): string | null {
  const missing = missingOptionalColumn(error, row, optional);
  if (missing) return missing;
  for (const column of optional) {
    if (column in row && isForeignKeyViolation(error, column)) return column;
  }
  return null;
}
