// In-app notifications (migration 0049) — the vocabulary, the
// best-effort writer, and the copy for every rental-booking event.
//
// RYDA had one notification channel before this: notifyTeam() in
// src/lib/notify.ts, which emails the TEAM. This module is the second
// channel and it points the other way — at the renter and the operator.
// The two are siblings, not replacements: a route that matters may call
// both, and this module inherits notify.ts's central discipline.
//
// THE DISCIPLINE: A NOTIFICATION NEVER FAILS THE THING IT ANNOUNCES.
// notifyTeam returns false and logs rather than throwing, because an
// email is a side effect of a database write and not part of it. The
// stakes here are higher, because the write this sits beside is a
// booking. If notifyUser() could throw, a Resend-style outage — a
// schema-cache miss, a dropped connection, a table that does not exist
// yet — would turn "the operator approved your booking" into a 500
// AFTER the row was already confirmed (and, once a charge exists at
// all, after the OPERATOR had already taken it). So notifyUser()
// catches everything, logs, and returns a
// result the caller is free to ignore. There is no error path a caller
// has to handle, which is what makes the one-line call site at each
// booking event safe to add.
//
// NO `server-only` IMPORT, and no Supabase client at module scope. The
// writer takes its client as an argument, exactly as loadPartnerStaffIds
// does in rental-booking-access.ts, so the copy builders below stay pure
// and the Vitest suite can pin every word of them without a database.
// Keep it that way — the moment this file imports supabase-admin, a
// client component that wants a notification TYPE starts pulling the
// service-role key's module graph into the bundle.
//
// ── D6 LIVES IN THE TYPES HERE ──────────────────────────────────────
// Decision D6: operators are anonymous ("a Miami operator")
// through browse and request, and are named to the renter only after
// the booking is confirmed. A notification is a renter-facing surface
// and obeys it — but obeying it with an `if` in each builder would mean
// nine chances to forget.
//
// Instead the rule is structural: the input types of the builders that
// fire BEFORE confirmation (declined, counter-offered, expiring,
// expired) have NO operator-name field at all. A route cannot leak what
// it cannot pass. Only bookingApprovedForRenter — which by definition
// fires on the transition to 'confirmed' — accepts a name outright, and
// bookingCancelledForRenter takes an explicit `wasConfirmed` because a
// booking cancelled out of 'requested' never earned the reveal while
// one cancelled after confirmation keeps it (0047 stamps confirmed_at
// exactly once; that column is the discriminator).
//
// ── AND ONE THING NO COPY MAY SAY ───────────────────────────────────
// No builder claims money moved, was held, or was refunded. Two
// separate reasons, and both outlast the other:
//
//   TODAY there is no rail at all. computeRentalFee produces a quote;
//   nothing in the booking flow charges anybody, at request or at
//   confirmation. Copy that implies otherwise is simply false.
//
//   AND WHEN THE RAIL LANDS, IT IS NOT RYDA'S. Rental money moves by
//   Stripe Connect DIRECT CHARGES: the operator is merchant of record,
//   the funds land in the operator's balance, and RYDA takes only its
//   application fee. RYDA therefore cannot hold a deposit, cannot pay
//   out "after a clean return", and cannot refund a renter — only the
//   operator can. So no builder may ever say RYDA holds, protects,
//   escrows, guarantees or will refund a renter's money, and any future
//   money sentence names the OPERATOR as the party that charged and the
//   party to ask for a refund.
//
// Guardrail 3.9 is about exactly this class of over-promise, and a
// notification is the worst place to make one — it is timestamped, it
// is in the user's feed, and it reads as a receipt. State what the code
// did. The test suite next door greps the builders for money words and
// fails on a match.

import type { SupabaseClient } from "@supabase/supabase-js";
import { nightsBetween } from "./rental-availability";
import { anonymousOperatorLabel } from "./rental-booking-access";

// ── The vocabulary ──────────────────────────────────────────────────

/**
 * Every value public.notifications.type may hold. Must match the
 * `notifications_type_known` CHECK in migration 0049 exactly — the
 * Vitest suite parses that migration and fails if the two drift, the
 * same tripwire rental-booking-status.ts uses against 0047's trigger.
 *
 * Adding a member is a three-file edit (here, the migration, the test's
 * expectations follow automatically). That friction is deliberate: a
 * type is what a digest job groups on and what a preference toggle will
 * mute, so it is an interface, not a log tag.
 */
