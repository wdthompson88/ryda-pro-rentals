// Open Generative AI / MuAPI video adapters.

import "server-only";
import type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
  VideoOrientation,
  VideoQuality,
  VideoVendor,
} from "./types";
import {
  downloadMuapiAsset,
  executeMuapiWorkflow,
  isMuapiConfigured,
  runMuapiPrediction,
} from "@/lib/generative-ai/muapi";

const DEFAULT_T2V_MODEL = "seedance-v2.0-t2v";
const DEFAULT_I2V_MODEL = "seedance-v2.0-i2v";
const DEFAULT_LIPSYNC_MODEL = "ltx-2.3-lipsync";

function aspectRatio(o: VideoOrientation | undefined): string {
  switch (o) {
    case "vertical":
      return "9:16";
    case "square":
      return "1:1";
    case "landscape":
    default:
      return "16:9";
  }
}

function resolution(q: VideoQuality | undefined): string {
  return q === "high" ? "1080p" : "720p";
}

function buildPrompt(input: GenerateClipInput): string {
  if (!input.styleNote || input.styleNote.trim().length === 0) {
    return input.prompt;
  }
  return `${input.styleNote.trim()}\n\n${input.prompt}`;
}

function safeMp4Name(filename: string): string {
  return filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
}

function notConfigured(): GenerateClipResult {
  return { kind: "not_configured", missingEnv: ["MUAPI_API_KEY"] };
}

async function persist(
  outputUrl: string,
  outDir: string,
  filename: string,
  vendor: VideoVendor,
  durationSec: number,
  requestId?: string | null,
): Promise<GenerateClipResult> {
  const fullPath = await downloadMuapiAsset(outputUrl, outDir, safeMp4Name(filename));
  return {
    kind: "ok",
    path: fullPath,
    vendorUrl: outputUrl,
    requestId: requestId ?? null,
    costCents: null,
    vendor,
    durationSec,
  } as GenerateClipResult;
}

async function generateTextToVideo(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  if (!isMuapiConfigured()) return notConfigured();
  const model = input.model || process.env.RYDA_MUAPI_VIDEO_MODEL || DEFAULT_T2V_MODEL;
  const payload: Record<string, unknown> = {
    prompt: buildPrompt(input),
    aspect_ratio: aspectRatio(input.orientation),
    duration: input.durationSec,
    resolution: resolution(input.quality),
  };
  try {
    const result = await runMuapiPrediction(model, payload, { maxAttempts: 900 });
    if (!result.outputUrl) {
      return { kind: "error", error: "MuAPI video generation returned no output URL." };
    }
    return await persist(result.outputUrl, outDir, filename, "muapi-video", input.durationSec, result.requestId);
  } catch (err) {
    return {
      kind: "error",
      error: `MuAPI video error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function generateImageToVideo(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  if (!isMuapiConfigured()) return notConfigured();
  if (!input.imageUrl) {
    return { kind: "error", error: "muapi-i2v requires imageUrl." };
  }
  const model = input.model || process.env.RYDA_MUAPI_I2V_MODEL || DEFAULT_I2V_MODEL;
  const payload: Record<string, unknown> = {
    prompt: buildPrompt(input),
    image_url: input.imageUrl,
    aspect_ratio: aspectRatio(input.orientation),
    duration: input.durationSec,
    resolution: resolution(input.quality),
  };
  try {
    const result = await runMuapiPrediction(model, payload, { maxAttempts: 900 });
    if (!result.outputUrl) {
      return { kind: "error", error: "MuAPI image-to-video returned no output URL." };
    }
    return await persist(result.outputUrl, outDir, filename, "muapi-i2v", input.durationSec, result.requestId);
  } catch (err) {
    return {
      kind: "error",
      error: `MuAPI image-to-video error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function generateLipSync(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  if (!isMuapiConfigured()) return notConfigured();
  if (!input.audioUrl || (!input.imageUrl && !input.videoUrl)) {
    return {
      kind: "error",
      error: "muapi-lipsync requires audioUrl and either imageUrl or videoUrl.",
    };
  }
  const model = input.model || process.env.RYDA_MUAPI_LIPSYNC_MODEL || DEFAULT_LIPSYNC_MODEL;
  const payload: Record<string, unknown> = {
    audio_url: input.audioUrl,
    prompt: buildPrompt(input),
    resolution: resolution(input.quality),
  };
  if (input.imageUrl) payload.image_url = input.imageUrl;
  if (input.videoUrl) payload.video_url = input.videoUrl;

  try {
    const result = await runMuapiPrediction(model, payload, { maxAttempts: 900 });
    if (!result.outputUrl) {
      return { kind: "error", error: "MuAPI lip-sync returned no output URL." };
    }
    return await persist(result.outputUrl, outDir, filename, "muapi-lipsync", input.durationSec, result.requestId);
  } catch (err) {
    return {
      kind: "error",
      error: `MuAPI lip-sync error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function generateWorkflow(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  if (!isMuapiConfigured()) return notConfigured();
  const workflowId = input.workflowId || process.env.RYDA_MUAPI_WORKFLOW_ID;
  if (!workflowId) {
    return { kind: "not_configured", missingEnv: ["RYDA_MUAPI_WORKFLOW_ID"] };
  }
  try {
    const result = await executeMuapiWorkflow(workflowId, {
      prompt: buildPrompt(input),
      duration: input.durationSec,
      aspect_ratio: aspectRatio(input.orientation),
      ...(input.workflowInputs ?? {}),
    });
    if (!result.outputUrl) {
      return { kind: "error", error: "MuAPI workflow returned no output URL." };
    }
    return await persist(result.outputUrl, outDir, filename, "muapi-workflow", input.durationSec, result.runId);
  } catch (err) {
    return {
      kind: "error",
      error: `MuAPI workflow error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export const muapiVideoAdapter: VideoGenAdapter = {
  vendor: "muapi-video",
  isConfigured: isMuapiConfigured,
  generate: generateTextToVideo,
};

export const muapiImageToVideoAdapter: VideoGenAdapter = {
  vendor: "muapi-i2v",
  isConfigured: isMuapiConfigured,
  generate: generateImageToVideo,
};

export const muapiLipSyncAdapter: VideoGenAdapter = {
  vendor: "muapi-lipsync",
  isConfigured: isMuapiConfigured,
  generate: generateLipSync,
};

export const muapiWorkflowAdapter: VideoGenAdapter = {
  vendor: "muapi-workflow",
  isConfigured: isMuapiConfigured,
  generate: generateWorkflow,
};
