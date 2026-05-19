// GET /api/admin/users/search?q=<email-or-uuid>
//
// Looks up a single user by email or UUID and returns their full
// operational picture: auth profile, KYC status, recent share purchases
// (up to 10), recent bookings (up to 10), open share transfers, and a
// pre-computed "total shares held" tally. Powers the user-lookup card
// on /admin so an admin can jump straight to a specific member instead
// of scrolling the recent-20 lists.
//
// Auth: requireAdmin (app_metadata.role === 'admin'). Uses the
// service-role client to bypass RLS — admins need cross-user visibility.
//
// The q param is normalized: lower-cased, trimmed. Detection is by
// UUID format (8-4-4-4-12 hex with dashes); anything else is treated
// as an email substring match.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Hit = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: Record<string, unknown> | null;
  user_metadata: Record<string, unknown> | null;
  kyc: {
    status: string;
    failure_code: string | null;
    failure_reason: string | null;
    updated_at: string;
  } | null;
  purchases: Array<{
    id: string;
    status: string;
    shares: number;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    total_cents: number;
    fulfilled_at: string | null;
    updated_at: string;
  }>;
  bookings: Array<{
    id: string;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    mode: string;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
  }>;
  transfers: Array<{
    id: string;
    direction: "from" | "to";
    counterparty: string;
    vehicle_symbol: string | null;
    boat_slug: string | null;
    shares: number;
    status: string;
    expires_at: string;
    updated_at: string;
  }>;
  total_shares_held: number;
};

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 3) {
    return NextResponse.json(
      { error: "Need at least 3 characters." },
      { status: 400 },
    );
  }

  // Resolve the candidate user(s). UUID = direct lookup. Otherwise we
  // page through auth.users and substring-match email. Capped at 25
  // hits so a 1-char prefix doesn't pull thousands of rows.
  const matched: Array<{
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    app_metadata: Record<string, unknown> | null;
    user_metadata: Record<string, unknown> | null;
  }> = [];

  if (UUID_RE.test(q)) {
    const { data, error } = await db.auth.admin.getUserById(q);
    if (error || !data?.user) {
      return NextResponse.json({ hits: [] });
    }
    matched.push({
      id: data.user.id,
      email: data.user.email ?? null,
      email_confirmed_at: data.user.email_confirmed_at ?? null,
      created_at: data.user.created_at ?? "",
      last_sign_in_at: data.user.last_sign_in_at ?? null,
      app_metadata:
        (data.user.app_metadata as Record<string, unknown>) ?? null,
      user_metadata:
        (data.user.user_metadata as Record<string, unknown>) ?? null,
    });
  } else {
    // Page through auth.users. RYDA scale (low thousands max) keeps
    // this fine. Swap to a database function with indexed email
    // lookup if the user table grows past ~50k.
    let page = 1;
    const perPage = 1000;
    let scanned = 0;
    const MAX_SCAN = 5000;
    while (matched.length < 25 && scanned < MAX_SCAN) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[admin/users/search · listUsers]", error);
        return NextResponse.json(
          { error: "User search failed." },
          { status: 500 },
        );
      }
      const users = data.users ?? [];
      scanned += users.length;
      for (const u of users) {
        if (matched.length >= 25) break;
        const email = (u.email ?? "").toLowerCase();
        if (email.includes(q)) {
          matched.push({
            id: u.id,
            email: u.email ?? null,
            email_confirmed_at: u.email_confirmed_at ?? null,
            created_at: u.created_at ?? "",
            last_sign_in_at: u.last_sign_in_at ?? null,
            app_metadata:
              (u.app_metadata as Record<string, unknown>) ?? null,
            user_metadata:
              (u.user_metadata as Record<string, unknown>) ?? null,
          });
        }
      }
      if (users.length < perPage) break;
      page += 1;
    }
  }

  if (matched.length === 0) {
    return NextResponse.json({ hits: [] });
  }

  // Pull adjacent rows for each matched user in parallel.
  const hits: Hit[] = await Promise.all(
    matched.map(async (u) => {
      const [kycRes, purchasesRes, bookingsRes, transfersFromRes, transfersToRes] =
        await Promise.all([
          db
            .from("kyc_verifications")
            .select("status, failure_code, failure_reason, updated_at")
            .eq("user_id", u.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          db
            .from("share_purchases")
            .select(
              "id, status, shares, vehicle_symbol, boat_slug, total_cents, fulfilled_at, updated_at",
            )
            .eq("user_id", u.id)
            .order("updated_at", { ascending: false })
            .limit(10),
          db
            .from("bookings")
            .select(
              "id, vehicle_symbol, boat_slug, mode, start_date, end_date, status, created_at",
            )
            .eq("user_id", u.id)
            .order("created_at", { ascending: false })
            .limit(10),
          db
            .from("share_transfers")
            .select(
              "id, to_user_email, vehicle_symbol, boat_slug, shares, status, expires_at, updated_at",
            )
            .eq("from_user_id", u.id)
            .order("updated_at", { ascending: false })
            .limit(10),
          db
            .from("share_transfers")
            .select(
              "id, from_user_id, vehicle_symbol, boat_slug, shares, status, expires_at, updated_at",
            )
            .eq("to_user_id", u.id)
            .order("updated_at", { ascending: false })
            .limit(10),
        ]);

      const purchases = (purchasesRes.data ?? []) as Hit["purchases"];
      const totalShares = purchases
        .filter((p) => p.status === "paid")
        .reduce((acc, p) => acc + (p.shares ?? 0), 0);

      const transfersFrom = (transfersFromRes.data ?? []).map(
        (t: {
          id: string;
          to_user_email: string;
          vehicle_symbol: string | null;
          boat_slug: string | null;
          shares: number;
          status: string;
          expires_at: string;
          updated_at: string;
        }) => ({
          id: t.id,
          direction: "from" as const,
          counterparty: t.to_user_email ?? "—",
          vehicle_symbol: t.vehicle_symbol,
          boat_slug: t.boat_slug,
          shares: t.shares,
          status: t.status,
          expires_at: t.expires_at,
          updated_at: t.updated_at,
        }),
      );
      const transfersTo = (transfersToRes.data ?? []).map(
        (t: {
          id: string;
          from_user_id: string;
          vehicle_symbol: string | null;
          boat_slug: string | null;
          shares: number;
          status: string;
          expires_at: string;
          updated_at: string;
        }) => ({
          id: t.id,
          direction: "to" as const,
          counterparty: t.from_user_id.slice(0, 8),
          vehicle_symbol: t.vehicle_symbol,
          boat_slug: t.boat_slug,
          shares: t.shares,
          status: t.status,
          expires_at: t.expires_at,
          updated_at: t.updated_at,
        }),
      );

      return {
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: u.app_metadata,
        user_metadata: u.user_metadata,
        kyc: kycRes.data ?? null,
        purchases,
        bookings: (bookingsRes.data ?? []) as Hit["bookings"],
        transfers: [...transfersFrom, ...transfersTo]
          .sort((a, b) =>
            (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
          )
          .slice(0, 10),
        total_shares_held: totalShares,
      };
    }),
  );

  return NextResponse.json({ hits });
}
