import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VALID_CHECK_SIZES = new Set([
  "$25K–$50K",
  "$50K–$250K",
  "$250K–$1M",
  "$1M+",
]);

export async function POST(req: Request) {
  try {
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
      console.log("[investor-inquiry · no-db]", {
        email, name, firm, check_size, notes, ts: new Date().toISOString(),
      });
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

    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
