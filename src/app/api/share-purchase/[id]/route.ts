// GET /api/share-purchase/[id] — read a single purchase row for the
// /share-purchase/[id] tracker page. Authenticated users can only read
// their own purchases; the RLS policy enforces this server-side.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await admin
    .from("share_purchases")
    .select(
      "id, user_id, email, name, vehicle_symbol, boat_slug, shares, price_per_share, acquisition_fee, total_cents, status, created_at, updated_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }

  return NextResponse.json({ purchase: data });
}
