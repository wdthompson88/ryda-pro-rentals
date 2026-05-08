// Public types for the video-generation subsystem.
// Adapters at lib/video-gen/<vendor>.ts each implement
// VideoGenAdapter so callers stay vendor-agnostic.
//
// Today: OpenAI Sora API (sora-2, sora-2-pro). Sora web/app was
// discontinued in 2026 — only the API remains. ChatGPT Pro
// subscriptions do NOT include Sora API access; OpenAI bills it
// separately under platform.openai.com/usage (same OPENAI_API_KEY
// as gpt-image-1).
//
// Future: Runway Gen-4, Luma Dream Machine, Kling. All have REST
// APIs and slot into the same VideoGenAdapter interface.

export type VideoQuality = "standard" | "high";

export type VideoOrientation = "vertical" | "landscape" | "square";

/** Per-clip request. Used for individual 5-10s clips that the
 *  composer stitches into a longer spot. The full daily-spot
 *  pipeline calls this 3 times. */
export type GenerateClipInput = {
  prompt: string;
  /** 5 or 10 seconds. Some Sora tiers accept 20; we cap at 10
   *  for the standard 3x5s template. */
  durationSec: 5 | 10;
  /** Output orientation. Default "landscape". The composer
   *  re-frames to vertical/landscape independently, so this is
   *  mostly a hint to the model. */
  orientation?: VideoOrientation;
  /** Quality tier. "standard" → sora-2 ($0.10/sec).
   *  "high" → sora-2-pro ($0.30/sec). */
  quality?: VideoQuality;
  /** Optional brand-style preamble prepended to the prompt. */
  styleNote?: string;
};

export type GenerateClipResult =
  | {
      kind: "ok";
      /** Local file path where the MP4 was saved. */
      path: string;
      /** Vendor's signed download URL (often expiring). */
      vendorUrl: string | null;
      /** Cents charged. Estimated from quality+duration since most
       *  vendors don't return per-call cost in the API response. */
      costCents: number | null;
      /** The vendor whose adapter served this. */
      vendor: VideoVendor;
      /** Actual duration of the saved clip (vendors sometimes
       *  return slightly more or less than requested). */
      durationSec: number;
    }
  | { kind: "not_configured"; missingEnv: string[] }
  | { kind: "rate_limited"; retryAfterSec: number | null }
  | { kind: "error"; error: string };

export type VideoVendor =
  | "seedance" // ByteDance Seedance 2.0 via fal.ai (DEFAULT)
  | "openai-sora" // legacy — API discontinues 2026-09-24
  | "runway" // not wired
  | "luma" // not wired
  | "kling" // not wired
  | "mock";

export type VideoGenAdapter = {
  vendor: VideoVendor;
  isConfigured(): boolean;
  /** Generate one clip + persist to disk under outDir. Returns
   *  the local path on success. Async/poll-based vendors must
   *  block until the clip is downloaded; callers expect this
   *  to be a single await. */
  generate(
    input: GenerateClipInput,
    outDir: string,
    filename: string,
  ): Promise<GenerateClipResult>;
};
