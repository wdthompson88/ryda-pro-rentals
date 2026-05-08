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
import { generateClipViaSora } from "./sora-driver";
import { composeSpot } from "./composer";
import {
  LAUNCH_INVENTORY,
  buildStoryboard,
  pickTodaysVehicle,
  type SpotInput,
} from "./storyboard";

const MARKER_DIR = path.join(os.homedir(), ".ryda-marketing", "daily-markers");
const TMP_CLIPS_ROOT = path.join(os.homedir(), ".ryda-marketing", "clips");
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
} {
  const out = { vehicleIdx: null as number | null, force: false, noQueue: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--no-queue") out.noQueue = true;
    else if (a === "--vehicle") {
      const idx = parseInt(argv[++i] ?? "", 10);
      if (Number.isInteger(idx)) out.vehicleIdx = idx;
    }
  }
  return out;
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

  const storyboard = buildStoryboard(vehicle);
  const stem = `${slugify(vehicle.name)}-${todayStamp()}`;
  const tmpDir = path.join(TMP_CLIPS_ROOT, stem);
  await fs.mkdir(tmpDir, { recursive: true });

  // -- Generate the 3 clips. Sequential because Sora throttles
  //    per-account aggressively and parallel runs trip rate limits.
  const clipPaths: string[] = [];
  for (const shot of storyboard.shots) {
    const clipPath = path.join(tmpDir, `shot-${shot.index}.mp4`);
    console.log(
      `[daily-spot] generating shot ${shot.index}/3 (${shot.durationSec}s)…`,
    );
    const res = await generateClipViaSora({
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
        `[daily-spot] NOT LOGGED IN. Open the Playwright Chrome window and log into ChatGPT, then re-run.`,
      );
      process.exit(2);
    } else if (res.kind === "no_video_capability") {
      console.error(`[daily-spot] ${res.hint}`);
      process.exit(3);
    } else if (res.kind === "timeout") {
      console.error(
        `[daily-spot] timeout at stage=${res.stage} on shot ${shot.index}. Sora generation can take >5 min on busy days; try again in an hour.`,
      );
      process.exit(4);
    } else {
      console.error(`[daily-spot] error on shot ${shot.index}: ${res.error}`);
      process.exit(5);
    }
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
