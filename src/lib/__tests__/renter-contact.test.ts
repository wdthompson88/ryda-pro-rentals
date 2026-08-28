// Tests for the renter contact precedence rule (renter-contact.ts).
//
// The defect this guards against: a signed-in member with a name on
// file somewhere being shown an empty "Full name" box on the request
// form. Every source a name can be written from is covered, and the
// order they win in is pinned — user_profiles (the profile page's
// legal name) over rental_profiles (last thing typed into a request)
// over auth metadata (onboarding / OAuth).

import { describe, expect, it } from "vitest";
import {
  metadataName,
  metadataPhone,
  resolveRenterContact,
} from "../renter-contact";

describe("metadataName", () => {
  it("prefers the composed `name` onboarding writes", () => {
    expect(
      metadataName({ name: "Dave Thompson", full_name: "David Thompson" }),
    ).toBe("Dave Thompson");
  });

  it("falls back to `full_name` (Google)", () => {
    expect(metadataName({ full_name: "David Thompson" })).toBe(
      "David Thompson",
    );
  });

  it("composes first_name + last_name when neither display name exists", () => {
    expect(metadataName({ first_name: "Dave", last_name: "Thompson" })).toBe(
      "Dave Thompson",
    );
    expect(metadataName({ first_name: "Dave" })).toBe("Dave");
    expect(metadataName({ last_name: "Thompson" })).toBe("Thompson");
  });

  it("ignores blanks and non-strings", () => {
    expect(metadataName({ name: "   ", full_name: 42, first_name: null })).toBe(
      "",
    );
    expect(metadataName(null)).toBe("");
    expect(metadataName(undefined)).toBe("");
    expect(metadataName({})).toBe("");
  });

  it("trims whitespace", () => {
    expect(metadataName({ name: "  Dave Thompson  " })).toBe("Dave Thompson");
  });
});

describe("metadataPhone", () => {
  it("reads the onboarding `phone` key", () => {
    expect(metadataPhone({ phone: " +1 305 555 0145 " })).toBe(
      "+1 305 555 0145",
    );
  });

  it("is empty when absent, blank, or not a string", () => {
    expect(metadataPhone({})).toBe("");
    expect(metadataPhone({ phone: "" })).toBe("");
    expect(metadataPhone({ phone: 3055550145 })).toBe("");
    expect(metadataPhone(null)).toBe("");
  });
});

describe("resolveRenterContact", () => {
  const userProfile = { full_name: "David Thompson", phone: "+1 305 555 0001" };
  const rentalProfile = { full_name: "Dave T", phone: "+1 305 555 0002" };
  const metadata = {
    name: "Dave Thompson",
    first_name: "Dave",
    last_name: "Thompson",
    phone: "+1 305 555 0003",
  };

  it("user_profiles wins when every source is present", () => {
    expect(resolveRenterContact({ userProfile, rentalProfile, metadata })).toEqual(
      { name: "David Thompson", phone: "+1 305 555 0001" },
    );
  });

  it("rental_profiles wins over metadata when there is no user_profiles row", () => {
    expect(
      resolveRenterContact({ userProfile: null, rentalProfile, metadata }),
    ).toEqual({ name: "Dave T", phone: "+1 305 555 0002" });
  });

  it("metadata carries a member who finished onboarding but never sent a request", () => {
    expect(
      resolveRenterContact({ userProfile: null, rentalProfile: null, metadata }),
    ).toEqual({ name: "Dave Thompson", phone: "+1 305 555 0003" });
  });

  it("resolves name and phone independently", () => {
    // Name on the profile page, phone only from onboarding.
    expect(
      resolveRenterContact({
        userProfile: { full_name: "David Thompson", phone: null },
        rentalProfile: { full_name: "", phone: "   " },
        metadata: { phone: "+1 305 555 0003" },
      }),
    ).toEqual({ name: "David Thompson", phone: "+1 305 555 0003" });
  });

  it("a blank higher-precedence value never beats a real lower one", () => {
    expect(
      resolveRenterContact({
        userProfile: { full_name: "  ", phone: "" },
        rentalProfile: { full_name: null, phone: undefined },
        metadata: { full_name: "David Thompson" },
      }),
    ).toEqual({ name: "David Thompson", phone: "" });
  });

  it("is empty when nothing is on file anywhere", () => {
    expect(resolveRenterContact({})).toEqual({ name: "", phone: "" });
    expect(
      resolveRenterContact({ userProfile: null, rentalProfile: null, metadata: {} }),
    ).toEqual({ name: "", phone: "" });
  });
});
