// /api/account/votes/[id]
//
// GET → vote detail with full description, computed tally, all
//       ballots (member-visible — no secret ballots in an LLC),
//       and the caller's current ballot (if any).
// POST → submit or update the caller's ballot.
//        Body: { choice: 'yes' | 'no' | 'abstain', rationale?: string }
//        Re-submission overwrites prior ballot via UNIQUE (vote_id,
//        user_id) → ON CONFLICT DO UPDATE.
//
// Auth: any signed-in user; both methods enforce LLC membership
// against the vote's llc_entity_id.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest, getUserFromRequestWithDiag } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";

// Per-request Supabase client scoped to the caller's JWT. Used to
// invoke the cast_llc_vote() RPC so auth.uid() inside the function
// resolves correctly. The service-role client (requireSupabaseAdmin)
// bypasses RLS but also nulls auth.uid() — perfect for admin reads,
// useless for RPCs that authorize via auth.uid().
async function getUserScopedSupabase(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const { token } = await getUserFromRequestWithDiag(req);
  if (!token) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
}

const READ_LIMIT = 30;
const WRITE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const RATIONALE_MAX = 2000;

type VoteRow = {
  id: string;
  llc_entity_id: string;
  vote_type: string;
  title: string;
  description: string;
  threshold_pct: number;
  eligible_share_total: number;
  opens_at: string;
  closes_at: string;
  status: "open" | "passed" | "failed" | "withdrawn";
};

type BallotRow = {
  id: string;
  user_id: string;
  choice: "yes" | "no" | "abstain";
  shares_at_ballot: number;
  submitted_at: string;
  rationale: string | null;
};

type AuthorRow = {
  user_id: string;
  preferred_name: string | null;
  full_name: string | null;
};

type Tally = {
  yes_shares: number;
  no_shares: number;
  abstain_shares: number;
  // Two yes-percent forms (codex round-1 LOW catch): yes_pct_raw
  // is the unrounded value used for threshold_met comparison; the
  // floor'd display value avoids lying ("75% yes / 75% needed but
  // not met" when the raw was 74.96 → display 75.0). The UI shows
  // floor-of-tenths so the displayed % can never exceed the value
  // that was actually compared to threshold_pct.
  yes_pct_raw: number;
  yes_pct_display: number;
  threshold_pct: number;
  threshold_met: boolean;
  shares_voted: number;
  shares_outstanding: number;
};

// Same-shape membership gate as the messages route. Returns
// { ok: true, llcId } so the caller can use the LLC id without
// re-querying.
async function gateMembership(
  db: ReturnType<typeof requireSupabaseAdmin>,
  userId: string,
  voteId: string,
): Promise<
  | { ok: true; vote: VoteRow }
  | { ok: false; status: number; body: { error: string } }
> {
  const v = await db
    .from("llc_votes")
    .select(
      "id, llc_entity_id, vote_type, title, description, threshold_pct, eligible_share_total, opens_at, closes_at, status",
    )
    .eq("id", voteId)
    .maybeSingle();
  if (v.error) {
    return {
      ok: false,
      status: 500,
      body: { error: `Vote query failed: ${v.error.message}` },
    };
  }
  if (!v.data) {
    return { ok: false, status: 404, body: { error: "Vote not found." } };
  }
  const vote = v.data as VoteRow;

  const llc = await db
    .from("llc_entities")
    .select("vehicle_symbol, boat_slug")
    .eq("id", vote.llc_entity_id)
    .maybeSingle();
  if (llc.error || !llc.data) {
    return {
      ok: false,
      status: 500,
      body: { error: "LLC lookup failed." },
    };
  }
  const sym = llc.data.vehicle_symbol;
  const slug = llc.data.boat_slug;
  if (!sym && !slug) {
    return {
      ok: false,
      status: 500,
      body: { error: "LLC has no underlying asset." },
    };
  }

  let q = db
    .from("share_holdings")
    .select("shares")
    .eq("user_id", userId)
    .is("transferred_at", null);
  if (sym) q = q.eq("vehicle_symbol", sym);
  if (slug) q = q.eq("boat_slug", slug);

  const r = await q;
  if (r.error) {
    return {
      ok: false,
      status: 500,
      body: { error: `Membership query failed: ${r.error.message}` },
    };
  }
  if ((r.data ?? []).length === 0) {
    return {
      ok: false,
      status: 403,
      body: { error: "Not a member of this LLC." },
    };
  }
  return { ok: true, vote };
}

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
  for (const id of userIds) {
    if (!map.has(id)) map.set(id, `Member ${id.slice(0, 8)}`);
  }
  return map;
}