export const NOTIFICATION_TYPES = [
  /** To the OPERATOR: a renter asked for dates on one of their cars. */
  "booking_requested",
  /** To the RENTER: approved and confirmed. The first event D6 lets name the operator. */
  "booking_approved",
  /** To the RENTER: the operator said no. */
  "booking_declined",
  /** To the RENTER: the operator proposed different dates (a new 0047 row). */
  "booking_counter_offered",
  /** To the OPERATOR: the renter answered that counter-offer. */
  "booking_counter_answered",
  /** To whichever party owes the answer: O5's 24h clock is nearly up. */
  "booking_expiring_soon",
  /** To both: nobody answered in time. */
  "booking_expired",
  /** To the other party: a confirmed booking was called off. */
  "booking_cancelled",
  /** Everything that is not a booking event. The single catch-all. */
  "account_notice",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Narrow an unknown (a query result, a request body) to the union. */
export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

// ── Bounds, mirroring 0049's CHECKs ─────────────────────────────────

export const NOTIFICATION_TITLE_MAX = 200;
export const NOTIFICATION_BODY_MAX = 2000;
export const NOTIFICATION_LINK_MAX = 512;

/**
 * The same-origin rule from 0049's `notifications_link_relative`, in
 * TypeScript, so a route rejects a bad link before the insert instead
 * of reading a constraint violation back.
 *
 * Deliberately a restatement of safeNext()'s allow-list rather than a
 * call to it: safeNext SANITIZES (it returns a fallback for bad input,
 * which is right for a redirect and wrong here — a notification with a
 * silently rewritten link points somewhere nobody chose). This answers
 * yes or no.
 */
export function isSafeNotificationLink(link: unknown): link is string {
  if (typeof link !== "string") return false;
  if (link.length === 0 || link.length > NOTIFICATION_LINK_MAX) return false;
  if (!link.startsWith("/")) return false;
  if (link.startsWith("//")) return false;
  if (link.includes("\\")) return false;
  if (link.includes(":")) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(link)) return false;
  return true;
}

// ── The row, and the shape the API sends ────────────────────────────

/** Row shape of public.notifications (migration 0049). */
export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * Select list for NotificationRow. Must drift with the type above — a
 * column-name typo inside a .select() string is not a type error, the
 * trap rental-listings-db.ts and rental-booking-access.ts both document.
 */
export const NOTIFICATION_COLS =
  "id, user_id, type, title, body, link, read_at, created_at";

/**
 * One notification as the API sends it, camelCased.
 *
 * user_id is absent and that is not tidiness: every row in this payload
 * belongs to the caller by construction (the route filters on their id
 * and RLS agrees), so echoing the uuid back adds nothing a client can
 * use and one more field a future bug can populate wrongly.
 */
