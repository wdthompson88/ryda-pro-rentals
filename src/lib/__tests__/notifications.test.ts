// Tests for the in-app notification layer (migration 0049).
//
// Four jobs, in descending order of how much they earn their keep.
//
// 1. THE VOCABULARY IS A MIRROR. NOTIFICATION_TYPES and the
//    `notifications_type_known` CHECK are the same list written twice,
//    in two languages, in two files no compiler relates. That is the
//    arrangement that drifts — someone adds a type in TypeScript, ships
//    it, and every insert of that type fails at the database months
//    later. So this suite parses 0049_notifications.sql and compares.
//    Copied wholesale from rental-booking-status.test.ts, which does the
//    same to 0047's trigger.
//
// 2. D6 IS TESTED AS A PROPERTY, NOT AS A LINE OF COPY. The operator is
//    anonymous to the renter until confirmation. Two layers are checked:
//    the STRUCTURAL one (the pre-confirmation builders have no
//    operator-name field at all — a compile error if someone adds one)
//    and the RUNTIME one (bookingCancelledForRenter is handed a real
//    operator name with wasConfirmed:false and must not print it).
//
// 3. NO BUILDER CLAIMS MONEY MOVED. Phase 3B has not landed; nothing
//    charges anything. Guardrail 3.9 is about exactly this over-promise
//    and a notification is the worst place to make one — it is
//    timestamped and it reads as a receipt. Every builder's output is
//    greped for money words.
//
// 4. notifyUser NEVER THROWS. It sits beside a booking write; if it
//    could throw, an outage would turn "your booking was approved" into
//    a 500 after the booking was already confirmed. Exercised against a
//    client that errors, a client that throws, and a missing table.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_COLS,
  NOTIFICATION_LINK_MAX,
  NOTIFICATION_TITLE_MAX,
  NOTIFICATION_TYPES,
  accountNotice,
  bookingApprovedForRenter,
  bookingCancelledForOperator,
  bookingCancelledForRenter,
  bookingCounterAnsweredForOperator,
  bookingCounterOfferedForRenter,
  bookingDeclinedForRenter,
  bookingExpired,
  bookingExpiringSoon,
  bookingRequestedForOperator,
  countUnreadNotifications,
  formatBookingDates,
  isNotificationType,
  isNotificationsTableMissing,
  isSafeNotificationLink,
  notifyUser,
  notifyUsers,
  operatorBookingLink,
  projectNotification,
  renterBookingLink,
  type NotificationContent,
  type NotificationRow,
} from "../notifications";

// ── the migration, as text ──────────────────────────────────────────

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/0049_notifications.sql",
);

/** The migration with `--` line comments removed, so prose about the
 *  vocabulary is never mistaken for the vocabulary. */
const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8").replace(
  /--[^\n]*/g,
  "",
);

function quoted(list: string): string[] {
  return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("0049 migration is readable (guards the parser, not the code)", () => {
  it("found the file and it is the notifications migration", () => {
    // Without this, every assertion below would pass vacuously if the
    // migration were renamed or renumbered.
    expect(MIGRATION_SQL).toContain(
      "create table if not exists public.notifications",
    );
    expect(MIGRATION_SQL).toContain("notifications_type_known");
    expect(MIGRATION_SQL).toContain(
      "public.notifications_enforce_immutable()",
    );
  });
});

describe("type vocabulary matches the migration's CHECK constraint", () => {
  it("the CHECK allows exactly NOTIFICATION_TYPES", () => {
    const match = /check\s*\(type\s+in\s*\(([^)]*)\)\)/.exec(MIGRATION_SQL);
    expect(match, "no `check (type in (…))` found in 0049").not.toBeNull();

    expect(sorted(quoted(match![1]))).toEqual(sorted(NOTIFICATION_TYPES));
  });

  it("has no duplicates", () => {
    expect(new Set(NOTIFICATION_TYPES).size).toBe(NOTIFICATION_TYPES.length);
  });

  it("every booking type is namespaced, and there is exactly one catch-all", () => {
    // The shape of the vocabulary is the contract a future digest job
    // groups on: booking_* is the precise half, account_notice is the
    // deliberately-single escape hatch. A second catch-all is how a
    // vocabulary becomes free text one type at a time.
    const catchAlls = NOTIFICATION_TYPES.filter(
      (t) => !t.startsWith("booking_"),
    );
    expect(catchAlls).toEqual(["account_notice"]);
  });
});

describe("isNotificationType", () => {
  it("accepts every member of the vocabulary", () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(isNotificationType(type)).toBe(true);
    }
  });

  it("rejects near-misses and non-strings", () => {
    for (const value of [
      "booking_confirmed", // 0047's status, not a notification type
      "booking_request",
      "BOOKING_APPROVED",
      "",
      null,
      undefined,
      7,
      { type: "booking_approved" },
    ]) {
      expect(isNotificationType(value), String(value)).toBe(false);
    }
  });
});

