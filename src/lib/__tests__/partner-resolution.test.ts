// partner-resolution tests — pins the ONE rule that decides which
// operator owns a rental inquiry (migration 0045). The pay-link route
// and the Connect webhook both route through resolveInquiryOperator, so
// these assertions are the contract for both.
//
// No Supabase anywhere: the resolver takes plain fetchers, so the
// precedence rule is exercised directly rather than through a mocked
// query builder (same reasoning as rental-inquiry.test.ts pinning the
// validator instead of the route).

import { describe, it, expect } from "vitest";
import {
  planOperatorLookup,
  resolveInquiryOperator,
  isColumnMissing,
  isForeignKeyViolation,
  missingOptionalColumn,
  droppableOptionalColumn,
  type PartnerFetch,
} from "../partner-resolution";

type Operator = { id: string; name: string };

const GM_LUXE: Operator = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "GM LUXE",
};

/** A fake roster + a call log, so "which key did it actually use" is
 *  assertable, not inferred. */
function roster(rows: Operator[]) {
  const calls = { byId: [] as string[], byName: [] as string[] };
  const byId: PartnerFetch<Operator> = async (value) => {
    calls.byId.push(value);
    return { ok: true, partner: rows.find((r) => r.id === value) ?? null };
  };
  const byName: PartnerFetch<Operator> = async (value) => {
    calls.byName.push(value);
    return { ok: true, partner: rows.find((r) => r.name === value) ?? null };
  };
  return { fetchers: { byId, byName }, calls };
}

describe("planOperatorLookup", () => {
  it("prefers partner_id when the lead carries one", () => {
    expect(
      planOperatorLookup({ partner_id: GM_LUXE.id, partner_name: "GM LUXE" }),
    ).toEqual({ via: "partner_id", value: GM_LUXE.id });
  });

  it("falls back to the snapshotted name when partner_id is null", () => {
    expect(
      planOperatorLookup({ partner_id: null, partner_name: "GM LUXE" }),
    ).toEqual({ via: "partner_name", value: "GM LUXE" });
  });

  it("treats a pre-0045 row (no partner_id key at all) as a name lookup", () => {
    expect(planOperatorLookup({ partner_name: "GM LUXE" })).toEqual({
      via: "partner_name",
      value: "GM LUXE",
    });
  });

  it("returns null when the lead names no operator (RYDA fleet)", () => {
    expect(planOperatorLookup({ partner_id: null, partner_name: null })).toBeNull();
    expect(planOperatorLookup({})).toBeNull();
  });

  it("treats blank strings as absent, and trims what it keeps", () => {
    expect(planOperatorLookup({ partner_id: "   ", partner_name: "  " })).toBeNull();
    expect(
      planOperatorLookup({ partner_id: "   ", partner_name: "  GM LUXE  " }),
    ).toEqual({ via: "partner_name", value: "GM LUXE" });
  });
});

