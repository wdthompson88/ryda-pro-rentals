// /api/account/llcs/[id]/messages
//
// GET  → list messages in this LLC's thread.
//        Query params:
//          - since=<ISO timestamp> (optional) — return only messages
//            with created_at > since. Used by the client for polling.
//          - limit=<n> (optional, default 50, max 200) — page size.
//        Without `since`, returns the most recent `limit` messages
//        ordered ASC (so the UI can render top-down chronologically).
//        With `since`, same but only the new ones.
//
// POST → append a new message.
//        Body: { body: string } (1-4000 chars).
//
// Auth: any signed-in user; both methods enforce LLC membership via
// the share_holdings → llc_entities join (the same join that the
// is_llc_member() SQL function uses).
//
// IMPORTANT: this route uses the service-role Supabase client, which
// bypasses RLS entirely. The RLS policies on llc_messages exist to
// protect direct table access from a member-context client (e.g. a
// future client component that queries supabase-js directly), NOT
// to provide defense-in-depth on this route. The route's own
// isMember() gate is the only authorization check that runs in this
// path. If you change the route, the RLS policies will not catch
// the divergence — re-audit the gate logic carefully.
//
// EXISTS BECAUSE
// /messages was a 64-line "coming soon" placeholder. Pre-launch is
// fine; Miami launch needs real co-owner coordination. One thread
// per LLC is the minimum viable surface — direct DMs and topic
// channels can come later.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";

// Rate limits — generous for read polling, tighter for writes.
// Polling cadence is 30s on the client, so 30 reads/min covers
// pathological tab-stacking. Writes at 20/min absorb a "fast typer
// bursts 5 in a row" without throttling normal use.
const READ_LIMIT = 30;
const WRITE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const BODY_MIN = 1;
const BODY_MAX = 4000;

// Page-level type so the GET response stays stable when we add fields.
type MessageRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

// Author projection — what the UI needs to render the avatar/name
// strip alongside each message. Pulled from user_profiles + cached
// per-request. Falls through preferred_name → full_name → "Member"
// in resolveAuthorNames below.
type AuthorRow = {
  user_id: string;
  preferred_name: string | null;
  full_name: string | null;
};

type MessageWithAuthor = MessageRow & {
  author_name: string;
};

// Helper: enforce LLC membership using the same join the DB function
// does. We do this at the route level so we can return a clean 403
// before hitting RLS. Returns true if the caller is currently an
// active shareholder in the LLC.
async function isMember(
  db: ReturnType<typeof requireSupabaseAdmin>,
  userId: string,
  llcId: string,
): Promise<boolean> {
  // Step 1: the LLC's underlying asset key.
  const llc = await db
    .from("llc_entities")
    .select("vehicle_symbol, boat_slug")
    .eq("id", llcId)
    .maybeSingle();
  if (llc.error || !llc.data) return false;

  // Step 2: does the caller hold an active share in that asset?
  const sym = llc.data.vehicle_symbol;
  const slug = llc.data.boat_slug;
  if (!sym && !slug) return false;

  let q = db
    .from("share_holdings")
    .select("id")
    .eq("user_id", userId)
    .is("transferred_at", null)
    .limit(1);
  if (sym) q = q.eq("vehicle_symbol", sym);
  if (slug) q = q.eq("boat_slug", slug);

  const r = await q;
  if (r.error) return false;
  return (r.data ?? []).length > 0;
}

