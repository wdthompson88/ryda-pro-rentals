// /api/admin/partners — the partner program's single admin API.
//
// GET   → { partners, applications, applicationsError, stripeConfigured }
//         Operator roster (partners, 0041) + Stripe onboarding state,
//         plus the application queue (partner_accounts, 0042).
// POST  → create-or-update an operator (upsert by name) — roster only.
//         Audit-logged (create / commercial-term edit / pause-resume).
//         FEE TERMS (0048 / decision D2): commission_rate, fee_mode
//         ('percent' | 'flat'), fee_flat_cents, fee_payer ('operator' |
//         'renter'), fee_floor_cents, fee_cap_cents. Only the keys a
//         caller sends are written, and coherence is judged against the
//         row AS IT WILL BE by resolveRentalFeeConfig — the same code
//         path computeRentalFee runs and the same rules 0048's CHECK
//         constraints enforce, so the admin preview, this validation,
//         the stored row and the eventual charge cannot disagree.
//         RENAMING is possible since 0045 but never silent: the two
//         remaining name couplings each answer with a 409 that writes
//         nothing, and a follow-up request confirms them —
//         confirmFleetCodeRename (the name is hard-coded in
//         partner-fleet.ts / partner-contacts.ts, so NEW leads break
//         until the code ships) and relinkLegacyInquiries (name-only
//         inquiries get linked to this operator first). See
//         src/lib/partner-rename.ts.
// PATCH → { userId, status: "approved" | "suspended", note?,
//           expectedCompanyName, linkExistingOperatorId?, pauseOperator? }
//         Review an application. APPROVAL IS THE BRIDGE: it
//         creates-or-finds the company-keyed operators row from the
//         application's company details, links it via
//         partner_accounts.partner_id, and returns both records — the
//         operator is then ready for Stripe Express onboarding.
//
//         The bridge joins on an APPLICANT-CONTROLLED string
//         (company_name, free text on the /partner apply form), and the
//         operator it resolves to is the Stripe Connect account rental
//         money settles into. So the bridge is deliberate, never
//         implicit, and never silent:
//
//         · expectedCompanyName is REQUIRED on approval and must equal
//           the row's current company_name. The applicant can rewrite
//           company_name at any time via /api/partner/me, so without
//           this the admin approves whatever the name happens to be at
//           write time, not the one they reviewed. Mismatch → 409
//           { staleApplication: true }.
//         · Matching an EXISTING operator by name is never automatic:
//           the first attempt returns 409 { requiresLinkConfirmation:
//           true, operator: <full disclosure — Stripe state, commission,
//           payment counts, other linked applications> } and writes
//           NOTHING. Only a follow-up carrying
//           linkExistingOperatorId === that operator's id links them.
//           (An already-bridged row — reinstating a suspension — keeps
//           its operator without re-confirmation; that link was
//           confirmed when it was made.)
//
//         Suspension never deletes the operator (it may carry payment
//         history) and never pauses it implicitly either: operators have
//         a lifecycle of their own (ops can create them directly, so
//         "no other approved application links to it" is true for every
//         ops-managed row). pauseOperator: true is the explicit opt-in,
//         and even then the pause is skipped when another approved
//         application shares the operator. Every status change is
//         audit-logged.
//
// Admin-only via requireAdmin + service-role client: partners rows
// hold ops-sensitive commercial terms (commission rates, Stripe
// account ids, contact emails) that must never reach the browser
// through any public path — 0041 defines no anon/authenticated RLS
// policies on purpose, and partner_accounts (0042) has no member
// write policies at all.
//
// GET also refreshes onboarding state best-effort and cheap: only for
// rows that HAVE an Express account but no stripe_onboarded_at yet, it
// retrieves the account and stamps the timestamp once charges_enabled
// flips — so "Ready" appears on the next roster load after the
// operator finishes Stripe's hosted onboarding, without a Connect
// account.updated webhook subscription.
//
// Status-code contract with /admin/partners (the UI pattern-matches):
//   503        → environment not configured (Stripe/Supabase keys absent)
//   500 + msg  → real failure; a message containing "does not exist" /
//                "schema cache" renders the run-migration-0041 hint
//   GET applicationsError (string) → the roster loaded but the
//                partner_accounts relation didn't — the Applications
//                tab alone degrades (run-migration-0042 hint) while
//                the Operators tab keeps working

import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";
import { recordAdminAction } from "@/lib/admin-audit";
import {
  classifyLegacyCount,
  countInquiriesByName,
  countLegacyInquiries,
  relinkLegacyInquiries,
} from "@/lib/partner-rename";
import {
  canTransitionPartnerStatus,
  type PartnerAccount,
  type PartnerStatus,
} from "@/lib/partner";
import {
  RENTAL_FEE_EXAMPLE_BASE_CENTS,
  computeRentalFee,
  rentalFeeConfigFromPartner,
  type PartnerFeeColumns,
  type RentalFeeMode,
  type RentalFeePayer,
} from "@/lib/fees";
import {
  readCentsField,
  readCommissionRate,
  readEnumField,
} from "@/lib/partner-fee-body";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// How many not-yet-onboarded accounts one GET will poll Stripe for.
// Keeps the roster load O(1)-ish even if ops bulk-adds operators.
const REFRESH_CAP = 5;

// Everything the admin review UI shows, including the partner_id
// bridge. Distinct from /api/partner/me's partner-facing selection
// only in audience — the columns themselves are not secret to admins.
const APPLICATION_COLS =
  "user_id, company_name, contact_name, contact_email, phone, website, fleet_size, market, status, status_note, approved_at, partner_id, created_at, updated_at";

