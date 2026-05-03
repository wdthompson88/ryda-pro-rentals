// GET /api/kyc/status — returns the current user's most recent KYC
// verification row. Used by the BuyFlow's VerifyStep to know whether
// to gate the "Continue" button.

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const admin = supabaseAdmin();
  if (!admin) {
    return NextResponse.json({ verified: false }, { status: 200 });
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ verified: false }, { status: 200 });
  }

  const { data } = await admin
    .from("kyc_verifications")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return NextResponse.json({ verified: false });
  }
  return NextResponse.json({
    verified: data[0].status === "verified",
    status: data[0].status,
    verificationId: data[0].id,
  });
}
