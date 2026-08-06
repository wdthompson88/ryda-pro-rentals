// GET  /api/admin/partners — operator roster + Stripe onboarding state.
// POST /api/admin/partners — create-or-link a partner (upsert by name).
//
// Admin-only via requireAdmin + service-role client: partners rows
// hold ops-sensitive commercial terms (commission rates, Stripe
// account ids, contact emails) that must never reach the browser
// through any public path — 0041 defines no anon/authenticated RLS
// policies on purpose.
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

import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PARTNER_VEHICLES } from "@/lib/partner-fleet";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// How many not-yet-onboarded accounts one GET will poll Stripe for.
// Keeps the roster load O(1)-ish even if ops bulk-adds operators.
const REFRESH_CAP = 5;

type PartnerRow = {
  id: string;
  name: string;
  contact_email: string | null;
  commission_rate: number;
  stripe_account_id: string | null;
  stripe_onboarded_at: string | null;
  [key: string]: unknown;
};

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
    return NextResponse.json(
      { error: `Database error: ${list.error.message}` },
      { status: 500 },
    );
  }
  const partners = (list.data ?? []) as PartnerRow[];

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
    stripeConfigured: !!stripe,
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

  const rawRate = body.commission_rate ?? body.commissionRate;
  const commissionRate =
    rawRate === undefined || rawRate === null ? null : Number(rawRate);
  // [0, 0.5] mirrors both the 0041 check constraint and
  // computeRentalFee's contract — reject here with words instead of
  // letting Postgres throw a constraint name at the admin.
  if (
    commissionRate !== null &&
    (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 0.5)
  ) {
    return NextResponse.json(
      { error: "commission_rate: decimal fraction between 0 and 0.5 (0.15 = 15%)." },
      { status: 400 },
    );
  }

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

  if (lookup.data) {
    const patch: Record<string, unknown> = {};
    if (id && name !== lookup.data.name) {
      // Rename guard: rental_inquiries snapshot partner_name at
      // inquiry time and the payment-link route resolves the partner
      // by that exact string; the code-level fleet (partner-fleet.ts)
      // stamps the same string on every NEW inquiry. Renaming a
      // referenced partner would orphan every in-flight lead ("not
      // onboarded yet" 404s) and break new-inquiry attribution — so a
      // referenced name is immutable until inquiries link by id.
      const oldName = String(lookup.data.name);
      const fleetNames = new Set<string>(
        PARTNER_VEHICLES.map((v) => v.partner),
      );
      if (fleetNames.has(oldName)) {
        return NextResponse.json(
          {
            error: `Cannot rename "${oldName}" — the partner fleet (partner-fleet.ts) attributes vehicles to that exact name, so a rename would break every new inquiry. Update the code first, then rename.`,
          },
          { status: 409 },
        );
      }
      const refs = await db
        .from("rental_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("partner_name", oldName);
      if (refs.error) {
        // Can't verify → refuse the rename rather than risk orphaning
        // in-flight leads.
        return NextResponse.json(
          { error: `Cannot verify the rename is safe: ${refs.error.message}` },
          { status: 500 },
        );
      }
      if ((refs.count ?? 0) > 0) {
        return NextResponse.json(
          {
            error: `Cannot rename "${oldName}" — ${refs.count} inquiry(ies) reference that name and would lose their operator link (payment links would 404 as "not onboarded"). Renames are blocked while the name is referenced.`,
          },
          { status: 409 },
        );
      }
      patch.name = name;
    }
    if (contactEmail !== null) patch.contact_email = contactEmail;
    if (commissionRate !== null) patch.commission_rate = commissionRate;
    if (status !== null) patch.status = status;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ partner: lookup.data, created: false });
    }
    const updated = await db
      .from("partners")
      .update(patch)
      .eq("id", lookup.data.id)
      .select("*")
      .single();
    if (updated.error || !updated.data) {
      console.error("[admin partners · update]", updated.error);
      return NextResponse.json(
        { error: `Update failed: ${updated.error?.message ?? "unknown"}` },
        { status: 500 },
      );
    }
    return NextResponse.json({ partner: updated.data, created: false });
  }

  const inserted = await db
    .from("partners")
    .insert({
      name,
      // Omitted fields take the 0041 defaults (commission 0.150,
      // status 'active', market 'Miami').
      ...(contactEmail !== null ? { contact_email: contactEmail } : {}),
      ...(commissionRate !== null ? { commission_rate: commissionRate } : {}),
      ...(status !== null ? { status } : {}),
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
        error: `Create failed: ${inserted.error?.message ?? "unknown"}. If the partners table does not exist, apply migration 0041 (operator approval required).`,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ partner: inserted.data, created: true });
}