type PartnerRow = {
  id: string;
  name: string;
  contact_email: string | null;
  market: string;
  commission_rate: number;
  stripe_account_id: string | null;
  stripe_onboarded_at: string | null;
  status: "active" | "paused";
  created_at: string;
  // Fee terms (0048). Optional on the type because a database that has
  // not had 0048 applied returns rows without them — the fee engine
  // resolves that absence to today's percent / operator-pays behavior
  // rather than throwing, and the POST below only writes these keys
  // when a caller actually sends one.
  fee_mode?: RentalFeeMode | null;
  fee_flat_cents?: number | null;
  fee_payer?: RentalFeePayer | null;
  fee_floor_cents?: number | null;
  fee_cap_cents?: number | null;
  [key: string]: unknown;
};

// Postgres/PostgREST text when the fee columns are missing — i.e. 0048
// has not been applied here. Distinguished from a real failure so the
// admin is told which migration to run instead of reading a raw error.
const FEE_COLUMN_RE = /fee_mode|fee_payer|fee_flat_cents|fee_floor_cents|fee_cap_cents/i;

function feeSchemaHint(message: string | undefined): string {
  const raw = message?.trim() || "unknown";
  return FEE_COLUMN_RE.test(raw) && /column|schema cache|does not exist/i.test(raw)
    ? `${raw}. The operator fee-terms columns are missing — apply migration 0048 (operator approval required).`
    : raw;
}

/** The worked example, flattened for the audit log. Cents on purpose —
 *  the audit trail should never carry a rounded dollar figure that
 *  cannot be reconciled back to the charge. */
function describeFeeExample(example: ReturnType<typeof computeRentalFee>) {
  return {
    base_amount_cents: example.baseAmountCents,
    fee_cents: example.feeCents,
    fee_payer: example.feePayer,
    renter_total_cents: example.renterTotalCents,
    operator_net_cents: example.operatorNetCents,
    ...(example.clampedBy
      ? { clamped_by: example.clampedBy, raw_fee_cents: example.rawFeeCents }
      : {}),
  };
}

/** Everything an admin needs to decide whether linking an application
 *  to a PRE-EXISTING operator is legitimate. Admin-only route, so the
 *  commercial terms are fine here (GET already returns whole rows) —
 *  this must never be mirrored into /api/partner/me. */
type OperatorDisclosure = {
  id: string;
  name: string;
  market: string;
  status: "active" | "paused";
  contact_email: string | null;
  commission_rate: number;
  stripe_account_id: string | null;
  stripeOnboarded: boolean;
  created_at: string;
  /** null when rental_payments can't be read (pre-0041 environment). */
  payments: { total: number; paid: number } | null;
  /** Approved applications ALREADY bridged to this operator. */
  linkedApprovedApplications: number;
};

