// Dropbox Sign template tampering detector.
//
// Templates (Operating Agreement, Management Services Agreement,
// Subscription Agreement) live at the vendor side. We reference
// them by ID at sign-request time. If a Dropbox Sign account
// credential leaks, an attacker can MODIFY the template content —
// add a hidden clause, swap signer roles, replace the entire PDF —
// and members signing the modified template won't see the change
// before clicking through.
//
// This module computes a deterministic SHA-256 over the template's
// stable structure. The hash is stored in template-hashes.json
// alongside the source. A daily cron (see /api/cron/template-hash-
// check) re-fetches each template and compares; a mismatch fires a
// notifyTeam alert. There is NO automatic gate on sign-requests
// today — detection only. If the structural alert fires, ops must
// manually disable signing via the Dropbox Sign env var rotation
// (set DROPBOX_SIGN_API_KEY="" → isDropboxSignConfigured returns
// false → /api/documents/* return 503). Adding an enforced gate
// in the route is a follow-up tracked in the LAUNCH_PLAN
// post-launch backlog.
//
// What's hashed (stable structure):
//   - signer_roles (ordered): role names + index
//   - cc_roles (ordered): role names + index
//   - custom_fields (ordered): name + type + required + signer index
//   - documents (ordered): index + name + form-fields (name, type,
//     required, signer index, position rect)
//
// What's NOT hashed (volatile / vendor-managed):
//   - timestamps (created_at, updated_at)
//   - file URLs (signed/expiring)
//   - account references (account_id, owner)
//   - editor URL
//
// Limitation (v1): we hash structure, not the actual rendered PDF
// bytes. **An attacker who replaces the PDF with one that has the
// SAME field positions but different prose passes this check.**
// This is a known gap. V2 must also fetch the PDF
// (templateFilesAsFileUrl + downloaded bytes) and include its
// SHA-256 in the manifest. Tracked as a pre-launch hardening
// item; v1 ships first because structural tampering (added/swapped
// signer roles, hidden custom fields, repositioned signature
// fields) is the higher-likelihood attack and is fully covered.
//
// No "server-only" import — pure compute, no secrets. The cron
// route at api/cron/template-hash-check is the secret-bearing
// surface; this module is testable without booting Next.js.

import crypto from "crypto";
import fs from "fs";
import path from "path";

/** Fields we serialize into the canonical hash input. Excludes
 *  any timestamps, account refs, signed URLs, or other volatile
 *  vendor-side state. */
type CanonicalTemplate = {
  template_id: string;
  signer_roles: { name: string; order: number }[];
  cc_roles: { name: string; order: number }[];
  custom_fields: {
    name: string;
    type: string;
    required: boolean;
    signer: number;
  }[];
  documents: {
    index: number;
    name: string;
    form_fields: {
      name: string;
      type: string;
      required: boolean;
      signer: number;
      x: number;
      y: number;
      width: number;
      height: number;
      page: number;
    }[];
  }[];
};

/** Map a Dropbox Sign API TemplateGetResponse.template into the
 *  canonical hash input. Tolerant of missing fields — the SDK
 *  types make many fields optional, but the API always returns
 *  the structural ones for a real template. */
