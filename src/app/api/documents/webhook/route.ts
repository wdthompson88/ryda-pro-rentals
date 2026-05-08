// POST /api/documents/webhook — Dropbox Sign webhook handler.
//
// Dropbox Sign sends `application/x-www-form-urlencoded` with a `json`
// field; the payload includes a hash that combines the API key + the
// event time. We verify by re-hashing.
//
// Events of interest:
//   - signature_request_signed         (single signer signed)
//   - signature_request_all_signed     (all signers done — flip to 'signed')
//   - signature_request_declined       (signer declined)
//   - signature_request_canceled       (we canceled it)
//
// On 'all_signed' we update the matching document_signatures row,
// set signed_at, and try to fetch the signed PDF URL.

import { NextResponse, type NextRequest } from "next/server";
import { isDropboxSignConfigured, signatureRequestApi } from "@/lib/dropbox-sign";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decideClaimAction } from "@/lib/dropbox-sign-claims";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Best-effort extraction of an HTTP status code from an SDK error.
 * The Dropbox Sign SDK throws errors that may carry the upstream
 * `statusCode` (or a nested `response.statusCode`). Returns
 * `undefined` for thrown values that aren't error-like (used to
 * distinguish "definite 404" from "transient/unknown" upstream).
 */
function readSdkStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as {
    statusCode?: number;
    status?: number;
    response?: { statusCode?: number; status?: number };
  };
  return (
    e.statusCode ??
    e.status ??
    e.response?.statusCode ??
    e.response?.status
  );
}