async function describeOperator(
  db: SupabaseClient,
  op: PartnerRow,
): Promise<OperatorDisclosure> {
  // Both counts are best-effort: a disclosure that loses one number is
  // far better than an approval that 500s.
  let payments: { total: number; paid: number } | null = null;
  const pay = await db
    .from("rental_payments")
    .select("status")
    .eq("partner_id", op.id);
  if (!pay.error && pay.data) {
    const rows = pay.data as { status: string }[];
    payments = {
      total: rows.length,
      paid: rows.filter((r) => r.status === "paid").length,
    };
  }
  const linked = await db
    .from("partner_accounts")
    .select("user_id", { count: "exact", head: true })
    .eq("partner_id", op.id)
    .eq("status", "approved");
  return {
    id: op.id,
    name: op.name,
    market: op.market,
    status: op.status,
    contact_email: op.contact_email,
    commission_rate: op.commission_rate,
    stripe_account_id: op.stripe_account_id,
    stripeOnboarded: Boolean(op.stripe_onboarded_at),
    created_at: op.created_at,
    payments,
    linkedApprovedApplications: linked.error ? 0 : (linked.count ?? 0),
  };
}

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Backend not configured — Supabase env is absent in this environment." },
      { status: 503 },
    );
  }

  const list = await db.from("partners").select("*").order("name");
  if (list.error) {
    // Pre-0041 window included: surface the raw message at 500 — the
    // admin UI matches "does not exist" / "schema cache" to show its
    // run-migration hint (503 is reserved for env-not-configured).
    // 0042 sequences after 0041, so a missing partners table implies
    // the applications table is missing too — one hint covers both.
    return NextResponse.json(
      { error: `Database error: ${list.error.message}` },
      { status: 500 },
    );
  }
  const partners = (list.data ?? []) as PartnerRow[];

  // Applications ride along best-effort: the roster (0041) can exist
  // before 0042 is applied, so a missing partner_accounts relation
  // degrades to applicationsError instead of failing the roster.
  let applications: PartnerAccount[] = [];
  let applicationsError: string | null = null;
  const apps = await db
    .from("partner_accounts")
    .select(APPLICATION_COLS)
    .order("created_at", { ascending: false });
  if (apps.error) {
    applicationsError = apps.error.message;
  } else {
    applications = (apps.data ?? []) as unknown as PartnerAccount[];
  }

  // Best-effort onboarded refresh (see route header). Capture the
  // narrowed client for the closures below.
  const stripeClient = stripe;
  const stale = partners
    .filter((p) => p.stripe_account_id && !p.stripe_onboarded_at)
    .slice(0, REFRESH_CAP);
  if (stripeClient && stale.length > 0) {
    await Promise.all(
      stale.map(async (p) => {
        try {
          const account = await stripeClient.accounts.retrieve(
            p.stripe_account_id as string,
          );
          if (account.charges_enabled) {
            const stampedAt = new Date().toISOString();
            const stamp = await db
              .from("partners")
              .update({ stripe_onboarded_at: stampedAt })
              .eq("id", p.id)
              // Idempotent under concurrent GETs — first stamp wins.
              .is("stripe_onboarded_at", null);
            if (stamp.error) {
              console.warn("[admin partners · onboarded stamp]", stamp.error);
            } else {
              p.stripe_onboarded_at = stampedAt;
            }
          }
        } catch (err) {
          // A deleted/restricted account or a Stripe blip must not
          // break the roster — the row just stays "Onboarding sent".
          console.warn("[admin partners · onboarded refresh]", p.id, err);
        }
      }),
    );
  }

  // Has 0048 been applied here? Migrations are proposed by code and
  // applied by a human (AGENTS.md), so there is a real window in which
  // this route ships before the columns exist — and during it the
  // editor must not POST fee_mode and break the commission edit that
  // worked yesterday. `select("*")` above already answers the question
  // whenever a row exists; the probe is only for an empty roster.
  let feeConfigReady = partners.length > 0
    ? Object.prototype.hasOwnProperty.call(partners[0], "fee_mode")
    : false;
  if (partners.length === 0) {
    const probe = await db.from("partners").select("fee_mode").limit(1);
    feeConfigReady = !probe.error;
  }

  return NextResponse.json({
    partners: partners.map((p) => ({
      ...p,
      // Computed convenience state; the UI derives its own chips from
      // the raw columns, API-first consumers get this ready-made.
      onboarding: !p.stripe_account_id
        ? "not_started"
        : p.stripe_onboarded_at
          ? "complete"
          : "pending",
    })),
    applications,
    applicationsError,
    stripeConfigured: !!stripe,
    // Drives the Operators tab: with 0048 applied the full fee-terms
    // editor renders; without it, only the commission-% control, so the
    // page keeps working against an un-migrated database instead of
    // 500-ing on an unknown column.
    feeConfigReady,
  });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Backend not configured — Supabase env is absent in this environment." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // The admin UI sends snake_case (and an id when editing an existing
  // row); camelCase accepted for API-first callers.
  const id = typeof body.id === "string" && UUID_RE.test(body.id) ? body.id : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) {
    return NextResponse.json({ error: "name: required." }, { status: 400 });
  }

  // Ops note from the roster UI's confirm modal. partners.status is a
  // partner-program lifecycle field (PATCH's suspension writes 'paused'
  // and the documented way back is this route with status 'active'), so
  // "who resumed this operator / who cut their commission, when, why"
  // has to be answerable from the audit log — see the audit writes below.
  const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";

  const rawEmail = body.contact_email ?? body.contactEmail;
  const contactEmail =
    typeof rawEmail === "string" && rawEmail.trim()
      ? rawEmail.trim().toLowerCase()
      : null;
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json(
      { error: "contact_email: not a valid email address." },
      { status: 400 },
    );
  }

  // The rate, read by src/lib/partner-fee-body.ts: bounded by the
  // imported ceiling (which the 0048 CHECK, computeRentalFee and the
  // admin form all share), refused rather than coerced when it is not a
  // number — Number('') is 0, and a 0% commission written from an empty
  // field earns RYDA nothing on every future booking — and refused when
  // it is finer than numeric(4,3) can store, because a rate that gets
  // re-rounded on write makes every later charge differ from the preview
  // and the audit entry that approved it.
  const commissionRateField = readCommissionRate(body);
  if (!commissionRateField.ok) {
    return NextResponse.json(
      { error: commissionRateField.error },
      { status: 400 },
    );
  }
  const commissionRate = commissionRateField.provided
    ? commissionRateField.value
    : null;

  // ── fee terms (0048 / D2) ───────────────────────────────────────────
  // Parsed for SHAPE here; validated for COHERENCE after the lookup,
  // because "is this a legal set of terms" is a question about the row
  // as it will exist, not about this request in isolation — flipping an
  // operator to flat mode is legal only if a flat amount is already on
  // the row or arrives in the same call.
  const feeModeField = readEnumField<RentalFeeMode>(body, "fee_mode", "feeMode", [
    "percent",
    "flat",
  ]);
  const feePayerField = readEnumField<RentalFeePayer>(
    body,
    "fee_payer",
    "feePayer",
    ["operator", "renter"],
  );
  const feeFlatField = readCentsField(body, "fee_flat_cents", "feeFlatCents");
  const feeFloorField = readCentsField(body, "fee_floor_cents", "feeFloorCents");
  const feeCapField = readCentsField(body, "fee_cap_cents", "feeCapCents");
  // Checked one at a time rather than in a loop so TypeScript narrows
  // each variable to its ok branch for the rest of the handler.
  if (!feeModeField.ok)
    return NextResponse.json({ error: feeModeField.error }, { status: 400 });
  if (!feePayerField.ok)
    return NextResponse.json({ error: feePayerField.error }, { status: 400 });
  if (!feeFlatField.ok)
    return NextResponse.json({ error: feeFlatField.error }, { status: 400 });
  if (!feeFloorField.ok)
    return NextResponse.json({ error: feeFloorField.error }, { status: 400 });
  if (!feeCapField.ok)
    return NextResponse.json({ error: feeCapField.error }, { status: 400 });

  // Pause/resume — mirrors the 0041 status check constraint. Paused
  // partners keep their roster row but the payment-link route refuses
  // new bookings for them.
  const rawStatus = body.status;
  const status =
    rawStatus === undefined || rawStatus === null
      ? null
      : rawStatus === "active" || rawStatus === "paused"
        ? rawStatus
        : "invalid";
  if (status === "invalid") {
    return NextResponse.json(
      { error: "status: must be 'active' or 'paused'." },
      { status: 400 },
    );
  }

  // Create-or-link: find the existing row (by id when the UI sends
  // one, else by the unique name) and patch only the provided fields —
  // a rate edit must not clobber a contact email and vice versa.
  const lookup = id
    ? await db.from("partners").select("*").eq("id", id).maybeSingle()
    : await db.from("partners").select("*").eq("name", name).maybeSingle();
  if (lookup.error) {
    return NextResponse.json(
      {
        error: `Partners schema not ready or query failed: ${lookup.error.message}. If the table does not exist, apply migration 0041 (operator approval required).`,
      },
      { status: 500 },
    );
  }
  const existingRow = (lookup.data as PartnerRow | null) ?? null;

  // ── the fee-terms patch, validated as the row WILL be ───────────────
  //
  // Only the keys a caller actually sent are written, for the same
  // reason the rest of this handler patches narrowly: a pause toggle
  // and an inline commission edit both POST the whole row identity, and
  // neither may reset an operator's fee terms as a side effect. It also
  // keeps every pre-0048 flow working against a database that has not
  // had the migration applied — no fee_* key in the patch, no unknown
  // column in the write.
  const feePatch: Record<string, unknown> = {};
  if (feeModeField.provided) feePatch.fee_mode = feeModeField.value;
  if (feePayerField.provided) feePatch.fee_payer = feePayerField.value;
  if (feeFlatField.provided) feePatch.fee_flat_cents = feeFlatField.value;
  if (feeFloorField.provided) feePatch.fee_floor_cents = feeFloorField.value;
  if (feeCapField.provided) feePatch.fee_cap_cents = feeCapField.value;

  const effectiveMode = (feePatch.fee_mode ??
    existingRow?.fee_mode ??
    "percent") as RentalFeeMode;

  // Switching back to a percent rate RETIRES the flat amount rather than
  // 400-ing on it. 0048's coherence CHECK forbids a percent row from
  // carrying a flat fee — precisely so the row always answers "which
  // number is live?" — and the alternative here is an error the admin
  // cannot act on ("clear a field you can no longer see"). The discard
  // is not silent: it lands in the audit entry's before/after like any
  // other changed column.
  if (
    effectiveMode === "percent" &&
    !feeFlatField.provided &&
    existingRow?.fee_flat_cents != null
  ) {
    feePatch.fee_flat_cents = null;
  }

  const pick = <T,>(key: string, fallback: T | null | undefined): T | null =>
    key in feePatch ? (feePatch[key] as T | null) : ((fallback ?? null) as T | null);

  // The row as it will exist after this write. Coherence is a property
  // of THAT, not of this request: flipping an operator to flat mode is
  // legal only if a flat amount is already on the row or arrives in the
  // same call, and only the merged view can tell.
  const effectiveFee: PartnerFeeColumns = {
    commission_rate: commissionRate ?? existingRow?.commission_rate ?? null,
    fee_mode: effectiveMode,
    fee_flat_cents: pick<number>("fee_flat_cents", existingRow?.fee_flat_cents),
    fee_payer: pick<RentalFeePayer>("fee_payer", existingRow?.fee_payer) ?? "operator",
    fee_floor_cents: pick<number>("fee_floor_cents", existingRow?.fee_floor_cents),
    fee_cap_cents: pick<number>("fee_cap_cents", existingRow?.fee_cap_cents),
  };

  // Validated by the FEE ENGINE, not by a second copy of its rules.
  // resolveRentalFeeConfig is the same code path computeRentalFee runs
  // internally and it enforces exactly what 0048's CHECK constraints
  // enforce, so a config this route accepts is one the row accepts and
  // one the admin preview renders identically. Per-BOOKING conditions
  // (a flat operator-paid fee larger than some particular base) are
  // deliberately not asserted here — they depend on a rental this route
  // has never seen. computeRentalFee refuses those at quote time, and
  // the admin form's worked example shows them before the save.
  let feeExample: ReturnType<typeof computeRentalFee> | null = null;
  try {
    feeExample = computeRentalFee(
      RENTAL_FEE_EXAMPLE_BASE_CENTS,
      rentalFeeConfigFromPartner(effectiveFee),
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // The engine's messages already name the offending field
    // ("flatCents is required when mode is 'flat'"), so pass them
    // through rather than flattening every cause into one sentence.
    const clean = detail.replace(/^computeRentalFee:\s*/, "");
    // A config that is coherent but simply cannot survive the $2,000
    // reference booking (an operator-paid flat fee bigger than the
    // rental) is a real, saveable term for an expensive fleet — it is
    // not a validation failure, so it must not 400 here.
    if (/exceeds the .* base/.test(clean)) {
      feeExample = null;
    } else {
      return NextResponse.json({ error: `Fee terms — ${clean}` }, { status: 400 });
    }
  }

  if (lookup.data) {
    const patch: Record<string, unknown> = { ...feePatch };
    // Set by the rename guard below so the audit entry records what the
    // rename actually did, not just that it happened.
    let relinkedInquiries = 0;
    let fleetCodeConfirmed = false;
    if (id && name !== lookup.data.name) {
      // Rename guard, NARROWED by migration 0045.
      //
      // Existing leads no longer break on a rename: rental_inquiries now
      // carry partner_id and the pay-link route resolves through it
      // (src/lib/partner-resolution.ts), so the snapshotted partner_name
      // is a historical label, not a lookup key. What is still coupled
      // to the string is code, not data — so the guard now blocks only
      // that, and only the rows the FK genuinely cannot cover.
      const oldName = String(lookup.data.name);
      const operatorId = String(lookup.data.id);

      // (1) The code-level fleet. partner-fleet.ts hard-codes the
      // operator name on every partner vehicle, so it is the name each
      // NEW inquiry gets stamped with and resolved by at capture time;
      // partner-contacts.ts keys its lead-routing inbox map on the same
      // string. Rename the roster row without editing both and new leads
      // land with a null partner_id and an unresolvable name.
      //
      // A CONFIRMATION, not a wall. Every name that can reach
      // rental_inquiries.partner_name comes from PARTNER_VEHICLES
      // (resolveRentalVehicle copies `.partner`; the anon POST body
      // cannot supply it), so a hard block here made every operator that
      // can own a lead permanently un-renameable — i.e. it re-imposed
      // exactly the coupling 0045 removed, one layer up. Same idiom as
      // the approval bridge's linkExistingOperatorId: disclose the
      // consequence, write nothing, and let a second request that
      // carries confirmFleetCodeRename proceed.
      const fleetNames = new Set<string>(
        PARTNER_VEHICLES.map((v) => v.partner),
      );
      if (fleetNames.has(oldName)) {
        if (body.confirmFleetCodeRename !== true) {
          return NextResponse.json(
            {
              error: `"${oldName}" is hard-coded in src/lib/partner-fleet.ts (on every one of its vehicles) and in src/lib/partner-contacts.ts (lead routing). Existing inquiries are safe — they link by partner_id since migration 0045 — but every NEW lead is stamped with the code's string, so until both files are updated and deployed new leads will land with no partner_id and an unresolvable name. Re-send with confirmFleetCodeRename to rename anyway.`,
              requiresFleetCodeConfirmation: true,
              codeReferences: [
                "src/lib/partner-fleet.ts",
                "src/lib/partner-contacts.ts",
              ],
            },
            { status: 409 },
          );
        }
        fleetCodeConfirmed = true;
      }

      // (2) Legacy leads only: rows still carrying this name with NO
      // partner_id. Those are the ones that would genuinely orphan —
      // they predate 0045 or its backfill could not prove them. Rows
      // that carry the FK are deliberately not counted; blocking on them
      // is the coupling this migration removed.
      const verdict = classifyLegacyCount(
        await countLegacyInquiries(db, oldName),
      );
      if (verdict.kind === "lookup_failed") {
        // Can't verify → refuse the rename rather than risk orphaning
        // in-flight leads.
        return NextResponse.json(
          { error: `Cannot verify the rename is safe: ${verdict.message}` },
          { status: 500 },
        );
      }
      if (verdict.kind === "pre_fk") {
        // Pre-0045 environment: no FK exists, so EVERY referencing row
        // is still name-coupled — the original guard, unchanged, until
        // the migration is applied. Not relinkable here: there is no
        // column to write.
        const all = await countInquiriesByName(db, oldName);
        if (all.error) {
          return NextResponse.json(
            {
              error: `Cannot verify the rename is safe: ${all.error.message?.trim() || "the database returned no diagnostic"}`,
            },
            { status: 500 },
          );
        }
        if ((all.count ?? 0) > 0) {
          return NextResponse.json(
            {
              error: `Cannot rename "${oldName}" — ${all.count} inquiry(ies) reference that name and migration 0045 (rental_inquiries.partner_id) has not been applied here, so they have no other link to this operator. Apply 0045 (operator approval required), then rename.`,
            },
            { status: 409 },
          );
        }
      } else if (verdict.count > 0) {
        // Relinkable, and this route is the only place with both halves
        // of the join in hand — so offer the fix instead of naming a
        // backfill the admin has no way to re-run (it lives in the body
        // of an applied migration; there is no route, script or npm
        // task for it). Confirmed explicitly because it writes rows
        // outside the one the admin thinks they are editing.
        if (body.relinkLegacyInquiries !== true) {
          return NextResponse.json(
            {
              error: `${verdict.count} inquiry(ies) still reference "${oldName}" by name alone (no partner_id) — most likely captured while the operator lookup was failing. Renaming now would orphan them and their payment links would 404 as "not onboarded". Re-send with relinkLegacyInquiries to link them to this operator first (the same exact-name join migration 0045 backfills with), then the rename proceeds.`,
              requiresLegacyRelink: true,
              legacyCount: verdict.count,
            },
            { status: 409 },
          );
        }
        // Runs BEFORE the name changes, so the join still matches.
        const relink = await relinkLegacyInquiries(db, oldName, operatorId);
        if (relink.error) {
          return NextResponse.json(
            {
              error: `Could not link the ${verdict.count} name-only inquiry(ies) to this operator, so the rename was not applied: ${relink.error.message?.trim() || "the database returned no diagnostic"}`,
            },
            { status: 500 },
          );
        }
        relinkedInquiries = verdict.count;
      }
      patch.name = name;
    }
    if (contactEmail !== null) patch.contact_email = contactEmail;
    if (commissionRate !== null) patch.commission_rate = commissionRate;
    if (status !== null) patch.status = status;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ partner: lookup.data, created: false });
    }
    const before = lookup.data as PartnerRow;
    const updated = await db
      .from("partners")
      .update(patch)
      .eq("id", lookup.data.id)
      .select("*")
      .single();
    if (updated.error || !updated.data) {
      console.error("[admin partners · update]", updated.error);
      return NextResponse.json(
        { error: `Update failed: ${feeSchemaHint(updated.error?.message)}` },
        { status: 500 },
      );
    }
    await recordAdminAction(db, {
      adminUserId: adminUser.id,
      action: "partner_operator_updated",
      targetType: "partner",
      targetId: before.id,
      details: {
        name: before.name,
        // Before/after on every changed field — commission_rate is the
        // application fee on every live charge and status is the
        // pause/resume switch; both need a durable "from → to".
        changed: Object.fromEntries(
          Object.keys(patch).map((k) => [
            k,
            { from: before[k] ?? null, to: patch[k] ?? null },
          ]),
        ),
        // A rename can take two side effects with it, both explicitly
        // confirmed by the caller and neither visible on the row: rows
        // in another table were re-pointed, and/or the admin accepted
        // that the code still says the old name.
        ...(relinkedInquiries > 0
          ? { relinked_inquiries: relinkedInquiries }
          : {}),
        ...(fleetCodeConfirmed ? { fleet_code_rename_confirmed: true } : {}),
        // The terms, worked through one concrete booking. A row of
        // columns ("fee_mode: flat, fee_flat_cents: 25000") does not
        // answer "what did this change cost the operator" a year later;
        // "on a $2,000 booking the renter paid $2,000 and the operator
        // received $1,750" does. Same function, same example, and the
        // same number the admin saw in the preview before clicking save.
        ...(feeExample && Object.keys(feePatch).length > 0
          ? { fee_example: describeFeeExample(feeExample) }
          : {}),
        note: note || undefined,
      },
    });
    return NextResponse.json({ partner: updated.data, created: false });
  }

  const inserted = await db
    .from("partners")
    .insert({
      name,
      // Omitted fields take the 0041/0048 defaults (commission 0.150,
      // status 'active', market 'Miami', fee_mode 'percent', fee_payer
      // 'operator', no clamps) — i.e. a new operator created without
      // fee terms gets exactly the terms every operator had before D2.
      ...(contactEmail !== null ? { contact_email: contactEmail } : {}),
      ...(commissionRate !== null ? { commission_rate: commissionRate } : {}),
      ...(status !== null ? { status } : {}),
      ...feePatch,
    })
    .select("*")
    .single();
  if (inserted.error || !inserted.data) {
    // 23505 on the unique name → two admins raced the same create.
    // The row exists, which is what the caller wanted — link to it.
    const code = (inserted.error as { code?: string } | null)?.code;
    if (code === "23505") {
      const existing = await db
        .from("partners")
        .select("*")
        .eq("name", name)
        .maybeSingle();
      if (existing.data) {
        return NextResponse.json({ partner: existing.data, created: false });
      }
    }
    console.error("[admin partners · insert]", inserted.error);
    return NextResponse.json(
      {
        error: `Create failed: ${feeSchemaHint(inserted.error?.message)}. If the partners table does not exist, apply migration 0041 (operator approval required).`,
      },
      { status: 500 },
    );
  }
  const createdRow = inserted.data as PartnerRow;
  await recordAdminAction(db, {
    adminUserId: adminUser.id,
    action: "partner_operator_created",
    targetType: "partner",
    targetId: createdRow.id,
    details: {
      name: createdRow.name,
      contact_email: createdRow.contact_email,
      commission_rate: createdRow.commission_rate,
      fee_mode: createdRow.fee_mode ?? null,
      fee_flat_cents: createdRow.fee_flat_cents ?? null,
      fee_payer: createdRow.fee_payer ?? null,
      fee_floor_cents: createdRow.fee_floor_cents ?? null,
      fee_cap_cents: createdRow.fee_cap_cents ?? null,
      ...(feeExample ? { fee_example: describeFeeExample(feeExample) } : {}),
      source: "operators_tab",
      note: note || undefined,
    },
  });
  return NextResponse.json({ partner: inserted.data, created: true });
}