describe("resolveInquiryOperator", () => {
  it("resolves by partner_id and never consults the name", async () => {
    const { fetchers, calls } = roster([GM_LUXE]);
    const res = await resolveInquiryOperator<Operator>(
      { partner_id: GM_LUXE.id, partner_name: "GM LUXE" },
      fetchers,
    );
    expect(res).toEqual({ ok: true, partner: GM_LUXE, via: "partner_id" });
    expect(calls.byId).toEqual([GM_LUXE.id]);
    expect(calls.byName).toEqual([]);
  });

  it("THE FIX: a renamed operator still resolves for an in-flight lead", async () => {
    // The roster row was renamed after the lead was captured, so the
    // lead's snapshotted partner_name no longer matches anything.
    const renamed: Operator = { ...GM_LUXE, name: "GM LUXE Exotics" };
    const { fetchers, calls } = roster([renamed]);

    const byName = await resolveInquiryOperator<Operator>(
      { partner_id: null, partner_name: "GM LUXE" },
      fetchers,
    );
    // Pre-0045 behavior, kept here as the control: name alone is lost.
    expect(byName.ok).toBe(false);

    const byId = await resolveInquiryOperator<Operator>(
      { partner_id: GM_LUXE.id, partner_name: "GM LUXE" },
      fetchers,
    );
    expect(byId).toEqual({ ok: true, partner: renamed, via: "partner_id" });
    expect(calls.byName).toEqual(["GM LUXE"]); // only the control call
  });

  it("resolves a legacy lead by name when partner_id is null", async () => {
    const { fetchers, calls } = roster([GM_LUXE]);
    const res = await resolveInquiryOperator<Operator>(
      { partner_id: null, partner_name: "GM LUXE" },
      fetchers,
    );
    expect(res).toEqual({ ok: true, partner: GM_LUXE, via: "partner_name" });
    expect(calls.byId).toEqual([]);
  });

  it("reports no_attribution when the lead names no operator", async () => {
    const { fetchers, calls } = roster([GM_LUXE]);
    const res = await resolveInquiryOperator<Operator>(
      { partner_id: null, partner_name: null },
      fetchers,
    );
    expect(res).toEqual({ ok: false, reason: "no_attribution" });
    expect(calls.byId).toEqual([]);
    expect(calls.byName).toEqual([]);
  });

  it("reports not_found for a name that is not on the roster", async () => {
    const { fetchers } = roster([]);
    const res = await resolveInquiryOperator<Operator>(
      { partner_id: null, partner_name: "Nobody Exotics" },
      fetchers,
    );
    expect(res).toEqual({
      ok: false,
      reason: "not_found",
      via: "partner_name",
      value: "Nobody Exotics",
    });
  });

  it("a dangling partner_id is not_found — it never falls back to the name", async () => {
    // The FK is `on delete restrict`, so an operator holding leads cannot
    // be deleted and an id pointing at nothing means something we cannot
    // account for wrote it. Resolving a DIFFERENT operator off a stale
    // label — a recycled roster name settling a charge into someone
    // else's Connect account — is exactly the bug 0045 removed.
    const { fetchers, calls } = roster([GM_LUXE]);
    const res = await resolveInquiryOperator<Operator>(
      { partner_id: "22222222-2222-4222-8222-222222222222", partner_name: "GM LUXE" },
      fetchers,
    );
    expect(res).toEqual({
      ok: false,
      reason: "not_found",
      via: "partner_id",
      value: "22222222-2222-4222-8222-222222222222",
    });
    expect(calls.byName).toEqual([]);
  });

  it("surfaces a lookup failure as its own reason, not as not_found", async () => {
    // The pay-link route maps this to 503/500 (schema not ready vs real
    // failure) — collapsing it into not_found would tell an admin the
    // operator is missing when the database simply did not answer.
    const error = { message: 'relation "partners" does not exist' };
    const fetchers = {
      byId: (async () => ({ ok: false, error })) as PartnerFetch<Operator>,
      byName: (async () => ({ ok: false, error })) as PartnerFetch<Operator>,
    };
    const res = await resolveInquiryOperator<Operator>(
      { partner_id: GM_LUXE.id },
      fetchers,
    );
    expect(res).toEqual({
      ok: false,
      reason: "lookup_failed",
      via: "partner_id",
      error,
    });
  });
});

describe("isColumnMissing", () => {
  it("matches PostgREST's column and schema-cache spellings", () => {
    expect(
      isColumnMissing(
        { message: 'column rental_inquiries.partner_id does not exist' },
        "partner_id",
      ),
    ).toBe(true);
    expect(
      isColumnMissing(
        { message: "Could not find the 'partner_id' column of 'rental_inquiries' in the schema cache" },
        "partner_id",
      ),
    ).toBe(true);
  });

  it("does not fire on unrelated errors", () => {
    expect(isColumnMissing({ message: "duplicate key value" }, "partner_id")).toBe(
      false,
    );
    // Names the column but is not a missing-column error.
    expect(
      isColumnMissing(
        { message: "insert violates foreign key constraint on partner_id" },
        "partner_id",
      ),
    ).toBe(false);
    expect(isColumnMissing(null, "partner_id")).toBe(false);
  });

  it("does not confuse one optional column for another", () => {
    const err = { message: "column rental_inquiries.user_id does not exist" };
    expect(isColumnMissing(err, "user_id")).toBe(true);
    expect(isColumnMissing(err, "partner_id")).toBe(false);
  });
});