export function canonicalize(
  template: Record<string, unknown>,
): CanonicalTemplate {
  const t = template as {
    template_id?: string;
    signer_roles?: { name?: string; order?: number }[];
    cc_roles?: { name?: string; order?: number }[];
    custom_fields?: {
      name?: string;
      type?: string;
      required?: boolean;
      signer?: number | string;
    }[];
    documents?: {
      index?: number;
      name?: string;
      form_fields?: {
        name?: string;
        type?: string;
        required?: boolean;
        signer?: number | string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        page?: number;
      }[];
    }[];
  };

  const signerToInt = (s: number | string | undefined): number => {
    if (typeof s === "number") return s;
    if (typeof s === "string") {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : -1;
    }
    return -1;
  };

  // Multi-key sort with tie-breakers. Codex review caught that
  // sorting form/custom fields by `name` alone makes
  // canonicalization unstable when two fields share a name (legal
  // in Dropbox Sign). Tie-breakers cascade: name → type → signer
  // → page → y → x. Two truly-identical fields canonicalize to
  // identical positions in the array, so the hash is stable.
  const compareCustom = (
    a: { name: string; type: string; required: boolean; signer: number },
    b: { name: string; type: string; required: boolean; signer: number },
  ): number =>
    a.name.localeCompare(b.name) ||
    a.type.localeCompare(b.type) ||
    a.signer - b.signer ||
    Number(a.required) - Number(b.required);
  const compareFormField = (
    a: {
      name: string;
      type: string;
      required: boolean;
      signer: number;
      x: number;
      y: number;
      page: number;
    },
    b: {
      name: string;
      type: string;
      required: boolean;
      signer: number;
      x: number;
      y: number;
      page: number;
    },
  ): number =>
    a.name.localeCompare(b.name) ||
    a.type.localeCompare(b.type) ||
    a.signer - b.signer ||
    a.page - b.page ||
    a.y - b.y ||
    a.x - b.x ||
    Number(a.required) - Number(b.required);
  const compareSignerRole = (
    a: { name: string; order: number },
    b: { name: string; order: number },
  ): number => a.order - b.order || a.name.localeCompare(b.name);

  return {
    template_id: t.template_id ?? "",
    signer_roles: (t.signer_roles ?? [])
      .map((r) => ({ name: r.name ?? "", order: r.order ?? 0 }))
      .sort(compareSignerRole),
    cc_roles: (t.cc_roles ?? [])
      .map((r) => ({ name: r.name ?? "", order: r.order ?? 0 }))
      .sort(compareSignerRole),
    custom_fields: (t.custom_fields ?? [])
      .map((f) => ({
        name: f.name ?? "",
        type: f.type ?? "",
        required: Boolean(f.required),
        signer: signerToInt(f.signer),
      }))
      .sort(compareCustom),
    documents: (t.documents ?? [])
      .map((d, i) => ({
        index: d.index ?? i,
        name: d.name ?? "",
        form_fields: (d.form_fields ?? [])
          .map((f) => ({
            name: f.name ?? "",
            type: f.type ?? "",
            required: Boolean(f.required),
            signer: signerToInt(f.signer),
            x: f.x ?? 0,
            y: f.y ?? 0,
            width: f.width ?? 0,
            height: f.height ?? 0,
            page: f.page ?? 0,
          }))
          .sort(compareFormField),
      }))
      .sort((a, b) => a.index - b.index || a.name.localeCompare(b.name)),
  };
}

/** Compute the SHA-256 of the canonical template structure. */
export function hashTemplate(template: Record<string, unknown>): string {
  const canonical = canonicalize(template);
  // JSON.stringify with sorted keys (we already canonical-sorted
  // arrays above; the object keys are stable per the
  // CanonicalTemplate type definition).
  const serialized = JSON.stringify(canonical);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

export type TemplateHashManifest = {
  /** Schema version so future format changes can migrate cleanly. */
  schema_version: 1;
  /** Each entry pins the expected canonical hash for one template. */
  templates: Record<
    string,
    {
      /** Human-readable label for ops triage. */
      label: string;
      /** Hex-encoded SHA-256 of canonicalize(template). */
      hash: string;
      /** ISO timestamp when this hash was last verified by hand. */
      verified_at?: string;
    }
  >;
};

const DEFAULT_MANIFEST_PATH = path.resolve(
  process.cwd(),
  "template-hashes.json",
);

/** Read template-hashes.json from disk. Returns null if missing
 *  (pre-launch state — no templates configured yet). */
export function loadManifest(
  manifestPath: string = DEFAULT_MANIFEST_PATH,
): TemplateHashManifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  const raw = fs.readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as TemplateHashManifest;
  if (parsed.schema_version !== 1) {
    throw new Error(
      `template-hashes.json schema_version=${parsed.schema_version} unsupported`,
    );
  }
  return parsed;
}

export type VerificationResult =
  | { kind: "match"; templateId: string; label: string }
  | {
      kind: "mismatch";
      templateId: string;
      label: string;
      expected: string;
      actual: string;
    }
  | {
      kind: "fetch_error";
      templateId: string;
      label: string;
      error: string;
    };

/** Compare a fetched template against the manifest entry. */
export function verifyAgainstManifest(
  manifestEntry: { label: string; hash: string },
  templateId: string,
  fetched: Record<string, unknown>,
): VerificationResult {
  const actual = hashTemplate(fetched);
  if (actual === manifestEntry.hash) {
    return { kind: "match", templateId, label: manifestEntry.label };
  }
  return {
    kind: "mismatch",
    templateId,
    label: manifestEntry.label,
    expected: manifestEntry.hash,
    actual,
  };
}
