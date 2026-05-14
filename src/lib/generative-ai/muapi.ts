import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export type MuapiPredictionResult = {
  requestId: string | null;
  raw: unknown;
  outputUrl: string | null;
};

export type MuapiWorkflowResult = {
  runId: string | null;
  raw: unknown;
  outputUrl: string | null;
};

type SubmitResponse = {
  request_id?: string;
  id?: string;
  url?: string;
  output?: { url?: string } | string;
  outputs?: string[];
};

type PollResponse = {
  status?: string;
  error?: string | { message?: string };
  url?: string;
  output?: { url?: string } | string;
  outputs?: string[];
  data?: { url?: string; output?: { url?: string } | string; outputs?: string[] };
};

function baseUrl(): string {
  return (process.env.MUAPI_BASE_URL || "https://api.muapi.ai").replace(/\/+$/, "");
}

export function isMuapiConfigured(): boolean {
  return Boolean(process.env.MUAPI_API_KEY);
}

function apiKey(): string {
  const key = process.env.MUAPI_API_KEY;
  if (!key) throw new Error("MUAPI_API_KEY is not configured.");
  return key;
}

function headers(): Record<string, string> {
  const key = apiKey();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    "x-api-key": key,
  };
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown error";
}

export function extractMuapiOutputUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as PollResponse;
  if (Array.isArray(data.outputs) && typeof data.outputs[0] === "string") {
    return data.outputs[0];
  }
  if (typeof data.url === "string") return data.url;
  if (typeof data.output === "string") return data.output;
  if (data.output && typeof data.output === "object" && typeof data.output.url === "string") {
    return data.output.url;
  }
  if (data.data) return extractMuapiOutputUrl(data.data);
  return null;
}

export async function submitMuapiPrediction(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<{ requestId: string | null; result: SubmitResponse }> {
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  const response = await fetch(`${baseUrl()}/api/v1/${cleanEndpoint}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MuAPI submit ${response.status}: ${text.slice(0, 300)}`);
  }
  const result = (await response.json()) as SubmitResponse;
  return { requestId: result.request_id ?? result.id ?? null, result };
}

export async function pollMuapiPrediction(
  requestId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<PollResponse> {
  const maxAttempts = options?.maxAttempts ?? 900;
  const intervalMs = options?.intervalMs ?? 2_000;
  const pollUrl = `${baseUrl()}/api/v1/predictions/${requestId}/result`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const response = await fetch(pollUrl, { headers: headers() });
    if (!response.ok) {
      if (response.status >= 500 && attempt < maxAttempts) continue;
      const text = await response.text();
      throw new Error(`MuAPI poll ${response.status}: ${text.slice(0, 300)}`);
    }
    const data = (await response.json()) as PollResponse;
    const status = data.status?.toLowerCase();
    if (!status || status === "completed" || status === "succeeded" || status === "success") {
      return data;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`MuAPI generation failed: ${errorMessage(data.error)}`);
    }
  }

  throw new Error("MuAPI generation timed out after polling.");
}

export async function runMuapiPrediction(
  endpoint: string,
  payload: Record<string, unknown>,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<MuapiPredictionResult> {
  const submitted = await submitMuapiPrediction(endpoint, payload);
  if (!submitted.requestId) {
    return {
      requestId: null,
      raw: submitted.result,
      outputUrl: extractMuapiOutputUrl(submitted.result),
    };
  }
  const result = await pollMuapiPrediction(submitted.requestId, options);
  return {
    requestId: submitted.requestId,
    raw: result,
    outputUrl: extractMuapiOutputUrl(result),
  };
}

export async function executeMuapiWorkflow(
  workflowId: string,
  inputs: Record<string, unknown>,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<MuapiWorkflowResult> {
  const response = await fetch(`${baseUrl()}/workflow/${workflowId}/api-execute`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ inputs }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MuAPI workflow submit ${response.status}: ${text.slice(0, 300)}`);
  }
  const submitted = (await response.json()) as { run_id?: string; id?: string };
  const runId = submitted.run_id ?? submitted.id ?? null;
  if (!runId) {
    return { runId: null, raw: submitted, outputUrl: extractMuapiOutputUrl(submitted) };
  }

  const maxAttempts = options?.maxAttempts ?? 900;
  const intervalMs = options?.intervalMs ?? 2_000;
  const pollUrl = `${baseUrl()}/workflow/run/${runId}/api-outputs`;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const poll = await fetch(pollUrl, { headers: headers() });
    if (!poll.ok) {
      if (poll.status >= 500 && attempt < maxAttempts) continue;
      const text = await poll.text();
      throw new Error(`MuAPI workflow poll ${poll.status}: ${text.slice(0, 300)}`);
    }
    const data = (await poll.json()) as PollResponse;
    const status = data.status?.toLowerCase();
    if (!status || status === "completed" || status === "succeeded" || status === "success") {
      return { runId, raw: data, outputUrl: extractMuapiOutputUrl(data) };
    }
    if (status === "failed" || status === "error") {
      throw new Error(`MuAPI workflow failed: ${errorMessage(data.error)}`);
    }
  }
  throw new Error("MuAPI workflow timed out after polling.");
}

export async function downloadMuapiAsset(
  url: string,
  outDir: string,
  filename: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MuAPI asset download ${response.status} from ${url}`);
  }
  const fullPath = path.join(outDir, filename);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(fullPath, Buffer.from(await response.arrayBuffer()));
  return fullPath;
}