describe("missingOptionalColumn", () => {
  const OPTIONAL = ["partner_id", "user_id"] as const;

  it("names the column to strip before retrying the insert", () => {
    expect(
      missingOptionalColumn(
        { message: "column rental_inquiries.partner_id does not exist" },
        { partner_id: "x", user_id: "y", email: "a@b.c" },
        OPTIONAL,
      ),
    ).toBe("partner_id");
    expect(
      missingOptionalColumn(
        { message: "column rental_inquiries.user_id does not exist" },
        { partner_id: "x", user_id: "y" },
        OPTIONAL,
      ),
    ).toBe("user_id");
  });

  it("returns null when the column is not on the row (nothing to strip)", () => {
    expect(
      missingOptionalColumn(
        { message: "column rental_inquiries.user_id does not exist" },
        { partner_id: "x" },
        OPTIONAL,
      ),
    ).toBeNull();
  });

  it("returns null for an unrelated error, so a real failure still surfaces", () => {
    expect(
      missingOptionalColumn(
        { message: "duplicate key value violates unique constraint" },
        { partner_id: "x", user_id: "y" },
        OPTIONAL,
      ),
    ).toBeNull();
  });
});

describe("isForeignKeyViolation", () => {
  const FK_ERR = {
    code: "23503",
    message:
      'insert or update on table "rental_inquiries" violates foreign key constraint "rental_inquiries_partner_id_fkey"',
  };

  it("matches a 23503 naming the column", () => {
    expect(isForeignKeyViolation(FK_ERR, "partner_id")).toBe(true);
  });

  it("does not fire on another column's constraint", () => {
    expect(isForeignKeyViolation(FK_ERR, "user_id")).toBe(false);
  });

  it("needs the code — a message that merely says 'foreign key' is not enough", () => {
    expect(
      isForeignKeyViolation(
        { message: "insert violates foreign key constraint on partner_id" },
        "partner_id",
      ),
    ).toBe(false);
    expect(isForeignKeyViolation(null, "partner_id")).toBe(false);
  });
});

describe("droppableOptionalColumn", () => {
  const OPTIONAL = ["partner_id", "user_id"] as const;

  it("drops partner_id when its FK stopped resolving mid-insert", () => {
    // The operator row disappeared between resolvePartnerId and the
    // insert (ops merging duplicates, or the approval bridge rolling
    // back a roster row it had just created). missingOptionalColumn
    // correctly declines this shape — it is not a schema problem — so
    // without this branch the whole lead is discarded for the sake of
    // an attribution column.
    expect(
      droppableOptionalColumn(
        {
          code: "23503",
          message:
            'insert or update on table "rental_inquiries" violates foreign key constraint "rental_inquiries_partner_id_fkey"',
        },
        { partner_id: "x", user_id: "y", email: "a@b.c" },
        OPTIONAL,
      ),
    ).toBe("partner_id");
  });

  it("still drops a column the schema does not have yet", () => {
    expect(
      droppableOptionalColumn(
        { message: "column rental_inquiries.partner_id does not exist" },
        { partner_id: "x" },
        OPTIONAL,
      ),
    ).toBe("partner_id");
  });

  it("keeps a real failure fatal — 23505 is not droppable", () => {
    expect(
      droppableOptionalColumn(
        { code: "23505", message: "duplicate key value violates unique constraint" },
        { partner_id: "x", user_id: "y" },
        OPTIONAL,
      ),
    ).toBeNull();
  });

  it("returns null when the blamed column is not on the row", () => {
    expect(
      droppableOptionalColumn(
        {
          code: "23503",
          message: 'violates foreign key constraint "rental_inquiries_partner_id_fkey"',
        },
        { user_id: "y" },
        OPTIONAL,
      ),
    ).toBeNull();
  });
});
