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

export async function POST(req: NextRequest) {
  if (!isDropboxSignConfigured()) {
    return NextResponse.json({ received: true });
  }
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ received: true });

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

  if (evtType === "signature_request_all_signed") {
    let signedPdfUrl: string | null = null;
    try {
      const result = await signatureRequestApi().signatureRequestGet(reqId);
      signedPdfUrl = result.body.signatureRequest?.filesUrl ?? null;
    } catch (err) {
      console.error("[docsign webhook · fetch]", err);
    }

    await admin
      .from("document_signatures")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_pdf_url: signedPdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("hellosign_request_id", reqId);
  } else if (evtType === "signature_request_declined") {
    await admin
      .from("document_signatures")
      .update({ status: "declined", updated_at: new Date().toISOString() })
      .eq("hellosign_request_id", reqId);
  } else if (evtType === "signature_request_canceled") {
    await admin
      .from("document_signatures")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("hellosign_request_id", reqId);
  } else if (evtType === "signature_request_viewed") {
    await admin
      .from("document_signatures")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("hellosign_request_id", reqId);
  }

  // Dropbox Sign requires this exact response body to acknowledge.
  return new Response("Hello API Event Received", { status: 200 });
}