describe("bounds match the migration's CHECK", () => {
  it("title, body and link caps agree with notifications_text_bounded", () => {
    const title = /length\(btrim\(title\)\)\s+between\s+1\s+and\s+(\d+)/.exec(
      MIGRATION_SQL,
    );
    expect(title, "no title length CHECK found").not.toBeNull();
    expect(Number(title![1])).toBe(NOTIFICATION_TITLE_MAX);

    const body = /length\(body\)\s*<=\s*(\d+)/.exec(MIGRATION_SQL);
    expect(body, "no body length CHECK found").not.toBeNull();
    expect(Number(body![1])).toBe(NOTIFICATION_BODY_MAX);

    const link = /length\(link\)\s+between\s+1\s+and\s+(\d+)/.exec(
      MIGRATION_SQL,
    );
    expect(link, "no link length CHECK found").not.toBeNull();
    expect(Number(link![1])).toBe(NOTIFICATION_LINK_MAX);
  });
});

describe("RLS posture — the properties 0049 exists to hold", () => {
  it("grants SELECT and UPDATE to the owner, and nothing else", () => {
    expect(MIGRATION_SQL).toContain("notifications_select_own");
    expect(MIGRATION_SQL).toContain("notifications_update_own");
  });

  it("has NO insert policy — the Mainstable divergence", () => {
    // The whole reason this table is written by service-role code: an
    // insert policy would let any authenticated user forge a row in a
    // stranger's feed, on the surface where a renter learns whether
    // their booking was approved.
    expect(MIGRATION_SQL).not.toMatch(/on public\.notifications\s+for insert/i);
  });

  it("makes read_at the only user-updatable column, twice", () => {
    // Layer 1: the column grant. An UPDATE naming any other column is
    // refused before RLS is consulted.
    expect(MIGRATION_SQL).toContain(
      "grant update (read_at) on public.notifications to authenticated",
    );
    expect(MIGRATION_SQL).toContain(
      "revoke all on public.notifications from anon, authenticated",
    );

    // Layer 2: the trigger, which also binds service-role code.
    expect(MIGRATION_SQL).toContain(
      "notifications: read_at is the only updatable column",
    );
    expect(MIGRATION_SQL).toMatch(
      /create trigger notifications_immutable_guard\s+before update on public\.notifications/,
    );
  });

  it("freezes every column the trigger claims to freeze", () => {
    // A column added to the table but forgotten in the guard would be
    // silently editable. Compare the guard body to the select list.
    const guard = /notifications_enforce_immutable\(\)[\s\S]*?raise exception/.exec(
      MIGRATION_SQL,
    );
    expect(guard, "could not read the guard body").not.toBeNull();
    const body = guard![0];
    for (const col of ["id", "user_id", "type", "title", "body", "link", "created_at"]) {
      expect(body, `${col} is not frozen`).toContain(`new.${col} is distinct from old.${col}`);
    }
    // …and read_at is deliberately NOT in it.
    expect(body).not.toContain("new.read_at is distinct from old.read_at");
  });

  it("stamps read_at from the database clock, not from the caller", () => {
    // The grant lets a user write read_at; without this the VALUE was
    // theirs to choose, on a row nothing else can touch, while the route
    // comments and any future digest treat it as an audit fact. The
    // trigger normalizes it: now() on the unread → read transition, the
    // original stamp on any later write, and null (mark unread) left
    // alone because a null claims nothing.
    const fn = /create or replace function public\.notifications_enforce_immutable\(\)[\s\S]*?\$\$ language plpgsql;/.exec(
      MIGRATION_SQL,
    );
    expect(fn, "could not read the trigger function").not.toBeNull();
    const source = fn![0];
    expect(source).toMatch(/if new\.read_at is not null then/);
    expect(source).toMatch(/new\.read_at\s*:=\s*now\(\)/);
    expect(source).toMatch(/new\.read_at\s*:=\s*old\.read_at/);

    // BEFORE UPDATE is what makes an assignment to NEW land.
    expect(MIGRATION_SQL).toMatch(
      /create trigger notifications_immutable_guard\s+before update on public\.notifications/,
    );
  });

  it("indexes the feed query and the unread badge", () => {
    expect(MIGRATION_SQL).toContain(
      "on public.notifications (user_id, created_at desc)",
    );
    expect(MIGRATION_SQL).toMatch(/where read_at is null/);
  });
});

