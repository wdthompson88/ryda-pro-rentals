// Dropbox Sign (formerly HelloSign) server client.
// Server-only — never import from a client component.
//
// The Dropbox Sign SDK uses API-key auth. Templates for the Operating
// Agreement and Management Services Agreement live in Dropbox Sign
// itself; we reference them by ID and pre-populate the buyer's name +
// email at signature-request time.
//
// See https://developers.hellosign.com/docs/embedded-signing/walkthrough
// for the embedded-signing flow we mount in DocumentsStep.

import * as DropboxSign from "@dropbox/sign";

const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? "";
const clientId = process.env.DROPBOX_SIGN_CLIENT_ID ?? "";

// Template IDs from Dropbox Sign dashboard. Each template has merge
// fields for the buyer's name + email + LLC + share count, populated
// at signature-request time. If these env vars are unset the API
// route surfaces a "templates not configured" error and DocumentsStep
// falls back to the typed-name signature (today's behavior).
export const TEMPLATES = {
  operating_agreement: process.env.DROPBOX_SIGN_OA_TEMPLATE_ID ?? "",
  management_services_agreement:
    process.env.DROPBOX_SIGN_MSA_TEMPLATE_ID ?? "",
  subscription_agreement:
    process.env.DROPBOX_SIGN_SUBSCRIPTION_TEMPLATE_ID ?? "",
} as const;

export type DocumentType = keyof typeof TEMPLATES;

// Lazy-init clients so a missing key doesn't crash boot. The
// /api/documents/* routes check `isDropboxSignConfigured()` first
// and surface a clear 503 when keys aren't present.
export function isDropboxSignConfigured(): boolean {
  return Boolean(apiKey && clientId);
}

export function signatureRequestApi() {
  const client = new DropboxSign.SignatureRequestApi();
  client.username = apiKey;
  return client;
}

export function embeddedApi() {
  const client = new DropboxSign.EmbeddedApi();
  client.username = apiKey;
  return client;
}

export const DROPBOX_SIGN_CLIENT_ID = clientId;
export const DROPBOX_SIGN_WEBHOOK_API_KEY = apiKey;
