// Mock LLC formation adapter — returns plausible-shaped data without
// any network calls. Used:
//   - In dev / local environments where keys aren't set
//   - In preview branches where we don't want to burn $399 per merge
//   - As a backstop if FIRSTBASE_API_KEY is accidentally cleared in
//     production (better to render a "not configured" admin banner
//     than crash the page)
//
// Mock formations:
//   - Get a deterministic providerId: "mock_<vehicleSymbol>_<8charHash>"
//   - Start in "submitted", auto-advance to "completed" after the
//     in-memory timer fires (process-lifetime only — no persistence).
//   - Include a fake EIN of the form "XX-XXXXXXX" with the first
//     two digits being one of the IRS reserved test ranges so the
//     value is recognizable as a mock everywhere it surfaces.
//
// IMPORTANT: callers that depend on real LLC formation should check
// adapter.mode === "mock" before continuing. The webhook handler
// already does this.

import crypto from "node:crypto";
import type {
  CreateFormationInput,
  FormationCreatedResponse,
  FormationDetails,
  FormationWebhookEvent,
} from "./types";
import type { LLCFormationAdapter } from "./adapter";

// In-memory store, lifetime = process lifetime. Mock formations
// accumulate during a dev session and disappear on restart. That's
// fine — real persistence happens through llc_entities migration
// (0022) which is provider-agnostic.
const STORE = new Map<string, FormationDetails>();

function fakeEin(): string {
  // IRS reserved test EIN range starts with 99-, never assigned to
  // real entities. Recognizable as fake to anyone reading our DB.
  const tail = String(Math.floor(Math.random() * 9_999_999)).padStart(7, "0");
  return `99-${tail}`;
}

function mockProviderId(vehicleSymbol: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${vehicleSymbol}-${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 8);
  return `mock_${vehicleSymbol.toLowerCase()}_${hash}`;
}

export const mockAdapter: LLCFormationAdapter = {
  provider: "firstbase", // Pretends to be Firstbase for downstream code paths
  mode: "mock",

  async createFormation(input: CreateFormationInput) {
    const providerId = mockProviderId(input.vehicleSymbol);
    const now = new Date().toISOString();
    const seed: FormationDetails = {
      providerId,
      providerApplicationId: `mock_app_${providerId}`,
      status: "submitted",
      llcName: input.llcName,
      state: input.state,
      formationDate: undefined, // populated when "completed"
    };
    STORE.set(providerId, seed);

    // Auto-advance after a short delay to make the admin UI feel
    // realistic without requiring real polling. 8 seconds gives the
    // operator time to land on the detail page and watch it flip.
    setTimeout(() => {
      const current = STORE.get(providerId);
      if (!current) return;
      STORE.set(providerId, {
        ...current,
        status: "completed",
        ein: fakeEin(),
        formationDate: new Date().toISOString().slice(0, 10),
        registeredAgent: {
          name: "Mock Registered Agent, LLC",
          address: {
            line1: "100 Sample St",
            city: "Tallahassee",
            state: input.state,
            postalCode: "32301",
            country: "US",
          },
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        },
        documents: [
          {
            label: "Certificate of Formation (mock)",
            url: "https://example.com/mock-cert",
          },
          {
            label: "Operating Agreement (mock)",
            url: "https://example.com/mock-oa",
          },
        ],
      });
    }, 8_000);

    return {
      providerId,
      providerApplicationId: seed.providerApplicationId,
      status: seed.status,
      createdAt: now,
    } satisfies FormationCreatedResponse;
  },

  async getFormation(providerId: string) {
    const found = STORE.get(providerId);
    if (!found) {
      // Allow mock-id lookups across cold starts: synthesize a
      // "completed" record so admin UI doesn't 404 in dev. We can't
      // distinguish "real id we lost track of" from "made-up id",
      // but in mock mode that's acceptable.
      return {
        providerId,
        status: "completed" as const,
        llcName: "Synthesized Mock LLC",
        state: "FL",
        ein: fakeEin(),
        formationDate: new Date().toISOString().slice(0, 10),
      };
    }
    return found;
  },

  async listFormations() {
    return [...STORE.values()];
  },

  verifyAndParseWebhook(): FormationWebhookEvent {
    // Mock adapter doesn't sign or verify — webhook receivers should
    // refuse to invoke this. If they do anyway, throw loudly so the
    // misuse is visible.
    throw new Error(
      "[llc-formation] mock adapter cannot verify webhook signatures. Configure FIRSTBASE_API_KEY + FIRSTBASE_WEBHOOK_SECRET to receive real events.",
    );
  },
};
