// partner-rename tests — the guard that decides whether an operator can
// be renamed (migration 0045). These cover the branch the route-level
// diff actually changed; the resolver's precedence rule is pinned next
// door in partner-resolution.test.ts.
//
// The query builders are exercised against a recording stub rather than a
// live PostgREST, because the bug they exist to prevent is in the REQUEST,
// not the response: `head: true` makes supabase-js issue an HTTP HEAD, a
// HEAD response has no body, and postgrest-js's error path then hands back
// `{ message: "" }` — which no message predicate can match. The pre-0045
// fallback keys off exactly that message.

import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyLegacyCount,
  countInquiriesByName,
  countLegacyInquiries,
  relinkLegacyInquiries,
} from "../partner-rename";

type Call = { op: string; args: unknown[] };

/** Minimal chainable PostgREST double: records every call, resolves to
 *  whatever the test hands it. */
function stubDb(result: Record<string, unknown>) {
  const calls: Call[] = [];
  const chain: Record<string, unknown> = {};
  for (const op of ["select", "eq", "is", "limit", "update"]) {
    chain[op] = (...args: unknown[]) => {
      calls.push({ op, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  const db = {
    from: (table: string) => {
      calls.push({ op: "from", args: [table] });
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

function selectOptions(calls: Call[]): Record<string, unknown> {
  const select = calls.find((c) => c.op === "select");
  return (select?.args[1] ?? {}) as Record<string, unknown>;
}

describe("countLegacyInquiries", () => {
  it("counts this name with no partner_id, from the right table", async () => {
    const { db, calls } = stubDb({ count: 3, error: null, data: [] });
    const res = await countLegacyInquiries(db, "GM LUXE");
    expect(res).toEqual({ count: 3, error: null });
    expect(calls.find((c) => c.op === "from")?.args).toEqual(["rental_inquiries"]);
    expect(calls.find((c) => c.op === "eq")?.args).toEqual(["partner_name", "GM LUXE"]);
    expect(calls.find((c) => c.op === "is")?.args).toEqual(["partner_id", null]);
  });

  it("NEVER uses head:true — a HEAD response has no body to read the error from", async () => {
    // Regression pin. With head:true the pre-0045 fallback below is
    // unreachable dead code: the error arrives as { message: "" }, no
    // predicate matches it, and every rename during the pre-migration
    // window 500s with an empty diagnostic.
    const { db, calls } = stubDb({ count: 0, error: null, data: [] });
    await countLegacyInquiries(db, "GM LUXE");
    const opts = selectOptions(calls);
    expect(opts.count).toBe("exact");
    expect(opts.head).toBeUndefined();
    // The count rides in on Content-Range, so the body stays one row.
    expect(calls.find((c) => c.op === "limit")?.args).toEqual([1]);
  });
});

describe("countInquiriesByName", () => {
  it("counts every row bearing the name and does not filter on partner_id", async () => {
    const { db, calls } = stubDb({ count: 12, error: null, data: [] });
    const res = await countInquiriesByName(db, "GM LUXE");
    expect(res).toEqual({ count: 12, error: null });
    expect(calls.find((c) => c.op === "eq")?.args).toEqual(["partner_name", "GM LUXE"]);
    // Pre-0045: the column does not exist, so filtering on it is what
    // errored in the first place.
    expect(calls.some((c) => c.op === "is")).toBe(false);
  });

  it("NEVER uses head:true either", async () => {
    const { db, calls } = stubDb({ count: 0, error: null, data: [] });
    await countInquiriesByName(db, "GM LUXE");
    expect(selectOptions(calls).head).toBeUndefined();
  });
});

describe("classifyLegacyCount", () => {
  it("reads a clean count", () => {
    expect(classifyLegacyCount({ count: 4, error: null })).toEqual({
      kind: "counted",
      count: 4,
    });
  });

  it("treats a null count as zero, not as a failure", () => {
    expect(classifyLegacyCount({ count: null, error: null })).toEqual({
      kind: "counted",
      count: 0,
    });
  });

  it("detects the pre-0045 window from either PostgREST spelling", () => {
    expect(
      classifyLegacyCount({
        count: null,
        error: { message: "column rental_inquiries.partner_id does not exist" },
      }),
    ).toEqual({ kind: "pre_fk" });
    expect(
      classifyLegacyCount({
        count: null,
        error: {
          message:
            "Could not find the 'partner_id' column of 'rental_inquiries' in the schema cache",
        },
      }),
    ).toEqual({ kind: "pre_fk" });
  });

  it("refuses the rename on any other error rather than guessing zero", () => {
    expect(
      classifyLegacyCount({
        count: null,
        error: { message: "canceling statement due to statement timeout" },
      }),
    ).toEqual({
      kind: "lookup_failed",
      message: "canceling statement due to statement timeout",
    });
  });

  it("never emits an empty diagnostic — the head:true failure shape", () => {
    // Belt and braces for the bug above: even if some transport hands
    // back a messageless error, the admin gets a sentence, and the
    // rename still stops instead of silently reading as 'pre-0045'.
    const verdict = classifyLegacyCount({ count: null, error: { message: "" } });
    expect(verdict.kind).toBe("lookup_failed");
    expect(verdict.kind === "lookup_failed" && verdict.message.length).toBeGreaterThan(0);
  });
});

describe("relinkLegacyInquiries", () => {
  it("links only the name-only rows, and only to this operator", async () => {
    const { db, calls } = stubDb({ error: null, data: null, count: null });
    const res = await relinkLegacyInquiries(db, "GM LUXE", "op-1");
    expect(res).toEqual({ error: null });
    expect(calls.find((c) => c.op === "update")?.args).toEqual([{ partner_id: "op-1" }]);
    expect(calls.find((c) => c.op === "eq")?.args).toEqual(["partner_name", "GM LUXE"]);
    // Guarded exactly like the 0045 backfill: never re-point a row the
    // write path has already linked by id.
    expect(calls.find((c) => c.op === "is")?.args).toEqual(["partner_id", null]);
  });

  it("surfaces the error instead of reporting success", async () => {
    const error = { message: "permission denied for table rental_inquiries" };
    const { db } = stubDb({ error, data: null, count: null });
    expect(await relinkLegacyInquiries(db, "GM LUXE", "op-1")).toEqual({ error });
  });
});
