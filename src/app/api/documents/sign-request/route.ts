// POST /api/documents/sign-request
// Body: { purchaseId: string, documentType: 'operating_agreement' | 'management_services_agreement' | 'subscription_agreement' }
// Returns: { signatureId: string, embedUrl: string, status: 'sent' }
//
// Creates a Dropbox Sign embedded signature request from a template,
// pre-populates the buyer's name + email + LLC + share count from
// the share_purchases row, and hands back the embed URL that
// DocumentsStep mounts in an iframe via the Dropbox Sign embedded JS.

import { NextResponse, type NextRequest } from "next/server";
import {
  TEMPLATES,
  isDropboxSignConfigured,
  signatureRequestApi,
  embeddedApi,
  type DocumentType,
} from "@/lib/dropbox-sign";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromRequest } from "@/lib/api-auth";
import { isAllowed, clientIp } from "@/lib/rate-limit";
import { VEHICLES } from "@/lib/market-data";
import { BOATS } from "@/lib/boat-data";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

const VALID_TYPES: DocumentType[] = [
  "operating_agreement",
  "management_services_agreement",
  "subscription_agreement",
];

export async function POST(req: NextRequest) {
  if (!(await isAllowed(`docsign:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  if (!isDropboxSignConfigured()) {
    return NextResponse.json(
      { error: "E-signature backend not configured." },
      { status: 503 },
    );
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const purchaseId = String(body.purchaseId ?? "");
  const documentType = String(body.documentType ?? "") as DocumentType;
  if (!purchaseId || !VALID_TYPES.includes(documentType)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const templateId = TEMPLATES[documentType];
  if (!templateId) {
    return NextResponse.json(
      { error: `${documentType} template is not configured.` },
      { status: 503 },
    );
  }

  const admin = requireSupabaseAdmin();

  // Fetch the purchase to populate template merge fields. Owner-only.
  const purchase = await admin
    .from("share_purchases")
    .select("id, user_id, name, email, vehicle_symbol, boat_slug, shares, total_cents")
    .eq("id", purchaseId)
    .single();
  if (purchase.error || !purchase.data) {
    return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  }
  if (purchase.data.user_id !== user.id) {
    return NextResponse.json({ error: "Not your purchase." }, { status: 403 });
  }

  // If a row for this (purchase, document_type) already exists and
  // is signed, short-circuit. If it exists but is not yet signed,
  // we mint a fresh embed URL (the prior one may have expired) and
  // return it.
  const existing = await admin
    .from("document_signatures")
    .select("id, hellosign_request_id, status")
    .eq("purchase_id", purchaseId)
    .eq("document_type", documentType)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing.data && existing.data.length > 0 && existing.data[0].status === "signed") {
    return NextResponse.json({
      signatureId: existing.data[0].id,
      status: "signed",
    });
  }

  // Build the LLC name snapshot for merge fields.
  const v = purchase.data.vehicle_symbol
    ? VEHICLES.find((x) => x.symbol === purchase.data.vehicle_symbol)
    : null;
  const b = purchase.data.boat_slug
    ? BOATS.find((x) => x.slug === purchase.data.boat_slug)
    : null;
  const assetLabel = v ? `${v.year} ${v.name}` : b ? `${b.year} ${b.name}` : "RYDA share";
  const llcName = v
    ? `RYDA ${v.symbol} LLC`
    : b
      ? `RYDA ${b.slug.toUpperCase()} LLC`
      : "RYDA LLC";

  // Create the embedded signature request from the template.
  // CustomFields keys must match the template's merge-field names
  // exactly. The template editor in Dropbox Sign defines them.
  let signatureRequestId: string;
  try {
    const reqApi = signatureRequestApi();
    const result = await reqApi.signatureRequestCreateEmbeddedWithTemplate({
      clientId: process.env.DROPBOX_SIGN_CLIENT_ID ?? "",
      templateIds: [templateId],
      subject: `${llcName} — ${documentType.replace(/_/g, " ")}`,
      message: `Please review and sign your ${documentType.replace(/_/g, " ")} for your co-ownership in ${llcName}.`,
      signers: [
        {
          role: "Member",
          emailAddress: purchase.data.email,
          name: purchase.data.name,
        },
      ],
      customFields: [
        { name: "member_name", value: purchase.data.name },
        { name: "member_email", value: purchase.data.email },
        { name: "asset_label", value: assetLabel },
        { name: "llc_name", value: llcName },
        { name: "shares", value: String(purchase.data.shares) },
        { name: "buy_in", value: `US $${(purchase.data.total_cents / 100).toLocaleString()}` },
      ],
      testMode: process.env.NODE_ENV !== "production",
      metadata: { purchaseId, userId: user.id, documentType },
    });
    const sigReq = result.body.signatureRequest;
    if (!sigReq?.signatureRequestId) {
      throw new Error("Dropbox Sign returned no signatureRequestId.");
    }
    signatureRequestId = sigReq.signatureRequestId;
  } catch (err) {
    console.error("[docsign · create]", err);
    return NextResponse.json(
      { error: "Could not create signature request." },
      { status: 500 },
    );
  }

  // Get the embed URL for the signer.
  let embedUrl: string;
  try {
    const embApi = embeddedApi();
    // Need the signature_id (per-signer) which lives on the request.
    const fetched = await signatureRequestApi().signatureRequestGet(signatureRequestId);
    const signature = fetched.body.signatureRequest?.signatures?.[0];
    if (!signature?.signatureId) {
      throw new Error("No signer-level signature_id on the request.");
    }
    const embed = await embApi.embeddedSignUrl(signature.signatureId);
    embedUrl = embed.body.embedded?.signUrl ?? "";
    if (!embedUrl) throw new Error("Empty embed URL.");
  } catch (err) {
    console.error("[docsign · embed]", err);
    return NextResponse.json(
      { error: "Could not generate signing URL." },
      { status: 500 },
    );
  }

  // Persist the row.
  const insert = await admin
    .from("document_signatures")
    .insert({
      purchase_id: purchaseId,
      user_id: user.id,
      document_type: documentType,
      hellosign_request_id: signatureRequestId,
      embed_url: embedUrl,
      status: "sent",
    })
    .select("id")
    .single();
  if (insert.error || !insert.data) {
    console.error("[docsign · insert]", insert.error);
    return NextResponse.json(
      { error: "Could not save signature record." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    signatureId: insert.data.id,
    embedUrl,
    status: "sent",
  });
}