describe("NOTIFICATION_COLS matches the row type", () => {
  it("names every column the API projects", () => {
    const cols = NOTIFICATION_COLS.split(",").map((c) => c.trim());
    expect(sorted(cols)).toEqual(
      sorted([
        "id",
        "user_id",
        "type",
        "title",
        "body",
        "link",
        "read_at",
        "created_at",
      ]),
    );
  });

  it("projectNotification drops user_id and camelCases the rest", () => {
    const row: NotificationRow = {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      type: "booking_approved",
      title: "Confirmed",
      body: null,
      link: "/account/rentals",
      read_at: null,
      created_at: "2026-08-10T12:00:00.000Z",
    };
    const view = projectNotification(row);
    expect(view).toEqual({
      id: row.id,
      type: "booking_approved",
      title: "Confirmed",
      body: null,
      link: "/account/rentals",
      readAt: null,
      createdAt: row.created_at,
    });
    expect(view as Record<string, unknown>).not.toHaveProperty("user_id");
  });
});

describe("isSafeNotificationLink mirrors the SQL constraint", () => {
  it("the SQL says what this function says", () => {
    // Both halves of the rule exist so a route can reject before the
    // insert; if one is edited the other must be too.
    expect(MIGRATION_SQL).toContain("left(link, 1) = '/'");
    expect(MIGRATION_SQL).toContain("left(link, 2) <> '//'");
    expect(MIGRATION_SQL).toContain("position('\\' in link) = 0");
    expect(MIGRATION_SQL).toContain("position(':' in link) = 0");
    expect(MIGRATION_SQL).toContain("link !~ '[[:cntrl:]]'");
  });

  it("accepts same-origin paths", () => {
    for (const link of [
      "/account/rentals",
      "/partner/requests",
      "/rent/huracan-evo",
      "/account/requests?tab=open",
      "/account#top",
    ]) {
      expect(isSafeNotificationLink(link), link).toBe(true);
    }
  });

  it("rejects everything that could leave the origin", () => {
    for (const link of [
      "https://evil.example",
      "//evil.example",
      "javascript:alert(1)",
      "/x\\evil.example",
      "/x:y",
      "account/requests", // no leading slash
      "",
      "  /account",
      "/a b",
      `/${"a".repeat(NOTIFICATION_LINK_MAX)}`,
      null,
      undefined,
      42,
    ]) {
      expect(isSafeNotificationLink(link), String(link)).toBe(false);
    }
  });
});

// ── the copy ────────────────────────────────────────────────────────

const TRIP = {
  car: "2024 Lamborghini Huracán",
  startDate: "2026-09-14",
  endDate: "2026-09-18",
};

/** A distinctive operator name — if it shows up anywhere it should not,
 *  a substring search finds it. */
const OPERATOR = "GM LUXE Rentals";

/** Every builder, exercised with inputs that make a leak visible. */
function everyContent(): Array<[string, NotificationContent]> {
  return [
    ["bookingRequestedForOperator", bookingRequestedForOperator(TRIP)],
    [
      "bookingApprovedForRenter",
      bookingApprovedForRenter({ ...TRIP, operatorName: OPERATOR, market: "Miami" }),
    ],
    [
      "bookingDeclinedForRenter",
      bookingDeclinedForRenter({ ...TRIP, market: "Miami" }),
    ],
    [
      "bookingCounterOfferedForRenter",
      bookingCounterOfferedForRenter({ ...TRIP, market: "Miami" }),
    ],
    [
      "bookingCounterAnsweredForOperator/accepted",
      bookingCounterAnsweredForOperator({ ...TRIP, accepted: true }),
    ],
    [
      "bookingCounterAnsweredForOperator/declined",
      bookingCounterAnsweredForOperator({ ...TRIP, accepted: false }),
    ],
    [
      "bookingExpiringSoon/renter",
      bookingExpiringSoon({ ...TRIP, market: "Miami", audience: "renter" }),
    ],
    [
      "bookingExpiringSoon/operator",
      bookingExpiringSoon({ ...TRIP, market: "Miami", audience: "operator" }),
    ],
    [
      "bookingExpired/renter",
      bookingExpired({ ...TRIP, market: "Miami", audience: "renter" }),
    ],
    [
      "bookingExpired/operator",
      bookingExpired({ ...TRIP, market: "Miami", audience: "operator" }),
    ],
    [
      "bookingCancelledForRenter/confirmed",
      bookingCancelledForRenter({
        ...TRIP,
        market: "Miami",
        wasConfirmed: true,
        operatorName: OPERATOR,
        cancelledBy: "operator",
      }),
    ],
    [
      "bookingCancelledForRenter/unconfirmed",
      bookingCancelledForRenter({
        ...TRIP,
        market: "Miami",
        wasConfirmed: false,
        operatorName: OPERATOR,
        cancelledBy: "operator",
      }),
    ],
    [
      "bookingCancelledForRenter/admin",
      bookingCancelledForRenter({
        ...TRIP,
        market: "Miami",
        wasConfirmed: true,
        operatorName: OPERATOR,
        cancelledBy: "admin",
      }),
    ],
    [
      "bookingCancelledForOperator",
      bookingCancelledForOperator({ ...TRIP, cancelledBy: "renter" }),
    ],
    [
      "bookingCancelledForOperator/unknown",
      bookingCancelledForOperator({ ...TRIP }),
    ],
    ["accountNotice", accountNotice({ title: "Verification approved" })],
  ];
}

