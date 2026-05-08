// ByteDance Seedance 2.0 adapter via fal.ai.
//
// Why this exists: as of May 2026, Sora's API has a death clock
// (Sept 24, 2026) and OpenAI is winding the entire video product
// down. Seedance 2.0 is ByteDance's flagship video model and
// available via fal.ai's queue API. fal.ai is the official
// integration partner; consumer access is via Dreamina/CapCut,
// enterprise via Volcengine — but for a Node/Vercel pipeline,
// fal.ai is the cleanest REST endpoint with TypeScript-friendly
// async patterns and pay-as-you-go billing (no monthly minimum).
//
// Costs (May 2026, USD via fal.ai third-party hosting):
//   720p, 5s clip   ~$0.05    (15s spot = ~$0.15, daily = ~$4.50/mo)
//   720p, 10s clip  ~$0.10
//   1080p Pro, 5s   ~$0.15-0.20  (15s spot = ~$0.50, daily = ~$15/mo)
//
// Roughly 10x cheaper than Sora 2 at equivalent resolution, with
// comparable cinematic quality and notably stronger physics on
// reflective surfaces (cars, boats, glass) per independent
// benchmarks.
//
// Watermark policy: Seedance 2.0 paid output has NO visible
// watermark. ByteDance embeds an INVISIBLE C2PA-style metadata
// tag for AI-content tracing — invisible to viewers, detectable
// by C2PA-aware tools. RYDA's marketing isn't pretending to be
// hand-shot footage so this is benign.
//
// API shape (fal.ai queue pattern):
//   POST /fal-ai/bytedance/seedance-2.0/text-to-video
//        Body: { prompt, resolution, duration, aspect_ratio, generate_audio }
//        Returns: { request_id, status_url, response_url }
//   GET  {status_url}      → { status: IN_QUEUE | IN_PROGRESS | COMPLETED | ERROR }
//   GET  {response_url}    → { video: { url } } when completed
//
// Auth header: `Authorization: Key {FAL_KEY}`. Get a key at
// https://fal.ai/dashboard/keys; pay-as-you-go billing.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
  VideoOrientation,
  VideoQuality,
} from "./types";

const FAL_QUEUE_BASE =
  process.env.FAL_QUEUE_BASE || "https://queue.fal.run";
const MODEL_PATH = "fal-ai/bytedance/seedance-2.0/text-to-video";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_MS = 5 * 60_000; // Seedance is fast: typical 40-60s for 5s clip

// fal.ai pricing as of May 2026. We surface a per-call cost
// estimate; fal returns billing details on the response but doesn't
// always include cents-per-call in a stable field.
const COST_CENTS_PER_SEC: Record<VideoQuality, number> = {
  standard: 1, // ~$0.01/sec at 720p
  high: 4, // ~$0.04/sec at 1080p Pro
};

