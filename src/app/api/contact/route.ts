import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";

const VALID_TYPES = new Set(["Membership", "Rental", "Press", "Partnership", "Investor", "Other"]);
const VALID_MARKETS = new Set(["Miami", "Los Angeles", "New York", "Not sure"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const inquiry_type = VALID_TYPES.has(body.type) ? body.type : "Other";
    const market = VALID_MARKETS.has(body.market) ? body.market : "Not sure";
    const message = String(body.message || "").trim().slice(0, 5000);

    if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (message.length < 20) {
      return NextResponse.json({ error: "Message must be at least 20 characters." }, { status: 400 });
    }

    if (!supabase) {
      // Fail closed in production — never tell the user "we got it" if we
      // didn't actually persist. Dev mode logs metadata only (no PII).
      if (process.env.NODE_ENV === "production") {
        console.error("[contact · misconfigured]");
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please email us directly." },
          { status: 503 },
        );
      }
      console.log("[contact · dev no-db]", { inquiry_type, market, ts: new Date().toISOString() });
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      phone: phone || null,
      inquiry_type,
      market,
      message,
    });

    if (error) {
      console.error("[contact · supabase]", error);
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    void notifyTeam({
      subject: `New ${inquiry_type.toLowerCase()} inquiry from ${name}`,
      replyTo: email,
      html: emailLayout(`New contact form: ${inquiry_type}`, `
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#7a7770;">From</div>
        <div style="font-size:16px;font-weight:500;margin-top:2px;">${escapeHtml(name)}</div>
        <div style="margin-top:2px;"><a href="mailto:${escapeHtml(email)}" style="color:#c03030;text-decoration:none;">${escapeHtml(email)}</a></div>
        ${phone ? `<div style="margin-top:2px;color:#3c3c3c;">${escapeHtml(phone)}</div>` : ""}
        <div style="margin-top:14px;display:flex;gap:24px;">
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#7a7770;">Type</div>
            <div style="margin-top:2px;font-weight:500;">${escapeHtml(inquiry_type)}</div>
          </div>
          <div style="margin-left:24px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#7a7770;">Market</div>
            <div style="margin-top:2px;">${escapeHtml(market)}</div>
          </div>
        </div>
        <div style="margin-top:18px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#7a7770;margin-bottom:6px;">Message</div>
        <div style="white-space:pre-wrap;color:#1c1c1c;">${escapeHtml(message)}</div>
        <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e1d8;font-size:13px;color:#3c3c3c;">
          <strong>Hit reply</strong> to respond — this email's reply-to is set to ${escapeHtml(email)}.
        </div>
      `),
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
