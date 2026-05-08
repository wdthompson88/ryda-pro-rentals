// POST /api/admin/generate-image
//
// Admin-only on-demand image generation. Used by:
//   - the (forthcoming) /admin/content-queue UI to attach hero
//     artwork to a queued post before scheduling
//   - one-off ops use ("regenerate this hero, the OG variant
//     looks washed out")
//   - the Instagram pipeline (IG REQUIRES an image; if a queued
//     IG row has no image_path, ops can call this route to
//     produce one and update the row)
//
// Body (JSON):
//   {
//     prompt: string,                                  required
//     styleNote?: string,                              optional brand-style preamble
//     size?: "1024x1024" | "1024x1536" | "1536x1024", default "1536x1024"
//     quality?: "low" | "medium" | "high",             default "medium"
//     filename?: string,                               default <timestamp>-<rand>.png
//     subdir?: string,                                 default "marketing/generated"
//     vendor?: "openai-images" | "mock",               default first configured
//     queueId?: string,                                if set, also patches that
//                                                      queue row's image_path so
//                                                      the cron picks it up
//   }
//
// Files land at public/<subdir>/<filename> so they're served at
// https://ryda.pro/<subdir>/<filename> — Instagram's image_url
// requirement (must be a publicly-resolvable URL) is satisfied
// without an extra storage layer.

import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  generateImage,
  type GenerateImageInput,
  type ImageQuality,
  type ImageSize,
} from "@/lib/image-gen";

export const runtime = "nodejs";

// Cap server-side: requests that load up huge prompts wedge the
// OpenAI call without value. 4000 chars is far above any sane
// brand-styled prompt and well under OpenAI's own ~32K limit.
const MAX_PROMPT_LEN = 4000;
const MAX_STYLE_NOTE_LEN = 2000;

const ALLOWED_SIZES: ImageSize[] = [
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "1792x1024",
  "auto",
];
const ALLOWED_QUALITY: ImageQuality[] = ["low", "medium", "high"];
const ALLOWED_VENDORS = new Set(["openai-images", "mock"]);

// Sanitize the subdir + filename so a malicious admin (or compromised
// admin token) can't traverse outside public/. Reject anything with
// a '..' segment, absolute path, or null byte. Allowed chars in
// filename: letters/digits/dash/underscore/dot. Same for subdir
// segments.
function isSafeSegment(s: string): boolean {
  if (!s || s.includes("\0")) return false;
  return /^[A-Za-z0-9._-]+$/.test(s);
}
function isSafeSubdir(s: string): boolean {
  if (!s) return false;
  if (s.startsWith("/") || s.includes("..") || s.includes("\0")) return false;
  return s.split("/").every(isSafeSegment);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: {
    prompt?: string;
    styleNote?: string;
    size?: string;
    quality?: string;
    filename?: string;
    subdir?: string;
    vendor?: string;
    queueId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Validate prompt
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length === 0) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return NextResponse.json(
      { error: `prompt exceeds ${MAX_PROMPT_LEN} chars.` },
      { status: 400 },
    );
  }

  // Optional styleNote
  const styleNote =
    typeof body.styleNote === "string" ? body.styleNote.trim() : undefined;
  if (styleNote && styleNote.length > MAX_STYLE_NOTE_LEN) {
    return NextResponse.json(
      { error: `styleNote exceeds ${MAX_STYLE_NOTE_LEN} chars.` },
      { status: 400 },
    );
  }

  // Validate size + quality + vendor against allow-lists
  const size = (body.size as ImageSize) ?? "1536x1024";
  if (!ALLOWED_SIZES.includes(size)) {
    return NextResponse.json(
      { error: `size must be one of ${ALLOWED_SIZES.join(", ")}.` },
      { status: 400 },
    );
  }
  const quality = (body.quality as ImageQuality) ?? "medium";
  if (!ALLOWED_QUALITY.includes(quality)) {
    return NextResponse.json(
      { error: `quality must be one of ${ALLOWED_QUALITY.join(", ")}.` },
      { status: 400 },
    );
  }
  const vendor = body.vendor;
  if (vendor && !ALLOWED_VENDORS.has(vendor)) {
    return NextResponse.json(
      { error: `vendor must be one of ${[...ALLOWED_VENDORS].join(", ")}.` },
      { status: 400 },
    );
  }

  // Validate subdir + filename (default to a safe location)
  const subdir = body.subdir ?? "marketing/generated";
  if (!isSafeSubdir(subdir)) {
    return NextResponse.json(
      { error: "subdir contains illegal characters." },
      { status: 400 },
    );
  }
  const fallbackName = `gen-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.png`;
  const filename = body.filename ?? fallbackName;
  if (!isSafeSegment(filename)) {
    return NextResponse.json(
      { error: "filename contains illegal characters." },
      { status: 400 },
    );
  }

  // public/ is the Next conventional static-asset dir. Files
  // dropped here are served at the corresponding URL path with
  // long-lived caching by Vercel's edge.
  const publicDir = path.join(process.cwd(), "public");
  const outDir = path.join(publicDir, subdir);

  const input: GenerateImageInput = {
    prompt,
    styleNote,
    size,
    quality,
  };

  const result = await generateImage(input, outDir, filename, {
    vendor: vendor as "openai-images" | "mock" | undefined,
  });

  if (result.kind === "not_configured") {
    return NextResponse.json(
      {
        error: "Image generation not configured.",
        missingEnv: result.missingEnv,
        hint: "Set OPENAI_API_KEY in Vercel env, or pass vendor:'mock' for local dev.",
      },
      { status: 503 },
    );
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Map disk path → public URL. The file lives at public/<subdir>/<file>
  // so the URL is /<subdir>/<file>.
  const urlPath = `/${subdir}/${filename}`.replace(/\/+/g, "/");

  // If a queueId was supplied, patch that row's image_path so the
  // social cron picks it up next tick. Best-effort — image gen
  // succeeded, the queue patch failing shouldn't fail the request.
  let queuePatched: { id: string; ok: boolean; error?: string } | null = null;
  if (body.queueId) {
    const db = supabaseAdmin();
    if (db) {
      const upd = await db
        .from("content_queue")
        .update({ image_path: urlPath })
        .eq("id", body.queueId)
        .select("id");
      queuePatched = {
        id: body.queueId,
        ok: !upd.error && (upd.data?.length ?? 0) > 0,
        error: upd.error?.message,
      };
    } else {
      queuePatched = {
        id: body.queueId,
        ok: false,
        error: "Database not configured.",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    path: result.path,
    url: urlPath,
    vendor: result.vendor,
    costCents: result.costCents,
    quality,
    size,
    queuePatched,
  });
}
