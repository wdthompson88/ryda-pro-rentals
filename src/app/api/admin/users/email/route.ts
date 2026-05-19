// POST /api/admin/users/email
//
// Send a direct one-off email from RYDA ops to a specific member.
// Uses the same Resend wiring as the team-notify helper, but sends to
// the member's address instead of TEAM_EMAIL, with reply-to set to
// the admin's own email so the conversation continues 1:1.
//
// Body: { userId: uuid, subject: string, body: string }
// Audit-logged as "email_sent" with the subject + first 280 chars of
// the body in details (full body NOT persisted to keep the audit log
// scannable; the email itself is the record).
//
// Auth: requireAdmin.

import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAction } from "@/lib/admin-audit";
import { emailLayout, escapeHtml } from "@/lib/notify";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.RYDA_NOTIFY_FROM ?? "";

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { userId?: string; subject?: string; body?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const messageBody = (body.body ?? "").trim();

  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: "userId must be a UUID." },
      { status: 400 },
    );
  }
  if (subject.length < 2 || subject.length > 200) {
    return NextResponse.json(
      { error: "Subject must be 2–200 characters." },
      { status: 400 },
    );
  }
  if (messageBody.length < 4 || messageBody.length > 20_000) {
    return NextResponse.json(
      { error: "Body must be 4–20,000 characters." },
      { status: 400 },
    );
  }

  if (!apiKey || !FROM) {
    return NextResponse.json(
      { error: "Resend not configured. Set RESEND_API_KEY + RYDA_NOTIFY_FROM." },
      { status: 500 },
    );
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

  const { data: targetRes, error: targetErr } = await db.auth.admin.getUserById(
    userId,
  );
  if (targetErr || !targetRes?.user?.email) {
    return NextResponse.json(
      { error: "User not found or has no email." },
      { status: 404 },
    );
  }
  const toEmail = targetRes.user.email;
  const replyTo = adminUser.email ?? undefined;

  // Render the body as a simple HTML paragraph block. Preserve
  // user-entered newlines as <br>. No markdown — admins paste plain
  // prose; if they want richer formatting they can hand-write HTML
  // and we'll add a flag later.
  const innerHtml = escapeHtml(messageBody).replace(/\n/g, "<br>");
  const html = emailLayout(subject, `<div>${innerHtml}</div>`);

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject,
      html,
      replyTo,
    });
    if (error) {
      console.error("[admin/users/email · resend]", error);
      return NextResponse.json(
        { error: "Email send failed at provider." },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error("[admin/users/email · throw]", e);
    return NextResponse.json({ error: "Email send threw." }, { status: 500 });
  }

  await recordAdminAction(db, {
    adminUserId: adminUser.id,
    action: "email_sent",
    targetType: "auth_user",
    targetId: userId,
    details: {
      target_email: toEmail,
      subject,
      body_preview: messageBody.slice(0, 280),
      reply_to: replyTo,
    },
  });

  return NextResponse.json({ ok: true, to: toEmail });
}
