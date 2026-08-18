// /api/notifications/read
//
// POST → mark the caller's notifications read (or unread).
//        Body, one of:
//          { ids: string[] }        specific rows (max 100)
//          { all: true }            every unread row in the feed
//        Optional:
//          { read: false }          with `ids`, mark them UNREAD again
//        Response: { updated, unreadCount }
//
// Auth: getUserFromRequest. Every statement carries
// `.eq("user_id", user.id)` — see the note in ../route.ts on why the
// ownership filter is written out even though 0049's RLS says the same
// thing.
//
// WHY THIS IS A POST TO ITS OWN PATH, NOT `PATCH /api/notifications/[id]`
// Marking read is overwhelmingly a BULK action — opening the feed marks
// the page, "mark all read" marks everything — and a per-row PATCH turns
// one intent into twenty requests, twenty rate-limit tokens and twenty
// chances to half-succeed. The single-row case is `{ ids: [one] }`.
//
// WHY read_at IS THE ONLY THING THIS WRITES
// It is the only thing 0049 permits anyone to write. The column grant
// stops a browser session and the notifications_immutable_guard trigger
// stops this route, which holds the service-role key and would otherwise
// be able to rewrite the title of a notification a user has already
// been shown. Adding another column to the update below does not fail
// review — it fails at the database, loudly, which is the point.
//
// AND THE TIMESTAMP BELOW IS A REQUEST, NOT THE RECORD. 0049's trigger
// normalizes read_at: the unread → read transition is stamped with the
// database's now() whatever value arrives, and a row that is already
// read keeps its first stamp. So the ISO string this route sends is
// discarded server-side — which is why the column can be trusted as
// "when they read it" even though a browser is allowed to write it.
// Do not build anything on the value being the one sent from here.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import {
  countUnreadNotifications,
  isNotificationsTableMissing,
} from "@/lib/notifications";

const WRITE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

/** Cap on `ids`. A feed page is 20; 100 is five pages of slack. */
const MAX_IDS = 100;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await isAllowed(`notif-read-mark:${ip}`, WRITE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const body = raw as { ids?: unknown; all?: unknown; read?: unknown };

  const markRead = body.read !== false;
  const all = body.all === true;

  let ids: string[] = [];
  if (!all) {
    if (!Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "Send { ids: [...] } or { all: true }." },
        { status: 400 },
      );
    }
    if (body.ids.length === 0) {
      return NextResponse.json(
        { error: "`ids` must not be empty." },
        { status: 400 },
      );
    }
    if (body.ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `At most ${MAX_IDS} ids per request.` },
        { status: 400 },
      );
    }
    // Validated as uuids before the query. Not because a non-uuid could
    // reach another user's row — the user_id filter forbids that
    // whatever the id is — but because PostgREST answers a malformed
    // uuid with a 400 and a parse error, and one bad id in a batch of
    // twenty would drop the other nineteen.
    ids = [];
    for (const value of body.ids) {
      if (typeof value !== "string" || !UUID_RE.test(value)) {
        return NextResponse.json(
          { error: "`ids` must be notification uuids." },
          { status: 400 },
        );
      }
      ids.push(value);
    }
  }

  // "Mark all UNREAD" is not a thing anyone asked for and would be a
  // one-click way to un-see a whole feed. `all` means "catch me up".
  if (all && !markRead) {
    return NextResponse.json(
      { error: "`read: false` requires explicit ids." },
      { status: 400 },
    );
  }

  let db;
  try {
    db = requireSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 },
    );
  }

  let q = db
    .from("notifications")
    // read_at, and nothing else. See the header — and note that on the
    // read path this value is replaced by the trigger's now(); it is
    // sent so the statement has a non-null to write, not because the
    // route gets to decide when the member read it.
    .update({ read_at: markRead ? new Date().toISOString() : null })
    .eq("user_id", user.id);

  if (all) {
    // Only the unread ones, so "mark all read" does not touch rows the
    // member read last week — those timestamps are the honest record of
    // when they saw it. (The trigger would pin them anyway; filtering
    // here keeps the statement honest about what it intends to change,
    // and keeps `updated` a count of rows that actually flipped.)
    q = q.is("read_at", null);
  } else {
    q = q.in("id", ids);
    // Same idea in the other direction: re-marking an already-read row
    // is a no-op rather than a fresh timestamp.
    if (markRead) q = q.is("read_at", null);
  }

  const { data, error } = await q.select("id");

  if (error) {
    if (isNotificationsTableMissing(error)) {
      // Pre-0049. Nothing to mark; the feed is showing its
      // "not configured yet" state and this is a no-op, not a fault.
      return NextResponse.json({ updated: 0, unreadCount: 0 });
    }
    console.error("[notifications · mark read]", error.message);
    return NextResponse.json(
      { error: "Could not update notifications." },
      { status: 500 },
    );
  }

  const unreadCount = await countUnreadNotifications(db, user.id);

  return NextResponse.json({
    updated: (data ?? []).length,
    unreadCount,
  });
}