export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export function projectNotification(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

// ── The writer ──────────────────────────────────────────────────────

/** The content half of a notification — what a copy builder returns. */
export type NotificationContent = {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

/** Content plus its recipient — what notifyUser() writes. */
export type NotifyUserInput = NotificationContent & { userId: string };

/**
 * What happened, for a caller that wants to log it. Nobody has to read
 * this: `void notifyUser(...)` is a legitimate call site.
 *
 *   ok            written.
 *   not_configured  no Supabase client (a preview deploy without keys).
 *   table_missing   pre-0049 environment — see degradesQuietly below.
 *   invalid         the caller built a row 0049 would reject. A bug in
 *                   OUR code, logged loudly, never surfaced to a user.
 *   failed          anything else: transport, RLS, an unexpected throw.
 */
export type NotifyUserResult =
  | { ok: true; id: string | null }
  | {
      ok: false;
      reason: "not_configured" | "table_missing" | "invalid" | "failed";
      detail?: string;
    };

/**
 * "No such table" detection — notifications arrives with migration
 * 0049, which (per the build loop's rule that migrations are proposed,
 * not applied) may not be live when this code deploys. Mirrors the
 * schema-cache fallback in /api/rental-inquiry and the connect webhook.
 *
 * The consequence of getting this wrong is the reason it exists: during
 * the pre-migration window, an undetected missing table would make
 * every booking event log a red error, and the temptation would be to
 * make notifyUser throw so it is noticed. Instead it degrades — the
 * booking still happens, the feed shows its "not configured yet" state,
 * and the log line says which migration is owed.
 */
/**
 * The two codes that mean "no such relation", and nothing else means it.
 *
 *   42P01     Postgres `undefined_table`, raised when the statement
 *             actually reached the database.
 *   PGRST205  PostgREST could not find the TABLE in its schema cache.
 *             A missing COLUMN is PGRST204 / 42703 — different codes,
 *             deliberately not in this set.
 */
const RELATION_MISSING_CODES = new Set(["42P01", "PGRST205"]);

type DbError = { message?: string; code?: string } | null | undefined;

function isTableMissing(error: DbError, table: string): boolean {
  const name = table.toLowerCase();
  const msg = (error?.message ?? "").toLowerCase();

  // Whatever else is true, the error must be about THIS table. Another
  // table's absence is another migration's problem and must not be
  // answered with "apply 0049".
  if (!msg.includes(name)) return false;

  // CODE FIRST, because a message is prose and a code is a contract.
  // Supabase's PostgrestError always carries one, so in production this
  // is the whole test: a coded error that is not a missing relation is
  // NOT a missing relation, full stop. isForeignKeyViolation() in
  // partner-resolution.ts reads error.code the same way.
  const code = String(error?.code ?? "").toUpperCase();
  if (code) return RELATION_MISSING_CODES.has(code);

  // No code at all — an older client, or a hand-rolled error object.
  // Fall back to the two exact phrasings, ANCHORED, because the loose
  // version of this test is the expensive bug the review caught: schema
  // DRIFT is phrased with the table's own name inside it —
  //   column "body" of relation "notifications" does not exist
  //   Could not find the 'body' column of 'notifications' in the schema cache
  // — so "mentions the table AND says does-not-exist" matches a missing
  // COLUMN too. Classified as table_missing, that drift would log "apply
  // 0049" (already applied; re-applying fixes nothing, `create table if
  // not exists` being a no-op), return ok:false with no alert, and make
  // the feed render "Not switched on yet" — every notification dropped,
  // indefinitely, behind a remediation message pointing nowhere.
  //
  // Anchoring at the start of the message is what separates them: the
  // undefined_table text BEGINS with `relation "…"`, while the column
  // text begins with `column "…" of relation "…"`. Drift therefore falls
  // through to `failed`: logged loudly with the real message, and a 500
  // from the feed route rather than a calm empty state.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`^relation "(?:[a-z0-9_$]+\\.)?${escaped}" does not exist`).test(
      msg,
    ) ||
    new RegExp(
      `^could not find the table '(?:[a-z0-9_$]+\\.)?${escaped}' in the schema cache`,
    ).test(msg)
  );
}

/** True when this error means "run migration 0049". */
export function isNotificationsTableMissing(error: DbError): boolean {
  return isTableMissing(error, "notifications");
}

/**
 * Validate what a caller assembled, so a bad row is a logged bug rather
 * than a constraint violation surfacing three layers up.
 *
 * Titles are trimmed and truncated rather than rejected: a title one
 * character over the bound is a copy problem, and dropping the whole
 * notification over it would silently cost a renter the news that their
 * booking was approved. A missing title or a bad type is different —
 * those are structural and cannot be repaired by guessing.
 */
function prepare(
  input: NotifyUserInput,
):
  | { ok: true; row: Omit<NotificationRow, "id" | "read_at" | "created_at"> }
  | { ok: false; detail: string } {
  // Every field is checked for TYPE, not just for presence, and the
  // whole input for being an object at all. TypeScript says this is a
  // NotifyUserInput, but accountNotice() is the one builder whose
  // content comes from the caller — a route handing it `body.title`
  // straight off an unvalidated JSON payload passes a number, and
  // `(input.title ?? "").trim()` on a number is a TypeError. Since the
  // documented call site is `void notifyUser(...)` with no .catch(),
  // that throw would surface as an unhandled rejection beside a
  // booking write. A malformed row is a bug in OUR code: report it as
  // `invalid` and log it, exactly as a missing title is.
  if (!input || typeof input !== "object") {
    return { ok: false, detail: `input must be an object, got ${typeof input}` };
  }
  if (!input.userId || typeof input.userId !== "string") {
    return { ok: false, detail: "missing userId" };
  }
  if (!isNotificationType(input.type)) {
    return { ok: false, detail: `unknown type: ${String(input.type)}` };
  }
  if (typeof input.title !== "string") {
    return {
      ok: false,
      detail: `title must be a string, got ${typeof input.title}`,
    };
  }
  const title = input.title.trim();
  if (title.length === 0) return { ok: false, detail: "empty title" };

  const bodyRaw = input.body ?? null;
  const body =
    typeof bodyRaw === "string" && bodyRaw.trim().length > 0
      ? bodyRaw.trim().slice(0, NOTIFICATION_BODY_MAX)
      : null;

  // An unsafe link is DROPPED, not rejected: the news is worth
  // delivering even when the destination is wrong, and a feed row with
  // no link is a legible degradation where a bad href is a phishing
  // shape. Logged by the caller below.
  const link =
    input.link != null && isSafeNotificationLink(input.link)
      ? input.link
      : null;

  return {
    ok: true,
    row: {
      user_id: input.userId,
      type: input.type,
      title: title.slice(0, NOTIFICATION_TITLE_MAX),
      body,
      link,
    },
  };
}

