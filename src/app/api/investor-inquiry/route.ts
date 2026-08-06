import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { isAllowed, clientIp } from "@/lib/rate-limit";

const VALID_CHECK_SIZES = new Set([
  "$25K–$50K",
  "$50K–$250K",
  "$250K–$1M",
  "$1M+",
]);

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  try {
    if (!(await isAllowed(`investor-inquiry:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS))) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const firm = String(body.firm || "").trim();
    const rawCheckSize = String(body.check_size || "").trim();
    const check_size = VALID_CHECK_SIZES.has(rawCheckSize) ? rawCheckSize : null;
    const notes = String(body.notes || "").trim().slice(0, 4000);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name required." }, { status: 400 });
    }

    if (!supabase) {
      if (process.env.NODE_ENV === "production") {
        console.error("[investor-inquiry · misconfigured]");
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please email us directly." },
          { status: 503 },
        );
      }
      console.log("[investor-inquiry · dev no-db]", { check_size, ts: new Date().toISOString() });
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { error } = await supabase.from("investor_inquiries").insert({
      email,
      name,
      firm: firm || null,
      check_size,
      notes: notes || null,
    });

    if (error) {
      console.error("[investor-inquiry · supabase]", error);
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    await notifyTeam({
      subject: `New investor inquiry: ${name}${check_size ? ` · ${check_size}` : ""}`,
      replyTo: email,
      html: emailLayout("New investor inquiry", `
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#514C47;">From</div>
        <div style="font-size:16px;font-weight:500;margin-top:2px;">${escapeHtml(name)}</div>
        <div style="margin-top:2px;"><a href="mailto:${escapeHtml(email)}" style="color:#C03030;text-decoration:none;">${escapeHtml(email)}</a></div>
        ${firm ? `<div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#514C47;">Firm</div><div style="margin-top:2px;">${escapeHtml(firm)}</div>` : ""}
        ${check_size ? `<div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#514C47;">Anticipated check size</div><div style="margin-top:2px;font-weight:500;">${escapeHtml(check_size)}</div>` : ""}
        ${notes ? `<div style="margin-top:18px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#514C47;margin-bottom:6px;">Notes</div><div style="white-space:pre-wrap;color:#1c1c1c;">${escapeHtml(notes)}</div>` : ""}
        <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e1d8;font-size:13px;color:#3c3c3c;">
          <strong>Hit reply</strong> to respond, this email's reply-to is set to ${escapeHtml(email)}.
        </div>
      `),
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
