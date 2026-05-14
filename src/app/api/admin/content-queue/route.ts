import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const rawLimit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, MAX_LIMIT))
    : 50;
  const status = url.searchParams.get("status");

  let query = db
    .from("content_queue")
    .select(
      [
        "id",
        "channel",
        "title",
        "body",
        "status",
        "scheduled_at",
        "published_at",
        "image_path",
        "metadata",
        "source_file",
        "created_at",
        "updated_at",
        "generation_vendor",
        "generation_type",
        "generation_model",
        "generation_request_id",
        "generation_status",
        "generation_output_url",
        "generation_error",
        "generated_asset_path",
        "generation_metadata",
      ].join(", "),
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}