/** Map our VideoOrientation to Seedance's aspect_ratio strings. */
function toAspectRatio(o: VideoOrientation | undefined): string {
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

function isConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

function authHeaders(): Record<string, string> {
  // fal.ai's auth scheme is `Key <api_key>`, not Bearer.
  return {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "Content-Type": "application/json",
  };
}

function buildPrompt(input: GenerateClipInput): string {
  if (!input.styleNote || input.styleNote.trim().length === 0) {
    return input.prompt;
  }
  return `${input.styleNote.trim()}\n\n${input.prompt}`;
}

type SubmitResponse = {
  request_id?: string;
  status_url?: string;
  response_url?: string;
  // fal sometimes returns errors inline:
  detail?: string;
};

type StatusResponse = {
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "ERROR" | string;
  queue_position?: number;
  detail?: string;
};

type ResultResponse = {
  video?: { url?: string };
  // Some endpoints wrap output:
  output?: { video?: { url?: string } };
  detail?: string;
};

/** POST a generation job. Returns the queue URLs on success. */
async function submitJob(
  input: GenerateClipInput,
): Promise<
  | { ok: true; statusUrl: string; responseUrl: string; requestId: string }
  | { ok: false; error: string; transient: boolean }
> {
  const quality: VideoQuality = input.quality ?? "standard";
  const resolution = quality === "high" ? "1080p" : "720p";

  const body = {
    prompt: buildPrompt(input),
    resolution,
    duration: String(input.durationSec), // fal expects string for the duration enum
    aspect_ratio: toAspectRatio(input.orientation),
    // We never want native audio in Seedance output — the composer
    // mixes a music bed in post and pre-existing audio causes
    // pop-clicks at the concat boundaries.
    generate_audio: false,
  };

  let resp: Response;
  try {
    resp = await fetch(`${FAL_QUEUE_BASE}/${MODEL_PATH}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      transient: true,
      error: `Network error submitting Seedance job: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!resp.ok) {
    const text = await resp.text();
    return {
      ok: false,
      transient: resp.status === 429 || resp.status >= 500,
      error: `fal.ai ${resp.status} on submit: ${text.slice(0, 300)}`,
    };
  }

  const json = (await resp.json()) as SubmitResponse;
  if (!json.request_id || !json.status_url || !json.response_url) {
    return {
      ok: false,
      transient: false,
      error: `fal.ai returned malformed submit response: ${JSON.stringify(
        json,
      ).slice(0, 200)}`,
    };
  }
  return {
    ok: true,
    statusUrl: json.status_url,
    responseUrl: json.response_url,
    requestId: json.request_id,
  };
}

/** Poll until COMPLETED or ERROR. Returns the response_url (which
 *  the caller then GETs to retrieve the video URL). */
async function pollJob(
  statusUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    let resp: Response;
    try {
      resp = await fetch(statusUrl, {
        method: "GET",
        headers: { Authorization: `Key ${process.env.FAL_KEY}` },
      });
    } catch {
      // transient — try again
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }
    if (!resp.ok) {
      return {
        ok: false,
        error: `fal.ai poll ${resp.status}: ${(await resp.text()).slice(0, 200)}`,
      };
    }
    const data = (await resp.json()) as StatusResponse;
    if (data.status === "COMPLETED") return { ok: true };
    if (data.status === "ERROR") {
      return { ok: false, error: `Seedance job failed: ${data.detail ?? "no detail"}` };
    }
    // IN_QUEUE | IN_PROGRESS — keep polling
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return {
    ok: false,
    error: `Seedance job timed out after ${MAX_POLL_MS / 60000}min.`,
  };
}

/** GET the response_url and extract the MP4 URL. */
async function getVideoUrl(
  responseUrl: string,
): Promise<{ ok: true; videoUrl: string } | { ok: false; error: string }> {
  let resp: Response;
  try {
    resp = await fetch(responseUrl, {
      method: "GET",
      headers: { Authorization: `Key ${process.env.FAL_KEY}` },
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error fetching Seedance result: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      error: `fal.ai result ${resp.status}: ${(await resp.text()).slice(0, 200)}`,
    };
  }
  const data = (await resp.json()) as ResultResponse;
  const url = data.video?.url ?? data.output?.video?.url ?? null;
  if (!url) {
    return {
      ok: false,
      error: `fal.ai result lacked video.url: ${JSON.stringify(data).slice(0, 200)}`,
    };
  }
  return { ok: true, videoUrl: url };
}

async function generate(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  if (!isConfigured()) {
    return { kind: "not_configured", missingEnv: ["FAL_KEY"] };
  }

  // 1. Submit.
  const submit = await submitJob(input);
  if (!submit.ok) {
    if (submit.transient) {
      return { kind: "rate_limited", retryAfterSec: 60 };
    }
    return { kind: "error", error: submit.error };
  }

  // 2. Poll until done.
  const poll = await pollJob(submit.statusUrl);
  if (!poll.ok) {
    return { kind: "error", error: poll.error };
  }

  // 3. Fetch the result envelope to get the video URL.
  const result = await getVideoUrl(submit.responseUrl);
  if (!result.ok) {
    return { kind: "error", error: result.error };
  }

  // 4. Download the MP4 (Google Cloud Storage URL — no auth needed).
  let mp4Resp: Response;
  try {
    mp4Resp = await fetch(result.videoUrl);
  } catch (err) {
    return {
      kind: "error",
      error: `Network error downloading Seedance MP4: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  if (!mp4Resp.ok) {
    return {
      kind: "error",
      error: `MP4 download ${mp4Resp.status} from ${result.videoUrl}`,
    };
  }
  const buf = Buffer.from(await mp4Resp.arrayBuffer());

  // 5. Persist.
  const safeName = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
  const fullPath = path.join(outDir, safeName);
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(fullPath, buf);
  } catch (err) {
    return {
      kind: "error",
      error: `Failed to persist MP4 to ${fullPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const quality: VideoQuality = input.quality ?? "standard";
  return {
    kind: "ok",
    path: fullPath,
    vendorUrl: result.videoUrl,
    costCents: COST_CENTS_PER_SEC[quality] * input.durationSec,
    vendor: "seedance",
    durationSec: input.durationSec,
  };
}

export const seedanceAdapter: VideoGenAdapter = {
  vendor: "seedance",
  isConfigured,
  generate,
};
