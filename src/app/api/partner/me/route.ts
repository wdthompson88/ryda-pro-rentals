// /api/partner/me — the /partner dashboard's data + application surface.
//
// GET  → { partner: PartnerAccount | null }
//   Returns the caller's partner account. First authenticated call
//   also converts signup intent into a real row: /signup?as=partner
//   can only write user-editable user_metadata (partner_intent +
//   company details), so this route reads that metadata via the
//   service-role client and provisions a partner_accounts row with
//   status 'pending'. Metadata is a REQUEST only — the row always
//   starts 'pending' and only /api/admin/partners can change status.
//
// POST → { partner: PartnerAccount }
//   Apply (signed-in member without a row) or update company details.
//   Detail fields only — status/approved_at are never written here.
//
// Auth: getUserFromRequest (bearer/cookie) → 401. All queries scope by
// user_id; the service-role client bypasses RLS so nothing else leaks.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import {
  validatePartnerApplication,
  type PartnerAccount,
} from "@/lib/partner";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Same backstop every user-facing route carries. GET costs up to two
// backend round-trips (select + auth admin lookup), POST writes — keep
// both behind a per-IP window so one account can't hammer Supabase.
const READ_LIMIT = 30;
const WRITE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

const COLS =
  "user_id, company_name, contact_name, contact_email, phone, website, fleet_size, market, status, status_note, approved_at, created_at, updated_at";

async function fetchPartner(
  db: SupabaseClient,
  userId: string,
): Promise<{ partner: PartnerAccount | null; error: string | null }> {
  const { data, error } = await db
    .from("partner_accounts")
    .select(COLS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { partner: null, error: error.message };
  return { partner: (data as PartnerAccount | null) ?? null, error: null };
}

export async function GET(req: NextRequest) {
  if (!(await isAllowed(`partner-me:read:${clientIp(req)}`, READ_LIMIT, RATE_WINDOW_MS))) {
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

  const { partner, error } = await fetchPartner(db, user.id);
  if (error) {
    console.error("[partner/me · select]", error);
    return NextResponse.json(
      { error: "Could not load partner account." },
      { status: 500 },
    );
  }
  if (partner) return NextResponse.json({ partner });

  // No row yet — check signup intent. user_metadata comes from the
  // service-role lookup (authoritative store), not from anything the
  // request claims.
  const { data: authUser, error: authErr } = await db.auth.admin.getUserById(
    user.id,
  );
  if (authErr || !authUser?.user) return NextResponse.json({ partner: null });
  const meta =
    (authUser.user.user_metadata as Record<string, unknown> | undefined) ?? {};
  if (meta.partner_intent !== true) {
    return NextResponse.json({ partner: null });
  }

  const parsed = validatePartnerApplication({
    company_name: meta.partner_company,
    contact_name: meta.name,
    phone: meta.partner_phone,
  });
  if (!parsed.ok) {
    // Intent without usable details (metadata is user-editable, so
    // garbage is possible) — let the dashboard show the apply form.
    return NextResponse.json({ partner: null, intent: true });
  }

  // Provision the pending application. ignoreDuplicates makes a
  // double-fire (two tabs) a no-op; re-select for the canonical row.
  const { error: insErr } = await db.from("partner_accounts").upsert(
    {
      user_id: user.id,
      ...parsed.value,
      contact_email: user.email,
      status: "pending",
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (insErr) {
    console.error("[partner/me · provision]", insErr);
    return NextResponse.json(
      { error: "Could not create partner application." },
      { status: 500 },
    );
  }
  const provisioned = await fetchPartner(db, user.id);
  return NextResponse.json({ partner: provisioned.partner });
}

export async function POST(req: NextRequest) {
  if (!(await isAllowed(`partner-me:write:${clientIp(req)}`, WRITE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = validatePartnerApplication(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
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

  const existing = await fetchPartner(db, user.id);
  if (existing.error) {
    console.error("[partner/me · select]", existing.error);
    return NextResponse.json(
      { error: "Could not load partner account." },
      { status: 500 },
    );
  }

  if (existing.partner) {
    // Detail update only — status fields are admin territory.
    const { error: updErr } = await db
      .from("partner_accounts")
      .update(parsed.value)
      .eq("user_id", user.id);
    if (updErr) {
      console.error("[partner/me · update]", updErr);
      return NextResponse.json(
        { error: "Could not save changes." },
        { status: 500 },
      );
    }
  } else {
    // Same double-fire tolerance as the GET provisioning path: if a
    // concurrent request (second tab, racing GET) created the row
    // between our check and this write, ignoreDuplicates turns the PK
    // conflict into a no-op instead of a bogus 500 — the re-fetch
    // below returns the row that won.
    const { error: insErr } = await db.from("partner_accounts").upsert(
      {
        user_id: user.id,
        ...parsed.value,
        contact_email: user.email,
        status: "pending",
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    if (insErr) {
      console.error("[partner/me · insert]", insErr);
      return NextResponse.json(
        { error: "Could not submit application." },
        { status: 500 },
      );
    }
  }

  const after = await fetchPartner(db, user.id);
  return NextResponse.json({ partner: after.partner });
}
