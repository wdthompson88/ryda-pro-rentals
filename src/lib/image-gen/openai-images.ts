// OpenAI Images adapter (gpt-image-1).
//
// Used by /api/admin/generate-image and ad-hoc CLI scripts to
// produce hero artwork for content_queue rows (Instagram captions,
// journal hero images, social card backgrounds).
//
// Auth: a regular OpenAI **API** key (sk-proj-...). NOT a ChatGPT
// Pro / Plus subscription — those grant chatgpt.com web access only.
// Get the API key from https://platform.openai.com/api-keys after
// adding billing at https://platform.openai.com/settings/organization/billing.
//
// Required env:
//   OPENAI_API_KEY — OpenAI API key with image generation access.
//
// Optional env:
//   OPENAI_ORG_ID  — pass through to OpenAI-Organization header
//                    if you're scoping spend to a specific org.
//
// Pricing (as of 2026, gpt-image-1, USD per image):
//   low      1024x1024  $0.011    1024x1536 / 1536x1024  $0.016
//   medium   1024x1024  $0.042    1024x1536 / 1536x1024  $0.063
//   high     1024x1024  $0.167    1024x1536 / 1536x1024  $0.25
//
// We surface costCents from a static lookup; OpenAI doesn't return
// per-call cost in the response. Adjust if pricing changes.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenAdapter,
  ImageQuality,
  ImageSize,
} from "./types";

const ENDPOINT = "https://api.openai.com/v1/images/generations";
const MODEL = "gpt-image-1";

// Cost lookup in cents (rounded to nearest cent for cost tracking,
// since the queue's cost column is integer cents).
const COST_CENTS: Record<ImageQuality, Record<ImageSize, number>> = {
  low: {
    "1024x1024": 1,
    "1024x1536": 2,
    "1536x1024": 2,
    "1792x1024": 2,
    auto: 2,
  },
  medium: {
    "1024x1024": 4,
    "1024x1536": 6,
    "1536x1024": 6,
    "1792x1024": 6,
    auto: 6,
  },
  high: {
    "1024x1024": 17,
    "1024x1536": 25,
    "1536x1024": 25,
    "1792x1024": 25,
    auto: 25,
  },
};

function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** OpenAI's Images API only accepts a fixed set of size strings.
 *  We map our wider ImageSize union (which covers Stability + Recraft
 *  too) down to what gpt-image-1 supports. 1792x1024 is silently
 *  swapped to 1536x1024 since OpenAI doesn't ship that aspect ratio
 *  on this model. */
function toOpenAiSize(size: ImageSize | undefined): string {
  switch (size) {
    case "1024x1024":
      return "1024x1024";
    case "1024x1536":
      return "1024x1536";
    case "1536x1024":
    case "1792x1024":
      return "1536x1024";
    case "auto":
    case undefined:
      return "auto";
    default:
      return "auto";
  }
}

function buildPrompt(input: GenerateImageInput): string {
  // RYDA voice + brand-style note prepended so every image trends
  // toward the same quiet-luxury aesthetic. Operator can override
  // by leaving styleNote blank — the prompt then runs as-is.
  if (!input.styleNote || input.styleNote.trim().length === 0) {
    return input.prompt;
  }
  return `${input.styleNote.trim()}\n\n${input.prompt}`;
}

async function generate(
  input: GenerateImageInput,
  outDir: string,
  filename: string,
): Promise<GenerateImageResult> {
  if (!isConfigured()) {
    return { kind: "not_configured", missingEnv: ["OPENAI_API_KEY"] };
  }

  const apiKey = process.env.OPENAI_API_KEY!;
  const orgId = process.env.OPENAI_ORG_ID;
  const quality: ImageQuality = input.quality ?? "medium";
  const size = input.size ?? "1536x1024";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (orgId) headers["OpenAI-Organization"] = orgId;

  const body = {
    model: MODEL,
    prompt: buildPrompt(input),
    n: 1,
    size: toOpenAiSize(size),
    quality, // "low" | "medium" | "high"
    // gpt-image-1 returns base64 by default (no expiring URL),
    // so we set response_format explicitly to b64_json. We persist
    // to disk and discard the base64 immediately.
    response_format: "b64_json",
  };

  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      kind: "error",
      error: `OpenAI Images network error: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!resp.ok) {
    const text = await resp.text();
    return {
      kind: "error",
      error: `OpenAI Images ${resp.status}: ${text.slice(0, 300)}`,
    };
  }

  let json: {
    data?: { b64_json?: string; url?: string }[];
  };
  try {
    json = (await resp.json()) as typeof json;
  } catch (err) {
    return {
      kind: "error",
      error: `OpenAI Images returned non-JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const first = json.data?.[0];
  if (!first?.b64_json) {
    return {
      kind: "error",
      error: "OpenAI Images returned no image data (missing b64_json).",
    };
  }

  // Persist to disk. Caller owns outDir + filename so we keep this
  // adapter dumb: no naming policy, no path canonicalization
  // beyond a mkdir -p so writing to a fresh subdir works.
  const safeName = filename.endsWith(".png") ? filename : `${filename}.png`;
  const fullPath = path.join(outDir, safeName);

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(fullPath, Buffer.from(first.b64_json, "base64"));
  } catch (err) {
    return {
      kind: "error",
      error: `Failed to persist image to ${fullPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  return {
    kind: "ok",
    path: fullPath,
    vendorUrl: first.url ?? null,
    costCents: COST_CENTS[quality][size] ?? null,
    vendor: "openai-images",
  };
}

export const openAiImagesAdapter: ImageGenAdapter = {
  vendor: "openai-images",
  isConfigured,
  generate,
};
