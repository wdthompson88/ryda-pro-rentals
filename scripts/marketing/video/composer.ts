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
  /** Input clip paths. brand_broll: 3 paths in shot order.
   *  conversion_vo: 1 path (the full 15-sec clip with VO baked in). */
  clipPaths: string[];
  /** The storyboard whose shots produced these clips. Used for
   *  durations, overlay text, and to dispatch between the
   *  multi-clip concat pipeline (brand_broll) and the single-
   *  clip preserve-audio pipeline (conversion_vo). */
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

/** Produce both vertical and landscape spots. Dispatches by
 *  storyboard.spotType:
 *    - brand_broll:    concat 3 input clips, drop source audio,
 *                      optionally mix a music bed.
 *    - conversion_vo:  single 15-sec clip, PRESERVE source audio
 *                      (the VO baked in by Seedance/Dreamina is
 *                      the whole point of this mode), optionally
 *                      duck a music bed underneath. */
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

  // Validate clip count matches spot type.
  const expected = storyboard.spotType === "conversion_vo" ? 1 : 3;
  if (clipPaths.length !== expected) {
    return {
      kind: "error",
      error: `Expected ${expected} clip(s) for ${storyboard.spotType}, got ${clipPaths.length}.`,
    };
  }

  await fs.mkdir(outDir, { recursive: true });

  // Audio bed presence check. If the file exists, we mix it; if
  // not, brand_broll outputs silent and conversion_vo keeps only
  // the source audio (VO + ambient from the AI generation).
  let audioBed: string | null = null;
  try {
    await fs.access(DEFAULT_AUDIO);
    audioBed = DEFAULT_AUDIO;
  } catch {
    audioBed = null;
  }

  const verticalOut = path.join(outDir, `${stem}-vertical.mp4`);
  const landscapeOut = path.join(outDir, `${stem}-landscape.mp4`);

  const pipeline =
    storyboard.spotType === "conversion_vo"
      ? runSingleClipPipeline
      : runMultiClipPipeline;

  const verticalRes = await pipeline({
    clipPaths,
    storyboard,
    outPath: verticalOut,
    targetW: 1080,
    targetH: 1920,
    audioBed,
  });
  if (verticalRes.kind !== "ok") return verticalRes;

  const landscapeRes = await pipeline({
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
  clipPaths: string[];
  storyboard: Storyboard;
  outPath: string;
  targetW: number;
  targetH: number;
  audioBed: string | null;
};

/** brand_broll pipeline: concat 3 trimmed/scaled clips + drawtext
 *  overlays + fade in/out + optional music bed. Drops source audio
 *  (AI clips often have weird artifacts; cleaner to strip). */
async function runMultiClipPipeline(p: PipelineInput): Promise<ComposeResult> {
  const { clipPaths, storyboard, outPath, targetW, targetH, audioBed } = p;
  const totalSec = storyboard.totalDurationSec;
  if (storyboard.spotType !== "brand_broll") {
    return {
      kind: "error",
      error: `runMultiClipPipeline called with non-brand_broll storyboard.`,
    };
  }

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

/** conversion_vo pipeline: single 15-sec input clip with VO already
 *  baked in by Seedance/Dreamina. Preserve source audio (the VO is
 *  the whole point), optionally mix a music bed UNDER it at low
 *  volume so the VO stays intelligible.
 *
 *  Differences from runMultiClipPipeline:
 *    - 1 video input instead of 3, no concat
 *    - Source audio is preserved (input #0's audio stream)
 *    - Music bed is ducked harder (-30 dB ish) since it's
 *      sidechained against speech, not silence
 *    - Single overlay at the end instead of 3 lower-thirds */
async function runSingleClipPipeline(p: PipelineInput): Promise<ComposeResult> {
  const { clipPaths, storyboard, outPath, targetW, targetH, audioBed } = p;
  const totalSec = storyboard.totalDurationSec;
  if (storyboard.spotType !== "conversion_vo") {
    return {
      kind: "error",
      error: `runSingleClipPipeline called with non-conversion_vo storyboard.`,
    };
  }
  const shot = storyboard.shots[0];

  // -- Inputs: video clip [0], optional music bed [1].
  const inputs: string[] = ["-i", clipPaths[0]];
  if (audioBed) inputs.push("-i", audioBed);

  // -- Filter graph
  const filters: string[] = [];

  // 1. Trim to 15s, scale + crop to target aspect.
  filters.push(
    `[0:v]trim=duration=${totalSec},setpts=PTS-STARTPTS,` +
      `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,` +
      `crop=${targetW}:${targetH}[scaled]`,
  );

  // 2. Optional overlay (the storyboard puts a small "RYDA · ryda.pro"
  //    burn at the end so sound-off viewers still see the URL).
  let prevLabel = "scaled";
  if (shot.overlay) {
    const text = escapeForDrawtext(shot.overlay);
    // Show in the last 4 seconds, lower-third position.
    const start = Math.max(0, totalSec - 4);
    filters.push(
      `[${prevLabel}]drawtext=text='${text}':` +
        `fontcolor=white:fontsize=${Math.round(targetH * 0.04)}:` +
        `box=1:boxcolor=black@0.5:boxborderw=18:` +
        `x=(w-text_w)/2:y=h*0.86:` +
        `enable='between(t,${start},${totalSec})'[laid]`,
    );
    prevLabel = "laid";
  }

  // 3. Fade in/out.
  filters.push(
    `[${prevLabel}]fade=t=in:st=0:d=0.25,fade=t=out:st=${totalSec - 0.4}:d=0.4[outv]`,
  );

  // 4. Audio. Source audio is the AI-generated VO + ambient.
  //    If a bed file exists, duck it heavily (under -25 dB) so
  //    the VO remains the primary; otherwise just pass source
  //    audio through.
  let audioMap: string;
  if (audioBed) {
    // Source audio normalized so VO is consistent across spots.
    filters.push(`[0:a]atrim=duration=${totalSec},asetpts=PTS-STARTPTS,volume=1.0[srca]`);
    // Music bed at -30 dB (volume=0.05) so it sits well under speech.
    filters.push(
      `[1:a]atrim=duration=${totalSec},asetpts=PTS-STARTPTS,volume=0.05[abed]`,
    );
    // amix with duration=first to bound to the source-audio length.
    filters.push(`[srca][abed]amix=inputs=2:duration=first:dropout_transition=0[outa]`);
    audioMap = "outa";
  } else {
    filters.push(
      `[0:a]atrim=duration=${totalSec},asetpts=PTS-STARTPTS,volume=1.0[outa]`,
    );
    audioMap = "outa";
  }

  // -- Assemble argv
  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[outv]",
    "-map",
    `[${audioMap}]`,
    "-c:a",
    "aac",
    "-b:a",
    "192k", // higher than brand_broll's 128k since speech intelligibility matters
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
  ];

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
          error: `ffmpeg exited ${code} (single-clip pipeline)`,
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