function computeTally(
  ballots: BallotRow[],
  vote: VoteRow,
): Tally {
  let yes = 0;
  let no = 0;
  let abstain = 0;
  for (const b of ballots) {
    if (b.choice === "yes") yes += b.shares_at_ballot;
    else if (b.choice === "no") no += b.shares_at_ballot;
    else abstain += b.shares_at_ballot;
  }
  // Yes-percentage is computed over OUTSTANDING shares (the vote-
  // open snapshot), NOT over ballots cast. This matches the OA's
  // "75% of outstanding shares" language: an abstain or a non-vote
  // both reduce the yes-fraction. Encourages turnout.
  const yesPctRaw =
    vote.eligible_share_total > 0
      ? (yes / vote.eligible_share_total) * 100
      : 0;
  // Floor-of-tenths so the display value never exceeds the value
  // we compared to the threshold. e.g. 74.96 → 74.9 (not 75.0).
  const yesPctDisplay = Math.floor(yesPctRaw * 10) / 10;
  return {
    yes_shares: yes,
    no_shares: no,
    abstain_shares: abstain,
    yes_pct_raw: yesPctRaw,
    yes_pct_display: yesPctDisplay,
    threshold_pct: vote.threshold_pct,
    threshold_met: yesPctRaw >= vote.threshold_pct,
    shares_voted: yes + no + abstain,
    shares_outstanding: vote.eligible_share_total,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: voteId } = await params;
  const ip = clientIp(req);
  if (!(await isAllowed(`vote-read:${ip}`, READ_LIMIT, RATE_WINDOW_MS))) {
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

  const gate = await gateMembership(db, user.id, voteId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }
  const vote = gate.vote;

  // All ballots for this vote (members can see who voted what —
  // no secret ballots in an LLC).
  const b = await db
    .from("llc_vote_ballots")
    .select("id, user_id, choice, shares_at_ballot, submitted_at, rationale")
    .eq("vote_id", voteId)
    .order("submitted_at", { ascending: true });
  if (b.error) {
    return NextResponse.json(
      { error: `Ballot query failed: ${b.error.message}` },
      { status: 500 },
    );
  }
  const ballots = (b.data ?? []) as BallotRow[];

  const authorIds = Array.from(new Set(ballots.map((bl) => bl.user_id)));
  const authorNames = await resolveAuthorNames(db, authorIds);

  const myBallot = ballots.find((bl) => bl.user_id === user.id) ?? null;
  const tally = computeTally(ballots, vote);

  return NextResponse.json({
    vote,
    tally,
    ballots: ballots.map((bl) => ({
      ...bl,
      author_name: authorNames.get(bl.user_id) ?? "Member",
    })),
    my_ballot: myBallot
      ? {
          ...myBallot,
          author_name: authorNames.get(myBallot.user_id) ?? "Member",
        }
      : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: voteId } = await params;
  const ip = clientIp(req);
  if (!(await isAllowed(`vote-write:${ip}`, WRITE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many ballot submissions. Slow down." },
      { status: 429 },
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Codex round-2 LOW catch: POST no longer needs the service-role
  // client (the cast_llc_vote RPC enforces authorization itself via
  // auth.uid()). Removing the requireSupabaseAdmin() check means
  // ballot submission keeps working in deploys that have anon-key
  // configured but not the service-role key.

  // Body parse first so 400s are returned cheaply.
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const choice = String((raw as { choice?: unknown }).choice ?? "");
  if (choice !== "yes" && choice !== "no" && choice !== "abstain") {
    return NextResponse.json(
      { error: "Choice must be yes, no, or abstain." },
      { status: 400 },
    );
  }
  const rationaleRaw = (raw as { rationale?: unknown }).rationale;
  let rationale: string | null = null;
  if (rationaleRaw !== undefined && rationaleRaw !== null) {
    if (typeof rationaleRaw !== "string") {
      return NextResponse.json(
        { error: "Rationale must be a string." },
        { status: 400 },
      );
    }
    const trimmed = rationaleRaw.trim();
    if (trimmed.length > RATIONALE_MAX) {
      return NextResponse.json(
        { error: `Rationale must be at most ${RATIONALE_MAX} characters.` },
        { status: 400 },
      );
    }
    rationale = trimmed.length > 0 ? trimmed : null;
  }

  // Codex round-1 HIGH catch: route the upsert through the
  // cast_llc_vote() RPC instead of writing directly. The RPC
  // derives shares_at_ballot server-side from share_holdings (so
  // the caller cannot spoof) and re-validates open/deadline/
  // membership atomically with a FOR SHARE lock on the vote row,
  // closing the TOCTOU window the previous direct-write had.
  //
  // We pass the user's auth token so auth.uid() inside the RPC
  // resolves to the caller — service-role would null it out and
  // the RPC would refuse with 'Sign in required'. supabaseAdmin()
  // doesn't carry a JWT; we use callRpcAsUser() pattern instead.
  // For the simplest implementation that proves the principle:
  // call rpc with the service-role client + p_user_id... wait,
  // we removed that arg from is_llc_member to close the membership
  // oracle. We need to call as the user.
  //
  // Cleanest path: use a per-request supabase client constructed
  // with the user's JWT, NOT the service-role client. This way
  // auth.uid() inside the RPC resolves correctly without taking
  // a user_id parameter.
  const userClient = await getUserScopedSupabase(req);
  if (!userClient) {
    return NextResponse.json(
      { error: "Could not establish authenticated context." },
      { status: 500 },
    );
  }

  const rpc = await userClient.rpc("cast_llc_vote", {
    p_vote_id: voteId,
    p_choice: choice,
    p_rationale: rationale,
  });

  if (rpc.error) {
    console.error("[cast_llc_vote rpc]", rpc.error);
    // The RPC raises with semantic SQLSTATEs (28000 sign-in,
    // P0002 not-found, P0001 closed/deadline, 42501 no shares,
    // 22023 rationale too long). Map to HTTP status.
    const code = rpc.error.code ?? "";
    const status =
      code === "28000"
        ? 401
        : code === "P0002"
          ? 404
          : code === "P0001"
            ? 409
            : code === "42501"
              ? 403
              : code === "22023"
                ? 400
                : 500;
    return NextResponse.json(
      { error: rpc.error.message ?? "Could not record ballot." },
      { status },
    );
  }

  return NextResponse.json({ ballot: rpc.data }, { status: 201 });
}
