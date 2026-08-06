import { describe, expect, it } from "vitest";
import {
  canTransitionPartnerStatus,
  validatePartnerApplication,
} from "../partner";

describe("validatePartnerApplication", () => {
  it("accepts a minimal valid application and applies defaults", () => {
    const res = validatePartnerApplication({ company_name: "GM LUXE" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.company_name).toBe("GM LUXE");
    expect(res.value.market).toBe("Miami");
    expect(res.value.contact_name).toBeNull();
    expect(res.value.phone).toBeNull();
    expect(res.value.website).toBeNull();
    expect(res.value.fleet_size).toBeNull();
  });

  it("trims and length-caps fields", () => {
    const res = validatePartnerApplication({
      company_name: `  ${"x".repeat(300)}  `,
      phone: `  +1 305 555 0100  `,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.company_name).toHaveLength(120);
    expect(res.value.phone).toBe("+1 305 555 0100");
  });

  it.each([undefined, null, "", "   ", "x", 42])(
    "rejects missing/short company name: %j",
    (company_name) => {
      const res = validatePartnerApplication({ company_name });
      expect(res.ok).toBe(false);
    },
  );

  it("rejects non-object payloads", () => {
    expect(validatePartnerApplication(null).ok).toBe(false);
    expect(validatePartnerApplication("GM LUXE").ok).toBe(false);
  });

  it("normalizes bare-domain websites to https", () => {
    const res = validatePartnerApplication({
      company_name: "GM LUXE",
      website: "gmluxe.net",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.website).toBe("https://gmluxe.net");
  });

  it("keeps explicit http(s) URLs and rejects other schemes", () => {
    const ok = validatePartnerApplication({
      company_name: "GM LUXE",
      website: "http://gmluxe.net",
    });
    expect(ok.ok && ok.value.website).toBe("http://gmluxe.net");

    const bad = validatePartnerApplication({
      company_name: "GM LUXE",
      // eslint-disable-next-line no-script-url
      website: "javascript:alert(1)",
    });
    expect(bad.ok).toBe(false);
  });

  it("drops unknown fleet sizes instead of failing the application", () => {
    const res = validatePartnerApplication({
      company_name: "GM LUXE",
      fleet_size: "a zillion",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.fleet_size).toBeNull();
  });

  it("accepts known fleet sizes", () => {
    const res = validatePartnerApplication({
      company_name: "GM LUXE",
      fleet_size: "6-15",
    });
    expect(res.ok && res.value.fleet_size).toBe("6-15");
  });
});

describe("canTransitionPartnerStatus", () => {
  it("allows review outcomes and reinstatement", () => {
    expect(canTransitionPartnerStatus("pending", "approved")).toBe(true);
    expect(canTransitionPartnerStatus("pending", "suspended")).toBe(true);
    expect(canTransitionPartnerStatus("approved", "suspended")).toBe(true);
    expect(canTransitionPartnerStatus("suspended", "approved")).toBe(true);
  });

  it("rejects no-ops and any return to pending", () => {
    expect(canTransitionPartnerStatus("pending", "pending")).toBe(false);
    expect(canTransitionPartnerStatus("approved", "approved")).toBe(false);
    expect(canTransitionPartnerStatus("approved", "pending")).toBe(false);
    expect(canTransitionPartnerStatus("suspended", "pending")).toBe(false);
  });
});
