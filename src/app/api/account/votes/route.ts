// GET /api/account/votes — list of votes across all LLCs the
// caller is a member of, with the caller's ballot status and the
// LLC name attached.
//
// Used by /votes (the member voting dashboard). Returns open votes
// first (sorted by closes_at ascending), then recently-closed.
//
// Auth: any signed-in user; the response only includes votes for
// LLCs the caller currently holds shares in.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";

const READ_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

type VoteRow = {
  id: string;
  llc_entity_id: string;
  vote_type: string;
  title: string;
  threshold_pct: number;
  eligible_share_total: number;
  opens_at: string;
  closes_at: string;
  status: "open" | "passed" | "failed" | "withdrawn";
};

type LlcRow = {
  id: string;
  llc_name: string;
};

type BallotRow = {
  vote_id: string;
  choice: "yes" | "no" | "abstain";
};

type VoteWithContext = VoteRow & {
  llc_name: string;
  my_ballot_choice: "yes" | "no" | "abstain" | null;
};

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!(await isAllowed(`votes-list:${ip}`, READ_LIMIT, RATE_WINDOW_MS))) {
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

  // Step 1: caller's active holdings → LLCs they belong to.
  const { data: holdings, error: hErr } = await db
    .from("share_holdings")
    .select("vehicle_symbol, boat_slug")
    .eq("user_id", user.id)
    .is("transferred_at", null);
  if (hErr) {
    return NextResponse.json(
      { error: `Holdings query failed: ${hErr.message}` },
      { status: 500 },
    );
  }

  const heldVehicles = Array.from(
    new Set(
      (holdings ?? [])
        .map((h) => h.vehicle_symbol)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const heldBoats = Array.from(
    new Set(
      (holdings ?? [])
        .map((h) => h.boat_slug)
        .filter((v): v is string => Boolean(v)),
    ),
  );

  if (heldVehicles.length === 0 && heldBoats.length === 0) {
    return NextResponse.json({ votes: [] });
  }

  // Step 2: find the LLCs for those assets.
  const llcs: LlcRow[] = [];
  if (heldVehicles.length > 0) {
    const r = await db
      .from("llc_entities")
      .select("id, llc_name")
      .in("vehicle_symbol", heldVehicles);
    if (r.error) {
      return NextResponse.json(
        { error: `LLC vehicle query failed: ${r.error.message}` },
        { status: 500 },
      );
    }
    llcs.push(...((r.data ?? []) as LlcRow[]));
  }
  if (heldBoats.length > 0) {
    const r = await db
      .from("llc_entities")
      .select("id, llc_name")
      .in("boat_slug", heldBoats);
    if (r.error) {
      return NextResponse.json(
        { error: `LLC boat query failed: ${r.error.message}` },
        { status: 500 },
      );
    }
    llcs.push(...((r.data ?? []) as LlcRow[]));
  }

  const llcById = new Map(llcs.map((l) => [l.id, l.llc_name]));
  const llcIds = [...llcById.keys()];
  if (llcIds.length === 0) {
    return NextResponse.json({ votes: [] });
  }

  // Step 3: pull votes for those LLCs. Open first, then closed
  // (sort by status asc — 'open' lexically precedes the others —
  // breaks ties by closes_at asc so urgent votes float to the top).
  const v = await db
    .from("llc_votes")
    .select(
      "id, llc_entity_id, vote_type, title, threshold_pct, eligible_share_total, opens_at, closes_at, status",
    )
    .in("llc_entity_id", llcIds)
    .order("status", { ascending: true })
    .order("closes_at", { ascending: true })
    .limit(100);
  if (v.error) {
    return NextResponse.json(
      { error: `Vote query failed: ${v.error.message}` },
      { status: 500 },
    );
  }
  const votes = (v.data ?? []) as VoteRow[];
  if (votes.length === 0) {
    return NextResponse.json({ votes: [] });
  }

  // Step 4: pull the caller's ballots for those votes.
  const voteIds = votes.map((vt) => vt.id);
  const b = await db
    .from("llc_vote_ballots")
    .select("vote_id, choice")
    .eq("user_id", user.id)
    .in("vote_id", voteIds);
  if (b.error) {
    return NextResponse.json(
      { error: `Ballot query failed: ${b.error.message}` },
      { status: 500 },
    );
  }
  const ballotByVote = new Map(
    ((b.data ?? []) as BallotRow[]).map((row) => [row.vote_id, row.choice]),
  );

  // Step 5: zip together.
  const enriched: VoteWithContext[] = votes.map((vt) => ({
    ...vt,
    llc_name: llcById.get(vt.llc_entity_id) ?? "(LLC)",
    my_ballot_choice: ballotByVote.get(vt.id) ?? null,
  }));

  return NextResponse.json({ votes: enriched });
}
