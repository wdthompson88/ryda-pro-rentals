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
import { openAiSoraAdapter } from "./openai-sora";
import { mockVideoAdapter } from "./mock";

export type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
  VideoQuality,
  VideoOrientation,
  VideoVendor,
} from "./types";

const REGISTRY: Record<VideoVendor, VideoGenAdapter | null> = {
  "openai-sora": openAiSoraAdapter,
  // Placeholders so callers can opt into a future adapter by name
  // without TS complaining. When the adapter ships, register it here.
  runway: null,
  luma: null,
  mock: mockVideoAdapter,
};

/** Return the first adapter whose isConfigured() is true, in
 *  preference order. Mock is excluded — production must fail
 *  loudly when no real vendor is wired. */
export function getDefaultAdapter(): VideoGenAdapter | null {
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
    return {
      kind: "not_configured",
      missingEnv: ["OPENAI_API_KEY"],
    };
  }
  if (!adapter.isConfigured()) {
    return {
      kind: "not_configured",
      missingEnv:
        adapter.vendor === "openai-sora"
          ? ["OPENAI_API_KEY"]
          : [`${adapter.vendor.toUpperCase()}_API_KEY`],
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
