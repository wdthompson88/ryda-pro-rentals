// Public entry point for the LLC formation module. Call sites
// import from "@/lib/llc-formation" — never from the concrete files.
// Keeps the seam clean and discourages provider-specific branching
// at call sites.

export type {
  CreateFormationInput,
  FormationCreatedResponse,
  FormationDetails,
  FormationStatus,
  FormationProvider,
  FormationState,
  FormationWebhookEvent,
  Address,
  FormationPerson,
} from "./types";

export type { LLCFormationAdapter } from "./adapter";
export { resolveAdapter } from "./adapter";
