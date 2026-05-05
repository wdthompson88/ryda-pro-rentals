// Shared types for the LLC formation module. Provider-agnostic — the
// adapter interface (./adapter.ts) speaks these, individual provider
// clients (./firstbase.ts, eventually ./atlas.ts) translate to/from
// vendor-specific schemas.
//
// Keeping the types centralized lets us swap formation providers
// without touching the call sites: the admin UI, the webhook handler,
// and any future automated trigger (e.g. share-purchase -> spawn LLC).

// US states we support for LLC formation. Limited to the ones RYDA's
// market footprint actually needs. Add as the footprint expands.
export type FormationState = "FL" | "DE" | "WY" | "CA" | "NY";

// Provider identifier — matches the formation_provider DB column.
// Add "atlas", "northwest", "manual" as we onboard them.
export type FormationProvider = "firstbase" | "manual";

// Lifecycle status for an LLC formation. Mirrors the underlying
// vendor lifecycle but normalized so the UI doesn't care which
// vendor is in use. Database column uses the same string union.
export type FormationStatus =
  | "draft"        // queued in our DB, not yet sent to provider
  | "submitted"    // submitted to provider, awaiting filing
  | "filed"        // state filing in progress
  | "approved"     // state approved, EIN pending
  | "completed"    // formation done, EIN issued, RA active
  | "failed";      // provider returned a hard failure

// US postal address for the LLC's principal place of business and
// registered agent. Matches the shape Firstbase + Atlas + most state
// SOSes accept.
export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: FormationState | string;
  postalCode: string;
  // ISO 3166-1 alpha-2. Always "US" for now — RYDA is US-only.
  country: "US";
};

// Person record for the founder, manager, or authorized signer.
// SSN/ITIN deliberately NOT in this type — those go through the
// provider's hosted form, never through our API. We only capture
// non-sensitive identity for our own DB.
export type FormationPerson = {
  fullName: string;
  email: string;
  phone?: string;
  address: Address;
  // Whether this person is the LLC manager (RYDA itself, typically)
  // vs. an initial member (a co-owning RYDA member who funded the
  // share purchase).
  role: "manager" | "member";
};

// Input to the formation API. The adapter takes this and returns a
// provider-specific application/company id we can poll.
export type CreateFormationInput = {
  // The vehicle (or boat) this LLC is being formed to hold. Used
  // both for our own DB linkage AND to populate the LLC's stated
  // business purpose.
  vehicleSymbol: string;
  vehicleDescription: string; // e.g. "2024 Ferrari 296 GTB"

  // Where to form. Default: FL (matches RYDA's Miami launch).
  state: FormationState;

  // The desired LLC name. Provider validates uniqueness against
  // the state's records and may reject with a "name unavailable"
  // error — caller should be prepared to retry with a suffix.
  llcName: string; // e.g. "RYDA F296 LLC"

  // The principal address of the LLC (where books + records are
  // kept). For RYDA this is the Miami HQ until cars get their own
  // physical office.
  principalAddress: Address;

  // The natural-person manager of the LLC. For RYDA SPVs this is
  // typically a designated officer of RYDA LLC (the platform).
  manager: FormationPerson;

  // Optional initial members. RYDA's flow may form the LLC empty
  // and add members via subsequent assignment, OR include them at
  // formation if all founding members are known up-front.
  initialMembers?: FormationPerson[];

  // Idempotency key — include the vehicle symbol + a hash of the
  // formation parameters so retries don't accidentally double-form.
  // Adapter MUST honor this (not all providers do natively;
  // wrapper logic enforces it via our DB).
  idempotencyKey: string;
};

// Provider response after a formation request is accepted. The
// formation isn't done yet — it's queued for state filing. The
// caller stores this id and polls (or awaits webhook) for status.
export type FormationCreatedResponse = {
  // The provider's id for this formation. e.g. Firstbase company_id
  // or application_id. We store it on the row for follow-up calls.
  providerId: string;
  // Some providers issue both an application id (workflow) and a
  // company id (entity). Surface both if present.
  providerApplicationId?: string;
  // The status reported synchronously. Most providers return
  // "submitted" or "filed" immediately and progress async.
  status: FormationStatus;
  // ISO timestamp.
  createdAt: string;
};

// Full snapshot of an LLC formation as the provider sees it. The
// caller pulls this on demand (admin "refresh status" button) OR
// receives equivalent fields via webhook events.
export type FormationDetails = {
  providerId: string;
  providerApplicationId?: string;
  status: FormationStatus;
  llcName: string;
  state: FormationState;
  ein?: string;                          // populated on ein.issued event
  registeredAgent?: {
    name: string;
    address: Address;
    expiresAt?: string;                  // ISO date
  };
  formationDate?: string;                // ISO date when state stamped
  documents?: Array<{
    label: string;                       // "Operating Agreement", "Certificate of Formation", etc.
    url: string;                         // signed URL or vendor-hosted link
    expiresAt?: string;
  }>;
  raw?: unknown;                         // provider's native payload, for debugging
};

// Webhook event we accept from the formation provider. Vendor-specific
// payloads are translated into this normalized shape inside the
// webhook handler before any business logic runs.
export type FormationWebhookEvent = {
  // Vendor-assigned id — used for dedup.
  eventId: string;
  // Normalized event type. Add new ones as the vendor exposes them.
  type:
    | "formation.created"
    | "formation.filed"
    | "formation.completed"
    | "formation.failed"
    | "ein.issued"
    | "registered_agent.renewed"
    | "compliance.alert";
  providerId: string;
  // Anything else the vendor sent. Stored on the event audit row
  // for later reconstruction.
  payload: Record<string, unknown>;
  receivedAt: string; // ISO
};
