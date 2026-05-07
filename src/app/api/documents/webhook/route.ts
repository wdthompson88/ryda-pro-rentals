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

  // Mutation FIRST, dedup SECOND (codex round-4 catch). The reverse
  // ordering would let a transient DB-write failure poison the
  // dedup table: dedup row recorded → mutation fails → 503 sent →
  // Dropbox retries → retry hits dedup conflict → 200 ack with no
  // mutation → permanent loss. By doing the side effect first and
  // claiming the dedup row only on success, a mutation failure
  // returns 503 with no dedup row, so the legitimate retry will
  // re-attempt cleanly.
  //
  // State-machine guards (codex round-5 catch). The migration
  // 0012 defines status as enum {pending, sent, viewed, signed,
  // declined, canceled}. Terminal states are signed/declined/
  // canceled. Without monotonic guards, a captured-and-tampered
  // 'viewed' or 'canceled' webhook could downgrade a 'signed' row
  // back to viewed (loses the signed_at + filesUrl) or canceled
  // (clobbers a real outcome). The `.in("status", [...])` clauses
  // below restrict each transition to legal source states so
  // replays/tampers can't regress terminal rows.
  //
  // Allowed transitions:
  //   pending|sent|viewed → signed     (all_signed)
  //   pending|sent|viewed → declined   (declined)
  //   pending|sent|viewed → canceled   (canceled)
  //   pending|sent        → viewed     (viewed)  ← tighter than the
  //     others because 'viewed' is informational; we don't want a
  //     replay to even re-stamp updated_at on a row that's already
  //     viewed/signed/declined/canceled.
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
    // No dedup row recorded yet — the legitimate retry will pick
    // this up cleanly.
    console.error("[docsign webhook · mutation]", mutationErr);
    return NextResponse.json(
      { error: "Mutation failed; retry." },
      { status: 503 },
    );
  }

  // Event-id dedup. Recorded ONLY on successful mutation. PK
  // conflict here means a concurrent delivery did the work in
  // parallel — that's fine, the UPDATE was idempotent. PK is
  // composite (event_hash, signature_request_id) — single-column
  // event_hash is HMAC over (event_time + event_type) only, which
  // would collide for legitimate same-second events on different
  // requests (codex round-1 catch). Migration:
  // 0024_dropbox_sign_events_dedup. Best-effort: if the dedup
  // insert itself errors after a successful mutation, the worst
  // outcome is a future replay re-running the (idempotent)
  // mutation again — log + 200-ack rather than 503ing on a
  // bookkeeping failure.
  try {
    const { error: insertErr } = await admin
      .from("dropbox_sign_events")
      .insert({
        event_hash: payload.event.event_hash,
        signature_request_id: reqId,
        event_type: evtType,
        event_time: payload.event.event_time,
      });
    if (insertErr && insertErr.code !== "23505") {
      console.error(
        "[docsign webhook · dedup insert (post-mutation, non-fatal)]",
        insertErr,
      );
    }
  } catch (err) {
    console.error("[docsign webhook · dedup insert exception]", err);
  }

  // Dropbox Sign requires this exact response body to acknowledge.
  return new Response("Hello API Event Received", { status: 200 });
}