// ── application review (the approval bridge) ─────────────────────────

export async function PATCH(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Backend not configured — Supabase env is absent in this environment." },
      { status: 503 },
    );
  }

  let body: {
    userId?: string;
    status?: string;
    note?: string;
    expectedCompanyName?: string;
    linkExistingOperatorId?: string;
    pauseOperator?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const note = (body.note ?? "").toString().slice(0, 1000);

  if (!UUID_RE.test(userId)) {
    return NextResponse.json(
      { error: "userId must be a UUID." },
      { status: 400 },
    );
  }
  if (body.status !== "approved" && body.status !== "suspended") {
    return NextResponse.json(
      { error: "status must be 'approved' or 'suspended'." },
      { status: 400 },
    );
  }
  const to = body.status as PartnerStatus;

  // The name the admin actually reviewed. Required on approval: the
  // applicant can rewrite company_name through /api/partner/me between
  // the roster's GET and this PATCH, and company_name is what the
  // bridge below joins the operator on.
  const expectedCompanyName =
    typeof body.expectedCompanyName === "string"
      ? body.expectedCompanyName.trim()
      : null;
  if (to === "approved" && !expectedCompanyName) {
    return NextResponse.json(
      {
        error:
          "expectedCompanyName is required to approve — send the company name shown in the review UI so the server can refuse if the applicant changed it.",
      },
      { status: 400 },
    );
  }

  // Deliberate confirmation that this application may be bridged to an
  // ALREADY-EXISTING operator row (see the route header).
  const linkExistingOperatorId =
    typeof body.linkExistingOperatorId === "string" &&
    UUID_RE.test(body.linkExistingOperatorId)
      ? body.linkExistingOperatorId
      : null;

  const pauseOperator = body.pauseOperator === true;

  const { data: app, error: getErr } = await db
    .from("partner_accounts")
    .select("user_id, status, company_name, contact_email, market, partner_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (getErr) {
    // Raw message on purpose: a missing partner_accounts relation
    // matches the UI's run-migration regex (0042 hint).
    return NextResponse.json({ error: getErr.message }, { status: 500 });
  }
  if (!app) {
    return NextResponse.json(
      { error: "Partner application not found." },
      { status: 404 },
    );
  }

  const from = app.status as PartnerStatus;
  if (!canTransitionPartnerStatus(from, to)) {
    return NextResponse.json(
      { error: `Cannot change status ${from} → ${to}.` },
      { status: 400 },
    );
  }

  // The application must still be the one the admin reviewed. Applicants
  // own company_name (free text, rewritable at any status through
  // /api/partner/me) and the approval bridge joins operators on it, so a
  // swap between page load and click would approve a different company
  // than the modal described — and the audit entry would record the
  // substituted value.
  if (to === "approved" && app.company_name !== expectedCompanyName) {
    return NextResponse.json(
      {
        error: `This application changed since you loaded it — the company is now "${app.company_name}", you reviewed "${expectedCompanyName}". Reload and review it again.`,
        staleApplication: true,
        companyName: app.company_name,
      },
      { status: 409 },
    );
  }

  // ON APPROVAL, resolve the operator BEFORE touching the application
  // so the CAS update below can stamp partner_id atomically with the
  // status flip. Order of preference:
  //   1. the already-bridged row (reinstating a suspended application
  //      must keep its history-bearing operator, not mint a twin) —
  //      no re-confirmation: that link was confirmed when it was made
  //   2. an existing roster row with the same unique name — the
  //      collision case. NEVER automatic: 409 with a full disclosure
  //      unless this request carries linkExistingOperatorId for
  //      exactly that row
  //   3. a fresh row seeded from the application's contact details
  // Seeding applies only to CREATE — an existing operator's ops-edited
  // contact_email/market are never clobbered by an application.
  let operator: PartnerRow | null = null;
  // Non-null only when THIS request created the roster row, so a lost
  // CAS race below can roll it back instead of leaving a live,
  // Stripe-onboardable operator named after a declined applicant.
  let createdOperatorId: string | null = null;
  let bridge: "existing_link" | "linked_confirmed" | "created" | null = null;
  if (to === "approved") {
    if (app.partner_id) {
      const linked = await db
        .from("partners")
        .select("*")
        .eq("id", app.partner_id)
        .maybeSingle();
      if (linked.error) {
        return NextResponse.json({ error: linked.error.message }, { status: 500 });
      }
      // A deleted operator row (partner_id would normally be nulled by
      // the FK, but be defensive) falls through to the name match.
      operator = (linked.data as PartnerRow | null) ?? null;
      if (operator) bridge = "existing_link";
    }
    if (!operator) {
      const found = await db
        .from("partners")
        .select("*")
        .eq("name", app.company_name)
        .maybeSingle();
      if (found.error) {
        return NextResponse.json(
          {
            error: `Operators schema not ready or query failed: ${found.error.message}. If the partners table does not exist, apply migration 0041 (operator approval required).`,
          },
          { status: 500 },
        );
      }
      const match = (found.data as PartnerRow | null) ?? null;
      if (match) {
        // THE COLLISION. company_name is applicant-controlled free text
        // and partners.name is UNIQUE, so "an operator with this exact
        // name already exists" means this approval would hand a stranger's
        // auth user the Stripe Connect account another company's rental
        // money settles into. Disclose and stop; write nothing.
        if (linkExistingOperatorId !== match.id) {
          return NextResponse.json(
            {
              error: `An operator named "${match.name}" already exists. Approving this application would link it to that existing operator — confirm the link explicitly if that is what you intend.`,
              requiresLinkConfirmation: true,
              operator: await describeOperator(db, match),
            },
            { status: 409 },
          );
        }
        operator = match;
        bridge = "linked_confirmed";
      }
    }
    if (!operator) {
      // No match — so a confirmation for one is stale (the roster
      // changed, or the applicant renamed themselves out of the match
      // the admin was shown). Refuse rather than quietly creating.
      if (linkExistingOperatorId) {
        return NextResponse.json(
          {
            error:
              "The operator you confirmed no longer matches this application. Reload and review it again.",
            staleApplication: true,
            companyName: app.company_name,
          },
          { status: 409 },
        );
      }
      const seeded = await db
        .from("partners")
        .insert({
          name: app.company_name,
          ...(app.contact_email ? { contact_email: app.contact_email } : {}),
          market: app.market,
          // commission_rate/status take the 0041 defaults (15%,
          // active) — commercial terms are set on the Operators tab,
          // never by the applicant.
        })
        .select("*")
        .single();
      if (seeded.error || !seeded.data) {
        // 23505 on the unique name → a concurrent approval (or a
        // roster add) won the create between our lookup and this
        // insert. That is the collision case again, arrived at by a
        // race: disclose it instead of adopting the row silently.
        const code = (seeded.error as { code?: string } | null)?.code;
        if (code === "23505") {
          const existing = await db
            .from("partners")
            .select("*")
            .eq("name", app.company_name)
            .maybeSingle();
          const raced = (existing.data as PartnerRow | null) ?? null;
          if (raced) {
            return NextResponse.json(
              {
                error: `An operator named "${raced.name}" was created while you were reviewing. Confirm the link explicitly if this application belongs to it.`,
                requiresLinkConfirmation: true,
                operator: await describeOperator(db, raced),
              },
              { status: 409 },
            );
          }
        }
        console.error("[admin partners · bridge create]", seeded.error);
        return NextResponse.json(
          { error: `Could not create the operator entry: ${seeded.error?.message ?? "unknown"}` },
          { status: 500 },
        );
      }
      operator = seeded.data as PartnerRow;
      createdOperatorId = operator.id;
      bridge = "created";
    }
  }

  // status_note is partner-visible (returned by /api/partner/me and
  // readable under the row's own-select RLS policy), so it only holds
  // the suspension notice. Approve notes stay in the audit log below —
  // never on a row the subject of the review can read.
  const update: Record<string, unknown> = {
    status: to,
    status_note: to === "suspended" ? note || null : null,
  };
  if (to === "approved") {
    update.approved_at = new Date().toISOString();
    update.partner_id = operator!.id;
  }

  // Compare-and-swap on the status we validated against: if another
  // admin's change landed between our read and this write, zero rows
  // match and we 409 instead of silently overwriting their decision.
  // On approval the swap also pins company_name, closing the last
  // window: the applicant can rewrite it (via /api/partner/me) between
  // our read and this write, which would otherwise approve a row whose
  // company no longer matches the operator we just bridged it to.
  let cas = db
    .from("partner_accounts")
    .update(update)
    .eq("user_id", userId)
    .eq("status", from);
  if (to === "approved") cas = cas.eq("company_name", app.company_name);
  const { data: updated, error: updErr } = await cas.select(APPLICATION_COLS);
  if (updErr || !updated || updated.length === 0) {
    // The bridge may have created a roster row moments ago. The roster
    // is keyed by NAME and the payment-link route resolves operators by
    // name alone, so an orphan here is not "an unlinked roster row" —
    // it is a live, Stripe-onboardable operator named after an
    // applicant whose approval never landed (they may have just been
    // declined by the admin who won the race). Roll it back. Safe by
    // construction: we created it in this request, so it carries no
    // payment history and nothing links to it yet.
    if (createdOperatorId) {
      const rollback = await db
        .from("partners")
        .delete()
        .eq("id", createdOperatorId)
        .is("stripe_account_id", null);
      if (rollback.error) {
        console.error(
          "[admin partners · bridge rollback]",
          createdOperatorId,
          rollback.error,
        );
      }
    }
    if (updErr) {
      console.error("[admin/partners · update]", updErr);
      return NextResponse.json(
        { error: "Failed to update partner status." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error:
          "This application changed while you were reviewing it (status or company name) — reload and retry.",
        staleApplication: true,
      },
      { status: 409 },
    );
  }
  const application = updated[0] as unknown as PartnerAccount;

  // ON SUSPENSION: never delete the operator (it may carry payment
  // history) and never pause it implicitly. Operators have their own
  // lifecycle — ops can create them directly on the Operators tab (and
  // 0041 seeds one), so those rows have ZERO partner_accounts pointing
  // at them and "no other approved application links to it" is
  // trivially true for every one of them. Pausing on that test alone
  // let a declined application halt an established operator's payment
  // links, one-way (reinstating does not resume). So: pause only when
  // the admin explicitly asked (pauseOperator), and even then only when
  // no OTHER approved application shares the operator.
  //
  // Best-effort: a failure here leaves the operator active, visible
  // (and pausable) on the Operators tab.
  let operatorPaused = false;
  let operatorPauseSkipped: "not_requested" | "shared" | null = null;
  if (to === "suspended" && app.partner_id) {
    if (!pauseOperator) {
      operatorPauseSkipped = "not_requested";
    } else {
      const others = await db
        .from("partner_accounts")
        .select("user_id", { count: "exact", head: true })
        .eq("partner_id", app.partner_id)
        .eq("status", "approved");
      if (others.error) {
        console.warn("[admin partners · pause check]", others.error);
      } else if ((others.count ?? 0) > 0) {
        operatorPauseSkipped = "shared";
      } else {
        const paused = await db
          .from("partners")
          .update({ status: "paused" })
          .eq("id", app.partner_id)
          .select("*")
          .maybeSingle();
        if (paused.error) {
          console.warn("[admin partners · pause]", paused.error);
        } else {
          operator = (paused.data as PartnerRow | null) ?? null;
          operatorPaused = operator !== null;
        }
      }
    }
    if (!operator) {
      const linked = await db
        .from("partners")
        .select("*")
        .eq("id", app.partner_id)
        .maybeSingle();
      operator = (linked.data as PartnerRow | null) ?? null;
    }
  }

  await recordAdminAction(db, {
    adminUserId: adminUser.id,
    action: "partner_status_changed",
    targetType: "partner_account",
    targetId: userId,
    details: {
      company_name: app.company_name,
      prior_status: from,
      new_status: to,
      note: note || undefined,
      ...(operator ? { partner_id: operator.id, operator_name: operator.name } : {}),
      // How the operator got attached matters after the fact: "linked
      // to an operator that already existed" is the reviewable event.
      ...(bridge ? { bridge } : {}),
      ...(to === "suspended" && app.partner_id
        ? { operator_paused: operatorPaused }
        : {}),
    },
  });

  // Both records: the reviewed application and the bridged operator
  // (null when a suspension had nothing linked). Admin-only response,
  // so the full operator row — commission and Stripe state included —
  // is fine here, unlike /api/partner/me.
  return NextResponse.json({
    ok: true,
    userId,
    status: to,
    application,
    operator,
    // What the API actually did to the operator, so the UI can report
    // it instead of asserting it.
    bridge,
    operatorPaused,
    operatorPauseSkipped,
  });
}
