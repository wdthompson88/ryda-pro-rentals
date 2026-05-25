// daily-brief.ts — generate "morning brief" markdown for the day's
// RYDA marketing work. Designed to run once each morning, tell the
// operator everything they need to do, and stage commands for the
// follow-on work (Dreamina prompts to paste, ChatGPT image prompts,
// drop-zones for outputs, compose commands).
//
// Why this exists: trying to fully automate Dreamina + ChatGPT
// browser flows is a losing battle (Cloudflare on chatgpt.com,
// fragile selectors on Dreamina). Operator effort isn't generating
// PROMPTS (cheap to compute) — it's running the AI tools themselves
// (1-3 minutes per generation regardless of who clicks the button).
// This script eliminates the "what do I generate today?" problem so
// the operator only has to do the actual creative-tool work.
//
// Usage:
//   npm run marketing:brief
//
// Output:
//   - Prints the full brief to stdout
//   - Writes to ~/.ryda-marketing/daily-briefs/brief-YYYY-MM-DD.md
//   - Optionally opens in $EDITOR (or Preview on macOS)
//
// Brief sections:
//   1. Header (date, today's vehicle, day-of-launch countdown)
//   2. Video spot — 3 Dreamina prompts + drop-zone + compose cmd
//   3. Scheduled posts — what's queued for today by channel
//   4. Image tasks — chatgpt.com prompts for posts missing images
//   5. Queue status — drafts/scheduled/published/failed counts
//   6. Action checklist — what to do today, in order

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnvLocal } from "./env-loader";

loadDotEnvLocal();

import {
  buildStoryboard,
  pickTodaysVehicle,
  LAUNCH_INVENTORY,
  type SpotType,
} from "./video/storyboard";

const BRIEF_DIR = path.join(os.homedir(), ".ryda-marketing", "daily-briefs");
const MANUAL_CLIPS_ROOT = path.join(
  os.homedir(),
  ".ryda-marketing",
  "manual-clips",
);

