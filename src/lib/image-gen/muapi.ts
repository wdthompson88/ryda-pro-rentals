// Open Generative AI / MuAPI image adapters.
//
// MuAPI powers the Open Generative AI studio's 200+ model catalog.
// We wire it as RYDA's preferred marketing image provider while
// keeping the same local persistence + queue semantics as the
// existing OpenAI Images adapter.

import "server-only";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenAdapter,
  ImageSize,
} from "./types";
import {
  downloadMuapiAsset,
  isMuapiConfigured,
  runMuapiPrediction,
} from "@/lib/generative-ai/muapi";

const DEFAULT_T2I_MODEL = "qwen-image";
const DEFAULT_I2I_MODEL = "qwen-image-edit";

function aspectRatio(size: ImageSize | undefined): string {
  switch (size) {
    case "1024x1536":
      return "2:3";
    case "1536x1024":
    case "1792x1024":
      return "16:9";
    case "1024x1024":
    case "auto":
    case undefined:
    default:
      return "1:1";
  }
}

function buildPrompt(input: GenerateImageInput): string {
  if (!input.styleNote || input.styleNote.trim().length === 0) {
    return input.prompt;
  }
  return `${input.styleNote.trim()}\n\n${input.prompt}`;
}

function safePngName(filename: string): string {
  return filename.endsWith(".png") ? filename : `${filename}.png`;
}

async function generateTextToImage(
  input: GenerateImageInput,
  outDir: string,
  filename: string,
): Promise<GenerateImageResult> {
  if (!isMuapiConfigured()) {
    return { kind: "not_configured", missingEnv: ["MUAPI_API_KEY"] };
  }

  const model = input.model || process.env.RYDA_MUAPI_IMAGE_MODEL || DEFAULT_T2I_MODEL;
  const payload: Record<string, unknown> = {
    prompt: buildPrompt(input),
    aspect_ratio: aspectRatio(input.size),
    num_images: 1,
  };
  if (input.quality) payload.quality = input.quality;

  try {
    const result = await runMuapiPrediction(model, payload, { maxAttempts: 60 });
    if (!result.outputUrl) {
      return { kind: "error", error: "MuAPI image generation returned no output URL." };
    }
    const fullPath = await downloadMuapiAsset(result.outputUrl, outDir, safePngName(filename));
    return {
      kind: "ok",
      path: fullPath,
      vendorUrl: result.outputUrl,
      requestId: result.requestId,
      costCents: null,
      vendor: "muapi-image",
    };
  } catch (err) {
    return {
      kind: "error",
      error: `MuAPI image error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function generateImageToImage(
  input: GenerateImageInput,
  outDir: string,
  filename: string,
): Promise<GenerateImageResult> {
  if (!isMuapiConfigured()) {
    return { kind: "not_configured", missingEnv: ["MUAPI_API_KEY"] };
  }
  const imagesList = input.imagesList?.length ? input.imagesList : input.imageUrl ? [input.imageUrl] : [];
  if (imagesList.length === 0) {
    return {
      kind: "error",
      error: "muapi-i2i requires imageUrl or imagesList.",
    };
  }

  const model = input.model || process.env.RYDA_MUAPI_I2I_MODEL || DEFAULT_I2I_MODEL;
  const payload: Record<string, unknown> = {
    prompt: buildPrompt(input),
    aspect_ratio: aspectRatio(input.size),
    images_list: imagesList,
    image_url: imagesList[0],
  };

  try {
    const result = await runMuapiPrediction(model, payload, { maxAttempts: 60 });
    if (!result.outputUrl) {
      return { kind: "error", error: "MuAPI image edit returned no output URL." };
    }
    const fullPath = await downloadMuapiAsset(result.outputUrl, outDir, safePngName(filename));
    return {
      kind: "ok",
      path: fullPath,
      vendorUrl: result.outputUrl,
      requestId: result.requestId,
      costCents: null,
      vendor: "muapi-i2i",
    };
  } catch (err) {
    return {
      kind: "error",
      error: `MuAPI image edit error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export const muapiImageAdapter: ImageGenAdapter = {
  vendor: "muapi-image",
  isConfigured: isMuapiConfigured,
  generate: generateTextToImage,
};

export const muapiImageToImageAdapter: ImageGenAdapter = {
  vendor: "muapi-i2i",
  isConfigured: isMuapiConfigured,
  generate: generateImageToImage,
};
