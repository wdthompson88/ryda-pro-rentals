import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { notifyTeam, emailLayout, escapeHtml } from "@/lib/notify";
import { isAllowed, clientIp } from "@/lib/rate-limit";

type ConversationTurn = { role: "user" | "bot"; text: string };

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  try {
    if (!isAllowed(`help-escalation:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 },
      );
    }
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const note = String(body.note || "").trim().slice(0, 5000);
    const trigger_message = String(body.trigger_message || "").trim().slice(0, 2000);
    const conversation: ConversationTurn[] | null = Array.isArray(body.conversation)
      ? body.conversation.slice(-12)
      : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    if (!supabase) {
      if (process.env.NODE_ENV === "production") {
        console.error("[help-escalation · misconfigured]");
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please email us directly." },
          { status: 503 },
        );
      }
      console.log("[help-escalation · dev no-db]", { ts: new Date().toISOString() });
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { error } = await supabase.from("help_escalations").insert({
      email,
      note: note || null,
      trigger_message: trigger_message || null,
      conversation,
    });

    if (error) {
      console.error("[help-escalation · supabase]", error);
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    // Best-effort email notification, fire and don't block the response.
    // The DB write is the source of truth; email is the alert layer.
    await notifyTeam({
      subject: `New help-chat escalation from ${email}`,
      replyTo: email,
      html: emailLayout(
        "Someone wants to talk to a human",
        renderEscalationHtml({ email, note, trigger_message, conversation }),
      ),
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}

function renderEscalationHtml({
  email,
  note,
  trigger_message,
  conversation,
}: {
  email: string;
  note: string;
  trigger_message: string;
  conversation: ConversationTurn[] | null;
}): string {
  const conversationHtml =
    conversation && conversation.length > 0
      ? `<div style="margin-top:18px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;margin-bottom:8px;">Conversation context</div>
          <div style="border:1px solid #e5e1d8;border-radius:8px;padding:12px;background:#faf7f2;">
            ${conversation
              .map(
                (t) =>
                  `<div style="margin:6px 0;"><span style="font-weight:600;color:${
                    t.role === "user" ? "#DC4747" : "#1c1c1c"
                  };">${t.role === "user" ? "User" : "Bot"}:</span> <span style="color:#3c3c3c;">${escapeHtml(
                    t.text,
                  )}</span></div>`,
              )
              .join("")}
          </div>
        </div>`
      : "";

  return `
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;">From</div>
      <div style="font-size:16px;font-weight:500;margin-top:2px;"><a href="mailto:${escapeHtml(email)}" style="color:#DC4747;text-decoration:none;">${escapeHtml(email)}</a></div>
    </div>

    ${
      note
        ? `<div style="margin-top:18px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;margin-bottom:6px;">Their note</div>
            <div style="white-space:pre-wrap;color:#1c1c1c;">${escapeHtml(note)}</div>
          </div>`
        : ""
    }

    ${
      trigger_message
        ? `<div style="margin-top:18px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#9A9590;margin-bottom:6px;">Trigger phrase</div>
            <div style="font-style:italic;color:#3c3c3c;">"${escapeHtml(trigger_message)}"</div>
          </div>`
        : ""
    }

    ${conversationHtml}

    <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e1d8;font-size:13px;color:#3c3c3c;">
      <strong>Hit reply</strong> to respond, this email's reply-to is set to ${escapeHtml(email)}.
    </div>
  `;
}
