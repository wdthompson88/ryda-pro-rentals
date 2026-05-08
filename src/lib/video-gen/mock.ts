// Mock video-gen adapter for tests + local dev.
// Writes a tiny 1-second silent MP4 to disk so downstream code
// (composer, queue insert) can exercise the full pipeline without
// hitting the OpenAI API.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
} from "./types";

// Smallest possible valid MP4 — a 1-frame 1x1 black H.264 video,
// pre-encoded with ffmpeg and base64-stored here. Not playable in
// Quicktime (1 frame is too short) but ffprobe + most NLEs accept it.
// For tests/dev only; never produced in prod.
const TINY_MP4_B64 =
  "AAAAGGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAB1tZGF0AAAAGGZ0eXBpc29tAAACAGlzb21pc28y";

function isConfigured(): boolean {
  return true;
}

async function generate(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  const safeName = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
  const fullPath = path.join(outDir, safeName);
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(fullPath, Buffer.from(TINY_MP4_B64, "base64"));
  } catch (err) {
    return {
      kind: "error",
      error: `Mock adapter failed to persist: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  return {
    kind: "ok",
    path: fullPath,
    vendorUrl: null,
    costCents: 0,
    vendor: "mock",
    durationSec: input.durationSec,
  };
}

export const mockVideoAdapter: VideoGenAdapter = {
  vendor: "mock",
  isConfigured,
  generate,
};
