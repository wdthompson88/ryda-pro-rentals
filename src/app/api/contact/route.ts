import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VALID_TYPES = new Set(["Membership", "Press", "Partnership", "Investor", "Other"]);
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
      console.log("[contact · no-db]", {
        name, email, phone, inquiry_type, market, message, ts: new Date().toISOString(),
      });
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

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
