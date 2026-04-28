import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const note = String(body.note || "").trim().slice(0, 5000);
    const trigger_message = String(body.trigger_message || "").trim().slice(0, 2000);
    const conversation = Array.isArray(body.conversation)
      ? body.conversation.slice(-12) // keep last 12 turns max
      : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    if (!supabase) {
      console.log("[help-escalation · no-db]", {
        email, note, trigger_message, conversation, ts: new Date().toISOString(),
      });
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

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