describe("every builder produces a row 0049 will accept", () => {
  it.each(everyContent())("%s", (_name, content) => {
    expect(isNotificationType(content.type)).toBe(true);
    expect(content.title.trim().length).toBeGreaterThan(0);
    expect(content.title.length).toBeLessThanOrEqual(NOTIFICATION_TITLE_MAX);
    if (content.body) {
      expect(content.body.length).toBeLessThanOrEqual(NOTIFICATION_BODY_MAX);
    }
    if (content.link) {
      expect(isSafeNotificationLink(content.link), content.link).toBe(true);
    }
  });

  it("names the car in every booking notification", () => {
    for (const [name, content] of everyContent()) {
      if (content.type === "account_notice") continue;
      expect(`${content.title} ${content.body ?? ""}`, name).toContain(TRIP.car);
    }
  });
});

describe("D6 — the operator is not named before confirmation", () => {
  // ── the structural half ──────────────────────────────────────────
  // These are compile-time assertions. A future edit that adds an
  // operator-name field to a pre-confirmation builder's input type
  // fails `npm run typecheck`, not just this suite — which is the
  // point: the rule is enforced by the shape of the function, so a
  // route cannot leak what it cannot pass.
  type HasOperatorName<T> = "operatorName" extends keyof T ? true : false;
  const declined: HasOperatorName<Parameters<typeof bookingDeclinedForRenter>[0]> =
    false;
  const countered: HasOperatorName<
    Parameters<typeof bookingCounterOfferedForRenter>[0]
  > = false;
  const expiring: HasOperatorName<Parameters<typeof bookingExpiringSoon>[0]> =
    false;
  const expired: HasOperatorName<Parameters<typeof bookingExpired>[0]> = false;

  it("the pre-confirmation builders have no operator-name field at all", () => {
    expect([declined, countered, expiring, expired]).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  // ── the runtime half ─────────────────────────────────────────────

  it("declined names the market, never the company", () => {
    const c = bookingDeclinedForRenter({ ...TRIP, market: "Miami" });
    expect(c.body).toContain("A vetted Miami operator");
    expect(`${c.title} ${c.body}`).not.toContain(OPERATOR);
  });

  it("a counter-offer is still pre-confirmation, so still anonymous", () => {
    const c = bookingCounterOfferedForRenter({ ...TRIP, market: "Miami" });
    expect(c.body).toContain("A vetted Miami operator");
  });

  it("an expiring or expired request never names the operator", () => {
    for (const c of [
      bookingExpiringSoon({ ...TRIP, market: "Miami", audience: "renter" }),
      bookingExpired({ ...TRIP, market: "Miami", audience: "renter" }),
    ]) {
      expect(c.body).toContain("A vetted Miami operator");
      expect(`${c.title} ${c.body}`).not.toContain(OPERATOR);
    }
  });

  it("falls back to a market-less label when the market is unknown", () => {
    const c = bookingDeclinedForRenter({ ...TRIP });
    expect(c.body).toContain("A vetted RYDA operator");
  });

  it("APPROVAL names the operator — the one event that reveals", () => {
    const c = bookingApprovedForRenter({
      ...TRIP,
      operatorName: OPERATOR,
      market: "Miami",
    });
    expect(c.body).toContain(OPERATOR);
  });

  it("approval degrades to the anonymous label when no name loaded", () => {
    // A failed partners lookup must not produce a half-sentence.
    const c = bookingApprovedForRenter({ ...TRIP, market: "Miami" });
    expect(c.body).toContain("A vetted Miami operator");
    expect(c.body).not.toContain("undefined");
    expect(c.body).not.toContain("null");
  });

  it("a cancellation BEFORE confirmation drops the name it was handed", () => {
    // The sharpest case: the caller passes a real operator name and the
    // builder must ignore it, because a booking cancelled out of
    // 'requested' never earned the reveal.
    const c = bookingCancelledForRenter({
      ...TRIP,
      market: "Miami",
      wasConfirmed: false,
      operatorName: OPERATOR,
      cancelledBy: "operator",
    });
    expect(`${c.title} ${c.body}`).not.toContain(OPERATOR);
    expect(c.body).toContain("A vetted Miami operator");
  });

  it("a cancellation AFTER confirmation keeps the name", () => {
    // The renter dealt with a named company and must be able to say who
    // called their trip off.
    const c = bookingCancelledForRenter({
      ...TRIP,
      market: "Miami",
      wasConfirmed: true,
      operatorName: OPERATOR,
      cancelledBy: "operator",
    });
    expect(c.body).toContain(OPERATOR);
  });

  it("a renter's own cancellation does not name anyone", () => {
    const c = bookingCancelledForRenter({
      ...TRIP,
      market: "Miami",
      wasConfirmed: true,
      operatorName: OPERATOR,
      cancelledBy: "renter",
    });
    expect(c.body).not.toContain(OPERATOR);
  });
});

describe("links point at the surfaces that carry the controls", () => {
  // Both routes arrive with feat/dt-rental-booking-surfaces (2F/2G) and
  // are absent from this tree — see the note above the two functions.
  // Pinned here because the previous targets (/partner, /account/requests)
  // are real pages that render TODAY, so the mistake is invisible in a
  // click-through: the operator's overview has no approve/decline
  // controls, and /account/requests lists rental_inquiries, a different
  // table from rental_bookings entirely.
  it("the renter goes to their bookings, not to the inquiry funnel", () => {
    expect(renterBookingLink()).toBe("/account/rentals");
  });

  it("the operator goes to the request inbox, not to the overview", () => {
    expect(operatorBookingLink()).toBe("/partner/requests");
  });

  it("every booking builder uses one of the two", () => {
    const surfaces = [renterBookingLink(), operatorBookingLink()];
    for (const [name, content] of everyContent()) {
      if (content.type === "account_notice") continue;
      expect(surfaces, name).toContain(content.link);
    }
  });
});

describe("cancellation copy never invents who cancelled", () => {
  // The bug this pins: a two-branch `cancelledBy === 'renter' ? … : …`
  // told the renter the OPERATOR cancelled whenever the value was
  // anything else — including 'admin' (RYDA support did it) and null (an
  // unstamped row) — and told the operator THE RENTER cancelled in the
  // same two cases. Naming the wrong party is worse than naming none:
  // it sends the reader to argue with someone who did nothing.
  const CONFIRMED = {
    ...TRIP,
    market: "Miami",
    wasConfirmed: true as const,
    operatorName: OPERATOR,
  };

  it("admin is RYDA, and is not laundered into the operator", () => {
    const renter = bookingCancelledForRenter({
      ...CONFIRMED,
      cancelledBy: "admin",
    });
    expect(renter.body).toContain("RYDA cancelled");
    expect(renter.body).not.toContain(OPERATOR);

    const operator = bookingCancelledForOperator({
      ...TRIP,
      cancelledBy: "admin",
    });
    expect(operator.body).toContain("RYDA cancelled");
    expect(operator.body).not.toContain("The renter cancelled");
  });

  it("an unstamped cancelled_by attributes the act to nobody", () => {
    for (const cancelledBy of [null, undefined]) {
      const renter = bookingCancelledForRenter({
        ...CONFIRMED,
        cancelledBy,
      });
      expect(renter.body, String(cancelledBy)).toContain("has been cancelled");
      expect(renter.body).not.toContain(OPERATOR);
      expect(renter.body).not.toContain("RYDA cancelled");

      const operator = bookingCancelledForOperator({
        ...TRIP,
        cancelledBy,
      });
      expect(operator.body, String(cancelledBy)).toContain("has been cancelled");
      expect(operator.body).not.toContain("The renter cancelled");
      expect(operator.body).not.toContain("You cancelled");
    }
  });

  it("still names the party when the row does say who", () => {
    expect(
      bookingCancelledForRenter({ ...CONFIRMED, cancelledBy: "operator" }).body,
    ).toContain(`${OPERATOR} cancelled`);
    expect(
      bookingCancelledForRenter({ ...CONFIRMED, cancelledBy: "renter" }).body,
    ).toContain("Your booking");
    expect(
      bookingCancelledForOperator({ ...TRIP, cancelledBy: "operator" }).body,
    ).toContain("You cancelled");
    expect(
      bookingCancelledForOperator({ ...TRIP, cancelledBy: "renter" }).body,
    ).toContain("The renter cancelled");
  });

  it("every cancelledBy value produces a sentence naming the car", () => {
    for (const cancelledBy of [
      "renter",
      "operator",
      "admin",
      null,
      undefined,
    ] as const) {
      for (const content of [
        bookingCancelledForRenter({ ...CONFIRMED, cancelledBy }),
        bookingCancelledForRenter({
          ...TRIP,
          market: "Miami",
          wasConfirmed: false,
          cancelledBy,
        }),
        bookingCancelledForOperator({ ...TRIP, cancelledBy }),
      ]) {
        expect(content.body, String(cancelledBy)).toContain(TRIP.car);
      }
    }
  });
});

describe("no copy claims money moved (guardrail 3.9)", () => {
  // Phase 3B has not landed. Nothing charges, holds, or refunds
  // anything, and a timestamped notification is the worst place to
  // imply otherwise.
  const MONEY =
    /\b(charg\w*|refund\w*|deposit\w*|payout\w*|payment\w*|paid|billed|invoice\w*|card|receipt)\b/i;

  it.each(everyContent())("%s says nothing about money", (_name, content) => {
    const text = `${content.title} ${content.body ?? ""}`;
    expect(text, `matched: ${MONEY.exec(text)?.[0]}`).not.toMatch(MONEY);
  });
});

describe("date formatting is UTC, not the reader's timezone", () => {
  it("renders the calendar days it was given", () => {
    // A local-time format would show a renter in Los Angeles the day
    // before their pickup. 0047's dates are UTC calendar days.
    expect(formatBookingDates("2026-09-14", "2026-09-18")).toBe("Sep 14 – Sep 18");
  });

  it("degrades to the raw values rather than printing Invalid Date", () => {
    expect(formatBookingDates("nope", "also-nope")).toBe("nope – also-nope");
  });

  it("counts nights, not days", () => {
    // Sep 14 → Sep 18 is four nights (0047: nights = end - start).
    const c = bookingRequestedForOperator(TRIP);
    expect(c.body).toContain("4 nights");
  });

  it("says '1 night' for a one-night rental", () => {
    const c = bookingRequestedForOperator({
      ...TRIP,
      startDate: "2026-09-14",
      endDate: "2026-09-15",
    });
    expect(c.body).toContain("1 night");
  });
});

describe("bookingExpiringSoon", () => {
  it("addresses the party that owes the answer", () => {
    const operator = bookingExpiringSoon({
      ...TRIP,
      audience: "operator",
      hoursLeft: 4,
    });
    expect(operator.link).toBe("/partner/requests");
    expect(operator.body).toContain("unanswered");

    const renter = bookingExpiringSoon({
      ...TRIP,
      audience: "renter",
      hoursLeft: 4,
    });
    expect(renter.link).toBe("/account/rentals");
    expect(renter.body).toContain("waiting on your answer");
  });

  it("never says '0 hours'", () => {
    const c = bookingExpiringSoon({ ...TRIP, audience: "operator", hoursLeft: 0 });
    expect(c.title).toContain("1 hour");
  });
});

describe("accountNotice", () => {
  it("drops a link it cannot vouch for", () => {
    // The one builder whose destination comes from the caller.
    expect(accountNotice({ title: "Hi", link: "https://evil.example" }).link).toBeNull();
    expect(accountNotice({ title: "Hi", link: "/account/verification" }).link).toBe(
      "/account/verification",
    );
  });

  it("cannot point at a booking surface — the D6 fence", () => {
    // This builder takes free text and therefore has no D6-shaped input
    // type. The line it must not cross is being used to ANNOUNCE A
    // BOOKING, and the machine-checkable half of that is the
    // destination: a row that opens the renter's bookings or the
    // operator's request inbox is a booking notification and must come
    // from a gated builder above.
    for (const link of [
      renterBookingLink(),
      operatorBookingLink(),
      `${renterBookingLink()}/abc-123`,
      `${operatorBookingLink()}?tab=open`,
      `${renterBookingLink().toUpperCase()}`,
      `${renterBookingLink()}/`,
    ]) {
      expect(accountNotice({ title: "Hi", link }).link, link).toBeNull();
    }
  });

  it("still allows the account surfaces a notice actually needs", () => {
    for (const link of [
      "/account/verification",
      "/account/documents",
      "/account/security",
      // Near-miss: a different section that merely starts the same way.
      "/account/rentalspolicy",
    ]) {
      expect(accountNotice({ title: "Hi", link }).link, link).toBe(link);
    }
  });

  it("is always the catch-all type, never a booking one", () => {
    expect(accountNotice({ title: "Hi" }).type).toBe("account_notice");
  });
});

// ── the writer ──────────────────────────────────────────────────────

type InsertOutcome = {
  data?: { id: string } | null;
  error?: { message: string } | null;
};

/** Minimal stand-in for the service-role client's insert chain. */
function stubDb(
  outcome: InsertOutcome | (() => never),
): { db: SupabaseClient; inserted: Record<string, unknown>[] } {
  const inserted: Record<string, unknown>[] = [];
  const db = {
    from() {
      return {
        insert(row: Record<string, unknown>) {
          inserted.push(row);
          return {
            select() {
              return {
                async maybeSingle() {
                  // `return` rather than a bare call so TypeScript
                  // narrows the union below.
                  if (typeof outcome === "function") return outcome();
                  return {
                    data: outcome.data ?? null,
                    error: outcome.error ?? null,
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { db, inserted };
}

const VALID = {
  userId: "33333333-3333-4333-8333-333333333333",
  ...bookingRequestedForOperator(TRIP),
};

describe("notifyUser — best effort, never throws", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the row and returns its id", async () => {
    const { db, inserted } = stubDb({ data: { id: "abc" } });
    const res = await notifyUser(db, VALID);
    expect(res).toEqual({ ok: true, id: "abc" });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      user_id: VALID.userId,
      type: "booking_requested",
      link: "/partner/requests",
    });
  });

  it("never writes a column the trigger would refuse", async () => {
    // read_at and created_at are the database's to set; id is
    // generated. An insert that named them would be a route trying to
    // backdate a notification.
    const { db, inserted } = stubDb({ data: { id: "abc" } });
    await notifyUser(db, VALID);
    expect(Object.keys(inserted[0]).sort()).toEqual([
      "body",
      "link",
      "title",
      "type",
      "user_id",
    ]);
  });

  it("degrades quietly with no client at all (preview deploy)", async () => {
    const res = await notifyUser(null, VALID);
    expect(res).toEqual({ ok: false, reason: "not_configured" });
  });

  it("degrades quietly when the table is missing (pre-0049)", async () => {
    const { db } = stubDb({
      error: {
        message:
          'relation "public.notifications" does not exist (schema cache)',
      },
    });
    const res = await notifyUser(db, VALID);
    expect(res).toEqual({ ok: false, reason: "table_missing" });
  });

  it("returns failed — not a throw — on any other database error", async () => {
    const { db } = stubDb({ error: { message: "connection reset" } });
    const res = await notifyUser(db, VALID);
    expect(res).toMatchObject({ ok: false, reason: "failed" });
  });

  it("swallows a throw from the client", async () => {
    // The whole point: this sits beside a confirmed booking.
    const { db } = stubDb(() => {
      throw new Error("socket hang up");
    });
    await expect(notifyUser(db, VALID)).resolves.toMatchObject({
      ok: false,
      reason: "failed",
    });
  });

  it("resolves rather than rejecting on a malformed input object", async () => {
    // The contract is "there is no error path a caller has to handle",
    // and the documented call site is `void notifyUser(...)` with no
    // .catch(). So a TypeError inside the helper is not a caught bug —
    // it is an unhandled rejection beside a confirmed booking, which is
    // the exact failure this module exists to rule out.
    //
    // These are the shapes that actually arrive: accountNotice() is the
    // one builder whose content comes from the caller, so a route
    // handing it `body.title` off an unvalidated JSON payload passes a
    // number or an object, not a string.
    const { db, inserted } = stubDb({ data: { id: "abc" } });

    for (const bad of [
      { ...VALID, title: 42 as never },
      { ...VALID, title: { toString: () => "x" } as never },
      { ...VALID, title: undefined as never },
      { ...VALID, userId: 7 as never },
      null as never,
      undefined as never,
    ]) {
      const res = await notifyUser(db, bad);
      expect(res, JSON.stringify(bad)).toMatchObject({ ok: false });
      expect(res.ok).toBe(false);
    }

    // …and none of them reached the database.
    expect(inserted).toHaveLength(0);
  });

  it("reports a non-string title as `invalid`, not as `failed`", async () => {
    // A bad row is a bug in OUR code, and the reason code says so —
    // `failed` would file it alongside a dropped connection and hide it.
    const { db } = stubDb({ data: { id: "abc" } });
    const res = await notifyUser(db, { ...VALID, title: 42 as never });
    expect(res).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("rejects a row 0049 would reject, without querying", async () => {
    const { db, inserted } = stubDb({ data: { id: "abc" } });

    const badType = await notifyUser(db, {
      ...VALID,
      type: "booking_confirmed" as never,
    });
    expect(badType).toMatchObject({ ok: false, reason: "invalid" });

    const noTitle = await notifyUser(db, { ...VALID, title: "   " });
    expect(noTitle).toMatchObject({ ok: false, reason: "invalid" });

    const noUser = await notifyUser(db, { ...VALID, userId: "" });
    expect(noUser).toMatchObject({ ok: false, reason: "invalid" });

    expect(inserted).toHaveLength(0);
  });

  it("drops an unsafe link but still delivers the news", async () => {
    // A feed row with no destination is a legible degradation; a bad
    // href on a screen the user already trusts is a phishing shape.
    const { db, inserted } = stubDb({ data: { id: "abc" } });
    const res = await notifyUser(db, {
      ...VALID,
      link: "https://evil.example",
    });
    expect(res).toMatchObject({ ok: true });
    expect(inserted[0].link).toBeNull();
    expect(inserted[0].title).toBe(VALID.title);
  });

  it("truncates rather than dropping an over-long title", async () => {
    const { db, inserted } = stubDb({ data: { id: "abc" } });
    await notifyUser(db, { ...VALID, title: "x".repeat(500) });
    expect(String(inserted[0].title)).toHaveLength(NOTIFICATION_TITLE_MAX);
  });

  it("normalizes an empty body to null", async () => {
    const { db, inserted } = stubDb({ data: { id: "abc" } });
    await notifyUser(db, { ...VALID, body: "   " });
    expect(inserted[0].body).toBeNull();
  });
});

describe("notifyUsers — one failure does not cancel the rest", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns one result per input, in order", async () => {
    const { db } = stubDb({ data: { id: "abc" } });
    const results = await notifyUsers(db, [
      VALID,
      { ...VALID, type: "nope" as never },
      VALID,
    ]);
    expect(results.map((r) => r.ok)).toEqual([true, false, true]);
  });

  it("a malformed member does not reject the whole fan-out", async () => {
    // The fan-out is `await`ed in a loop, so a rejection from any one
    // member would take the rest of the recipients with it — the
    // operator's staff notification lost because the renter's title was
    // a number.
    const { db } = stubDb({ data: { id: "abc" } });
    const results = await notifyUsers(db, [
      VALID,
      { ...VALID, title: 42 as never },
      VALID,
    ]);
    expect(results.map((r) => r.ok)).toEqual([true, false, true]);
  });
});

describe("isNotificationsTableMissing", () => {
  it("recognizes the two codes that mean no such relation", () => {
    // 42P01 = Postgres undefined_table; PGRST205 = PostgREST could not
    // find the TABLE in its schema cache.
    expect(
      isNotificationsTableMissing({
        code: "42P01",
        message: 'relation "public.notifications" does not exist',
      }),
    ).toBe(true);
    expect(
      isNotificationsTableMissing({
        code: "PGRST205",
        message:
          "Could not find the table 'public.notifications' in the schema cache",
      }),
    ).toBe(true);
  });

  it("recognizes both phrasings when the error carries no code", () => {
    expect(
      isNotificationsTableMissing({
        message: "Could not find the table 'public.notifications' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isNotificationsTableMissing({
        message: 'relation "public.notifications" does not exist',
      }),
    ).toBe(true);
  });

  it("does NOT treat schema drift as a missing table", () => {
    // The bug this exists to stop. A missing COLUMN is phrased with the
    // table's own name inside it, so the loose "mentions the table and
    // says does-not-exist" test matched it — and classifying drift as
    // table_missing drops every notification, silently, behind a
    // "apply 0049" message that fixes nothing (0049 is already applied;
    // `create table if not exists` is a no-op). Drift must fall through
    // to `failed`, which is loud.
    for (const error of [
      {
        code: "42703",
        message:
          'column "body" of relation "notifications" does not exist',
      },
      {
        code: "PGRST204",
        message:
          "Could not find the 'body' column of 'notifications' in the schema cache",
      },
      // …and the same two with no code at all.
      { message: 'column "body" of relation "notifications" does not exist' },
      {
        message:
          "Could not find the 'body' column of 'notifications' in the schema cache",
      },
    ]) {
      expect(isNotificationsTableMissing(error), error.message).toBe(false);
    }
  });

  it("does not swallow an unrelated error", () => {
    expect(isNotificationsTableMissing({ message: "connection reset" })).toBe(
      false,
    );
    // A different table's absence is a different bug.
    expect(
      isNotificationsTableMissing({
        message: 'relation "public.rental_bookings" does not exist',
      }),
    ).toBe(false);
    // A permission failure names the table and is emphatically not
    // "apply the migration".
    expect(
      isNotificationsTableMissing({
        code: "42501",
        message: "permission denied for table notifications",
      }),
    ).toBe(false);
    expect(
      isNotificationsTableMissing({
        code: "23514",
        message:
          'new row for relation "notifications" violates check constraint "notifications_type_known"',
      }),
    ).toBe(false);
    expect(isNotificationsTableMissing(null)).toBe(false);
  });
});

describe("countUnreadNotifications", () => {
  function countDb(result: { count?: number | null; error?: unknown }) {
    return {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  is: async () => result,
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;
  }

  it("returns the count", async () => {
    expect(await countUnreadNotifications(countDb({ count: 3 }), "u")).toBe(3);
  });

  it("returns 0 rather than failing the page", async () => {
    // The badge is decoration; the list is the payload.
    expect(
      await countUnreadNotifications(countDb({ error: { message: "boom" } }), "u"),
    ).toBe(0);
    expect(await countUnreadNotifications(countDb({ count: null }), "u")).toBe(0);
    expect(await countUnreadNotifications(null, "u")).toBe(0);
  });
});