export async function POST(req: NextRequest) {
  // Fail-closed on missing config. Mirrors the Stripe webhooks
  // pattern (Sub-Batch A2): a 503 forces Dropbox Sign to retry, so a
  // legitimate event that arrives during a temporary mis-config is
  // not silently lost. Codex final-review catch.
  if (!isDropboxSignConfigured()) {
    console.error("[docsign webhook] not configured (missing API key)");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 },
    );
  }
  const admin = supabaseAdmin();
  if (!admin) {
    console.error("[docsign webhook] supabase admin not available");
    return NextResponse.json(
      { error: "Backend not available." },
      { status: 503 },
    );
  }

  // Dropbox Sign sends multipart/form-encoded with a "json" key.
  const formData = await req.formData();
  const json = formData.get("json");
  if (typeof json !== "string") {
    return NextResponse.json({ error: "Missing payload." }, { status: 400 });
  }
  let payload: {
    event: { event_type: string; event_time: string; event_hash: string };
    signature_request?: {
      signature_request_id: string;
      signatures?: { signature_id: string; signed_at?: number | null }[];
      files_url?: string;
      metadata?: Record<string, string>;
      is_complete?: boolean;
    };
  };
  try {
    payload = JSON.parse(json);
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  // Shape guard before HMAC compute. Without this an adversarial JSON
  // body that omits `event` (or makes it non-object) would throw on the
  // string-concatenation below, surfacing a 500 instead of a clean 400.
  // Codex review caught this on Sub-Batch A2.
  const ev = (payload as { event?: unknown }).event;
  if (
    !ev ||
    typeof ev !== "object" ||
    typeof (ev as { event_time?: unknown }).event_time !== "string" ||
    typeof (ev as { event_type?: unknown }).event_type !== "string" ||
    typeof (ev as { event_hash?: unknown }).event_hash !== "string"
  ) {
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  // Verify hash: HMAC-SHA256(event_time + event_type, api_key).
  // SAST S-C-1: use crypto.timingSafeEqual instead of `!==` so the
  // compare doesn't short-circuit on the first mismatched byte —
  // otherwise an attacker can timing-analyze the expected hex digest
  // (which is derived from the API key, so a leak helps key recovery).
  // Pattern matches `lib/api-auth.ts` cron bearer compare.
  const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? "";
  const expected = crypto
    .createHmac("sha256", apiKey)
    .update(payload.event.event_time + payload.event.event_type)
    .digest("hex");
  const got = payload.event.event_hash;
  let valid = false;
  if (typeof got === "string" && got.length === expected.length) {
    try {
      valid = crypto.timingSafeEqual(
        Buffer.from(expected, "utf8"),
        Buffer.from(got, "utf8"),
      );
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    return NextResponse.json({ error: "Invalid hash." }, { status: 400 });
  }

  const evtType = payload.event.event_type;
  const reqId = payload.signature_request?.signature_request_id;
  if (!reqId) {
    // Test event ('callback_test') or other infra event — must respond 200
    // with the literal string "Hello API Event Received" per Dropbox Sign.
    return new Response("Hello API Event Received", { status: 200 });
  }

  // Local-row gate: cheaply reject reqIds we never sent. Codex
  // final-review caught that the previous version called Dropbox
  // Sign's API for every webhook delivery — even one with a
  // tampered/enumerated reqId — opening a free-cost DoS where an
  // attacker replays a valid HMAC across N fake reqIds and forces
  // N Dropbox API calls + N dedup-table rows.
  //
  // Defense: every legitimate reqId we ever process corresponds to
  // a row we created in document_signatures (api/documents/sign-
  // request inserts before sending the request). If no local row,
  // the event isn't for us. Reject 400 without touching Dropbox
  // Sign or the dedup table.
  //
  // Lookup error vs row-missing: codex round-3 caught that
  // ignoring `error` here would conflate a transient DB outage
  // (data:null + error:set) with a definite row-missing tamper
  // signal (data:null + error:null). We separate the two so a
  // transient outage returns 503 (Dropbox retries) instead of 400
  // (event lost).
  const lookup = await admin
    .from("document_signatures")
    .select("id")
    .eq("hellosign_request_id", reqId)
    .limit(1)
    .maybeSingle();
  if (lookup.error) {
    console.error("[docsign webhook · local lookup]", lookup.error);
    return NextResponse.json(
      { error: "Local lookup temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!lookup.data) {
    return NextResponse.json(
      { error: "Unknown signature request." },
      { status: 400 },
    );
  }

  // Tampered-replay defense (codex final-review catch). The HMAC
  // covers (event_time + event_type) only — it does NOT cover the
  // signature_request body. So an attacker replaying a captured
  // valid HMAC can swap signature_request_id to point at a
  // different *real* request (e.g. another customer's) and our
  // local update would mutate that unrelated row. Defense: fetch
  // the request from Dropbox Sign and verify it actually exists +
  // matches the event_type's expected state. We trust the SDK's
  // response, not the webhook body, for the state-mutation
  // decision.
  //
  // Transient-failure handling: 5xx / timeout from the SDK becomes
  // 503 here so Dropbox Sign retries the webhook (we mustn't
  // accidentally lose the event by ACKing 200). Definite 404 means
  // the reqId is fake → 400 (won't retry, attack vector closed).
  let apiSig: {
    isComplete?: boolean;
    isDeclined?: boolean;
    filesUrl?: string;
  } | null = null;
  try {
    const result = await signatureRequestApi().signatureRequestGet(reqId);
    apiSig = result.body.signatureRequest ?? null;
  } catch (err) {
    const status = readSdkStatusCode(err);
    if (status === 404) {
      console.error("[docsign webhook · 404 from Dropbox Sign]", reqId);
      return NextResponse.json(
        { error: "Signature request not verifiable." },
        { status: 400 },
      );
    }
    // Transient — propagate up so Dropbox Sign retries.
    console.error("[docsign webhook · transient API error]", err);
    return NextResponse.json(
      { error: "Upstream verification temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!apiSig) {
    // SDK returned a "successful" response with empty body. Could
    // be a transient malformed response from upstream — treat as
    // 503 so Dropbox Sign retries instead of dropping a possibly-
    // legitimate event. Codex round-4 catch.
    console.error("[docsign webhook · empty apiSig body]", reqId);
    return NextResponse.json(
      { error: "Upstream response malformed; retry." },
      { status: 503 },
    );
  }

  // Per-event state verification — done BEFORE dedup insert
  // (codex round-3 catch). If we dedup'd before checking and the
  // state didn't match (eventual-consistency window or tamper),
  // a 400 response would poison the dedup table and the
  // legitimate retry would skip processing. By checking first
  // and returning 503 on mismatch, Dropbox Sign retries until
  // the state catches up (or gives up if the request is fake).
  //
  // 503 is the right code here because we cannot distinguish
  // "API state lag" from "tampered request body" — both produce
  // a mismatch. A retry-friendly outcome is safer than dropping
  // a legitimate event. The local-row gate above already filtered
  // most reqId-enumeration attacks, so 503 retries here are bounded
  // to (real-event window) + (legit retries during state lag).
  if (evtType === "signature_request_all_signed" && !apiSig.isComplete) {
    console.error(
      "[docsign webhook · state mismatch all_signed/!isComplete]",
      reqId,
    );
    return NextResponse.json(
      { error: "Request state mismatch; retry." },
      { status: 503 },
    );
  }
  if (evtType === "signature_request_declined" && !apiSig.isDeclined) {
    console.error(
      "[docsign webhook · state mismatch declined/!isDeclined]",
      reqId,
    );
    return NextResponse.json(
      { error: "Request state mismatch; retry." },
      { status: 503 },
    );
  }
  // 'canceled' and 'viewed' have no isCanceled / isViewed flag in
  // the SDK response, so the existence-check above is the strongest
  // state-binding we can do here.
  //
  // Residual (codex round-6): a captured 'canceled' or 'viewed'
  // event can still be body-swapped onto another real non-terminal
  // request, downgrading it. The state-machine guards on the
  // mutation block (below) prevent terminal regression, so the
  // worst-case impact is a 'pending' or 'sent' row becoming
  // 'viewed' or 'canceled' incorrectly. Future hardening: include
  // the signature_request body in the HMAC compute (requires
  // Dropbox Sign protocol change) OR poll Dropbox Sign for the
  // last-event-type per request and cross-check.

  // Claim-then-mark-processed pattern (Item 5 from .launch-prep
  // LAUNCH_PLAN.md, migration 0027 added the processed_at column).
  // The earlier "mutation-first, dedup-second" worked but had two
  // residuals: (a) two concurrent deliveries could both pass HMAC
  // + state-check + run the mutation before either dedup-recorded
  // (idempotent UPDATE made this safe but it's "imperfect at-most-
  // once"); (b) a worker crashing mid-mutation left no dedup row
  // and the retry re-ran the mutation. With claim-then-mark, the
  // INSERT happens BEFORE the mutation, marking it as in-flight
  // (processed_at = NULL); on success we UPDATE processed_at = NOW().
  //
  // Decision logic lives in lib/dropbox-sign-claims (pure function,
  // unit-tested without Supabase). Three outcomes for an existing
  // dedup row:
  //   - already_processed → return 200 ack, no work
  //   - in_flight (claim < 5min ago) → return 503, let active worker finish
  //   - take_over (claim >= 5min ago) → previous worker crashed,
  //     restart processing
  // No row → claim_and_process (the common path).

  // Step 1: try to claim. Generate a per-request claim token (UUID)
  // and INSERT with processed_at=NULL. All subsequent CAS ops use
  // .eq("claim_token", ourToken) so a stale worker's writes can't
  // trample our active claim. Codex round-2 caught the missing
  // ownership token.
  const ourClaimToken = crypto.randomUUID();
  let proceed = false;
  let isTakeOver = false;
  const insertResult = await admin
    .from("dropbox_sign_events")
    .insert({
      event_hash: payload.event.event_hash,
      signature_request_id: reqId,
      event_type: evtType,
      event_time: payload.event.event_time,
      processed_at: null,
      claim_token: ourClaimToken,
    });

  if (!insertResult.error) {
    proceed = true; // fresh claim
  } else if (insertResult.error.code === "23505") {
    // Existing row — fetch it and decide.
    const lookupResult = await admin
      .from("dropbox_sign_events")
      .select("received_at, processed_at, claim_token")
      .eq("event_hash", payload.event.event_hash)
      .eq("signature_request_id", reqId)
      .maybeSingle();
    if (lookupResult.error) {
      console.error(
        "[docsign webhook · existing-claim lookup]",
        lookupResult.error,
      );
      return NextResponse.json(
        { error: "Claim lookup failed; retry." },
        { status: 503 },
      );
    }
    const decision = decideClaimAction(lookupResult.data ?? null);
    if (decision.action === "already_processed") {
      return new Response("Hello API Event Received", { status: 200 });
    }
    if (decision.action === "in_flight") {
      console.warn(
        "[docsign webhook · in-flight claim, ageMs=",
        decision.ageMs,
        "]",
      );
      return NextResponse.json(
        { error: "Claim in-flight; retry." },
        { status: 503 },
      );
    }
    // take_over: refresh received_at + STAMP OUR claim_token so
    // any subsequent stale worker (the original OR another
    // take-over winner) can't write through our updates. CAS on
    // the previous claim_token (or processed_at IS NULL if no
    // token existed pre-migration) to atomically swing ownership.
    const previousClaimToken = lookupResult.data?.claim_token ?? null;
    let reclaimQuery = admin
      .from("dropbox_sign_events")
      .update({
        received_at: new Date().toISOString(),
        claim_token: ourClaimToken,
      })
      .eq("event_hash", payload.event.event_hash)
      .eq("signature_request_id", reqId)
      .is("processed_at", null);
    // CAS on previous token: if another worker reclaimed between
    // our lookup and update, their token differs from what we saw
    // and the update affects 0 rows.
    if (previousClaimToken !== null) {
      reclaimQuery = reclaimQuery.eq("claim_token", previousClaimToken);
    } else {
      // Pre-migration legacy row with no token: only proceed if
      // claim_token is still NULL.
      reclaimQuery = reclaimQuery.is("claim_token", null);
    }
    const reclaimResult = await reclaimQuery.select("event_hash");
    if (reclaimResult.error || !reclaimResult.data?.length) {
      console.warn(
        "[docsign webhook · take-over race lost]",
        reqId,
        reclaimResult.error,
      );
      return NextResponse.json(
        { error: "Claim contention; retry." },
        { status: 503 },
      );
    }
    proceed = true;
    isTakeOver = true;
    const ageMs =
      decision.action === "take_over" ? decision.ageMs : "n/a";
    console.warn(
      "[docsign webhook · taking over stale claim, ageMs=",
      ageMs,
      "]",
    );
  } else {
    // Non-conflict insert error (table missing, RLS, etc.).
    console.error("[docsign webhook · claim insert]", insertResult.error);
    return NextResponse.json(
      { error: "Claim write temporarily unavailable." },
      { status: 503 },
    );
  }

  if (!proceed) {
    // Defensive — should be unreachable.
    return NextResponse.json(
      { error: "Internal claim resolution error." },
      { status: 500 },
    );
  }

  // Step 2: state-machine-guarded mutation. The migration 0012
  // defines status as enum {pending, sent, viewed, signed, declined,
  // canceled}. Terminal states are signed/declined/canceled.
  // Without monotonic guards, a captured-and-tampered 'viewed' or
  // 'canceled' webhook could downgrade a 'signed' row back to
  // viewed/canceled. The .in() clauses restrict each transition
  // to legal source states.
  //
  // Allowed transitions:
  //   pending|sent|viewed → signed     (all_signed)
  //   pending|sent|viewed → declined   (declined)
  //   pending|sent|viewed → canceled   (canceled)
  //   pending|sent        → viewed     (viewed) — tighter (no replay restamp)
  const NON_TERMINAL_PRE_VIEW = ["pending", "sent"] as const;
  const NON_TERMINAL = ["pending", "sent", "viewed"] as const;
  let mutationErr: { message?: string } | null = null;
  if (evtType === "signature_request_all_signed") {
    const upd = await admin
      .from("document_signatures")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_pdf_url: apiSig.filesUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("hellosign_request_id", reqId)
      .in("status", NON_TERMINAL);
    mutationErr = upd.error;
  } else if (evtType === "signature_request_declined") {
    const upd = await admin
      .from("document_signatures")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("hellosign_request_id", reqId)
      .in("status", NON_TERMINAL);
    mutationErr = upd.error;
  } else if (evtType === "signature_request_canceled") {
    const upd = await admin
      .from("document_signatures")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("hellosign_request_id", reqId)
      .in("status", NON_TERMINAL);
    mutationErr = upd.error;
  } else if (evtType === "signature_request_viewed") {
    const upd = await admin
      .from("document_signatures")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("hellosign_request_id", reqId)
      .in("status", NON_TERMINAL_PRE_VIEW);
    mutationErr = upd.error;
  }

  if (mutationErr) {
    // Mutation failed AFTER we claimed. DELETE the claim row so
    // the legitimate retry can re-claim immediately (no 5-minute
    // wait). CAS on our claim_token so we only delete OUR claim —
    // a parallel worker that took over after us shouldn't have
    // its row deleted by our slow-failure cleanup. Codex round-2
    // catch.
    //
    // Codex round-3 catch: this DELETE must run for take-over
    // claims too, not just fresh claims. A take-over worker that
    // fails leaves a stuck row otherwise — retries are forced
    // through the 5-minute stale-claim wait window instead of
    // immediately re-claiming. The CAS on claim_token + null-
    // processed_at means we only delete a claim WE actively
    // own, so the original worker's history concern is moot
    // (the take-over already overwrote received_at).
    await admin
      .from("dropbox_sign_events")
      .delete()
      .eq("event_hash", payload.event.event_hash)
      .eq("signature_request_id", reqId)
      .eq("claim_token", ourClaimToken)
      .is("processed_at", null);
    console.error("[docsign webhook · mutation]", mutationErr);
    return NextResponse.json(
      { error: "Mutation failed; retry." },
      { status: 503 },
    );
  }

  // Step 3: mark the claim processed. CAS on our claim_token so a
  // stale worker (the original we took over from, or another
  // parallel worker) can't mark "their" row processed using our
  // mutation result. If CAS misses, it means we no longer own the
  // claim — log + ack (the mutation already happened idempotently;
  // worst case the new owner re-runs it).
  const markResult = await admin
    .from("dropbox_sign_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_hash", payload.event.event_hash)
    .eq("signature_request_id", reqId)
    .eq("claim_token", ourClaimToken);
  if (markResult.error) {
    console.error(
      "[docsign webhook · mark-processed (non-fatal)]",
      markResult.error,
    );
  }

  // Dropbox Sign requires this exact response body to acknowledge.
  return new Response("Hello API Event Received", { status: 200 });
}
