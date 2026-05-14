// queue-poller.ts — drain "needs image" rows from content_queue,
// generate the image via Open Generative AI / MuAPI first, save to public/marketing/generated,
// patch the row's image_path so the social cron picks it up.
//
// Why: every Instagram row needs an image (the IG Graph API rejects
// caption-only posts) and journal rows want hero artwork. Until
// each row's image_path resolves to a real file under
// PUBLIC_ASSET_BASE_URL, the social-publisher cron logs them as
// blocked. This poller closes that gap by generating images
// continuously in the background. MuAPI is preferred; legacy OpenAI
// Images remains a fallback through src/lib/image-gen.
//
// Flow per pass:
//   1. SELECT * FROM content_queue
//        WHERE status IN ('approved','scheduled','draft')
//          AND channel IN ('instagram','journal')
//          AND (image_path IS NULL OR image_path file missing)
//        LIMIT BATCH_SIZE
//   2. For each row, build a prompt:
//        - row.metadata.image_prompt if present
//        - else compose from row.title + body + brand-style preamble
//   3. Call generateImage(prompt, outPath) through the vendor registry
//   4. UPDATE content_queue SET image_path = '/marketing/generated/<file>.png'
//   5. Sleep PAUSE_BETWEEN_MS to be polite to vendor rate limits
//
// Modes:
//   --once   single pass then exit
//   --loop   pass + sleep POLL_INTERVAL_MS, repeat (intended for
//            launchd / systemd autostart)
//
// Required env (loaded from ryda-web/.env or shell):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Optional env:
//   QUEUE_POLLER_BATCH_SIZE=5            rows per pass (default 5)
//   QUEUE_POLLER_PAUSE_MS=30000          ms between rows (default 30s)
//   QUEUE_POLLER_INTERVAL_MS=600000      ms between passes (default 10m)
//   QUEUE_POLLER_HEADLESS=false          launch Playwright headless
//   QUEUE_POLLER_OUT_DIR=...             override output dir
//   MUAPI_API_KEY=...                    preferred Open Generative AI provider
//   OPENAI_API_KEY=...                   legacy OpenAI Images fallback

import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { promises as fs } from "node:fs";
import { loadDotEnvLocal } from "./env-loader";

// tsx doesn't auto-load .env files. Load Supabase + generation env
// before reading process.env below.
loadDotEnvLocal();

// Lazy-imported in pollOnce() so this script can `tsx`-load
// without server-only failing if it's run from a non-Next env.
type ImageApiResult =
  | {
      kind: "ok";
      path: string;
      vendor: string;
      vendorUrl: string | null;
      requestId?: string | null;
      costCents: number | null;
    }
  | { kind: "not_configured"; missingEnv: string[] }
  | { kind: "error"; error: string };
type ImageApiFn = (
  input: { prompt: string; quality: "low" | "medium" | "high"; size: string },
  outDir: string,
  filename: string,
) => Promise<ImageApiResult>;
let generateImageApi: ImageApiFn | null = null;

const BATCH_SIZE = parseInt(process.env.QUEUE_POLLER_BATCH_SIZE || "5", 10);
const PAUSE_BETWEEN_MS = parseInt(
  process.env.QUEUE_POLLER_PAUSE_MS || "30000",
  10,
);
const POLL_INTERVAL_MS = parseInt(
  process.env.QUEUE_POLLER_INTERVAL_MS || "600000",
  10,
);
const HEADLESS = process.env.QUEUE_POLLER_HEADLESS === "true";
const OUT_DIR =
  process.env.QUEUE_POLLER_OUT_DIR ||
  path.join(process.cwd(), "public", "marketing", "generated");
const PUBLIC_URL_PREFIX = "/marketing/generated";

