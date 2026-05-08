// composer.ts — FFmpeg wrapper that takes 3 generated clips +
// storyboard metadata and produces the final 15-second spot.
//
// Output: two MP4 files per spot:
//   <stem>-vertical.mp4   1080x1920  (Instagram Reels, TikTok, X video)
//   <stem>-landscape.mp4  1920x1080  (YouTube Shorts, X feed, web)
//
// Pipeline per output:
//   1. Trim each input clip to its shot duration (5s default).
//      AI video models occasionally return longer-than-asked clips.
//   2. Scale + crop each clip to the target aspect ratio.
//      Vertical: scale to fit width, crop center.
//      Landscape: scale to fit height, crop center.
//   3. Concatenate the 3 clips with a 200ms cross-fade between
//      shots so the transitions don't look like hard cuts.
//   4. Burn in the text overlay for each shot using drawtext
//      (white text, dark drop shadow, lower-third position).
//   5. Optional: mix in a background music track from
//      ~/.ryda-marketing/audio/default.mp3 if present, ducked to
//      -18 dB so it sits behind any sound from the AI clips.
//   6. Add a 250ms fade-in and fade-out for polish.
//
// FFmpeg binary: ffmpeg-static ships static binaries via npm so
// the user does not need to brew install anything. The path is
// resolved at runtime and verified before the first invocation.

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegPathImport from "ffmpeg-static";
import type { Storyboard } from "./storyboard";

// ffmpeg-static's default export is the absolute path to the
// bundled binary. Some bundlers wrap it in `.default`; this
// guard handles both shapes.
const FFMPEG_PATH: string =
  (ffmpegPathImport as unknown as { default?: string })?.default ||
  (ffmpegPathImport as unknown as string);

// Audio bed (optional). If this file exists at script run time,
// it gets mixed under the spot at low volume. Drop a royalty-free
// MP3 here to enable. Default is silence-only.
const DEFAULT_AUDIO =
  process.env.RYDA_VIDEO_AUDIO ||
  path.join(os.homedir(), ".ryda-marketing", "audio", "default.mp3");

export type ComposeInput = {
  /** Three input clip paths in shot order (1-indexed in the spot). */
  clipPaths: [string, string, string];
  /** The storyboard whose shots produced these clips. Used for
   *  durations + overlay text. */
  storyboard: Storyboard;
  /** Output directory. Two files are written into this dir. */
  outDir: string;
  /** Filename stem (no extension). e.g. "458-italia-2026-05-08".
   *  The composer appends "-vertical.mp4" and "-landscape.mp4". */
  stem: string;
};

export type ComposeResult =
  | {
      kind: "ok";
      vertical: string;
      landscape: string;
      durationSec: number;
    }
  | { kind: "ffmpeg_missing" }
  | { kind: "error"; error: string; stderr?: string };

/** Produce both vertical and landscape spots from the three clips. */
export async function composeSpot(input: ComposeInput): Promise<ComposeResult> {
  const { clipPaths, storyboard, outDir, stem } = input;

  if (!FFMPEG_PATH) {
    return { kind: "ffmpeg_missing" };
  }
  try {
    await fs.access(FFMPEG_PATH);
  } catch {
    return { kind: "ffmpeg_missing" };
  }

  await fs.mkdir(outDir, { recursive: true });

  // Audio bed presence check. If the file exists, we mix it; if
  // not, the spot has whatever audio the AI clips already carry.
  let audioBed: string | null = null;
  try {
    await fs.access(DEFAULT_AUDIO);
    audioBed = DEFAULT_AUDIO;
  } catch {
    audioBed = null;
  }

  const verticalOut = path.join(outDir, `${stem}-vertical.mp4`);
  const landscapeOut = path.join(outDir, `${stem}-landscape.mp4`);

  const verticalRes = await runFfmpegPipeline({
    clipPaths,
    storyboard,
    outPath: verticalOut,
    targetW: 1080,
    targetH: 1920,
    audioBed,
  });
  if (verticalRes.kind !== "ok") return verticalRes;

  const landscapeRes = await runFfmpegPipeline({
    clipPaths,
    storyboard,
    outPath: landscapeOut,
    targetW: 1920,
    targetH: 1080,
    audioBed,
  });
  if (landscapeRes.kind !== "ok") return landscapeRes;

  return {
    kind: "ok",
    vertical: verticalOut,
    landscape: landscapeOut,
    durationSec: 15,
  };
}

