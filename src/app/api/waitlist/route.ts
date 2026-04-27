import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      console.log("[waitlist · no-db]", { email, name, market, ts: new Date().toISOString() });
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { error } = await supabase
      .from("waitlist")
      .insert({ email, name: name || null, market });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, persisted: true, duplicate: true });
      }
      console.error("[waitlist · supabase]", error);
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
