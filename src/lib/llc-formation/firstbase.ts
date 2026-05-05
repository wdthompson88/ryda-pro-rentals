// Firstbase.io adapter.
//
// Wraps the Firstbase Partner API behind the LLCFormationAdapter
// interface. Two operating modes:
//   - "sandbox" → api-sandbox.firstbase.io, fake state filings, no $
//   - "live"    → api.firstbase.io, real $399 + state fees per call
//
// Live mode is gated by FIRSTBASE_MODE === "live" in env. A stray
// preview-deploy or test run with sandbox keys cannot accidentally
// form a real LLC.
//
// IMPORTANT: this file makes NO network calls until createFormation
// or getFormation is invoked. Until you've actually signed up at
// firstbase.io and dropped real keys into Vercel env, only the mock
// adapter is selected (see adapter.ts:resolveAdapter).
//
// Endpoint shapes below are based on Firstbase's published Partner
// API as of late 2025. Verify against current docs before flipping
// to live: https://docs.firstbase.io/partner-api/

import crypto from "node:crypto";
import type {
  CreateFormationInput,
  FormationCreatedResponse,
  FormationDetails,
  FormationStatus,
  FormationWebhookEvent,
} from "./types";
import type { LLCFormationAdapter } from "./adapter";

const BASE_URLS = {
  live: "https://api.firstbase.io/v1",
  sandbox: "https://api-sandbox.firstbase.io/v1",
} as const;

type FirstbaseConfig = {
  apiKey: string;
  webhookSecret: string;
  mode: "live" | "sandbox";
};

export function createFirstbaseAdapter(
  config: FirstbaseConfig,
): LLCFormationAdapter {
  const baseUrl = BASE_URLS[config.mode];

  /** Authenticated fetch wrapper. Throws on non-2xx with body context. */
  async function fb(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((init.headers as Record<string, string>) ?? {}),
    };
    if (init.idempotencyKey) {
      // Firstbase honors a separate Idempotency-Key header — same
      // pattern Stripe uses. Repeated requests with the same key
      // return the original response without re-charging or
      // re-creating an entity.
      headers["Idempotency-Key"] = init.idempotencyKey;
    }

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    if (!res.ok) {
      throw new FirstbaseError(
        `Firstbase ${path} failed: ${res.status} ${res.statusText}`,
        {
          status: res.status,
          body: text,
          path,
        },
      );
    }
    return text ? JSON.parse(text) : null;
  }

  return {
    provider: "firstbase",
    mode: config.mode,

    async createFormation(input: CreateFormationInput) {
      // Translate our normalized CreateFormationInput into Firstbase's
      // POST /companies payload. The vendor schema is theirs to change;
      // keep this translation thin so the seam stays obvious.
      const body = {
        type: "LLC",
        state: input.state,
        name: input.llcName,
        purpose: `Hold title to ${input.vehicleDescription} for member co-ownership.`,
        principal_address: addressToFirstbase(input.principalAddress),
        managers: [personToFirstbase(input.manager)],
        members: (input.initialMembers ?? []).map(personToFirstbase),
        // Firstbase will issue an EIN as part of formation by default.
        // We don't need to opt out unless a specific LLC has an EIN
        // already (rare for SPVs).
        request_ein: true,
        // Year-1 RA included; renew annually thereafter.
        registered_agent: { service: "firstbase", years: 1 },
        // Stash our internal ids so reconciliation is one query.
        metadata: {
          ryda_vehicle_symbol: input.vehicleSymbol,
          ryda_idempotency_key: input.idempotencyKey,
        },
      };

      const resp = (await fb("/companies", {
        method: "POST",
        body: JSON.stringify(body),
        idempotencyKey: input.idempotencyKey,
      })) as FirstbaseCompanyResponse;

      return {
        providerId: resp.id,
        providerApplicationId: resp.application_id ?? undefined,
        status: mapStatus(resp.status),
        createdAt: resp.created_at ?? new Date().toISOString(),
      } satisfies FormationCreatedResponse;
    },

    async getFormation(providerId: string) {
      const resp = (await fb(
        `/companies/${encodeURIComponent(providerId)}`,
      )) as FirstbaseCompanyResponse;
      return {
        providerId: resp.id,
        providerApplicationId: resp.application_id ?? undefined,
        status: mapStatus(resp.status),
        llcName: resp.name,
        state: resp.state as FormationDetails["state"],
        ein: resp.ein ?? undefined,
        registeredAgent: resp.registered_agent
          ? {
              name: resp.registered_agent.name,
              address: addressFromFirstbase(resp.registered_agent.address),
              expiresAt: resp.registered_agent.expires_at,
            }
          : undefined,
        formationDate: resp.formation_date ?? undefined,
        documents: (resp.documents ?? []).map((d) => ({
          label: d.label,
          url: d.url,
          expiresAt: d.expires_at,
        })),
        raw: resp,
      };
    },

    async listFormations() {
      const resp = (await fb("/companies")) as {
        data: FirstbaseCompanyResponse[];
      };
      return resp.data.map((r) => ({
        providerId: r.id,
        providerApplicationId: r.application_id ?? undefined,
        status: mapStatus(r.status),
        llcName: r.name,
        state: r.state as FormationDetails["state"],
        ein: r.ein ?? undefined,
        formationDate: r.formation_date ?? undefined,
        raw: r,
      }));
    },

    verifyAndParseWebhook(rawBody: string, headers): FormationWebhookEvent {
      // Firstbase follows the Stripe-style signature pattern:
      //   Header: Firstbase-Signature: t=<unixTs>,v1=<hexHmacSha256>
      //   HMAC over: `${t}.${rawBody}`
      const sigHeader =
        headers["firstbase-signature"] ??
        headers["Firstbase-Signature"] ??
        "";
      if (!sigHeader) {
        throw new FirstbaseError("Missing Firstbase-Signature header", {
          status: 400,
        });
      }
      const parts = Object.fromEntries(
        sigHeader.split(",").map((p) => {
          const idx = p.indexOf("=");
          return [p.slice(0, idx), p.slice(idx + 1)];
        }),
      ) as { t?: string; v1?: string };

      if (!parts.t || !parts.v1) {
        throw new FirstbaseError("Malformed Firstbase-Signature", {
          status: 400,
        });
      }

      // Reject signatures older than 5 min — replay-window guard.
      const ts = parseInt(parts.t, 10);
      if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
        throw new FirstbaseError("Webhook signature timestamp out of window", {
          status: 400,
        });
      }

      if (!config.webhookSecret) {
        throw new FirstbaseError(
          "FIRSTBASE_WEBHOOK_SECRET not configured — cannot verify signature",
          { status: 500 },
        );
      }
      const expected = crypto
        .createHmac("sha256", config.webhookSecret)
        .update(`${parts.t}.${rawBody}`)
        .digest("hex");

      // Constant-time compare so the signature mismatch path doesn't
      // leak timing about the secret. Both buffers must be same length;
      // if not, the comparison fails fast which is fine — that's also
      // a mismatch.
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(parts.v1, "hex");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new FirstbaseError("Webhook signature mismatch", {
          status: 400,
        });
      }

      const parsed = JSON.parse(rawBody) as {
        id: string;
        type: string;
        data: { object: { id: string; [k: string]: unknown } };
        created: number;
      };

      // Map Firstbase event types to our normalized union. Anything we
      // don't recognize gets a "compliance.alert" so it's still
      // delivered to ops for triage rather than silently dropped.
      const type = mapEventType(parsed.type);
      return {
        eventId: parsed.id,
        type,
        providerId: parsed.data.object.id,
        payload: parsed.data.object,
        receivedAt: new Date(parsed.created * 1000).toISOString(),
      };
    },
  };
}

