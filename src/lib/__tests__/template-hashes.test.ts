// Tests for the Dropbox Sign template canonicalization + hash logic.
// The hash is what the daily cron compares against template-
// hashes.json to detect vendor-side template tampering.
//
// What we pin:
//  - Hashes are deterministic across array-order shuffles (signer
//    role order, custom field order — but the cron will alert on
//    any structural change anyway, so order-stability is for
//    operator sanity, not security).
//  - Volatile fields (timestamps, signed URLs, account refs) are
//    excluded — vendor-managed metadata changing daily must not
//    fire false-positive tamper alerts.
//  - Adding a custom field, swapping a signer role, removing a
//    document, or moving a form field's coordinates ALL produce
//    a different hash — that's the security contract.

import { describe, it, expect } from "vitest";
import { canonicalize, hashTemplate, verifyAgainstManifest } from "../template-hashes";

const baseTemplate = {
  template_id: "tmpl_abc123",
  title: "Operating Agreement",
  message: "Please sign",
  signer_roles: [
    { name: "Member", order: 0 },
    { name: "RYDA", order: 1 },
  ],
  cc_roles: [{ name: "Counsel", order: 0 }],
  custom_fields: [
    { name: "member_name", type: "text", required: true, signer: 0 },
    { name: "share_count", type: "text", required: true, signer: 1 },
  ],
  documents: [
    {
      index: 0,
      name: "OA.pdf",
      form_fields: [
        {
          name: "member_signature",
          type: "signature",
          required: true,
          signer: 0,
          x: 100,
          y: 200,
          width: 150,
          height: 40,
          page: 5,
        },
      ],
    },
  ],
  // These are volatile fields — must NOT influence the hash.
  created_at: 1714000000,
  updated_at: 1715000000,
  account: { account_id: "acc_xyz" },
  edit_url: "https://app.dropboxsign.com/template/edit/abc?token=xxx",
};

describe("canonicalize", () => {
  it("excludes volatile fields (timestamps, account, edit_url)", () => {
    const c = canonicalize(baseTemplate);
    const json = JSON.stringify(c);
    expect(json).not.toMatch(/created_at/);
    expect(json).not.toMatch(/updated_at/);
    expect(json).not.toMatch(/account/);
    expect(json).not.toMatch(/edit_url/);
    expect(json).not.toMatch(/title/);
    expect(json).not.toMatch(/message/);
  });

  it("preserves the structural surface attackers could tamper with", () => {
    const c = canonicalize(baseTemplate);
    expect(c.template_id).toBe("tmpl_abc123");
    expect(c.signer_roles).toHaveLength(2);
    expect(c.cc_roles).toHaveLength(1);
    expect(c.custom_fields).toHaveLength(2);
    expect(c.documents).toHaveLength(1);
    expect(c.documents[0].form_fields).toHaveLength(1);
  });

  it("sorts signer_roles by order (stable across shuffles)", () => {
    const shuffled = {
      ...baseTemplate,
      signer_roles: [
        { name: "RYDA", order: 1 },
        { name: "Member", order: 0 },
      ],
    };
    const c = canonicalize(shuffled);
    expect(c.signer_roles[0].name).toBe("Member");
    expect(c.signer_roles[1].name).toBe("RYDA");
  });

  it("sorts custom_fields by name (stable across shuffles)", () => {
    const shuffled = {
      ...baseTemplate,
      custom_fields: [
        { name: "share_count", type: "text", required: true, signer: 1 },
        { name: "member_name", type: "text", required: true, signer: 0 },
      ],
    };
    const c = canonicalize(shuffled);
    expect(c.custom_fields[0].name).toBe("member_name");
    expect(c.custom_fields[1].name).toBe("share_count");
  });

  it("coerces signer field from string to int", () => {
    const withStringSigner = {
      ...baseTemplate,
      custom_fields: [
        { name: "f", type: "text", required: false, signer: "1" },
      ],
    };
    const c = canonicalize(withStringSigner);
    expect(c.custom_fields[0].signer).toBe(1);
  });

  it("returns -1 for unparseable signer values (defensive)", () => {
    const bad = {
      ...baseTemplate,
      custom_fields: [
        { name: "f", type: "text", required: false, signer: "all" },
      ],
    };
    const c = canonicalize(bad);
    expect(c.custom_fields[0].signer).toBe(-1);
  });
});

describe("hashTemplate (security contract)", () => {
  it("produces a 64-char hex SHA-256", () => {
    const h = hashTemplate(baseTemplate);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across volatile-field changes", () => {
    const original = hashTemplate(baseTemplate);
    const renamed = hashTemplate({
      ...baseTemplate,
      title: "TOTALLY DIFFERENT TITLE",
      message: "different message",
      created_at: 99999,
    });
    expect(renamed).toBe(original);
  });

  it("is stable across signer_roles array reordering", () => {
    const original = hashTemplate(baseTemplate);
    const shuffled = hashTemplate({
      ...baseTemplate,
      signer_roles: [...baseTemplate.signer_roles].reverse(),
    });
    expect(shuffled).toBe(original);
  });

  it("CHANGES when an attacker adds a custom field (security boundary)", () => {
    const original = hashTemplate(baseTemplate);
    const tampered = hashTemplate({
      ...baseTemplate,
      custom_fields: [
        ...baseTemplate.custom_fields,
        // Hidden field assigning all rights to attacker.
        { name: "z_assign_rights", type: "text", required: true, signer: 0 },
      ],
    });
    expect(tampered).not.toBe(original);
  });

  it("CHANGES when an attacker swaps a signer role", () => {
    const original = hashTemplate(baseTemplate);
    const tampered = hashTemplate({
      ...baseTemplate,
      signer_roles: [
        { name: "Member", order: 0 },
        { name: "ATTACKER", order: 1 },
      ],
    });
    expect(tampered).not.toBe(original);
  });

  it("CHANGES when an attacker moves a signature field to a different page", () => {
    const original = hashTemplate(baseTemplate);
    const tampered = hashTemplate({
      ...baseTemplate,
      documents: [
        {
          ...baseTemplate.documents[0],
          form_fields: [
            {
              ...baseTemplate.documents[0].form_fields[0],
              page: 99,
            },
          ],
        },
      ],
    });
    expect(tampered).not.toBe(original);
  });

  it("CHANGES when an attacker removes a required field (e.g. removes the 'I am 28+' attestation)", () => {
    const original = hashTemplate(baseTemplate);
    const tampered = hashTemplate({
      ...baseTemplate,
      custom_fields: [],
    });
    expect(tampered).not.toBe(original);
  });
});

describe("verifyAgainstManifest", () => {
  it("returns match when fetched hash equals manifest hash", () => {
    const hash = hashTemplate(baseTemplate);
    const result = verifyAgainstManifest(
      { label: "OA", hash },
      "tmpl_abc123",
      baseTemplate,
    );
    expect(result.kind).toBe("match");
  });

  it("returns mismatch with both hashes when tampered", () => {
    const expected = hashTemplate(baseTemplate);
    const result = verifyAgainstManifest(
      { label: "OA", hash: expected },
      "tmpl_abc123",
      { ...baseTemplate, custom_fields: [] },
    );
    expect(result.kind).toBe("mismatch");
    if (result.kind === "mismatch") {
      expect(result.expected).toBe(expected);
      expect(result.actual).not.toBe(expected);
    }
  });
});
