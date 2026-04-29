import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";

const VALID_MARKETS = new Set(["Miami", "LA", "NY", "Other"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const market = VALID_MARKETS.has(body.market) ? body.market : "Miami";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    if (!supabase) {
      if (process.env.NODE_ENV === "production") {
        console.error("[waitlist · misconfigured]");
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please email us directly." },
          { status: 503 },
        );
      }
      console.log("[waitlist · dev no-db]", { market, ts: new Date().toISOString() });
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { error } = await supabase
      .from("waitlist")
      .insert({ email, name: name || null, market });

    if (error) {
      // 23505 = unique violation (duplicate email). Don't email on duplicates;
      // the lead is already in the table from a prior submission.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, persisted: true, duplicate: true });
      }
      console.error("[waitlist · supabase]", error);
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    void notifyTeam({
      subject: `New waitlist signup: ${name || email}`,
      replyTo: email,
      html: emailLayout("New waitlist signup", `
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">From</div>
        <div style="font-size:16px;font-weight:500;margin-top:2px;"><a href="mailto:${escapeHtml(email)}" style="color:#DC4747;text-decoration:none;">${escapeHtml(email)}</a></div>
        ${name ? `<div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">Name</div><div style="margin-top:2px;">${escapeHtml(name)}</div>` : ""}
        <div style="margin-top:14px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">Market</div>
        <div style="margin-top:2px;">${escapeHtml(market)}</div>
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