// ---- Translation helpers -----------------------------------------

type FirstbaseAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type FirstbasePerson = {
  full_name: string;
  email: string;
  phone?: string;
  address: FirstbaseAddress;
  role: "manager" | "member";
};

type FirstbaseCompanyResponse = {
  id: string;
  application_id?: string;
  name: string;
  state: string;
  status: string;
  ein?: string | null;
  formation_date?: string | null;
  created_at?: string;
  registered_agent?: {
    name: string;
    address: FirstbaseAddress;
    expires_at?: string;
  };
  documents?: Array<{ label: string; url: string; expires_at?: string }>;
};

function addressToFirstbase(a: CreateFormationInput["principalAddress"]): FirstbaseAddress {
  return {
    line1: a.line1,
    line2: a.line2 ?? null,
    city: a.city,
    state: a.state,
    postal_code: a.postalCode,
    country: a.country,
  };
}

function addressFromFirstbase(a: FirstbaseAddress): FormationDetails["registeredAgent"] extends { address: infer X } | undefined ? X : never {
  return {
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
    country: a.country as "US",
  };
}

function personToFirstbase(p: CreateFormationInput["manager"]): FirstbasePerson {
  return {
    full_name: p.fullName,
    email: p.email,
    phone: p.phone,
    address: addressToFirstbase(p.address),
    role: p.role,
  };
}

function mapStatus(s: string): FormationStatus {
  const normalized = s.toLowerCase();
  if (normalized.includes("complete")) return "completed";
  if (normalized.includes("approved")) return "approved";
  if (normalized.includes("filed") || normalized === "filing") return "filed";
  if (normalized.includes("submit")) return "submitted";
  if (normalized.includes("fail") || normalized.includes("error"))
    return "failed";
  return "draft";
}

function mapEventType(t: string): FormationWebhookEvent["type"] {
  switch (t) {
    case "company.created":
    case "formation.created":
      return "formation.created";
    case "company.filed":
    case "formation.filed":
      return "formation.filed";
    case "company.completed":
    case "formation.completed":
      return "formation.completed";
    case "company.failed":
    case "formation.failed":
      return "formation.failed";
    case "ein.issued":
      return "ein.issued";
    case "registered_agent.renewed":
      return "registered_agent.renewed";
    default:
      return "compliance.alert";
  }
}

export class FirstbaseError extends Error {
  status: number;
  body?: string;
  path?: string;
  constructor(
    message: string,
    opts: { status: number; body?: string; path?: string },
  ) {
    super(message);
    this.name = "FirstbaseError";
    this.status = opts.status;
    this.body = opts.body;
    this.path = opts.path;
  }
}
