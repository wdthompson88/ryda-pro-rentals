// GET /api/admin/inquiries — list rental inquiries (the rental-first
// lead pipeline).
//
// Admin-only via requireAdmin (app_metadata.role === 'admin'). Uses
// the service-role client to bypass RLS — 0039 grants anon INSERT
// only and defines no SELECT policies, so every read of
// rental_inquiries goes through this gate.
//
// The pipeline is deliberately thin: RYDA is lead-gen, not the
// merchant of record. An inquiry lands as `new`, an admin forwards it
// to the operator (`sent`), and the operator either closes it
// (`booked` — the referral-commission event) or doesn't (`lost`).
// Creation happens only through the public POST /api/rental-inquiry
// route, so there is deliberately no POST here.
//
// Filter params accepted on GET:
//   ?status=new|sent|booked|lost   — default: all statuses
//
// Response: { inquiries, total, counts } where `counts` is the
// whole-table per-status tally (independent of the status filter) so
// the stat strip stays accurate while the list is filtered.
//
// Each inquiry also carries `payment_status` — the latest
// rental_payments status for the row (pending|paid|expired|canceled),
// null when no link was ever minted. Before migration 0041 lands the
// join degrades to null rather than failing the list, so the admin UI
// simply renders no Payment chip.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

const STATUSES = ["new", "sent", "booked", "lost"] as const;
type Status = (typeof STATUSES)[number];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
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

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  let q = db
    .from("rental_inquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(500);

  if (statusFilter && (STATUSES as readonly string[]).includes(statusFilter)) {
    q = q.eq("status", statusFilter);
  }

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 },
    );
  }
  const rows = (data ?? []) as Array<Record<string, unknown> & { id: string }>;

  // Latest rental_payments status per inquiry, for the Payment chip in
  // /admin/inquiries. One .in() query instead of an embedded join so
  // the pre-0041 window (rental_payments missing) degrades to "no
  // chip" instead of erroring the whole list.
  const paymentStatus = new Map<string, string>();
  if (rows.length > 0) {
    const pay = await db
      .from("rental_payments")
      .select("inquiry_id, status, created_at")
      .in(
        "inquiry_id",
        rows.map((r) => r.id),
      )
      .order("created_at", { ascending: true });
    if (pay.error) {
      // Missing table (pre-0041) is expected; anything else is worth a
      // line in the logs — but the chip is decoration, the rows are
      // the point, so never fail the list over it.
      const msg = pay.error.message.toLowerCase();
      const tableMissing =
        msg.includes("rental_payments") &&
        (msg.includes("schema cache") || msg.includes("does not exist"));
      if (!tableMissing) {
        console.warn("[admin inquiries · payment join]", pay.error);
      }
    } else {
      for (const p of (pay.data ?? []) as Array<{
        inquiry_id: string;
        status: string;
      }>) {
        // Ascending created_at → the newest row wins the slot, except
        // 'paid' is sticky: settled money outranks any later
        // bookkeeping row however it came to exist.
        if (paymentStatus.get(p.inquiry_id) === "paid") continue;
        paymentStatus.set(p.inquiry_id, p.status);
      }
    }
  }

  // Per-status totals for the stat strip. Head-only count queries so
  // no row payload moves. A failed count degrades to 0 rather than
  // failing the whole list — the counts are decoration, the rows are
  // the point.
  const counts: Record<Status, number> = {
    new: 0,
    sent: 0,
    booked: 0,
    lost: 0,
  };
  await Promise.all(
    STATUSES.map(async (s) => {
      const { count: c, error: countErr } = await db
        .from("rental_inquiries")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      if (!countErr && typeof c === "number") counts[s] = c;
    }),
  );

  return NextResponse.json({
    inquiries: rows.map((r) => ({
      ...r,
      payment_status: paymentStatus.get(r.id) ?? null,
    })),
    total: count ?? 0,
    counts,
  });
}
