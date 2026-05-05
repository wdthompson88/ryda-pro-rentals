// POST /api/webhooks/firstbase — Firstbase formation event receiver.
//
// Mirrors the Stripe webhook pattern (signature verify, event-id
// dedup, status-guarded compare-and-set, return 200 quickly).
//
// Wire-up steps when going live:
//   1. Set FIRSTBASE_API_KEY (live key) in Vercel env
//   2. Set FIRSTBASE_WEBHOOK_SECRET (from Firstbase dashboard)
//   3. Set FIRSTBASE_MODE=live in Vercel env
//   4. Register this URL in the Firstbase dashboard:
//        https://api.firstbase.io/v1/webhooks
//      Subscribe to: formation.*, ein.issued, registered_agent.renewed
//
// Until those env vars are present, resolveAdapter() returns the mock
// adapter and any inbound webhook (which can't happen without a real
// account) will fail signature verification and 400.

import { NextResponse, type NextRequest } from "next/server";
import { resolveAdapter } from "@/lib/llc-formation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyTeam } from "@/lib/notify";

// Need raw body for signature verification — Next.js App Router
// gives us req.text() pre-parse, same shape as the Stripe handler.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adapter = resolveAdapter();
  if (adapter.mode === "mock") {
    // Mock mode means no FIRSTBASE_API_KEY in env. Silently 200
    // so a misconfigured webhook subscription doesn't pile up
    // retries — but log loudly so the team notices in the
    // function logs.
    console.warn(
      "[firstbase webhook] received in mock mode (FIRSTBASE_API_KEY unset) — ignoring",
    );
    return NextResponse.json({ received: true, mode: "mock" }, { status: 200 });
  }

  const admin = supabaseAdmin();
  if (!admin) {
    console.warn(
      "[firstbase webhook] supabase admin not configured — ignoring",
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Pull raw body + headers for signature verification.
  const rawBody = await req.text();
  // NextRequest.headers is a Headers object — collect into a plain
  // record because that's what the adapter signature expects.
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  let event;
  try {
    event = adapter.verifyAndParseWebhook(rawBody, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[firstbase webhook] verification failed:", message);
    // 400 surfaces as a hard failure on the Firstbase dashboard;
    // they'll retry per their schedule, which is what we want for
    // transient mismatches and what we want to surface for real
    // mismatches (signal to investigate).
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Event-id dedup. INSERT first, then process. ON CONFLICT means
  // the duplicate path returns 200 immediately without re-running
  // side-effects.
  const insertResult = await admin
    .from("llc_formation_events")
    .insert({
      event_id: event.eventId,
      formation_provider: adapter.provider,
      event_type: event.type,
      provider_id: event.providerId,
      payload: event.payload,
    })
    .select("event_id")
    .maybeSingle();

  // If the insert failed because of a unique-violation on event_id,
  // it's a duplicate. Other errors bubble up.
  if (insertResult.error) {
    if (insertResult.error.code === "23505") {
      console.log(
        "[firstbase webhook] duplicate event, skipping",
        event.eventId,
        event.type,
      );
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error(
      "[firstbase webhook] failed to record event:",
      insertResult.error,
    );
    // 500 → Firstbase retries → next attempt may succeed once the
    // DB transient resolves. Don't 200 on a failed write or we'll
    // permanently lose the event.
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Lookup the LLC entity to apply side-effects. Match by
  // provider_id — populated when the formation was created.
  const llcLookup = await admin
    .from("llc_entities")
    .select("id, vehicle_symbol, boat_slug, llc_name, formation_status, ein")
    .eq("formation_provider", adapter.provider)
    .eq("provider_id", event.providerId)
    .maybeSingle();

  if (llcLookup.error) {
    console.error(
      "[firstbase webhook] llc lookup error:",
      llcLookup.error,
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const llc = llcLookup.data;
  if (!llc) {
    // Event arrived before we recorded the formation. Possible if
    // the admin form crashed mid-submit OR the event is for an LLC
    // formed outside RYDA. Notify ops; don't fail.
    console.warn(
      "[firstbase webhook] no matching LLC for provider_id",
      event.providerId,
      "event:",
      event.type,
    );
    await notifyTeam({
      subject: "Firstbase webhook for unknown LLC",
      html: `<p>Event ${event.type} for provider_id ${event.providerId} has no matching llc_entities row.</p><p>Event id: ${event.eventId}</p>`,
    });
    // Mark event as received-but-not-applied so the audit row
    // doesn't accumulate as a "lost" event.
    await admin
      .from("llc_formation_events")
      .update({ applied: false })
      .eq("event_id", event.eventId);
    return NextResponse.json({ received: true, unmatched: true });
  }

  // Apply side-effects per event type. Each path is a single
  // compare-and-set so concurrent webhooks for the same LLC don't
  // race. Errors bubble up to a 500 so Firstbase retries.
  try {
    switch (event.type) {
      case "formation.completed": {
        // Pull the full snapshot from the vendor (more authoritative
        // than the webhook payload, which is event-shaped).
        const details = await adapter.getFormation(event.providerId);
        const upd = await admin
          .from("llc_entities")
          .update({
            formation_status: "completed",
            ein: details.ein ?? null,
            registered_agent_name: details.registeredAgent?.name ?? null,
            registered_agent_address: details.registeredAgent?.address ?? null,
            formation_date: details.formationDate ?? null,
            formation_completed_at: new Date().toISOString(),
          })
          .eq("id", llc.id)
          .neq("formation_status", "completed") // idempotent: already-completed = no-op
          .select("id");
        if (upd.error) throw upd.error;
        await notifyTeam({
          subject: `LLC formation completed: ${llc.llc_name}`,
          html: `<p>${llc.llc_name} (${llc.vehicle_symbol ?? llc.boat_slug ?? ""}) formation completed. EIN: ${details.ein ?? "(pending)"}.</p>`,
        });
        break;
      }
      case "formation.filed": {
        await admin
          .from("llc_entities")
          .update({ formation_status: "filed" })
          .eq("id", llc.id)
          .in("formation_status", ["draft", "submitted"]);
        break;
      }
      case "formation.failed": {
        await admin
          .from("llc_entities")
          .update({ formation_status: "failed" })
          .eq("id", llc.id);
        await notifyTeam({
          subject: `LLC formation FAILED: ${llc.llc_name}`,
          html: `<p>${llc.llc_name} formation failed at provider ${adapter.provider}. Provider id: ${event.providerId}. Manual reconciliation required.</p>`,
        });
        break;
      }
      case "ein.issued": {
        const ein = (event.payload as { ein?: string }).ein;
        if (ein) {
          await admin
            .from("llc_entities")
            .update({ ein })
            .eq("id", llc.id)
            .is("ein", null); // idempotent
        }
        break;
      }
      case "registered_agent.renewed": {
        const expiresAt = (event.payload as { expires_at?: string }).expires_at;
        // Just record on the audit; no new state on llc_entities
        // beyond what the next getFormation() refresh would pull.
        console.log(
          "[firstbase webhook] RA renewed for",
          llc.id,
          "expires:",
          expiresAt,
        );
        break;
      }
      case "compliance.alert":
      case "formation.created":
      default:
        // Any unrecognized type goes here. The audit row records it,
        // ops can investigate manually.
        console.log(
          "[firstbase webhook] unhandled event type",
          event.type,
          "for",
          llc.id,
        );
        break;
    }
  } catch (err) {
    console.error(
      "[firstbase webhook] handler failed for",
      event.eventId,
      event.type,
      err,
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Mark event as applied. Separate UPDATE so the audit row
  // reliably reflects success — if this fails we still return 200
  // because the side-effects above already landed.
  await admin
    .from("llc_formation_events")
    .update({ applied: true, llc_entity_id: llc.id, applied_at: new Date().toISOString() })
    .eq("event_id", event.eventId);

  return NextResponse.json({ received: true, type: event.type });
}
