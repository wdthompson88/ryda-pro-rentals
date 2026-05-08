// Mock image-gen adapter for tests + local dev when OPENAI_API_KEY
// isn't set. Writes a tiny PNG (1x1 transparent pixel) to outDir
// so downstream code that expects a real file on disk doesn't trip.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenAdapter,
} from "./types";

// 1x1 transparent PNG, base64-encoded. Smallest valid PNG payload.
const ONE_BY_ONE_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function isConfigured(): boolean {
  // Always configured — the mock has no env requirement. Used as
  // the dev fallback so /api/admin/generate-image returns ok in
  // local environments without burning OpenAI credits.
  return true;
}

async function generate(
  _input: GenerateImageInput,
  outDir: string,
  filename: string,
): Promise<GenerateImageResult> {
  const safeName = filename.endsWith(".png") ? filename : `${filename}.png`;
  const fullPath = path.join(outDir, safeName);
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(fullPath, Buffer.from(ONE_BY_ONE_PNG_B64, "base64"));
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
  };
}

export const mockImageAdapter: ImageGenAdapter = {
  vendor: "mock",
  isConfigured,
  generate,
};