// RYDA Q3 2026 Miami launch.
const LAUNCH_DATE = new Date("2026-09-15T00:00:00-04:00");

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function daysUntilLaunch(): number {
  const ms = LAUNCH_DATE.getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function parseArgs(argv: string[]): {
  vehicleIdx: number | null;
  noOpen: boolean;
  spotType: SpotType;
} {
  const out = {
    vehicleIdx: null as number | null,
    noOpen: false,
    spotType: "brand_broll" as SpotType,
  };
  const VALID_SPOT_TYPES = new Set<SpotType>([
    "brand_broll",
    "conversion_vo",
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-open") out.noOpen = true;
    else if (a === "--vehicle") {
      const idx = parseInt(argv[++i] ?? "", 10);
      if (Number.isInteger(idx)) out.vehicleIdx = idx;
    } else if (a === "--spot-type") {
      const v = (argv[++i] ?? "").toLowerCase();
      if (VALID_SPOT_TYPES.has(v as SpotType)) out.spotType = v as SpotType;
    } else if (a.startsWith("--spot-type=")) {
      const v = a.split("=")[1].toLowerCase();
      if (VALID_SPOT_TYPES.has(v as SpotType)) out.spotType = v as SpotType;
    }
  }
  return out;
}

type QueueRow = {
  id: string;
  channel: string;
  title: string | null;
  body: string;
  image_path: string | null;
  hashtags: string[];
  status: string;
  scheduled_at: string | null;
  metadata: Record<string, unknown> | null;
};

async function fetchQueue(): Promise<{
  rows: QueueRow[];
  error: string | null;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      rows: [],
      error:
        "Supabase env not set; queue sections will be empty. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("content_queue")
    .select(
      "id, channel, title, body, image_path, hashtags, status, scheduled_at, metadata",
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as QueueRow[], error: null };
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function buildBrief(opts: {
  vehicleIdx: number | null;
  queueRows: QueueRow[];
  queueError: string | null;
  date: string;
  spotType: SpotType;
}): string {
  const { vehicleIdx, queueRows, queueError, date, spotType } = opts;
  const vehicle =
    vehicleIdx != null
      ? LAUNCH_INVENTORY[vehicleIdx % LAUNCH_INVENTORY.length]
      : pickTodaysVehicle();
  const storyboard = buildStoryboard({ ...vehicle, spotType });
  const stem = `${slugify(vehicle.name)}-${date}`;
  const dropZone = path.join(MANUAL_CLIPS_ROOT, stem);
  const days = daysUntilLaunch();

  // Filter queue: scheduled-for-today, status-needs-attention, missing-image.
  const todayPosts = queueRows.filter(
    (r) =>
      isToday(r.scheduled_at) &&
      ["scheduled", "approved", "draft"].includes(r.status),
  );
  const missingImage = queueRows.filter(
    (r) =>
      !r.image_path &&
      r.channel === "instagram" &&
      ["draft", "approved", "scheduled"].includes(r.status),
  );
  const counts = {
    draft: queueRows.filter((r) => r.status === "draft").length,
    approved: queueRows.filter((r) => r.status === "approved").length,
    scheduled: queueRows.filter((r) => r.status === "scheduled").length,
    failed: queueRows.filter((r) => r.status === "failed").length,
    published: queueRows.filter((r) => r.status === "published").length,
  };

  const lines: string[] = [];
  lines.push(`# RYDA Marketing Brief — ${date}`);
  lines.push("");
  lines.push(`**Today's vehicle:** ${vehicle.name} (${vehicle.vehicleType})`);
  lines.push(`**Spot type:** \`${spotType}\` ${spotType === "conversion_vo" ? "(single 15s clip with VO baked in)" : "(3 silent clips, captions do the educational lift)"}`);
  lines.push(`**Days to Q3 launch:** ${days}`);
  lines.push("");
  if (queueError) {
    lines.push(`> ⚠️ Queue access failed: ${queueError}`);
    lines.push("");
  }

  // ---- Section 1: Today's video spot ----
  lines.push("## 1. Today's 15-second video spot");
  lines.push("");

  if (storyboard.spotType === "conversion_vo") {
    // Single-prompt brief — one 15-second clip with VO embedded.
    lines.push(
      `**Conversion spot** — single 15s prompt with off-camera narration baked in. Generate ONE clip in **Dreamina** (https://dreamina.capcut.com) — switch to **Video** mode, **enable audio**, paste the prompt below, submit. Save the result as \`spot.mp4\` into:`,
    );
    lines.push("");
    lines.push("```");
    lines.push(dropZone);
    lines.push("```");
    lines.push("");
    lines.push(`### The prompt (paste into Dreamina)`);
    lines.push("");
    lines.push("```");
    lines.push(storyboard.shots[0].prompt);
    lines.push("```");
    lines.push("");
    lines.push(`### Voice-over script (for reference / re-recording)`);
    lines.push("");
    lines.push("> " + storyboard.voScript);
    lines.push("");
    lines.push(`**After spot.mp4 is saved, run:**`);
    lines.push("");
    lines.push("```bash");
    lines.push(
      `cd /Users/odinpartners/Desktop/dev/ryda-web && npm run marketing:daily-spot -- --vendor=manual --spot-type=conversion_vo --vehicle ${vehicleIdx ?? 0} --resume`,
    );
    lines.push("```");
    lines.push("");
    lines.push(
      `Composer preserves the VO audio, optionally ducks a music bed underneath at -30 dB, burns the "RYDA · ryda.pro" overlay in the last 4 seconds, exports vertical (1080×1920) + landscape (1920×1080).`,
    );
  } else {
    // Default brand-broll: 3 separate 5-sec prompts.
    lines.push(
      `**Brand b-roll** — 3 silent clips × 5s. Caption carries the educational lift. Generate 3 clips in **Dreamina** (https://dreamina.capcut.com) — switch to **Video** mode, paste each prompt, hit the arrow to submit. Save each result as \`shot-N.mp4\` into:`,
    );
    lines.push("");
    lines.push("```");
    lines.push(dropZone);
    lines.push("```");
    lines.push("");
    for (const shot of storyboard.shots) {
      lines.push(
        `### Shot ${shot.index} (${shot.durationSec}s, overlay: "${shot.overlay}")`,
      );
      lines.push("");
      lines.push("```");
      lines.push(shot.prompt);
      lines.push("```");
      lines.push("");
    }
    lines.push("**After all 3 clips are saved, run:**");
    lines.push("");
    lines.push("```bash");
    lines.push(
      `cd /Users/odinpartners/Desktop/dev/ryda-web && npm run marketing:daily-spot -- --vendor=manual --vehicle ${vehicleIdx ?? 0} --resume`,
    );
    lines.push("```");
    lines.push("");
    lines.push(
      `Composer outputs vertical (1080×1920) + landscape (1920×1080) MP4s, drops a draft row in content_queue tagged for Instagram Reels.`,
    );
  }
  lines.push("");
  lines.push(`**Caption to use with the post:**`);
  lines.push("");
  lines.push("> " + storyboard.caption);
  lines.push("");

  // ---- Section 2: Scheduled posts today ----
  lines.push("## 2. Scheduled posts going out today");
  lines.push("");
  if (todayPosts.length === 0) {
    lines.push("> No posts scheduled for today.");
  } else {
    for (const r of todayPosts) {
      lines.push(
        `### ${r.channel.toUpperCase()} — ${r.title ?? "(no title)"} — ${fmtTime(r.scheduled_at)}`,
      );
      lines.push("");
      lines.push(`**Status:** \`${r.status}\``);
      if (r.image_path) {
        lines.push(`**Image:** \`${r.image_path}\``);
      } else if (r.channel === "instagram") {
        lines.push(`**Image:** ⚠️ MISSING (Instagram requires one)`);
      }
      if (r.hashtags?.length > 0) {
        lines.push(`**Hashtags:** ${r.hashtags.map((h) => `#${h}`).join(" ")}`);
      }
      lines.push("");
      lines.push("```");
      lines.push(r.body.slice(0, 600));
      if (r.body.length > 600) lines.push("...");
      lines.push("```");
      lines.push("");
    }
  }

  // ---- Section 3: Image tasks ----
  lines.push("## 3. Hero images needed");
  lines.push("");
  if (missingImage.length === 0) {
    lines.push(
      "> No queue rows are missing images. (Image generation also runs autonomously via OpenAI Images API if `OPENAI_API_KEY` is set.)",
    );
  } else {
    lines.push(
      `${missingImage.length} Instagram row(s) need a hero image. Generate at https://chatgpt.com (or whichever image tool you prefer); save as PNG.`,
    );
    lines.push("");
    for (const r of missingImage.slice(0, 8)) {
      const meta = r.metadata as { image_prompt?: string } | null;
      const promptText =
        meta?.image_prompt ??
        `Editorial photograph: ${r.title ?? r.body.slice(0, 100)}`;
      lines.push(`### ${r.title ?? r.body.slice(0, 60)}`);
      lines.push("");
      lines.push(`**Channel:** ${r.channel}`);
      lines.push(`**Image prompt:**`);
      lines.push("");
      lines.push("```");
      lines.push(promptText);
      lines.push("```");
      lines.push("");
      lines.push(
        `Save the image into \`ryda-web/public/marketing/generated/\` and the social cron picks it up next tick.`,
      );
      lines.push("");
    }
  }

  // ---- Section 4: Queue status ----
  lines.push("## 4. Queue status");
  lines.push("");
  lines.push(`- **Draft:** ${counts.draft}`);
  lines.push(`- **Approved (waiting to schedule):** ${counts.approved}`);
  lines.push(`- **Scheduled (waiting to publish):** ${counts.scheduled}`);
  lines.push(`- **Published (last 200 rows):** ${counts.published}`);
  lines.push(
    `- **Failed:** ${counts.failed}${counts.failed > 0 ? " ⚠️ check `/admin/content-queue?status=failed`" : ""}`,
  );
  lines.push("");

  // ---- Section 5: Action checklist ----
  lines.push("## 5. Today's checklist");
  lines.push("");
  if (storyboard.spotType === "conversion_vo") {
    lines.push(`- [ ] Generate ONE 15s clip in Dreamina with audio enabled (see Section 1)`);
    lines.push(`- [ ] Drop as \`spot.mp4\` into \`${dropZone}\``);
    lines.push(
      `- [ ] Run compose: \`npm run marketing:daily-spot -- --vendor=manual --spot-type=conversion_vo --vehicle ${vehicleIdx ?? 0} --resume\``,
    );
  } else {
    lines.push(`- [ ] Generate 3 video clips in Dreamina (see Section 1)`);
    lines.push(`- [ ] Drop clips into \`${dropZone}\``);
    lines.push(
      `- [ ] Run compose: \`npm run marketing:daily-spot -- --vendor=manual --vehicle ${vehicleIdx ?? 0} --resume\``,
    );
  }
  if (missingImage.length > 0) {
    lines.push(
      `- [ ] Generate ${missingImage.length} hero image(s) per Section 3`,
    );
  }
  if (counts.draft > 0) {
    lines.push(
      `- [ ] Review ${counts.draft} draft row(s) in /admin/content-queue, approve those ready to ship`,
    );
  }
  if (counts.failed > 0) {
    lines.push(
      `- [ ] Investigate ${counts.failed} failed row(s) in /admin/content-queue?status=failed`,
    );
  }
  lines.push(`- [ ] Spot-check today's published posts on the live channels`);
  lines.push("");

  // ---- Footer ----
  lines.push("---");
  lines.push("");
  lines.push(
    `Brief generated ${new Date().toISOString()}. Run \`npm run marketing:brief\` to regenerate (idempotent — overwrites today's brief file).`,
  );
  lines.push("");
  return lines.join("\n");
}

async function openInEditor(filePath: string): Promise<void> {
  // Try $EDITOR, then `open` on macOS, then no-op.
  const editor = process.env.EDITOR;
  const cmd = editor || (process.platform === "darwin" ? "open" : null);
  if (!cmd) return;
  await new Promise<void>((resolve) => {
    const proc = spawn(cmd, [filePath], { stdio: "ignore", detached: true });
    proc.on("error", () => resolve());
    proc.on("spawn", () => {
      proc.unref();
      resolve();
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = todayStamp();

  console.log(`[brief] generating brief for ${date}…`);

  const queue = await fetchQueue();
  if (queue.error) {
    console.warn(`[brief] queue fetch warning: ${queue.error}`);
  }

  const brief = buildBrief({
    vehicleIdx: args.vehicleIdx,
    queueRows: queue.rows,
    queueError: queue.error,
    date,
    spotType: args.spotType,
  });

  await fs.mkdir(BRIEF_DIR, { recursive: true });
  const briefPath = path.join(BRIEF_DIR, `brief-${date}.md`);
  await fs.writeFile(briefPath, brief);
  console.log(`[brief] wrote ${briefPath}`);

  // Print to console for grep-ability + copy-paste.
  console.log("");
  console.log(brief);

  if (!args.noOpen) {
    await openInEditor(briefPath);
    console.log("");
    console.log(`[brief] opened in default app. (Pass --no-open to skip.)`);
  }
}

if (process.argv[1]?.endsWith("daily-brief.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
