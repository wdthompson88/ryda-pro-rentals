// POST /api/share-purchase/[id]/resend-amendment
//
// Re-render + re-email the LLC member-register amendment PDF for a
// paid share-purchase. Used when:
//   - The original webhook-driven email bounced or got marked spam
//   - The member lost their copy and wants it again
//   - Ops re-sends from /admin (admin role can resend any purchase)
//
// Auth: the purchase owner OR an admin (app_metadata.role='admin').
// Owner-only routes return 404 to non-owners to avoid leaking purchase
// ids; admin path bypasses the owner filter and is audit-logged.
//
// Idempotency: doesn't create a new llc_amendments row — updates the
// existing one's email_attempted_at + emailed flag. Re-sending three
// times in a row → three emails, one row, latest timestamps win.

import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { renderAmendmentPdf } from "@/lib/llc-amendment-pdf";
import { emailLayout, escapeHtml } from "@/lib/notify";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";
import { Resend } from "resend";

export const runtime = "nodejs";

// Tighter rate limit than other account routes — re-sending a PDF
// is expensive and there's no legitimate reason to fire more than
// a couple per minute.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (
    !(await isAllowed(
      `resend-amendment:${user.id}:${clientIp(req)}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    ))
  ) {
    return NextResponse.json(
      { error: "Too many resend requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let admin;
  try {
    admin = requireSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const { id: purchaseId } = await params;

  // Auth split: admin can resend ANY purchase; owners can resend
  // their own. The /admin/page.tsx Resend button hits this route
  // and was previously broken (404'd for admins) because the
  // .eq("user_id", user.id) filter rejected non-owner admin reads.
  const adminUser = await requireAdmin(req);
  const isAdminCaller = !!adminUser;

  let lookup = admin
    .from("share_purchases")
    .select(
      "id, user_id, status, shares, vehicle_symbol, boat_slug, name, email, total_cents, fulfilled_at",
    )
    .eq("id", purchaseId);
  if (!isAdminCaller) {
    lookup = lookup.eq("user_id", user.id);
  }
  const { data: purchase, error: purchaseErr } = await lookup.maybeSingle();
  if (purchaseErr || !purchase) {
    return NextResponse.json(
      { error: "Purchase not found." },
      { status: 404 },
    );
  }
  if (purchase.status !== "paid") {
    return NextResponse.json(
      { error: "Amendment is only generated after the purchase is paid." },
      { status: 409 },
    );
  }

  // Find the asset display info (used for the PDF + email subject).
  const v = purchase.vehicle_symbol
    ? VEHICLES.find((x) => x.symbol === purchase.vehicle_symbol)
    : null;
  const b = purchase.boat_slug
    ? BOATS.find((x) => x.slug === purchase.boat_slug)
    : null;
  const assetDisplay = v
    ? `${v.year} ${v.name}`
    : b
      ? `${b.year} ${b.name}`
      : (purchase.vehicle_symbol ?? purchase.boat_slug ?? "RYDA asset");
  const llcName = v
    ? `RYDA ${v.symbol} LLC`
    : b
      ? `RYDA ${b.slug.toUpperCase()} LLC`
      : "RYDA LLC";

  // Re-render the PDF.
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderAmendmentPdf({
      purchaseId: purchase.id,
      memberName: purchase.name,
      memberEmail: purchase.email,
      shares: purchase.shares,
      assetLabel: assetDisplay,
      llcName,
      effectiveDate: new Date().toISOString().slice(0, 10),
      totalAmount: Number(purchase.total_cents ?? 0) / 100,
    });
  } catch (err) {
    console.error("[resend-amendment · render]", err);
    return NextResponse.json(
      { error: "Could not render amendment." },
      { status: 500 },
    );
  }

  // Send.
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RYDA_NOTIFY_FROM;
  if (!resendKey || !from) {
    return NextResponse.json(
      {
        error:
          "Email backend not configured. Contact support to receive your amendment.",
      },
      { status: 503 },
    );
  }

  const resend = new Resend(resendKey);
  const { error: emailError } = await resend.emails.send({
    from,
    to: purchase.email,
    subject: `Re-sent: your ${llcName} member register amendment`,
    html: emailLayout(
      "Your co-ownership amendment, re-sent",
      `
        <p>${escapeHtml(purchase.name)},</p>
        <p>Per your request, here's a fresh copy of your share's
        amendment to <strong>${escapeHtml(llcName)}</strong>'s
        Operating Agreement, recording you as a member.</p>
        <p>Reference: <code>${escapeHtml(purchase.id)}</code></p>
        <p>If you didn't request this, you can ignore the email — no
        change to your account.</p>
      `,
    ),
    attachments: [
      {
        filename: `${llcName.replace(/\s+/g, "-")}-amendment.pdf`,
        content: pdfBuffer,
      },
    ],
  });
  if (emailError) {
    console.error("[resend-amendment · email]", emailError);
    return NextResponse.json(
      { error: "Could not send email." },
      { status: 500 },
    );
  }

  // Bump email_attempted_at on the existing amendment row (don't
  // insert a duplicate). The unique constraint on (purchase_id,
  // document_type) protects us either way.
  await admin
    .from("llc_amendments")
    .update({
      emailed: true,
      email_attempted_at: new Date().toISOString(),
    })
    .eq("purchase_id", purchase.id)
    .eq("document_type", "member_register_amendment");

  // Audit-log the admin path. Owner self-serve resends don't need
  // audit (the email itself is the receipt).
  if (isAdminCaller && adminUser) {
    await recordAdminAction(admin, {
      adminUserId: adminUser.id,
      action: "resend_amendment",
      targetType: "share_purchase",
      targetId: purchase.id,
      details: {
        recipient: purchase.email,
        owner_user_id: purchase.user_id,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
