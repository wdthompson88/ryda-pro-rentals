// /api/notifications
//
// GET → the caller's own notification feed, newest first, paginated.
//       Query params:
//         limit   1–50, default 20
//         before  ISO timestamp cursor — return rows strictly older
//         unread  "1" | "true" → only unread rows
//       Response:
//         { configured, notifications, unreadCount, nextCursor }
//
// Auth: getUserFromRequest. There is no "read someone else's feed"
// mode, no user_id parameter, and no admin branch — see below.
//
// WHY SERVICE-ROLE WITH A HAND-WRITTEN OWNERSHIP FILTER
// Migration 0049's RLS already scopes SELECT to `user_id = auth.uid()`,
// so a user-scoped client would enforce this for free. This route uses
// the service-role client and `.eq("user_id", user.id)` anyway, which is
// RYDA's dominant pattern (guardrail 3.7: "new routes use the
// service-role client and enforce ownership in code"). The filter is not
// redundant with RLS — it is the layer that keeps working if a policy is
// ever loosened, and the layer a code reviewer can see. Both must be
// true; neither is trusted alone.
//
// The one thing that must never appear in this file is a way to pass a
// user id in. The feed is the surface where a renter learns whether
// their booking was approved; a `?userId=` escape hatch — even an
// admin-gated one — is a personal-message reader, and 0049 deliberately
// declines to give admins even a read policy for the same reason.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import {
  NOTIFICATION_COLS,
  countUnreadNotifications,
  isNotificationsTableMissing,
  projectNotification,
  type NotificationRow,
} from "@/lib/notifications";

const READ_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const DEFAULT_PAGE = 20;
const MAX_PAGE = 50;

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await isAllowed(`notif-read:${ip}`, READ_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
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

  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const unreadOnly = isTruthy(url.searchParams.get("unread"));
  const before = parseCursor(url.searchParams.get("before"));
  if (url.searchParams.get("before") && !before) {
    return NextResponse.json(
      { error: "Invalid `before` cursor." },
      { status: 400 },
    );
  }

  // One extra row, so "is there another page" is answered without a
  // second query and without a count over the whole feed.
  let q = db
    .from("notifications")
    .select(NOTIFICATION_COLS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (unreadOnly) q = q.is("read_at", null);
  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;

  if (error) {
    // Pre-0049 environment. A 200 with configured:false rather than a
    // 500, because the feed page has a state for "notifications aren't
    // switched on yet" and an error banner would read as a fault the
    // member could do something about.
    if (isNotificationsTableMissing(error)) {
      return NextResponse.json({
        configured: false,
        notifications: [],
        unreadCount: 0,
        nextCursor: null,
      });
    }
    console.error("[notifications · list]", error.message);
    return NextResponse.json(
      { error: "Could not load notifications." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as unknown as NotificationRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // Cursor is the last row's created_at, and pagination is `lt` on it.
  // Two notifications written to the same user in the same microsecond
  // — a fan-out loop, in practice — could straddle a page boundary and
  // the second would be skipped. Accepted: the alternative is a keyset
  // `or(created_at.lt.X, and(created_at.eq.X, id.lt.Y))` filter whose
  // string-built predicate is a worse hazard than a lost row in a feed
  // that is also refetched from the top on every visit.
  const nextCursor = hasMore ? page[page.length - 1].created_at : null;

  const unreadCount = await countUnreadNotifications(db, user.id);

  return NextResponse.json({
    configured: true,
    notifications: page.map(projectNotification),
    unreadCount,
    nextCursor,
  });
}

function clampLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE;
  return Math.min(n, MAX_PAGE);
}

function isTruthy(raw: string | null): boolean {
  return raw === "1" || raw === "true";
}

/** ISO timestamp or null. Rejects anything Date cannot parse. */
function parseCursor(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