// RYDA brand-style preamble. Prepended to every prompt to bias
// generation toward editorial photo realism rather than illustration
// or 3D render. Tuned to the "quiet luxury" brand voice the
// content-marketer agent established.
const BRAND_PREAMBLE = `
Editorial photograph in the style of Magnum photography.
Subject: a single luxury or exotic vehicle in a Miami garage setting.
Aesthetic: quiet luxury, restrained, natural light, shallow depth of field.
Avoid: oversaturated colors, lens flares, fake bokeh, 3D-render look,
illustration style, watermarks, text overlays.
`.trim();

type QueueRow = {
  id: string;
  channel: string;
  title: string | null;
  body: string;
  image_path: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  source_file: string | null;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`[queue-poller] missing env: ${name}`);
    process.exit(2);
  }
  return v;
}

function buildPrompt(row: QueueRow): string {
  // 1. Explicit image_prompt in row metadata wins (operator
  //    override path).
  const explicit = row.metadata?.image_prompt;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return `${BRAND_PREAMBLE}\n\nScene: ${explicit.trim()}`;
  }
  // 2. Otherwise compose from the post's title (if any) + the
  //    first 200 chars of body. Trims hashtag noise.
  const titleHint = row.title ? `${row.title}. ` : "";
  const bodyHint = row.body
    .replace(/#\w+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return `${BRAND_PREAMBLE}\n\nScene: ${titleHint}${bodyHint}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Resolve a row's image_path to a disk location and check
 *  whether the file actually exists. Returns null if the path
 *  is a public URL we wrote ourselves and the file is present. */
async function rowNeedsImage(row: QueueRow, publicDir: string): Promise<boolean> {
  if (!row.image_path) return true;
  // image_path is conventionally a public URL like /marketing/...
  // resolve to disk under the web app's public/ folder.
  if (row.image_path.startsWith("http")) {
    // External URL — assume it's hosted elsewhere, not our problem.
    return false;
  }
  const stripped = row.image_path.startsWith("/")
    ? row.image_path.slice(1)
    : row.image_path;
  const diskPath = path.join(publicDir, stripped);
  return !(await fileExists(diskPath));
}

async function pollOnce(): Promise<{
  scanned: number;
  generated: number;
  errors: number;
  notLoggedIn: boolean;
}> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("content_queue")
    .select(
      "id, channel, title, body, image_path, metadata, status, source_file",
    )
    .in("status", ["draft", "approved", "scheduled"])
    .in("channel", ["instagram", "journal"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(BATCH_SIZE * 4); // overshoot — we filter for missing files next

  if (error) {
    console.error("[queue-poller] query failed:", error.message);
    return { scanned: 0, generated: 0, errors: 1, notLoggedIn: false };
  }
  const rows = (data ?? []) as QueueRow[];
  const publicDir = path.dirname(OUT_DIR); // public/marketing/generated → public/marketing → public
  const webPublicDir = path.resolve(OUT_DIR, "..", "..");

  // Filter to the rows that genuinely need an image.
  const needs: QueueRow[] = [];
  for (const row of rows) {
    if (await rowNeedsImage(row, webPublicDir)) {
      needs.push(row);
      if (needs.length >= BATCH_SIZE) break;
    }
  }

  console.log(
    `[queue-poller] scanned ${rows.length} candidate rows, ${needs.length} need images`,
  );

  let generated = 0;
  let errors = 0;
  let notLoggedIn = false;

  for (let i = 0; i < needs.length; i++) {
    const row = needs[i];
    const fnameStem = slugify(
      row.title ||
        (row.source_file ? path.parse(row.source_file).name : `row-${row.id}`),
    );
    const filename = `${fnameStem || "image"}-${row.id.slice(0, 8)}.png`;
    const outPath = path.join(OUT_DIR, filename);
    const publicUrl = `${PUBLIC_URL_PREFIX}/${filename}`;

    const prompt = buildPrompt(row);
    console.log(
      `[queue-poller] (${i + 1}/${needs.length}) row=${row.id.slice(0, 8)} channel=${row.channel}`,
    );

    if (!generateImageApi) {
      // Lazy import — pulls in src/lib/image-gen which uses
      // server-only. Doing this lazily means the script can
      // tsx-load even if env isn't set up yet.
      const lib = await import("@/lib/image-gen");
      generateImageApi = async (input, outDir, filename) => {
        const r = await lib.generateImage(
          {
            prompt: input.prompt,
            size: input.size as
              | "1024x1024"
              | "1024x1536"
              | "1536x1024"
              | "1792x1024"
              | "auto",
            quality: input.quality,
          },
          outDir,
          filename,
        );
        if (r.kind === "ok") {
          return {
            kind: "ok",
            path: r.path,
            vendor: r.vendor,
            vendorUrl: r.vendorUrl,
            requestId: r.requestId ?? null,
            costCents: r.costCents,
          };
        }
        if (r.kind === "not_configured") {
          return { kind: "not_configured", missingEnv: r.missingEnv };
        }
        return { kind: "error", error: r.error };
      };
    }

    let result: ImageApiResult;
    try {
      result = await generateImageApi(
        { prompt, quality: "medium", size: "1536x1024" },
        OUT_DIR,
        filename,
      );
    } catch (err) {
      result = {
        kind: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }

    if (result.kind === "ok") {
      const upd = await supabase
        .from("content_queue")
        .update({
          image_path: publicUrl,
          generation_vendor: result.vendor,
          generation_type: "image",
          generation_request_id: result.requestId ?? null,
          generation_status: "completed",
          generation_output_url: result.vendorUrl,
          generation_error: null,
          generated_asset_path: publicUrl,
          generation_metadata: {
            prompt,
            vendor: result.vendor,
            requestId: result.requestId ?? null,
            costCents: result.costCents,
            source: "marketing:gen-images",
          },
        })
        .eq("id", row.id)
        .select("id");
      if (upd.error) {
        console.error(
          `[queue-poller]   image saved but queue update failed: ${upd.error.message}`,
        );
        errors += 1;
      } else {
        const sizeKb = result.path
          ? Math.round((await fs.stat(result.path)).size / 1024)
          : 0;
        console.log(
          `[queue-poller]   ok: ${publicUrl} (${sizeKb} KB)`,
        );
        generated += 1;
      }
    } else if (result.kind === "not_configured") {
      console.error(
        `[queue-poller]   NOT CONFIGURED. Missing env: ${(result.missingEnv ?? []).join(", ")}. Set MUAPI_API_KEY in .env.local for Open Generative AI / MuAPI, or OPENAI_API_KEY for fallback.`,
      );
      notLoggedIn = true;
      break;
    } else {
      console.error(`[queue-poller]   error: ${result.error}`);
      errors += 1;
    }

    // Polite pause between rows. Creative generation vendors throttle
    // aggressively if you hammer them; 30s keeps background spend and
    // rate limits under control.
    if (i < needs.length - 1) {
      await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_MS));
    }
  }

  return { scanned: rows.length, generated, errors, notLoggedIn };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const loop = args.has("--loop");

  console.log("[queue-poller] starting");
  console.log(
    `[queue-poller] config: batch=${BATCH_SIZE} pause=${PAUSE_BETWEEN_MS}ms interval=${POLL_INTERVAL_MS}ms vendor=muapi-preferred`,
  );

  do {
    const summary = await pollOnce();
    console.log(`[queue-poller] pass complete: ${JSON.stringify(summary)}`);
    if (loop && summary.notLoggedIn) {
      // Wait a longer interval after a login failure so the user
      // has time to log in before the next attempt.
      console.log(
        "[queue-poller] sleeping 5min after provider configuration failure",
      );
      await new Promise((r) => setTimeout(r, 5 * 60_000));
      continue;
    }
    if (loop) {
      console.log(`[queue-poller] sleeping ${POLL_INTERVAL_MS}ms`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  } while (loop);

  console.log("[queue-poller] done");
}

if (process.argv[1]?.endsWith("queue-poller.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
