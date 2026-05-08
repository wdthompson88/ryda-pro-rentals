// daily-spot.ts — orchestrator. Produces ONE 15-second car/boat
// spot per day, idempotently. Designed to be triggered hourly by
// launchd; only the first invocation per day actually generates,
// subsequent invocations no-op.
//
// Pipeline:
//   1. Pick today's vehicle (round-robin from LAUNCH_INVENTORY,
//      or override via --vehicle <slug>).
//   2. Build a 3-shot storyboard.
//   3. For each shot, drive Sora via chatgpt.com → generate clip
//      → save to a temp dir.
//   4. Compose with FFmpeg → vertical + landscape MP4 in
//      public/marketing/videos/.
//   5. Append a row to content_queue (channel='instagram',
//      status='draft', metadata.video_paths set) so the operator
//      can review + approve before the social cron picks it up.
//   6. Write a marker file so re-runs the same day skip.
//
// Modes:
//   --once         single pass then exit (default)
//   --vehicle <i>  use inventory index i (skips today's-pick logic)
//   --no-queue     skip Supabase queue insert (offline / dry mode)
//   --force        ignore the day-marker file
//
// Required env (only when not --no-queue):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "../env-loader";

// Load env (FAL_KEY, OPENAI_API_KEY, Supabase) from .env.local
// BEFORE importing modules that read env at init time.
loadDotEnvLocal();

import { composeSpot } from "./composer";
import {
  LAUNCH_INVENTORY,
  buildStoryboard,
  pickTodaysVehicle,
  type SpotInput,
} from "./storyboard";

// Vendor selection.
//   dreamina-auto: drive dreamina.capcut.com via Playwright. Uses
//                  the user's existing $18-25/mo Dreamina sub at $0
//                  marginal cost. Default for users with the sub.
//                  Probe-verified working May 2026 (Akamai/ByteDance
//                  doesn't block Playwright with stealth on this
//                  domain, unlike Cloudflare on chatgpt.com).
//   seedance:      ByteDance Seedance 2.0 via fal.ai REST API.
//                  Pay-as-you-go, FAL_KEY, ~$4.50/mo at 720p. Use
//                  if you don't have a Dreamina sub.
//   sora:          OpenAI Sora API, legacy until 2026-09-24.
//   manual:        user generates clips in any web UI and drops
//                  MP4s in ~/.ryda-marketing/manual-clips/<stem>/.
//                  Use when dreamina-auto breaks (UI changed) or
//                  for hand-curated hero spots.
//   mock:          tests/dev
type Vendor = "dreamina-auto" | "seedance" | "sora" | "manual" | "mock";

type AnyResult =
  | {
      kind: "ok";
      path: string;
      sizeBytes: number;
      vendorUrl: string | null;
    }
  | { kind: "error"; error: string }
  | { kind: "rate_limited"; retryAfterSec: number | null }
  | { kind: "not_configured"; missingEnv: string[] };

const MARKER_DIR = path.join(os.homedir(), ".ryda-marketing", "daily-markers");
const TMP_CLIPS_ROOT = path.join(os.homedir(), ".ryda-marketing", "clips");

// Manual-mode dirs. The user drops MP4s into manual-clips/<stem>/
// and the prompts get written to manual-prompts/<stem>/ for easy
// copy. Both live under ~/.ryda-marketing/ so they're outside
// the repo + survive across runs.
const MANUAL_CLIPS_ROOT = path.join(
  os.homedir(),
  ".ryda-marketing",
  "manual-clips",
);
const MANUAL_PROMPTS_ROOT = path.join(
  os.homedir(),
  ".ryda-marketing",
  "manual-prompts",
);
const OUT_DIR = path.join(
  process.cwd(),
  "public",
  "marketing",
  "videos",
);
const PUBLIC_URL_PREFIX = "/marketing/videos";

