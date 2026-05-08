// Smoke test for the FFmpeg composer pipeline.
//
// Generates 3 synthetic clips with ffmpeg's `testsrc` (no AI calls,
// no Sora) and runs them through composeSpot to validate the
// filter graph + overlays + concat + fade pipeline end-to-end.
//
// Run:  npm run marketing:smoke-test
// Pass: ffprobe says output is ~15s, both vertical + landscape exist.
// Fail: filter graph syntax error, missing binary, malformed output.

import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import ffmpegPathImport from "ffmpeg-static";
import { composeSpot } from "../composer";
import { buildStoryboard, LAUNCH_INVENTORY } from "../storyboard";

const FFMPEG_PATH: string =
  (ffmpegPathImport as unknown as { default?: string })?.default ||
  (ffmpegPathImport as unknown as string);

async function makeSyntheticClip(outPath: string, color: string, durationSec: number) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `testsrc=duration=${durationSec}:size=1280x720:rate=30`,
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:size=1280x720:duration=${durationSec}`,
      "-filter_complex",
      "[0:v][1:v]blend=all_mode=multiply:all_opacity=0.3[outv]",
      "-map",
      "[outv]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-t",
      String(durationSec),
      outPath,
    ];
    const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (b: Buffer) => {
      stderr += b.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`testsrc gen failed: code=${code}\n${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

async function getDurationSec(filePath: string): Promise<number> {
  // Use ffmpeg itself (no ffprobe in ffmpeg-static) by parsing the
  // -i analysis output. Cheap + good-enough for a smoke test.
  return new Promise<number>((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, ["-i", filePath, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (b: Buffer) => {
      stderr += b.toString();
    });
    proc.on("close", () => {
      const m = stderr.match(/Duration:\s+(\d+):(\d+):([\d.]+)/);
      if (!m) {
        reject(new Error(`could not parse duration from ffmpeg output`));
        return;
      }
      const [, h, mi, s] = m;
      resolve(parseInt(h, 10) * 3600 + parseInt(mi, 10) * 60 + parseFloat(s));
    });
    proc.on("error", reject);
  });
}

async function main() {
  console.log("[smoke] ffmpeg path:", FFMPEG_PATH);

  const tmpDir = path.join(os.tmpdir(), "ryda-spot-smoke-" + Date.now());
  await fs.mkdir(tmpDir, { recursive: true });
  console.log(`[smoke] tmp: ${tmpDir}`);

  const clipPaths: string[] = [];
  for (let i = 0; i < 3; i++) {
    const clip = path.join(tmpDir, `synthetic-${i + 1}.mp4`);
    const color = ["red", "green", "blue"][i];
    console.log(`[smoke] generating synthetic clip ${i + 1} (${color}, 5s)…`);
    await makeSyntheticClip(clip, color, 5);
    clipPaths.push(clip);
  }

  const sb = buildStoryboard(LAUNCH_INVENTORY[0]);
  console.log(`[smoke] composing…`);
  const result = await composeSpot({
    clipPaths: clipPaths as [string, string, string],
    storyboard: sb,
    outDir: tmpDir,
    stem: "smoke-test",
  });

  if (result.kind !== "ok") {
    console.error(`[smoke] FAIL: ${result.kind}`);
    if ("error" in result) console.error(result.error);
    if ("stderr" in result) console.error(result.stderr);
    process.exit(1);
  }

  const verticalDur = await getDurationSec(result.vertical);
  const landscapeDur = await getDurationSec(result.landscape);
  console.log(
    `[smoke] vertical: ${result.vertical} (${verticalDur.toFixed(2)}s)`,
  );
  console.log(
    `[smoke] landscape: ${result.landscape} (${landscapeDur.toFixed(2)}s)`,
  );

  const within = (d: number) => d > 14.5 && d < 15.6;
  if (!within(verticalDur) || !within(landscapeDur)) {
    console.error(
      `[smoke] FAIL: durations out of range. Expected ~15s; got vertical=${verticalDur}, landscape=${landscapeDur}`,
    );
    process.exit(1);
  }

  console.log(`[smoke] PASS — full pipeline works end to end`);

  // Clean up the smoke artifacts; they're not useful past this point.
  await fs.rm(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
