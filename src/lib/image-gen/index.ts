// Public entrypoint for the image-generation subsystem.
//
// Today: only OpenAI Images (gpt-image-1) is wired. Future vendors
// (Recraft, Stability) can register here without callers having to
// know which provider served the image.
//
// Selection order:
//   1. Caller's explicit `vendor` choice (e.g. "openai-images")
//   2. First adapter whose isConfigured() returns true
//   3. Mock adapter (always configured) — only if explicitly opted in
//      via vendor:"mock", or in test env. We don't fall back to mock
//      automatically in production because silently writing a 1x1 PNG
//      where ops expects a real hero image is a worse failure mode
//      than returning not_configured.

import "server-only";
import type {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenAdapter,
  ImageVendor,
} from "./types";
import { openAiImagesAdapter } from "./openai-images";
import { mockImageAdapter } from "./mock";
import { muapiImageAdapter, muapiImageToImageAdapter } from "./muapi";

export type {
  GenerateImageInput,
  GenerateImageResult,
  ImageGenAdapter,
  ImageQuality,
  ImageSize,
  ImageVendor,
} from "./types";

const REGISTRY: Record<ImageVendor, ImageGenAdapter | null> = {
  "muapi-image": muapiImageAdapter,
  "muapi-i2i": muapiImageToImageAdapter,
  "openai-images": openAiImagesAdapter,
  // Not wired yet; placeholder so callers can opt into a future
  // adapter by name without TS complaining.
  recraft: null,
  stability: null,
  mock: mockImageAdapter,
};

/** Return the first adapter whose isConfigured() is true, in
 *  preference order. Mock is excluded so production doesn't
 *  silently fall through to a 1x1 PNG. */
export function getDefaultAdapter(): ImageGenAdapter | null {
  if (muapiImageAdapter.isConfigured()) return muapiImageAdapter;
  if (openAiImagesAdapter.isConfigured()) return openAiImagesAdapter;
  return null;
}

/** Look up a specific adapter by name. */
export function getAdapter(vendor: ImageVendor): ImageGenAdapter | null {
  return REGISTRY[vendor] ?? null;
}

/** Generate a single image. Picks the adapter via:
 *    1. options.vendor if provided
 *    2. getDefaultAdapter()
 *    3. fail with not_configured listing what's missing.
 */
export async function generateImage(
  input: GenerateImageInput,
  outDir: string,
  filename: string,
  options?: { vendor?: ImageVendor },
): Promise<GenerateImageResult> {
  const adapter =
    (options?.vendor ? getAdapter(options.vendor) : null) ??
    getDefaultAdapter();
  if (!adapter) {
    return {
      kind: "not_configured",
      missingEnv: ["MUAPI_API_KEY", "OPENAI_API_KEY"],
    };
  }
  if (!adapter.isConfigured()) {
    // Caller asked for a specific vendor that isn't configured.
    // Surface the missing env explicitly so ops knows what to wire.
    return {
      kind: "not_configured",
      missingEnv:
        adapter.vendor === "muapi-image" || adapter.vendor === "muapi-i2i"
          ? ["MUAPI_API_KEY"]
          : adapter.vendor === "openai-images"
          ? ["OPENAI_API_KEY"]
          : [`${adapter.vendor.toUpperCase()}_API_KEY`],
    };
  }
  return adapter.generate(input, outDir, filename);
}

/** Status snapshot for the admin UI: which image vendors are
 *  configured? Returned alongside the social connector status so
 *  ops sees at a glance whether image-generating routes will work. */
export function imageVendorStatus(): {
  vendor: ImageVendor;
  configured: boolean;
}[] {
  return (Object.keys(REGISTRY) as ImageVendor[]).map((vendor) => {
    const adapter = REGISTRY[vendor];
    return {
      vendor,
      configured: adapter ? adapter.isConfigured() : false,
    };
  });
}
