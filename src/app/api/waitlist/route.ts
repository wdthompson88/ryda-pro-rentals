import { NextResponse } from "next/server";

/**
 * Waitlist API.
 *
 * Today: just logs server-side and returns 200 — keeps the form working
 * without external dependencies.
 *
 * When Supabase is wired up, replace the body of POST() with:
 *
 *   const supabase = createClient(...)
 *   const { error } = await supabase
 *     .from("waitlist")
 *     .insert({ email, name, market })
 *   if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const name = String(body.name || "").trim();
    const market = String(body.market || "Miami");

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required." },
        { status: 400 },
      );
    }

    // Server-side log so Ryan can see signups in Vercel logs until DB is wired.
    console.log("[waitlist]", { email, name, market, ts: new Date().toISOString() });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
