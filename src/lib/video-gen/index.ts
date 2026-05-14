// Public entrypoint for the video-generation subsystem.
//
// Today: OpenAI Sora API (sora-2 / sora-2-pro). Future vendors
// (Runway Gen-4, Luma Dream Machine, Kling) register here without
// callers needing to know which provider served a clip.
//
// Selection order:
//   1. Caller's explicit `vendor` choice
//   2. First adapter whose isConfigured() is true (i.e. has env wired)
//   3. Mock adapter — only when explicitly opted in via vendor:"mock"
//      or in test environments. NEVER auto-fallback to mock in
//      production: silently writing a 1-frame MP4 where ops expects
//      a real spot is a worse failure mode than honest not_configured.

import "server-only";
import type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
  VideoVendor,
} from "./types";
import { seedanceAdapter } from "./seedance";
import { openAiSoraAdapter } from "./openai-sora";
import { mockVideoAdapter } from "./mock";
import {
  muapiImageToVideoAdapter,
  muapiLipSyncAdapter,
  muapiVideoAdapter,
  muapiWorkflowAdapter,
} from "./muapi";

export type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
  VideoQuality,
  VideoOrientation,
  VideoVendor,
} from "./types";

const REGISTRY: Record<VideoVendor, VideoGenAdapter | null> = {
  "muapi-video": muapiVideoAdapter,
  "muapi-i2v": muapiImageToVideoAdapter,
  "muapi-lipsync": muapiLipSyncAdapter,
  "muapi-workflow": muapiWorkflowAdapter,
  // Default. ByteDance Seedance 2.0 via fal.ai. ~10x cheaper than
  // Sora at equivalent quality, no API death clock, strong physics
  // on reflective surfaces (cars, boats, glass).
  seedance: seedanceAdapter,
  // Legacy. OpenAI announced March 2026 that the Sora API will
  // discontinue 2026-09-24. We keep the adapter wired through the
  // shutdown date so existing OPENAI_API_KEY-only setups still work,
  // but the default adapter no longer prefers it.
  "openai-sora": openAiSoraAdapter,
  // Placeholders so callers can opt into a future adapter by name
  // without TS complaining. When the adapter ships, register it here.
  runway: null,
  luma: null,
  kling: null,
  mock: mockVideoAdapter,
};

/** Return the first adapter whose isConfigured() is true, in
 *  preference order. Mock is excluded — production must fail
 *  loudly when no real vendor is wired.
 *  Order: Seedance (FAL_KEY) > Sora (OPENAI_API_KEY, legacy). */
export function getDefaultAdapter(): VideoGenAdapter | null {
  if (muapiVideoAdapter.isConfigured()) return muapiVideoAdapter;
  if (seedanceAdapter.isConfigured()) return seedanceAdapter;
  if (openAiSoraAdapter.isConfigured()) return openAiSoraAdapter;
  return null;
}

export function getAdapter(vendor: VideoVendor): VideoGenAdapter | null {
  return REGISTRY[vendor] ?? null;
}

/** Generate a single clip. Picks the adapter via:
 *    1. options.vendor if provided
 *    2. getDefaultAdapter()
 *    3. fail with not_configured listing the missing env. */
export async function generateClip(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
  options?: { vendor?: VideoVendor },
): Promise<GenerateClipResult> {
  const adapter =
    (options?.vendor ? getAdapter(options.vendor) : null) ??
    getDefaultAdapter();
  if (!adapter) {
    // MuAPI is the preferred Open Generative AI path. FAL/OpenAI
    // remain supported fallbacks for existing setups.
    return {
      kind: "not_configured",
      missingEnv: ["MUAPI_API_KEY", "FAL_KEY", "OPENAI_API_KEY"],
    };
  }
  if (!adapter.isConfigured()) {
    const envByVendor: Record<string, string> = {
      "muapi-video": "MUAPI_API_KEY",
      "muapi-i2v": "MUAPI_API_KEY",
      "muapi-lipsync": "MUAPI_API_KEY",
      "muapi-workflow": "MUAPI_API_KEY",
      seedance: "FAL_KEY",
      "openai-sora": "OPENAI_API_KEY",
      runway: "RUNWAY_API_KEY",
      luma: "LUMA_API_KEY",
      kling: "KLING_API_KEY",
    };
    return {
      kind: "not_configured",
      missingEnv: [envByVendor[adapter.vendor] ?? `${adapter.vendor.toUpperCase()}_API_KEY`],
    };
  }
  return adapter.generate(input, outDir, filename);
}

export function videoVendorStatus(): {
  vendor: VideoVendor;
  configured: boolean;
}[] {
  return (Object.keys(REGISTRY) as VideoVendor[]).map((vendor) => {
    const adapter = REGISTRY[vendor];
    return {
      vendor,
      configured: adapter ? adapter.isConfigured() : false,
    };
  });
}
