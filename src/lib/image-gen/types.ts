// Public types for the image-generation subsystem.
// Adapters at lib/image-gen/<vendor>.ts each implement
// ImageGenAdapter so the calling code is vendor-agnostic.
// Today: OpenAI Images (gpt-image-1). Future: Recraft, Stability,
// Midjourney (when they ship API).

export type ImageQuality = "low" | "medium" | "high";

export type ImageSize =
  | "1024x1024"
  | "1024x1536" // portrait
  | "1536x1024" // landscape (use for 16:9 hero, slight pad)
  | "1792x1024" // wider
  | "auto";

export type GenerateImageInput = {
  prompt: string;
  /** Optional brand-style reference. Adapters may interpret as
   *  prepend or as a separate style param depending on API. */
  styleNote?: string;
  /** Output dimensions. Default is 1536x1024 (cinematic 16:9-ish). */
  size?: ImageSize;
  /** Generation quality / token cost. Default 'medium'. */
  quality?: ImageQuality;
  /** Optional seed-style identifier for caching/dedup. */
  brandHash?: string;
  /** Optional Open Generative AI / MuAPI model endpoint override. */
  model?: string;
  /** Optional reference image URL for image-to-image/edit models. */
  imageUrl?: string;
  /** Optional multi-reference image URLs for omni/style/reference models. */
  imagesList?: string[];
};

export type GenerateImageResult =
  | {
      kind: "ok";
      /** Local file path where we wrote the PNG/WebP. */
      path: string;
      /** Vendor's response url (often expiring) for reference. */
      vendorUrl: string | null;
      /** Vendor request/prediction id for audit and polling traceability. */
      requestId?: string | null;
      /** Cents charged by the vendor (best-effort; some vendors
       *  don't surface per-call cost). */
      costCents: number | null;
      /** The vendor whose adapter served this. */
      vendor: ImageVendor;
    }
  | { kind: "not_configured"; missingEnv: string[] }
  | { kind: "error"; error: string };

export type ImageGenAdapter = {
  vendor: ImageVendor;
  isConfigured(): boolean;
  /** Generate one image + persist to disk under outDir. Returns
   *  the local path on success. */
  generate(
    input: GenerateImageInput,
    outDir: string,
    filename: string,
  ): Promise<GenerateImageResult>;
};

export type ImageVendor =
  | "muapi-image"
  | "muapi-i2i"
  | "openai-images"
  | "recraft"
  | "stability"
  | "mock";
