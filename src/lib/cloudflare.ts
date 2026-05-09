// Cloudflare API client for programmatic DNS record management.
//
// When you need to add/change a DNS record (new Stripe webhook
// endpoint subdomain, staging environment, additional Resend
// sender, etc.), use this instead of clicking through the
// Cloudflare dashboard.
//
// Setup:
//   1. Generate a scoped token at
//      https://dash.cloudflare.com/profile/api-tokens
//      → "Create Custom Token"
//      → Permissions: Zone DNS Edit (zone-scoped, NOT account-wide)
//      → Zone Resources: Include → Specific zone → ryda.pro
//      → no client IP filter, 1-year TTL
//   2. Add to Vercel env + .env.local:
//      CLOUDFLARE_API_TOKEN=<token>
//      CLOUDFLARE_ZONE_ID=<zone id>  (find at dashboard → Overview, right column)
//
// Why scoped token (not Global API Key): if leaked, attacker can
// only edit DNS for ryda.pro — not delete the account, change
// billing, or touch other zones. Lowest-privilege practice.
//
// Why this lib + not the dashboard: lets us add records via code
// (e.g., when bootstrapping a new Stripe webhook, the admin route
// can self-register the subdomain), and lets us put DNS state
// under version control (script that asserts the live records
// match a desired-state list, fails CI if they drift).

import "server-only";

const API_BASE = "https://api.cloudflare.com/client/v4";

type CloudflareEnv = { token: string; zoneId: string };

function env(): CloudflareEnv | null {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) return null;
  return { token, zoneId };
}

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "SRV";

export type DnsRecord = {
  id?: string;
  type: DnsRecordType;
  /** Subdomain or "@" for apex. Example: "@", "www", "send". */
  name: string;
  /** Target. IPv4 for A, hostname for CNAME, content for TXT, etc. */
  content: string;
  /** TTL in seconds, 1 = "automatic". */
  ttl?: number;
  /** Cloudflare proxy status. true = orange cloud (proxied),
   *  false = grey cloud (DNS only). Defaults to false (DNS only)
   *  to match our current ryda.pro setup. */
  proxied?: boolean;
  /** MX priority. Required for MX records. */
  priority?: number;
};

export type CloudflareResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }
  | { ok: false; error: "not_configured"; missingEnv: string[] };

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<CloudflareResult<T>> {
  const e = env();
  if (!e) {
    return {
      ok: false,
      error: "not_configured",
      missingEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"],
    };
  }
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${e.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return {
      ok: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const json = (await resp.json()) as {
    success: boolean;
    result?: T;
    errors?: { code: number; message: string }[];
  };
  if (!resp.ok || !json.success) {
    const msg = json.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || "unknown";
    return { ok: false, error: `Cloudflare API ${resp.status}: ${msg}`, status: resp.status };
  }
  return { ok: true, data: json.result as T };
}

/** List all DNS records on the zone. */
export async function listRecords(): Promise<CloudflareResult<DnsRecord[]>> {
  const e = env();
  if (!e) return { ok: false, error: "not_configured", missingEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"] };
  return request<DnsRecord[]>("GET", `/zones/${e.zoneId}/dns_records?per_page=100`);
}

/** Add a new DNS record. Defaults proxied=false to match current
 *  ryda.pro convention (grey cloud only). */
export async function addRecord(
  record: Omit<DnsRecord, "id">,
): Promise<CloudflareResult<DnsRecord>> {
  const e = env();
  if (!e) return { ok: false, error: "not_configured", missingEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"] };
  return request<DnsRecord>("POST", `/zones/${e.zoneId}/dns_records`, {
    proxied: false,
    ttl: 1,
    ...record,
  });
}

/** Update an existing record (replaces all fields). */
export async function updateRecord(
  id: string,
  record: Omit<DnsRecord, "id">,
): Promise<CloudflareResult<DnsRecord>> {
  const e = env();
  if (!e) return { ok: false, error: "not_configured", missingEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"] };
  return request<DnsRecord>("PUT", `/zones/${e.zoneId}/dns_records/${id}`, {
    proxied: false,
    ttl: 1,
    ...record,
  });
}

/** Delete a record by id. */
export async function deleteRecord(
  id: string,
): Promise<CloudflareResult<{ id: string }>> {
  const e = env();
  if (!e) return { ok: false, error: "not_configured", missingEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"] };
  return request<{ id: string }>("DELETE", `/zones/${e.zoneId}/dns_records/${id}`);
}

/** Verify the zone is reachable + token is valid. Useful for
 *  health checks or pre-flight before a script does any writes. */
export async function verifyToken(): Promise<CloudflareResult<{ id: string; status: string }>> {
  const e = env();
  if (!e) return { ok: false, error: "not_configured", missingEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"] };
  return request("GET", `/zones/${e.zoneId}`);
}
