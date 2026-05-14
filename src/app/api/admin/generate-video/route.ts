// POST /api/admin/generate-video
//
// Admin-only on-demand video clip generation. Used by:
//   - the daily-spot orchestrator script
//   - the (forthcoming) /admin/content-queue UI to attach video
//     b-roll to a queued post
//   - one-off ops use ("regenerate this clip, the original came
//     out with a watermark")
//
// Body (JSON):
//   {
//     prompt: string,                            required
//     styleNote?: string,                        optional brand-style preamble
//     durationSec?: 5 | 10,                      default 5
//     orientation?: "vertical"|"landscape"|"square",
//                                                default "landscape"
//     quality?: "standard"|"high",               default "standard"
//                                                ("high" = sora-2-pro, 3x cost)
//     filename?: string,                         default <timestamp>-<rand>.mp4
//     subdir?: string,                           default "marketing/videos/clips"
//     vendor?: "muapi-video"|"muapi-i2v"|"muapi-lipsync"|"muapi-workflow"|
//              "seedance"|"openai-sora"|"mock", default first configured
//     model?: string,                            optional MuAPI endpoint/model
//     imageUrl?: string,                         optional reference image URL
//     videoUrl?: string,                         optional source video URL
//     audioUrl?: string,                         optional lip-sync audio URL
//     workflowId?: string,                       optional MuAPI workflow id
//     workflowInputs?: object,                   optional MuAPI workflow inputs
//     queueId?: string,                          if set, patches content_queue metadata
//   }
//
// Files land at public/<subdir>/<filename>.mp4 → served at
// https://ryda.pro/<subdir>/<filename>.mp4. The Instagram + X
// connectors can reference these URLs once they support video
// upload (currently text+image only).

import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  generateClip,
  type GenerateClipInput,
  type VideoOrientation,
  type VideoQuality,
  type VideoVendor,
} from "@/lib/video-gen";

export const runtime = "nodejs";
// Sora generation can take 60-180s per clip. Vercel hobby limits
// API routes to 10s; pro to 60s; enterprise allows 900s.
// 300s is the highest cap available below the enterprise tier and
// is the value the current plan accepts — anything higher fails
// the deploy with "maxDuration must be between 1 and 300". If
// generation reliably needs >300s for production loads, upgrade
// the Vercel plan first, then bump this back up.
export const maxDuration = 300;

const MAX_PROMPT_LEN = 4000;
const MAX_STYLE_NOTE_LEN = 2000;

const ALLOWED_DURATIONS = [5, 10, 15] as const;
const ALLOWED_ORIENTATIONS: VideoOrientation[] = [
  "vertical",
  "landscape",
  "square",
];
const ALLOWED_QUALITY: VideoQuality[] = ["standard", "high"];
const ALLOWED_VENDORS = new Set([
  "muapi-video",
  "muapi-i2v",
  "muapi-lipsync",
  "muapi-workflow",
  "seedance",
  "openai-sora",
  "mock",
]);

// Same path-traversal guards as the image route. Allow only
// safe characters in subdir + filename so a compromised admin
// token can't write outside public/.
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
    durationSec?: number;
    orientation?: string;
    quality?: string;
    filename?: string;
    subdir?: string;
    vendor?: string;
    model?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    workflowId?: string;
    workflowInputs?: Record<string, unknown>;
    queueId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

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

  const styleNote =
    typeof body.styleNote === "string" ? body.styleNote.trim() : undefined;
  if (styleNote && styleNote.length > MAX_STYLE_NOTE_LEN) {
    return NextResponse.json(
      { error: `styleNote exceeds ${MAX_STYLE_NOTE_LEN} chars.` },
      { status: 400 },
    );
  }

  const durationSec = (body.durationSec ?? 5) as 5 | 10 | 15;
  if (!ALLOWED_DURATIONS.includes(durationSec)) {
    return NextResponse.json(
      { error: `durationSec must be one of ${ALLOWED_DURATIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const orientation = (body.orientation as VideoOrientation) ?? "landscape";
  if (!ALLOWED_ORIENTATIONS.includes(orientation)) {
    return NextResponse.json(
      { error: `orientation must be one of ${ALLOWED_ORIENTATIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const quality = (body.quality as VideoQuality) ?? "standard";
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

  const subdir = body.subdir ?? "marketing/videos/clips";
  if (!isSafeSubdir(subdir)) {
    return NextResponse.json(
      { error: "subdir contains illegal characters." },
      { status: 400 },
    );
  }
  const fallbackName = `clip-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.mp4`;
  const filename = body.filename ?? fallbackName;
  if (!isSafeSegment(filename)) {
    return NextResponse.json(
      { error: "filename contains illegal characters." },
      { status: 400 },
    );
  }

  const publicDir = path.join(process.cwd(), "public");
  const outDir = path.join(publicDir, subdir);

  const input: GenerateClipInput = {
    prompt,
    styleNote,
    durationSec,
    orientation,
    quality,
    model: typeof body.model === "string" ? body.model.trim() : undefined,
    imageUrl:
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : undefined,
    videoUrl:
      typeof body.videoUrl === "string" ? body.videoUrl.trim() : undefined,
    audioUrl:
      typeof body.audioUrl === "string" ? body.audioUrl.trim() : undefined,
    workflowId:
      typeof body.workflowId === "string" ? body.workflowId.trim() : undefined,
    workflowInputs:
      body.workflowInputs && typeof body.workflowInputs === "object"
        ? body.workflowInputs
        : undefined,
  };

  const result = await generateClip(input, outDir, filename, {
    vendor: vendor as VideoVendor | undefined,
  });

  if (result.kind === "not_configured") {
    return NextResponse.json(
      {
        error: "Video generation not configured.",
        missingEnv: result.missingEnv,
        hint: "Set MUAPI_API_KEY for Open Generative AI / MuAPI, FAL_KEY for Seedance fallback, or OPENAI_API_KEY for legacy Sora.",
      },
      { status: 503 },
    );
  }
  if (result.kind === "rate_limited") {
    return NextResponse.json(
      {
        error: "Sora API rate limited.",
        retryAfterSec: result.retryAfterSec,
      },
      { status: 429 },
    );
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const urlPath = `/${subdir}/${filename}`.replace(/\/+/g, "/");

  let queuePatched: { id: string; ok: boolean; error?: string } | null = null;
  if (body.queueId) {
    const db = supabaseAdmin();
    if (db) {
      const upd = await db
        .from("content_queue")
        .update({
          generation_vendor: result.vendor,
          generation_type:
            result.vendor === "muapi-i2v"
              ? "image-to-video"
              : result.vendor === "muapi-lipsync"
                ? "lip-sync"
                : result.vendor === "muapi-workflow"
                  ? "workflow"
                  : "video",
          generation_model: input.model ?? input.workflowId ?? null,
          generation_request_id: result.requestId ?? null,
          generation_status: "completed",
          generation_output_url: result.vendorUrl,
          generation_error: null,
          generated_asset_path: urlPath,
          generation_metadata: {
            prompt,
            styleNote,
            durationSec,
            orientation,
            quality,
            vendor: result.vendor,
            requestId: result.requestId ?? null,
            costCents: result.costCents,
          },
        })
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
    requestId: result.requestId ?? null,
    costCents: result.costCents,
    durationSec: result.durationSec,
    quality,
    orientation,
    queuePatched,
  });
}