// Resolve display names for a set of user IDs. Uses user_profiles
// as the source of truth; falls back to a stable per-user identifier
// like "Member 1a2b3c4d" if a profile row is missing (shouldn't
// happen post-onboarding but the identifier preserves accountability
// in moderation logs without leaking email).
// Picks preferred_name first (the casual one a member chose to be
// addressed by); falls back to full_name; finally the stable id.
//
// Codex round-1 catch: prior fallback was just "Member" — same
// label for every nameless user, which makes the thread illegible
// when two unnamed members post. Stable per-user suffix fixes that
// without leaking email.
async function resolveAuthorNames(
  db: ReturnType<typeof requireSupabaseAdmin>,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const r = await db
    .from("user_profiles")
    .select("user_id, preferred_name, full_name")
    .in("user_id", userIds);
  const map = new Map<string, string>();
  for (const row of (r.data ?? []) as AuthorRow[]) {
    const name =
      row.preferred_name?.trim() ||
      row.full_name?.trim() ||
      `Member ${row.user_id.slice(0, 8)}`;
    map.set(row.user_id, name);
  }
  // Backfill IDs that didn't have a profile row at all.
  for (const id of userIds) {
    if (!map.has(id)) map.set(id, `Member ${id.slice(0, 8)}`);
  }
  return map;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: llcId } = await params;
  const ip = clientIp(req);
  if (!(await isAllowed(`messages-read:${ip}`, READ_LIMIT, RATE_WINDOW_MS))) {
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

  // Membership gate.
  const ok = await isMember(db, user.id, llcId);
  if (!ok) {
    return NextResponse.json(
      { error: "Not a member of this LLC." },
      { status: 403 },
    );
  }

  // Parse + clamp query params.
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(MAX_PAGE_SIZE, rawLimit))
    : DEFAULT_PAGE_SIZE;

  // Build the query. Service-role bypasses RLS; we already gated.
  // Codex round-2 catch: the initial load (no `since`) needs the
  // most-recent N messages, not the oldest N. Fetch DESC (most
  // recent first), limit, then reverse on the way out so the UI
  // can render top-down chronologically.
  //
  // For polling (with `since`), DESC + limit gives us the most
  // recent N new ones, which is the right behavior if the gap
  // between polls produced more than `limit` new messages — we
  // surface the latest page rather than the oldest. The reversal
  // back to ASC keeps the client's dedup ordering correct.
  let query = db
    .from("llc_messages")
    .select("id, user_id, body, created_at")
    .eq("llc_entity_id", llcId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (since) {
    // ISO timestamps compare lexically when normalized to UTC; keep
    // the string format Postgres returns.
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      query = query.gt("created_at", sinceDate.toISOString());
    }
    // If `since` is malformed, ignore it rather than 400 — the
    // client's polling loop should never send a bad value, and
    // returning the full page is a safer fallback than crashing.
  }

  const { data, error } = await query;
  if (error) {
    console.error("[messages GET]", error);
    return NextResponse.json(
      { error: "Could not load messages." },
      { status: 500 },
    );
  }

  // Reverse DESC → ASC so the client renders chronologically top-down.
  const rows = ((data ?? []) as MessageRow[]).slice().reverse();
  const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const authorNames = await resolveAuthorNames(db, authorIds);

  const enriched: MessageWithAuthor[] = rows.map((r) => ({
    ...r,
    author_name: authorNames.get(r.user_id) ?? "Member",
  }));

  return NextResponse.json({ messages: enriched });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: llcId } = await params;
  const ip = clientIp(req);
  if (!(await isAllowed(`messages-write:${ip}`, WRITE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many messages. Slow down for a minute." },
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

  // Membership gate (matches RLS).
  const ok = await isMember(db, user.id, llcId);
  if (!ok) {
    return NextResponse.json(
      { error: "Not a member of this LLC." },
      { status: 403 },
    );
  }

  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const body = String((raw as { body?: unknown }).body ?? "").trim();
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return NextResponse.json(
      { error: `Message must be ${BODY_MIN}-${BODY_MAX} characters.` },
      { status: 400 },
    );
  }

  const insert = await db
    .from("llc_messages")
    .insert({
      llc_entity_id: llcId,
      user_id: user.id,
      body,
    })
    .select("id, user_id, body, created_at")
    .single();
  if (insert.error || !insert.data) {
    console.error("[messages POST]", insert.error);
    return NextResponse.json(
      { error: "Could not send message." },
      { status: 500 },
    );
  }

  // Resolve author name for the round-trip echo so the client can
  // optimistically render the new message without a refetch.
  const authorNames = await resolveAuthorNames(db, [user.id]);
  const enriched: MessageWithAuthor = {
    ...(insert.data as MessageRow),
    author_name: authorNames.get(user.id) ?? "Member",
  };

  return NextResponse.json({ message: enriched }, { status: 201 });
}
