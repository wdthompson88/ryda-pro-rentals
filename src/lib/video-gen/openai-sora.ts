// OpenAI Sora API adapter (sora-2 / sora-2-pro).
//
// Why this exists: Sora's web/app interface was discontinued in
// 2026; the OpenAI Sora API is the only programmatic path now.
// ChatGPT Pro subscriptions do NOT include Sora API access —
// it's billed separately under platform.openai.com using the same
// OPENAI_API_KEY as gpt-image-1.
//
// API shape (verify against current docs at
// https://platform.openai.com/docs/api-reference/videos before
// debugging — OpenAI's video API has iterated more aggressively
// than their text or image APIs):
//
//   POST /v1/videos           create job → returns { id, status }
//   GET  /v1/videos/{id}      poll status → returns { status, ... }
//                             status: queued | processing | succeeded | failed
//   GET  /v1/videos/{id}/content?variant=video
//                             download MP4 once status='succeeded'
//
// Async pattern: this adapter blocks until the clip is downloaded
// (or fails). Calls poll every 5 seconds for up to MAX_POLL_MS.
// Sora generation typically takes 60-180 seconds per 5-second clip.
//
// Pricing (USD, as of 2026 — check current rates):
//   sora-2     720p   $0.10/sec    (5s = $0.50, 10s = $1.00)
//   sora-2-pro 1080p  $0.30/sec    (5s = $1.50, 10s = $3.00)

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  GenerateClipInput,
  GenerateClipResult,
  VideoGenAdapter,
  VideoQuality,
} from "./types";

const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const VIDEOS_ENDPOINT = `${API_BASE}/videos`;

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 10 * 60_000; // 10 minutes

/** Cents per second. Multiply by durationSec for the per-call cost. */
const COST_CENTS_PER_SEC: Record<VideoQuality, number> = {
  standard: 10, // sora-2
  high: 30, // sora-2-pro
};

const MODEL: Record<VideoQuality, string> = {
  standard: "sora-2",
  high: "sora-2-pro",
};

function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildPrompt(input: GenerateClipInput): string {
  if (!input.styleNote || input.styleNote.trim().length === 0) {
    return input.prompt;
  }
  return `${input.styleNote.trim()}\n\n${input.prompt}`;
}

function authHeaders(): Record<string, string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const orgId = process.env.OPENAI_ORG_ID;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (orgId) headers["OpenAI-Organization"] = orgId;
  return headers;
}

/** POST /v1/videos to create a generation job. Returns the job id. */
async function createJob(
  input: GenerateClipInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string; transient: boolean }> {
  const quality: VideoQuality = input.quality ?? "standard";

  // Map orientation to a size hint Sora understands. Vertical maps
  // to 720x1280, landscape to 1280x720, square to 720x720. The
  // composer re-frames anyway; this just biases the model's
  // composition.
  const orientation = input.orientation ?? "landscape";
  const size =
    orientation === "vertical"
      ? "720x1280"
      : orientation === "square"
        ? "720x720"
        : "1280x720";

  const body = {
    model: MODEL[quality],
    prompt: buildPrompt(input),
    seconds: input.durationSec,
    size,
  };

  let resp: Response;
  try {
    resp = await fetch(VIDEOS_ENDPOINT, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      transient: true,
      error: `Network error creating Sora job: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!resp.ok) {
    const text = await resp.text();
    const transient = resp.status === 429 || resp.status >= 500;
    return {
      ok: false,
      transient,
      error: `Sora API ${resp.status} on create: ${text.slice(0, 300)}`,
    };
  }

  let json: { id?: string };
  try {
    json = (await resp.json()) as { id?: string };
  } catch (err) {
    return {
      ok: false,
      transient: false,
      error: `Sora returned non-JSON on create: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!json.id) {
    return { ok: false, transient: false, error: "Sora create returned no job id." };
  }
  return { ok: true, id: json.id };
}

/** Poll /v1/videos/{id} until status is succeeded or failed. */
async function pollJob(
  id: string,
): Promise<
  | { ok: true; downloadUrl: string | null }
  | { ok: false; error: string }
> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    let resp: Response;
    try {
      resp = await fetch(`${VIDEOS_ENDPOINT}/${id}`, {
        method: "GET",
        headers: authHeaders(),
      });
    } catch (err) {
      // Transient network blip — retry on next tick.
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }
    if (!resp.ok) {
      const text = await resp.text();
      return { ok: false, error: `Sora poll ${resp.status}: ${text.slice(0, 200)}` };
    }
    const data = (await resp.json()) as {
      status?: string;
      error?: { message?: string };
      // Older Sora versions returned download_url; newer ones
      // expect the caller to fetch /content?variant=video. We
      // try both — adapter handles either shape downstream.
      download_url?: string;
      output?: { url?: string };
    };
    if (data.status === "succeeded") {
      const direct = data.download_url ?? data.output?.url ?? null;
      return { ok: true, downloadUrl: direct };
    }
    if (data.status === "failed") {
      return {
        ok: false,
        error: `Sora job failed: ${data.error?.message ?? "no detail"}`,
      };
    }
    // queued | processing | in_progress — keep polling
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { ok: false, error: `Sora job timed out after ${MAX_POLL_MS / 60000}min.` };
}

/** Fetch the MP4 bytes. If a direct download_url was provided by
 *  poll(), use it; otherwise hit /v1/videos/{id}/content. */
async function downloadMp4(
  id: string,
  directUrl: string | null,
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  const url = directUrl ?? `${VIDEOS_ENDPOINT}/${id}/content?variant=video`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "GET",
      // Direct download_url from OpenAI is pre-signed and doesn't
      // need auth; the /content endpoint does. Send the auth header
      // either way — pre-signed URLs ignore extra headers.
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error downloading Sora MP4: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  if (!resp.ok) {
    return {
      ok: false,
      error: `Sora MP4 download ${resp.status}: ${(await resp.text()).slice(0, 200)}`,
    };
  }
  const arrayBuffer = await resp.arrayBuffer();
  return { ok: true, bytes: Buffer.from(arrayBuffer) };
}

async function generate(
  input: GenerateClipInput,
  outDir: string,
  filename: string,
): Promise<GenerateClipResult> {
  if (!isConfigured()) {
    return { kind: "not_configured", missingEnv: ["OPENAI_API_KEY"] };
  }

  // 1. Create the job.
  const create = await createJob(input);
  if (!create.ok) {
    if (create.transient) {
      return { kind: "rate_limited", retryAfterSec: 60 };
    }
    return { kind: "error", error: create.error };
  }

  // 2. Poll until done.
  const poll = await pollJob(create.id);
  if (!poll.ok) {
    return { kind: "error", error: poll.error };
  }

  // 3. Download the MP4.
  const dl = await downloadMp4(create.id, poll.downloadUrl);
  if (!dl.ok) {
    return { kind: "error", error: dl.error };
  }

  // 4. Persist.
  const safeName = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
  const fullPath = path.join(outDir, safeName);
  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(fullPath, dl.bytes);
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
    vendorUrl: poll.downloadUrl,
    costCents: COST_CENTS_PER_SEC[quality] * input.durationSec,
    vendor: "openai-sora",
    durationSec: input.durationSec,
  };
}

export const openAiSoraAdapter: VideoGenAdapter = {
  vendor: "openai-sora",
  isConfigured,
  generate,
};