/**
 * Drop one in-app notification into a user's feed. BEST EFFORT — never
 * throws, never fails the business action that triggered it.
 *
 * `db` must be the SERVICE-ROLE client (requireSupabaseAdmin()): 0049
 * grants no insert to `authenticated` at all, deliberately, so that a
 * browser cannot forge a row in anyone's feed including its own. Passing
 * a user-scoped client here returns { ok: false, reason: 'failed' } and
 * logs — it does not silently succeed.
 *
 * Call it beside the write it announces, not inside a transaction with
 * it. The booking is the fact; this is the telling.
 */
export async function notifyUser(
  db: SupabaseClient | null,
  input: NotifyUserInput,
): Promise<NotifyUserResult> {
  if (!db) {
    console.log("[notifications · skipped, no supabase client]", {
      type: input?.type,
    });
    return { ok: false, reason: "not_configured" };
  }

  // EVERYTHING after the client check is inside the try, prepare()
  // included. prepare() is defensive on its own (see its header), but
  // it and the log line below are ordinary property access over a value
  // this function does not control, and the contract this module sells
  // — "there is no error path a caller has to handle" — is only true if
  // nothing at all can escape. A rejected promise from a `void`
  // call site is a throw with extra steps.
  try {
    const prepared = prepare(input);
    if (!prepared.ok) {
      console.error("[notifications · invalid]", prepared.detail, {
        type: input?.type,
      });
      return { ok: false, reason: "invalid", detail: prepared.detail };
    }

    if (input.link != null && prepared.row.link === null) {
      console.warn("[notifications · dropped unsafe link]", {
        type: input.type,
        link: String(input.link).slice(0, 80),
      });
    }

    const { data, error } = await db
      .from("notifications")
      .insert(prepared.row)
      .select("id")
      .maybeSingle();

    if (error) {
      if (isNotificationsTableMissing(error)) {
        console.log("[notifications · skipped, table missing (apply 0049)]", {
          type: input.type,
        });
        return { ok: false, reason: "table_missing" };
      }
      console.error("[notifications · insert]", error.message);
      return { ok: false, reason: "failed", detail: error.message };
    }

    return { ok: true, id: (data as { id?: string } | null)?.id ?? null };
  } catch (e) {
    // The catch notify.ts has and for the same reason: a throw here
    // would propagate into a route that has already confirmed a booking.
    console.error("[notifications · throw]", e);
    return {
      ok: false,
      reason: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * How many unread rows this user has — the nav badge, and the number
 * both API routes return so a client never has to derive it from a page
 * of results (a page of 20 cannot tell you there are 40).
 *
 * `head: true` with an exact count is a COUNT, not a fetch: no rows
 * cross the wire. Served by 0049's partial unread index, so it never
 * touches a read row.
 *
 * Returns 0 on ANY error, including a missing table. The badge is
 * decoration and the list is the payload; a feed that 500s because a
 * count query hiccuped is the wrong trade. Lives here rather than in the
 * route because a Next route file may only export HTTP methods.
 */
export async function countUnreadNotifications(
  db: SupabaseClient | null,
  userId: string,
): Promise<number> {
  if (!db) return 0;
  try {
    const { count, error } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Fan-out: the same or different notifications to several users in one
 * call — the operator's staff, or both sides of a booking that expired.
 *
 * Sequential rather than Promise.all, and settled rather than raced: the
 * list is two or three recipients in every real call site, and one
 * failure must not cancel the rest. Returns one result per input, in
 * order.
 */
export async function notifyUsers(
  db: SupabaseClient | null,
  inputs: readonly NotifyUserInput[],
): Promise<NotifyUserResult[]> {
  const out: NotifyUserResult[] = [];
  for (const input of inputs) {
    out.push(await notifyUser(db, input));
  }
  return out;
}

// ── Where a notification points ─────────────────────────────────────
//
// CROSS-BRANCH DEPENDENCY, stated plainly: neither of these routes
// exists in THIS tree. Both are built on feat/dt-rental-booking-surfaces
// (build loop 2F and 2G) and arrive when that branch merges.
//
// They are still what these links point at, because they are the only
// screens that can do what the copy tells the reader to do:
//
//   /partner/requests  the operator's approve / decline / counter-offer
//                      inbox over rental_bookings. /partner — where these
//                      links used to point — is the partner OVERVIEW: it
//                      has a status card and a fleet panel and no request
//                      controls whatsoever, so "you have 24 hours to
//                      approve or decline" landed on a page with no way
//                      to do either.
//   /account/rentals   the renter's rental_bookings. /account/requests —
//                      the old target — lists rental_INQUIRIES, the lead
//                      funnel from before 0047 existed. Different table,
//                      different object, and a renter sent there to check
//                      on a booking finds a list their booking is not in.
//
// A link that 404s until the surfaces branch merges is the smaller lie:
// it is obviously broken, where a link that lands on the wrong real page
// reads as "your booking is not there". When the deep links land
// (/account/rentals/<id>, /partner/requests/<id>) change these two
// functions and every past and future notification follows, because the
// link is built here and nowhere else.

/** Where a renter's booking notification takes them. */
export function renterBookingLink(): string {
  return "/account/rentals";
}

/** Where an operator's booking notification takes them. */
export function operatorBookingLink(): string {
  return "/partner/requests";
}

// ── Copy ────────────────────────────────────────────────────────────

/**
 * The facts every booking notification is built from.
 *
 * `car` is the display label both parties use for the vehicle
 * ("2024 Lamborghini Huracán") — assembled by the caller from the
 * listing row, because this module does not query.
 *
 * There is no bookingId field, and its absence is D6-adjacent hygiene:
 * a uuid in a title tells the reader nothing and the link carries the
 * routing. If a future deep link needs it, add it to the LINK builders
 * above, not to the copy.
 */
export type RentalBookingDigest = {
  /** "2024 Lamborghini Huracán". */
  car: string;
  /** Pickup day, ISO yyyy-mm-dd. */
  startDate: string;
  /** Return day, ISO yyyy-mm-dd. */
  endDate: string;
};

/** The digest plus the market, for copy that must stay anonymous. */
export type AnonymousBookingDigest = RentalBookingDigest & {
  /** "Miami" — names the city, never the company. */
  market?: string | null;
};

// The local copy of the pre-confirmation stand-in is gone, exactly as its
// own note instructed: "When 2D merges, delete this and import that."
// 2D has merged, so anonymousOperatorLabel() in rental-booking-access.ts
// — the authority on D6 — is now the single wording for every surface,
// this file's seven notification bodies included. That matters more than
// it did when the two were byte-identical: the label has since dropped
// the word "vetted", and a private duplicate here would have kept
// claiming it in a renter's notifications after every screen stopped.

/**
 * "Mar 14 – Mar 18" — or "Mar 14, 2027 – Mar 18, 2027" when the trip is
 * in a different year than the one being written about.
 *
 * UTC throughout, matching the day math in rental-availability.ts and
 * 0047's `current_date`. A local-time format here would show a renter
 * in Los Angeles the day before their pickup.
 */
export function formatBookingDates(startDate: string, endDate: string): string {
  const start = formatUtcDay(startDate);
  const end = formatUtcDay(endDate);
  if (!start || !end) return `${startDate} – ${endDate}`;
  return `${start} – ${end}`;
}

function formatUtcDay(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "4 nights" / "1 night", or "" when the dates do not parse. */
function nightsPhrase(startDate: string, endDate: string): string {
  const n = nightsBetween(startDate, endDate);
  if (n === null || n <= 0) return "";
  return n === 1 ? "1 night" : `${n} nights`;
}

/** "Mar 14 – Mar 18 · 4 nights", with the nights half dropped if unknown. */
function tripPhrase(startDate: string, endDate: string): string {
  const dates = formatBookingDates(startDate, endDate);
  const nights = nightsPhrase(startDate, endDate);
  return nights ? `${dates} · ${nights}` : dates;
}

// ── The builders ────────────────────────────────────────────────────
//
// Each returns NotificationContent, so a call site is one line:
//
//   void notifyUser(db, {
//     userId: operatorUserId,
//     ...bookingRequestedForOperator({ car, startDate, endDate }),
//   });

/**
 * TO THE OPERATOR — a renter has asked for dates on one of their cars.
 *
 * The renter is not named, and that is symmetry rather than policy: D6
 * governs the operator's identity, but an operator deciding on a request
 * should be looking at dates and a car, not at who is asking. The name
 * is on the request screen if they want it.
 */
export function bookingRequestedForOperator(
  input: RentalBookingDigest,
): NotificationContent {
  return {
    type: "booking_requested",
    title: `New request: ${input.car}`,
    body: `${tripPhrase(input.startDate, input.endDate)}. You have 24 hours to approve or decline before the request expires.`,
    link: operatorBookingLink(),
  };
}

/**
 * TO THE RENTER — approved. The booking is confirmed and the dates are
 * held (0047's EXCLUDE constraint now covers them).
 *
 * The only renter-facing builder that accepts an operator name, because
 * confirmation is exactly the event D6 reveals on. The name is optional
 * because the partners lookup can fail or be absent (a pre-0041
 * environment) — a missing name degrades to the anonymous label, never
 * to a half-sentence.
 *
 * Says nothing about money, and "held" here means the DATES are held —
 * 0047's EXCLUDE constraint — not a card and not a deposit. Nothing
 * charges anybody at confirmation today, and when a charge does exist it
 * will be the OPERATOR's (direct charges, operator merchant of record),
 * never a RYDA hold. Today approval moves a status and reserves days, so
 * that is what this says.
 */
export function bookingApprovedForRenter(
  input: RentalBookingDigest & {
    /** Revealed at confirmation (D6). Null/absent → the anonymous label. */
    operatorName?: string | null;
    market?: string | null;
  },
): NotificationContent {
  const who = (input.operatorName ?? "").trim() || anonymousOperatorLabel(input.market);
  return {
    type: "booking_approved",
    title: `Confirmed: ${input.car}`,
    // "Your dates are locked in" rather than "your booking is held":
    // 0047's EXCLUDE constraint holds the DAYS, and the word "held" next
    // to a booking reads as a hold on a card. RYDA holds no money at any
    // point — the operator is merchant of record — so the sentence says
    // what is actually reserved.
    body: `${who} approved your dates — ${tripPhrase(input.startDate, input.endDate)}. Those days are locked in; open the booking for pickup details.`,
    link: renterBookingLink(),
  };
}

/**
 * TO THE RENTER — declined.
 *
 * No operator-name field on the input type. A declined request never
 * reached confirmation, so under D6 there is nothing to reveal, and the
 * builder is shaped so a caller cannot pass one by mistake.
 */
export function bookingDeclinedForRenter(
  input: AnonymousBookingDigest,
): NotificationContent {
  return {
    type: "booking_declined",
    title: `Not available: ${input.car}`,
    body: `${anonymousOperatorLabel(input.market)} could not take ${formatBookingDates(input.startDate, input.endDate)}. Your dates are free — try another car or another week.`,
    link: renterBookingLink(),
  };
}

/**
 * TO THE RENTER — the operator proposed different dates.
 *
 * 0047 models a counter-offer as a NEW 'requested' row with
 * initiated_by = 'operator', so this carries the PROPOSED dates, and
 * the ball is now in the renter's court. Still pre-confirmation, so
 * still anonymous — no operator-name field.
 */
export function bookingCounterOfferedForRenter(
  input: AnonymousBookingDigest,
): NotificationContent {
  return {
    type: "booking_counter_offered",
    title: `Alternate dates offered: ${input.car}`,
    body: `${anonymousOperatorLabel(input.market)} can't do your original week but offered ${tripPhrase(input.startDate, input.endDate)}. Accept or decline before it expires.`,
    link: renterBookingLink(),
  };
}

/**
 * TO THE OPERATOR — the renter answered a counter-offer.
 *
 * `accepted` picks the sentence rather than the type: both outcomes are
 * the same event on the same row from the operator's side, and one type
 * keeps a future "mute counter-offer replies" preference coherent.
 */
export function bookingCounterAnsweredForOperator(
  input: RentalBookingDigest & { accepted: boolean },
): NotificationContent {
  return {
    type: "booking_counter_answered",
    title: input.accepted
      ? `Alternate dates accepted: ${input.car}`
      : `Alternate dates declined: ${input.car}`,
    body: input.accepted
      ? `The renter took ${tripPhrase(input.startDate, input.endDate)}. The dates are held on your calendar.`
      : `The renter passed on ${formatBookingDates(input.startDate, input.endDate)}. Those days are open again.`,
    link: operatorBookingLink(),
  };
}

/**
 * TO WHICHEVER PARTY OWES THE ANSWER — O5's 24h clock is nearly up.
 *
 * `audience` is not cosmetic: 0047 added initiated_by precisely because
 * a renter's request and an operator's counter-offer are the same row
 * shape waiting on opposite parties, and a warning sent to the wrong
 * one is worse than none. Read rentalBookingDecider() (2D) to pick it.
 *
 * The renter branch has no operator-name field: an unanswered request
 * is by definition pre-confirmation.
 */
export function bookingExpiringSoon(
  input: AnonymousBookingDigest & {
    audience: "renter" | "operator";
    /** Whole hours left, for the sentence. Clamped to at least 1. */
    hoursLeft?: number;
  },
): NotificationContent {
  const hours = Math.max(1, Math.round(input.hoursLeft ?? 4));
  const window = hours === 1 ? "1 hour" : `${hours} hours`;
  const dates = formatBookingDates(input.startDate, input.endDate);

  if (input.audience === "operator") {
    return {
      type: "booking_expiring_soon",
      title: `Expiring in ${window}: ${input.car}`,
      body: `A request for ${dates} is still unanswered. It auto-declines when the window closes.`,
      link: operatorBookingLink(),
    };
  }

  return {
    type: "booking_expiring_soon",
    title: `Expiring in ${window}: ${input.car}`,
    body: `${anonymousOperatorLabel(input.market)} is waiting on your answer for ${dates}. The offer lapses when the window closes.`,
    link: renterBookingLink(),
  };
}

/**
 * TO EITHER PARTY — nobody answered in time and the row is terminal
 * (0047: expires_at passed; the trigger refuses to confirm it now).
 *
 * Both audiences get the SAME copy shape but different framing, and
 * neither names the operator: an expired request never confirmed.
 */
export function bookingExpired(
  input: AnonymousBookingDigest & { audience: "renter" | "operator" },
): NotificationContent {
  const dates = formatBookingDates(input.startDate, input.endDate);

  if (input.audience === "operator") {
    return {
      type: "booking_expired",
      title: `Request expired: ${input.car}`,
      body: `A request for ${dates} went unanswered and has closed. Those days are open again.`,
      link: operatorBookingLink(),
    };
  }

  return {
    type: "booking_expired",
    title: `Request expired: ${input.car}`,
    // "No days are reserved" rather than "nothing is held": a renter
    // reading "nothing is held" on a request that just lapsed will hear
    // it as a card hold, and RYDA has never held anything of theirs.
    body: `${anonymousOperatorLabel(input.market)} didn't answer in time, so your request for ${dates} has closed. No days are reserved, and you can request again.`,
    link: renterBookingLink(),
  };
}

/**
 * TO THE RENTER — a booking was cancelled.
 *
 * `wasConfirmed` is the D6 gate and it is REQUIRED rather than inferred:
 * a booking cancelled out of 'requested' never earned the operator's
 * name, and one cancelled after confirmation keeps it (the renter dealt
 * with a named company and must be able to say who called it off). 0047
 * stamps confirmed_at exactly once, which is the discriminator to read —
 * `Boolean(booking.confirmed_at)`, not the status, because 'cancelled'
 * is reachable from both sides of the reveal.
 *
 * operatorName is ignored outright when wasConfirmed is false. Passing
 * one is not an error a caller has to handle; it simply cannot leak.
 *
 * EVERY VALUE OF cancelledBy GETS ITS OWN SENTENCE, including 'admin'
 * and null. The two-branch version this replaces said "the operator
 * cancelled" for anything that was not the renter — so a support agent
 * calling a trip off, or a row whose cancelled_by never got stamped,
 * told the renter a specific untruth about a specific company. Naming
 * the wrong party is worse than naming none: the renter's next move is
 * to phone whoever they were told did it.
 */
export function bookingCancelledForRenter(
  input: AnonymousBookingDigest & {
    wasConfirmed: boolean;
    /** Only used when wasConfirmed — see above. */
    operatorName?: string | null;
    /** 0047's cancelled_by. Drives the sentence, not the disclosure. */
    cancelledBy?: "renter" | "operator" | "admin" | null;
  },
): NotificationContent {
  const who = input.wasConfirmed
    ? (input.operatorName ?? "").trim() || anonymousOperatorLabel(input.market)
    : anonymousOperatorLabel(input.market);
  const dates = formatBookingDates(input.startDate, input.endDate);

  let body: string;
  switch (input.cancelledBy) {
    case "renter":
      body = `Your booking for ${input.car}, ${dates}, is cancelled. Those dates are open again.`;
      break;
    case "operator":
      body = `${who} cancelled ${input.car} for ${dates}. Those dates are open again — try another car or another week.`;
      break;
    case "admin":
      // RYDA itself, through admin tooling. Named as RYDA rather than as
      // the operator, because it was not the operator.
      body = `RYDA cancelled ${input.car} for ${dates}. Those dates are open again.`;
      break;
    default:
      // cancelled_by is null or something 0047 has not taught us yet.
      // Say what is certainly true and attribute it to nobody.
      body = `Your booking for ${input.car}, ${dates}, has been cancelled. Those dates are open again.`;
  }

  return {
    type: "booking_cancelled",
    title: `Cancelled: ${input.car}`,
    body,
    link: renterBookingLink(),
  };
}

/**
 * TO THE OPERATOR — a booking on one of their cars was cancelled.
 *
 * Separate from the renter builder rather than a shared function with a
 * flag: the renter's version is D6-constrained and this one is not (an
 * operator always knows who they are), and folding them together is how
 * a future edit to "the cancellation copy" quietly relaxes the reveal.
 *
 * Same rule as the renter builder on cancelledBy: a sentence per value.
 * "The renter cancelled" as the catch-all told an operator that their
 * customer walked when in fact RYDA support had cancelled the trip —
 * and an operator who believes a renter cancels on them prices that
 * renter differently next time (O3).
 */
export function bookingCancelledForOperator(
  input: RentalBookingDigest & {
    cancelledBy?: "renter" | "operator" | "admin" | null;
  },
): NotificationContent {
  const dates = formatBookingDates(input.startDate, input.endDate);
  let body: string;
  switch (input.cancelledBy) {
    case "operator":
      body = `You cancelled ${input.car} for ${dates}. Those days are open again.`;
      break;
    case "renter":
      body = `The renter cancelled ${input.car} for ${dates}. Those days are open again.`;
      break;
    case "admin":
      body = `RYDA cancelled ${input.car} for ${dates}. Those days are open again.`;
      break;
    default:
      body = `The booking for ${input.car}, ${dates}, has been cancelled. Those days are open again.`;
  }

  return {
    type: "booking_cancelled",
    title: `Cancelled: ${input.car}`,
    body,
    link: operatorBookingLink(),
  };
}

/**
 * The non-booking catch-all — verification outcomes, admin messages,
 * and the build loop's own acceptance check ("trigger a test
 * notification; it appears in the feed and marks read").
 *
 * ── WHY THIS ONE IS NOT D6-SHAPED, AND WHERE ITS FENCE IS ───────────
 * Every builder above enforces D6 through its input TYPE: the ones that
 * fire before confirmation have no operator-name field, so a route
 * cannot leak what it cannot pass. This builder takes free text and
 * therefore has no such fence — and pretending otherwise would be the
 * lie, since its whole purpose is the notices with no fixed shape.
 *
 * What keeps it from being the hole in D6 is that D6 is a rule about
 * naming an operator ON A BOOKING, and this builder has no booking in
 * scope. Two things hold that line, one by convention and one by code:
 *
 *   THE RULE, for callers: IF IT IS ABOUT A BOOKING, IT DOES NOT BELONG
 *   HERE. A booking event that needs new words gets a new builder and a
 *   new vocabulary member — the three-file edit NOTIFICATION_TYPES
 *   describes — not a free-text notice wearing account_notice. Every
 *   code path that has a partner name in hand (the 2D decide route, the
 *   expiry sweep) reaches for a builder above, which is gated.
 *
 *   THE ENFORCEMENT, in the one field a machine can check: a notice may
 *   not LINK into the booking surfaces. A row that points at
 *   /account/rentals or /partner/requests is a booking notification by
 *   any reading — it is asking to be opened as one — and if it is a
 *   booking notification it must come from a gated builder. Such a link
 *   is dropped, exactly as an off-origin one is, and the notice still
 *   delivers.
 *
 * The link is validated rather than trusted for the same reason: this
 * is the one builder whose destination comes from the caller.
 */
export function accountNotice(input: {
  title: string;
  body?: string | null;
  link?: string | null;
}): NotificationContent {
  return {
    type: "account_notice",
    title: input.title,
    body: input.body ?? null,
    link:
      isSafeNotificationLink(input.link) && !isBookingSurfaceLink(input.link)
        ? input.link
        : null,
  };
}

/** True when a link points into a booking surface — see accountNotice. */
function isBookingSurfaceLink(link: string): boolean {
  const path = link.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase();
  return [renterBookingLink(), operatorBookingLink()].some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}