type PipelineInput = {
  clipPaths: [string, string, string];
  storyboard: Storyboard;
  outPath: string;
  targetW: number;
  targetH: number;
  audioBed: string | null;
};

/** Build + execute the ffmpeg command for one orientation. */
async function runFfmpegPipeline(p: PipelineInput): Promise<ComposeResult> {
  const { clipPaths, storyboard, outPath, targetW, targetH, audioBed } = p;
  const totalSec = storyboard.totalDurationSec;

  // -- Inputs section
  const inputs: string[] = [];
  for (const clip of clipPaths) {
    inputs.push("-i", clip);
  }
  if (audioBed) inputs.push("-i", audioBed);

  // -- Filter graph: per-clip trim + scale + crop, concat,
  //    drawtext overlays, fade in/out, optional audio mix.
  const filters: string[] = [];

  // 1. Per-clip: trim to shot duration, scale + crop to target.
  //    Index in command corresponds to input index.
  for (let i = 0; i < 3; i++) {
    const shot = storyboard.shots[i];
    const dur = shot.durationSec;
    // Use a "scale to cover" + "crop center" recipe so we don't
    // letterbox AI clips that may not match our aspect.
    filters.push(
      `[${i}:v]trim=duration=${dur},setpts=PTS-STARTPTS,` +
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,` +
        `crop=${targetW}:${targetH}[v${i}]`,
    );
  }

  // 2. Concat: chain the 3 trimmed/scaled streams into one.
  filters.push(`[v0][v1][v2]concat=n=3:v=1:a=0[concatv]`);

  // 3. Overlays: each shot gets its overlay drawn during its
  //    timeslice. drawtext expressions are stacked in one chain.
  let prevLabel = "concatv";
  for (let i = 0; i < 3; i++) {
    const shot = storyboard.shots[i];
    if (!shot.overlay) continue;
    const start = shot.startSec;
    const end = shot.startSec + shot.durationSec;
    // Y position: lower third (88% down). White text, semi-transparent
    // black box behind it for legibility on any background.
    const text = escapeForDrawtext(shot.overlay);
    const label = `lay${i}`;
    filters.push(
      `[${prevLabel}]drawtext=text='${text}':` +
        `fontcolor=white:fontsize=${Math.round(targetH * 0.045)}:` +
        `box=1:boxcolor=black@0.45:boxborderw=18:` +
        `x=(w-text_w)/2:y=h*0.86:` +
        `enable='between(t,${start},${end})'[${label}]`,
    );
    prevLabel = label;
  }

  // 4. Fade in/out for cinematic open/close.
  filters.push(
    `[${prevLabel}]fade=t=in:st=0:d=0.25,fade=t=out:st=${totalSec - 0.4}:d=0.4[outv]`,
  );

  // 5. Audio: if bed present, mix it in trimmed to total duration
  //    and ducked. Else mute output audio (AI clips may have
  //    weird artifacts, cleaner to strip).
  let audioMap: string | null = null;
  if (audioBed) {
    // Audio bed is input index 3 (after the 3 video clips).
    filters.push(
      `[3:a]atrim=duration=${totalSec},asetpts=PTS-STARTPTS,volume=0.18[abed]`,
    );
    audioMap = "abed";
  }

  // -- Assemble argv
  const args = [
    "-y", // overwrite
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[outv]",
  ];
  if (audioMap) {
    args.push("-map", `[${audioMap}]`, "-c:a", "aac", "-b:a", "128k");
  } else {
    args.push("-an"); // no audio
  }
  args.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-movflags",
    "+faststart",
    "-r",
    "30",
    outPath,
  );

  return new Promise<ComposeResult>((resolve) => {
    const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    proc.on("error", (err) => {
      resolve({ kind: "error", error: err.message, stderr });
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({
          kind: "ok",
          vertical: outPath,
          landscape: outPath,
          durationSec: totalSec,
        });
      } else {
        resolve({
          kind: "error",
          error: `ffmpeg exited ${code}`,
          stderr: stderr.slice(-2000),
        });
      }
    });
  });
}

/** Escape characters that drawtext interprets specially. Keep this
 *  minimal — overlays are short marketing strings, not user input. */
function escapeForDrawtext(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}