function todayStamp(): string {
  // YYYY-MM-DD in local time. Matches operator intuition better
  // than UTC for a once-a-day cadence.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function parseArgs(argv: string[]): {
  vehicleIdx: number | null;
  force: boolean;
  noQueue: boolean;
  vendor: Vendor;
  quality: "standard" | "high";
  resume: boolean;
} {
  const out = {
    vehicleIdx: null as number | null,
    force: false,
    noQueue: false,
    vendor: "dreamina-auto" as Vendor,
    quality: "standard" as "standard" | "high",
    resume: false,
  };
  const VALID_VENDORS = new Set<Vendor>([
    "dreamina-auto",
    "seedance",
    "sora",
    "manual",
    "mock",
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--no-queue") out.noQueue = true;
    else if (a === "--resume") out.resume = true;
    else if (a === "--vehicle") {
      const idx = parseInt(argv[++i] ?? "", 10);
      if (Number.isInteger(idx)) out.vehicleIdx = idx;
    } else if (a === "--vendor") {
      const v = (argv[++i] ?? "").toLowerCase();
      if (VALID_VENDORS.has(v as Vendor)) out.vendor = v as Vendor;
    } else if (a.startsWith("--vendor=")) {
      const v = a.split("=")[1].toLowerCase();
      if (VALID_VENDORS.has(v as Vendor)) out.vendor = v as Vendor;
    } else if (a === "--quality=high" || a === "--high") {
      out.quality = "high";
    } else if (a === "--quality=standard") {
      out.quality = "standard";
    }
  }
  return out;
}

/** Single-clip generation routed through the video-gen lib. The
 *  lib's registry handles vendor selection (Seedance default,
 *  Sora as legacy fallback, mock for tests). The adapter pattern
 *  means swapping vendors is a one-line CLI flag. */
async function generateClip(
  vendor: Vendor,
  prompt: string,
  durationSec: 5 | 10,
  outPath: string,
  quality: "standard" | "high",
): Promise<AnyResult> {
  // Map our local Vendor type to the lib's VideoVendor type.
  const libVendor =
    vendor === "sora" ? "openai-sora" : vendor === "mock" ? "mock" : "seedance";

  const { generateClip: generateClipViaApi } = await import(
    "@/lib/video-gen"
  );
  const outDir = path.dirname(outPath);
  const filename = path.basename(outPath);
  const result = await generateClipViaApi(
    {
      prompt,
      durationSec,
      orientation: "landscape",
      quality,
    },
    outDir,
    filename,
    { vendor: libVendor },
  );
  if (result.kind === "ok") {
    let sizeBytes = 0;
    try {
      const stat = await fs.stat(result.path);
      sizeBytes = stat.size;
    } catch {
      // best-effort
    }
    return {
      kind: "ok",
      path: result.path,
      sizeBytes,
      vendorUrl: result.vendorUrl,
    };
  }
  return result;
}

async function alreadyRanToday(): Promise<boolean> {
  await fs.mkdir(MARKER_DIR, { recursive: true });
  const marker = path.join(MARKER_DIR, `spot-${todayStamp()}`);
  try {
    await fs.access(marker);
    return true;
  } catch {
    return false;
  }
}

async function writeMarker(stem: string, vehicleName: string): Promise<void> {
  await fs.mkdir(MARKER_DIR, { recursive: true });
  const marker = path.join(MARKER_DIR, `spot-${todayStamp()}`);
  await fs.writeFile(
    marker,
    JSON.stringify({ stem, vehicleName, at: new Date().toISOString() }, null, 2),
  );
}

/** Auto-vendor path. Generates 3 clips sequentially via the lib's
 *  registry (Seedance / Sora / mock). Exits the process on any
 *  failure so the day-marker doesn't get written. */
async function acquireClipsViaApi(
  storyboard: ReturnType<typeof buildStoryboard>,
  tmpDir: string,
  args: ReturnType<typeof parseArgs>,
): Promise<string[]> {
  const clipPaths: string[] = [];
  for (const shot of storyboard.shots) {
    const clipPath = path.join(tmpDir, `shot-${shot.index}.mp4`);
    console.log(
      `[daily-spot] generating shot ${shot.index}/3 (${shot.durationSec}s)…`,
    );
    const res = await generateClip(
      args.vendor,
      shot.prompt,
      shot.durationSec as 5 | 10,
      clipPath,
      args.quality,
    );
    if (res.kind === "ok") {
      console.log(
        `[daily-spot]   ok: ${(res.sizeBytes / 1024 / 1024).toFixed(1)} MB`,
      );
      clipPaths.push(clipPath);
    } else if (res.kind === "rate_limited") {
      console.error(
        `[daily-spot] rate limited by ${args.vendor}. Retry after ${res.retryAfterSec ?? "?"}s.`,
      );
      process.exit(9);
    } else if (res.kind === "not_configured") {
      console.error(
        `[daily-spot] ${args.vendor} not configured. Missing env: ${res.missingEnv.join(", ")}.\n\nFor Seedance: get a key at https://fal.ai/dashboard/keys and set FAL_KEY in .env.local.\nOr use --vendor=manual to generate clips yourself in a web UI.`,
      );
      process.exit(10);
    } else {
      console.error(`[daily-spot] error on shot ${shot.index}: ${res.error}`);
      process.exit(5);
    }
  }
  return clipPaths;
}

/** Dreamina-auto path. Drives dreamina.capcut.com via Playwright
 *  to generate the 3 clips sequentially using the user's existing
 *  $18-25/mo Dreamina sub. Sequential because Dreamina rate-limits
 *  parallel prompts on consumer accounts.
 *
 *  Pre-req: user has already signed in once via the persistent
 *  profile at ~/.ryda-marketing/dreamina-profile/. If the driver
 *  detects a login wall (cookies expired), it returns
 *  not_logged_in and we exit with a clear message.
 *
 *  Selectors are best-effort and may need iteration when Dreamina
 *  ships UI changes. The driver's helpers (waitForComposer,
 *  clickGenerate, waitForGeneratedVideo) all carry candidate
 *  selector lists — first to match wins. */
async function acquireClipsViaDreaminaAuto(
  storyboard: ReturnType<typeof buildStoryboard>,
  tmpDir: string,
): Promise<string[]> {
  // Lazy import so non-dreamina-auto runs don't pay the import
  // cost (Playwright + stealth pull in ~50MB of module code).
  const { generateClipViaDreamina } = await import("./dreamina-driver");
  const clipPaths: string[] = [];
  for (const shot of storyboard.shots) {
    const clipPath = path.join(tmpDir, `shot-${shot.index}.mp4`);
    console.log(
      `[daily-spot] dreamina-auto shot ${shot.index}/3 (${shot.durationSec}s)…`,
    );
    const res = await generateClipViaDreamina({
      prompt: shot.prompt,
      durationSec: shot.durationSec as 5 | 10,
      outPath: clipPath,
    });
    if (res.kind === "ok") {
      console.log(
        `[daily-spot]   ok: ${(res.sizeBytes / 1024 / 1024).toFixed(1)} MB`,
      );
      clipPaths.push(clipPath);
    } else if (res.kind === "not_logged_in") {
      console.error(
        `[daily-spot] Dreamina session expired. Open dreamina.capcut.com\nin the persistent profile and sign in again, then re-run.\n\nProfile: ${path.join(os.homedir(), ".ryda-marketing", "dreamina-profile")}`,
      );
      process.exit(2);
    } else if (res.kind === "out_of_credits") {
      console.error(`[daily-spot] ${res.hint}`);
      process.exit(8);
    } else if (res.kind === "timeout") {
      console.error(
        `[daily-spot] dreamina-auto timeout at stage=${res.stage} on shot ${shot.index}.\nIf this happens repeatedly, Dreamina's UI may have changed. Either:\n  - Check the selector lists in scripts/marketing/video/dreamina-driver.ts\n  - Fall back to --vendor=manual for today's spot`,
      );
      process.exit(4);
    } else {
      console.error(`[daily-spot] error on shot ${shot.index}: ${res.error}`);
      process.exit(5);
    }
  }
  return clipPaths;
}

/** Manual-vendor path. Two-step UX: first call prints the
 *  storyboard prompts + saves them to disk, then exits. The user
 *  generates the clips in any web UI (Dreamina, Sora.com, Runway,
 *  etc.) and drops them in ~/.ryda-marketing/manual-clips/<stem>/.
 *  Re-running with --resume picks them up + composes. */
async function acquireClipsManual(
  storyboard: ReturnType<typeof buildStoryboard>,
  stem: string,
  args: ReturnType<typeof parseArgs>,
): Promise<string[]> {
  const manualDir = path.join(MANUAL_CLIPS_ROOT, stem);
  await fs.mkdir(manualDir, { recursive: true });
  const expected = storyboard.shots.map((s) => ({
    shot: s,
    mp4: path.join(manualDir, `shot-${s.index}.mp4`),
  }));

  if (!args.resume) {
    // Step 1: write prompts + print copy-paste-friendly UX, then exit.
    const promptsDir = path.join(MANUAL_PROMPTS_ROOT, stem);
    await fs.mkdir(promptsDir, { recursive: true });
    for (const { shot } of expected) {
      await fs.writeFile(
        path.join(promptsDir, `shot-${shot.index}.txt`),
        shot.prompt,
      );
    }
    console.log("");
    console.log("=========================================");
    console.log("MANUAL MODE — generate clips yourself");
    console.log("=========================================");
    console.log("");
    console.log(`Stem:      ${stem}`);
    console.log(`Prompts:   ${promptsDir}`);
    console.log(`Drop MP4s: ${manualDir}`);
    console.log("");
    for (const { shot } of expected) {
      console.log(
        `--- Shot ${shot.index} (${shot.durationSec}s, overlay: "${shot.overlay}") ---`,
      );
      console.log(shot.prompt);
      console.log("");
    }
    console.log("=========================================");
    console.log("NEXT STEPS:");
    console.log("=========================================");
    console.log("1. Open Dreamina (https://dreamina.capcut.com) — or any AI video tool.");
    console.log("2. Paste each prompt above and generate (~60s/clip on Seedance).");
    console.log("3. Save the MP4s as shot-1.mp4, shot-2.mp4, shot-3.mp4 into:");
    console.log(`     ${manualDir}`);
    console.log("4. Re-run with --resume to compose the spot:");
    console.log(
      `     npm run marketing:daily-spot -- --vendor=manual --vehicle ${args.vehicleIdx ?? 0} --resume`,
    );
    console.log("");
    process.exit(0);
  }

  // Step 2 (--resume): verify all 3 MP4s are present.
  console.log(`[daily-spot] resume: checking ${manualDir}`);
  const clipPaths: string[] = [];
  const missing: string[] = [];
  for (const { shot, mp4 } of expected) {
    try {
      const stat = await fs.stat(mp4);
      console.log(
        `[daily-spot]   shot-${shot.index}.mp4 ok (${(stat.size / 1024 / 1024).toFixed(1)} MB)`,
      );
      clipPaths.push(mp4);
    } catch {
      missing.push(`shot-${shot.index}.mp4`);
    }
  }
  if (missing.length > 0) {
    console.error(
      `[daily-spot] missing clips in ${manualDir}: ${missing.join(", ")}\n\nGenerate them in your video tool of choice + drop them in that directory, then re-run.`,
    );
    process.exit(11);
  }
  return clipPaths;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.force && (await alreadyRanToday())) {
    console.log(
      `[daily-spot] today's spot already generated (marker present in ${MARKER_DIR}). Use --force to override.`,
    );
    process.exit(0);
  }

  const vehicle: SpotInput =
    args.vehicleIdx != null
      ? LAUNCH_INVENTORY[args.vehicleIdx % LAUNCH_INVENTORY.length]
      : pickTodaysVehicle();
  console.log(`[daily-spot] vehicle: ${vehicle.name} (${vehicle.vehicleType})`);
  console.log(`[daily-spot] vendor:  ${args.vendor}`);

  const storyboard = buildStoryboard(vehicle);
  const stem = `${slugify(vehicle.name)}-${todayStamp()}`;
  const tmpDir = path.join(TMP_CLIPS_ROOT, stem);
  await fs.mkdir(tmpDir, { recursive: true });

  // ---- Acquire the 3 clips. Two paths:
  //      1. API vendors (seedance/sora/mock): generate via the
  //         video-gen lib in a sequential loop.
  //      2. manual vendor: print prompts + wait for the user to
  //         drop MP4s in the manual-clips dir, then pick up via
  //         --resume on the second invocation.
  let clipPaths: string[] = [];

  if (args.vendor === "manual") {
    clipPaths = await acquireClipsManual(storyboard, stem, args);
  } else if (args.vendor === "dreamina-auto") {
    clipPaths = await acquireClipsViaDreaminaAuto(storyboard, tmpDir);
  } else {
    clipPaths = await acquireClipsViaApi(storyboard, tmpDir, args);
  }

  // Auto-vendors fall through to compose below; the manual branch
  // either exits early (step 1) or returns 3 clip paths (step 2).
  if (clipPaths.length !== 3) {
    console.error(
      `[daily-spot] expected 3 clips, got ${clipPaths.length}. Aborting before compose.`,
    );
    process.exit(7);
  }
  // -- Compose with FFmpeg.
  console.log(`[daily-spot] composing ${stem}…`);
  const compose = await composeSpot({
    clipPaths: clipPaths as [string, string, string],
    storyboard,
    outDir: OUT_DIR,
    stem,
  });
  if (compose.kind === "ffmpeg_missing") {
    console.error(
      `[daily-spot] ffmpeg-static missing. Run 'npm install' inside ryda-web/.`,
    );
    process.exit(6);
  }
  if (compose.kind !== "ok") {
    console.error(
      `[daily-spot] ffmpeg failed: ${compose.error}\n${compose.stderr ?? ""}`,
    );
    process.exit(7);
  }

  console.log(`[daily-spot] vertical: ${compose.vertical}`);
  console.log(`[daily-spot] landscape: ${compose.landscape}`);

  // -- Push to content_queue (unless --no-queue). Channel is
  //    'instagram' because IG Reels is the primary surface for
  //    short vertical video; the operator can re-channel via the
  //    admin UI before publishing.
  if (!args.noQueue) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn(
        `[daily-spot] missing Supabase env — spot rendered to disk but not queued. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or pass --no-queue to silence this.`,
      );
    } else {
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const verticalUrl = `${PUBLIC_URL_PREFIX}/${path.basename(compose.vertical)}`;
      const landscapeUrl = `${PUBLIC_URL_PREFIX}/${path.basename(compose.landscape)}`;
      const ins = await supabase.from("content_queue").insert({
        channel: "instagram",
        title: `${vehicle.name} — daily spot`,
        body: storyboard.caption,
        image_path: verticalUrl, // IG connector needs an image_path; first frame would be ideal but the URL works.
        hashtags: ["MiamiCars", "RYDA", vehicle.vehicleType === "boat" ? "MiamiBoats" : "ExoticCars"],
        metadata: {
          spot_kind: "video",
          video_vertical_url: verticalUrl,
          video_landscape_url: landscapeUrl,
          duration_sec: 15,
          vehicle: vehicle.name,
          vehicle_type: vehicle.vehicleType,
          generated_at: new Date().toISOString(),
        },
        status: "draft",
        source_file: `daily-spot/${stem}`,
      });
      if (ins.error) {
        console.error(`[daily-spot] queue insert failed: ${ins.error.message}`);
      } else {
        console.log(`[daily-spot] queued as draft (channel=instagram)`);
      }
    }
  }

  await writeMarker(stem, vehicle.name);
  console.log(`[daily-spot] done`);
}

if (process.argv[1]?.endsWith("daily-spot.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
