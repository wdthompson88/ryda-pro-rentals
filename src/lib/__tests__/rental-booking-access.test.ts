// Tests for the rental booking authorization boundary (build loop 2D).
//
// Three service-role routes read and write rental_bookings, which means
// RLS is bypassed on every one of them and the checks in
// rental-booking-access.ts ARE the access control. Two failure modes are
// worth a suite of their own:
//
//   1. A caller reading a booking that is none of their business. The
//      routes answer 404 rather than 403 for a non-party, so a bug here
//      does not announce itself — it just quietly serves the row.
//   2. An operator's identity reaching a renter before the booking is
//      confirmed. That is decision D6, it is a promise made in public
//      copy ("a Miami operator"), and the whole point of routing
//      every payload through discloseOperator() is that it can be
//      pinned here once instead of in each route.

import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RENTAL_BOOKING_COLS,
  anonymousOperatorLabel,
  awaitsRentalBookingDecision,
  discloseOperator,
  isOperatorRevealedToRenter,
  loadPartnerStaffIds,
  projectRentalBooking,
  rentalBookingAccess,
  rentalBookingDecider,
  rentalBookingSubject,
  type RentalBookingAccessGranted,
  type RentalBookingCaller,
  type RentalBookingRow,
  type RentalBookingSubject,
  type RentalOperatorIdentity,
} from "../rental-booking-access";
import { RENTAL_BOOKING_STATUSES } from "../rental-booking-status";
import {
  quoteRentalBooking,
  rentalQuoteColumns,
  renterFacingQuote,
  type RentalQuoteListing,
} from "../rental-quote";

// ── fixtures ────────────────────────────────────────────────────────

const RENTER = "11111111-1111-4111-8111-111111111111";
const OTHER_RENTER = "22222222-2222-4222-8222-222222222222";
const STAFF = "33333333-3333-4333-8333-333333333333";
const ADMIN = "44444444-4444-4444-8444-444444444444";
const PARTNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PARTNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const OPERATOR: RentalOperatorIdentity = {
  partnerId: PARTNER,
  name: "GM LUXE",
  email: "ops@gmluxe.example",
};

function subject(over: Partial<RentalBookingSubject> = {}): RentalBookingSubject {
  return {
    renter_user_id: RENTER,
    status: "requested",
    initiated_by: "renter",
    confirmed_at: null,
    listing_partner_id: PARTNER,
    ...over,
  };
}

const renterCaller: RentalBookingCaller = { userId: RENTER };
const otherRenterCaller: RentalBookingCaller = { userId: OTHER_RENTER };
const staffCaller: RentalBookingCaller = {
  userId: STAFF,
  partnerIds: [PARTNER],
};
const otherStaffCaller: RentalBookingCaller = {
  userId: STAFF,
  partnerIds: [OTHER_PARTNER],
};
const adminCaller: RentalBookingCaller = { userId: ADMIN, isAdmin: true };
const anonCaller: RentalBookingCaller = { userId: null };

function row(over: Partial<RentalBookingRow> = {}): RentalBookingRow {
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    listing_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    renter_user_id: RENTER,
    start_date: "2026-09-05",
    end_date: "2026-09-08",
    status: "requested",
    initiated_by: "renter",
    base_amount_cents: 331_500,
    fee_cents: 49_725,
    fee_payer: "operator",
    deposit_amount_cents: 0,
    renter_total_cents: 331_500,
    operator_net_cents: 281_775,
    currency: "usd",
    deposit_status: "none",
    deposit_authorized_at: null,
    deposit_auth_expires_at: null,
    deposit_captured_cents: 0,
    expires_at: "2026-08-11T00:00:00.000Z",
    confirmed_at: null,
    completed_at: null,
    decided_at: null,
    cancelled_by: null,
    created_at: "2026-08-10T00:00:00.000Z",
    updated_at: "2026-08-10T00:00:00.000Z",
    ...over,
  };
}

function granted(over: Partial<RentalBookingAccessGranted> = {}) {
  return {
    ok: true as const,
    party: "renter" as const,
    canDecide: false,
    operatorRevealed: false,
    ...over,
  };
}

// ── who may see a booking ───────────────────────────────────────────

describe("rentalBookingAccess — the renter", () => {
  it("sees their own booking", () => {
    const access = rentalBookingAccess(renterCaller, subject());
    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.party).toBe("renter");
  });

  it("sees nothing of another renter's booking", () => {
    const access = rentalBookingAccess(otherRenterCaller, subject());
    expect(access).toEqual({ ok: false, reason: "not_a_party" });
  });

  it("is still the renter on a car their own employer operates", () => {
    // Renter wins the label over operator staff, so the row reads as
    // theirs. The capabilities are computed separately, which is why the
    // operator identity is still visible to them here.
    const access = rentalBookingAccess(
      { userId: RENTER, partnerIds: [PARTNER] },
      subject(),
    );
    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.party).toBe("renter");
    expect(access.operatorRevealed).toBe(true);
  });
});

describe("rentalBookingAccess — operator staff", () => {
  it("sees a booking on a listing their partner owns", () => {
    const access = rentalBookingAccess(staffCaller, subject());
    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.party).toBe("operator");
  });

  it("sees nothing on another operator's listing", () => {
    const access = rentalBookingAccess(otherStaffCaller, subject());
    expect(access).toEqual({ ok: false, reason: "not_a_party" });
  });

  it("sees nothing when the listing's owner could not be resolved", () => {
    // Fail closed: an unknown owner must never resolve to "everyone".
    const access = rentalBookingAccess(
      staffCaller,
      subject({ listing_partner_id: null }),
    );
    expect(access).toEqual({ ok: false, reason: "not_a_party" });
  });
});

describe("rentalBookingAccess — admin and strangers", () => {
  it("admin sees every booking, whoever the parties are", () => {
    const access = rentalBookingAccess(
      adminCaller,
      subject({ renter_user_id: OTHER_RENTER, listing_partner_id: OTHER_PARTNER }),
    );
    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.party).toBe("admin");
  });

  it("a signed-in non-party gets nothing", () => {
    const access = rentalBookingAccess({ userId: OTHER_RENTER }, subject());
    expect(access).toEqual({ ok: false, reason: "not_a_party" });
  });

  it("an anonymous caller is unauthenticated, not merely unauthorized", () => {
    // Distinct reasons because the routes answer them differently: 401
    // (sign in and try again) vs 404 (there is nothing here for you).
    expect(rentalBookingAccess(anonCaller, subject())).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });

  it("an isAdmin flag without a user id is not admin", () => {
    expect(rentalBookingAccess({ userId: null, isAdmin: true }, subject())).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });
});

// ── whose turn it is ────────────────────────────────────────────────

describe("who owes the answer", () => {
  it("a renter's request is awaiting the operator", () => {
    expect(rentalBookingDecider({ initiated_by: "renter" })).toBe("operator");
  });

  it("an operator's counter-offer is awaiting the renter", () => {
    expect(rentalBookingDecider({ initiated_by: "operator" })).toBe("renter");
  });

  it("only a requested booking awaits a decision", () => {
    const awaiting = RENTAL_BOOKING_STATUSES.filter((status) =>
      awaitsRentalBookingDecision({ status }),
    );
    expect(awaiting).toEqual(["requested"]);
  });

  it("operator staff may decide a renter's request; the renter may not", () => {
    const s = subject();
    const staff = rentalBookingAccess(staffCaller, s);
    const renter = rentalBookingAccess(renterCaller, s);
    expect(staff.ok && staff.canDecide).toBe(true);
    expect(renter.ok && renter.canDecide).toBe(false);
  });

  it("the renter may answer an operator's counter-offer; the operator may not", () => {
    const s = subject({ initiated_by: "operator" });
    const staff = rentalBookingAccess(staffCaller, s);
    const renter = rentalBookingAccess(renterCaller, s);
    expect(renter.ok && renter.canDecide).toBe(true);
    expect(staff.ok && staff.canDecide).toBe(false);
  });

  it("nobody may decide a booking that is no longer requested", () => {
    for (const status of RENTAL_BOOKING_STATUSES) {
      if (status === "requested") continue;
      const s = subject({ status });
      for (const caller of [renterCaller, staffCaller, adminCaller]) {
        const access = rentalBookingAccess(caller, s);
        expect(access.ok && access.canDecide).toBe(false);
      }
    }
  });

  it("an admin may decide on either side of a live request", () => {
    for (const initiated_by of ["renter", "operator"] as const) {
      const access = rentalBookingAccess(adminCaller, subject({ initiated_by }));
      expect(access.ok && access.canDecide).toBe(true);
    }
  });
});

// ── D6: the operator reveal ─────────────────────────────────────────

describe("D6 — the operator is withheld until the booking is confirmed", () => {
  it("is withheld from the renter before confirmation", () => {
    for (const status of ["requested", "declined", "expired"] as const) {
      const access = rentalBookingAccess(renterCaller, subject({ status }));
      expect(access.ok && access.operatorRevealed).toBe(false);
      expect(discloseOperator(access, OPERATOR, "Miami")).toEqual({
        revealed: false,
        label: "A Miami operator",
      });
    }
  });

  it("is revealed to the renter from confirmation onward", () => {
    for (const status of ["confirmed", "in_progress", "completed"] as const) {
      const access = rentalBookingAccess(
        renterCaller,
        subject({ status, confirmed_at: "2026-08-10T12:00:00.000Z" }),
      );
      expect(access.ok && access.operatorRevealed).toBe(true);
      expect(discloseOperator(access, OPERATOR, "Miami")).toEqual({
        revealed: true,
        operator: OPERATOR,
      });
    }
  });

  it("stays revealed on a booking cancelled AFTER it was confirmed", () => {
    // The renter has to be able to say who cancelled their trip.
    expect(
      isOperatorRevealedToRenter({
        status: "cancelled",
        confirmed_at: "2026-08-10T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("stays hidden on a booking cancelled out of 'requested'", () => {
    expect(
      isOperatorRevealedToRenter({ status: "cancelled", confirmed_at: null }),
    ).toBe(false);
  });

  it("is revealed to the operator's own staff at every status", () => {
    for (const status of RENTAL_BOOKING_STATUSES) {
      const access = rentalBookingAccess(staffCaller, subject({ status }));
      expect(access.ok && access.operatorRevealed).toBe(true);
    }
  });

  it("is revealed to an admin at every status", () => {
    for (const status of RENTAL_BOOKING_STATUSES) {
      const access = rentalBookingAccess(adminCaller, subject({ status }));
      expect(access.ok && access.operatorRevealed).toBe(true);
    }
  });

  it("never reaches a non-party, whatever the status", () => {
    for (const status of RENTAL_BOOKING_STATUSES) {
      const access = rentalBookingAccess(
        otherRenterCaller,
        subject({ status, confirmed_at: "2026-08-10T12:00:00.000Z" }),
      );
      expect(access.ok).toBe(false);
      expect(discloseOperator(access, OPERATOR, "Miami")).toEqual({
        revealed: false,
        label: "A Miami operator",
      });
    }
  });

  it("degrades to the anonymous label when no identity was loaded", () => {
    // An entitled caller plus a failed partners lookup must not produce
    // a half-populated operator object.
    const access = rentalBookingAccess(
      renterCaller,
      subject({ status: "confirmed", confirmed_at: "2026-08-10T12:00:00.000Z" }),
    );
    expect(discloseOperator(access, null, "Miami")).toEqual({
      revealed: false,
      label: "A Miami operator",
    });
    expect(
      discloseOperator(access, { partnerId: PARTNER, name: "" }, "Miami"),
    ).toEqual({ revealed: false, label: "A Miami operator" });
  });

  it("names the market when it has one and stays honest when it does not", () => {
    expect(anonymousOperatorLabel("Miami")).toBe("A Miami operator");
    expect(anonymousOperatorLabel("  ")).toBe("The operator");
    expect(anonymousOperatorLabel(null)).toBe("The operator");
  });
});

// ── the payload ─────────────────────────────────────────────────────

describe("projectRentalBooking", () => {
  it("withholds RYDA's commission from the renter", () => {
    const view = projectRentalBooking(row(), granted({ party: "renter" }));
    expect(view.feeCents).toBeUndefined();
    expect(view.operatorNetCents).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain("49725");
    expect(JSON.stringify(view)).not.toContain("281775");
  });

  it("gives the operator and the admin their own numbers", () => {
    for (const party of ["operator", "admin"] as const) {
      const view = projectRentalBooking(row(), granted({ party }));
      expect(view.feeCents).toBe(49_725);
      expect(view.operatorNetCents).toBe(281_775);
    }
  });

  it("bills nights, not days", () => {
    // The 5th → the 8th is three nights and four occupied days.
    const view = projectRentalBooking(row(), granted());
    expect(view.nights).toBe(3);
  });

  it("only surfaces expires_at while the request is unanswered", () => {
    expect(projectRentalBooking(row(), granted()).expiresAt).toBe(
      "2026-08-11T00:00:00.000Z",
    );
    const decided = projectRentalBooking(
      row({ status: "declined", decided_at: "2026-08-10T09:00:00.000Z" }),
      granted(),
    );
    expect(decided.expiresAt).toBeNull();
    expect(decided.awaitsDecisionFrom).toBeNull();
  });

  it("says who is being waited on", () => {
    expect(projectRentalBooking(row(), granted()).awaitsDecisionFrom).toBe(
      "operator",
    );
    expect(
      projectRentalBooking(row({ initiated_by: "operator" }), granted())
        .awaitsDecisionFrom,
    ).toBe("renter");
  });

  it("never carries a Stripe object id", () => {
    // 0047 withholds charge_payment_intent_id / deposit_payment_intent_id
    // from `authenticated` outright; the select list must not fetch them
    // and the view must not have a home for them.
    const view = projectRentalBooking(row(), granted({ party: "admin" }));
    expect(Object.keys(view).join(",")).not.toContain("payment_intent");
    expect(RENTAL_BOOKING_COLS).not.toContain("payment_intent");
  });
});

describe("rentalBookingSubject", () => {
  it("folds a row and its listing's owner into one subject", () => {
    const s = rentalBookingSubject(row(), PARTNER);
    expect(s).toEqual({
      renter_user_id: RENTER,
      status: "requested",
      initiated_by: "renter",
      confirmed_at: null,
      listing_partner_id: PARTNER,
    });
  });

  it("normalizes a missing owner to null rather than undefined", () => {
    expect(rentalBookingSubject(row(), undefined).listing_partner_id).toBeNull();
  });
});

// ── the one query ───────────────────────────────────────────────────

type StubResult = { data: { partner_id: string | null }[] | null; error: { message: string } | null };

type StubBuilder = {
  select: (columns: string) => StubBuilder;
  eq: (column: string, value: unknown) => StubBuilder;
  then: <T>(onfulfilled: (value: StubResult) => T) => Promise<T>;
};

function stubDb(result: StubResult, filters: [string, unknown][] = []) {
  const builder: StubBuilder = {
    select: () => builder,
    eq: (column, value) => {
      filters.push([column, value]);
      return builder;
    },
    then: (onfulfilled) => Promise.resolve(result).then(onfulfilled),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("loadPartnerStaffIds", () => {
  it("asks only for APPROVED memberships of this user", async () => {
    const filters: [string, unknown][] = [];
    const ids = await loadPartnerStaffIds(
      stubDb({ data: [{ partner_id: PARTNER }], error: null }, filters),
      STAFF,
    );
    expect(ids).toEqual([PARTNER]);
    expect(filters).toEqual([
      ["user_id", STAFF],
      ["status", "approved"],
    ]);
  });

  it("drops unbridged applications (partner_id still null)", async () => {
    const ids = await loadPartnerStaffIds(
      stubDb({ data: [{ partner_id: null }, { partner_id: PARTNER }], error: null }),
      STAFF,
    );
    expect(ids).toEqual([PARTNER]);
  });

  it("fails closed when the lookup errors", async () => {
    const ids = await loadPartnerStaffIds(
      stubDb({
        data: null,
        error: { message: 'relation "partner_accounts" does not exist' },
      }),
      STAFF,
    );
    expect(ids).toEqual([]);
  });
});

// ── the 2C/2D seam ──────────────────────────────────────────────────
//
// 2C prices a range and 2D stores the result, and between them sits one
// mapping: rentalQuoteColumns(). Before it existed, each writing route
// spelled out `{ base_amount_cents: quote.baseAmountCents, … }` by hand,
// which is nine chances per route to transpose a pair — and the pair that
// matters, renter_total_cents and operator_net_cents, are both "cents
// about this booking", so swapping them type-checks perfectly and pays
// the operator the renter's gross.
//
// These tests pin the property that replaced the vigilance: what the
// renter is SHOWN and what the row STORES are the same numbers, because
// they come from the same quote through one mapping.

describe("quote → booking row", () => {
  const seamListing: RentalQuoteListing = {
    available_from: null,
    available_until: null,
    booking_horizon_days: 180,
    min_nights: 2,
    max_nights: 30,
    daily_rate_cents: 110_500,
  };

  /** The same stay the `row()` fixture above describes, actually priced. */
  function priced() {
    const result = quoteRentalBooking({
      listing: seamListing,
      startDate: "2026-09-05",
      endDate: "2026-09-08",
      today: "2026-09-01",
    });
    if (!result.ok) throw new Error(`expected a quote, got ${result.reason}`);
    return result.quote;
  }

  it("writes only columns the read path selects back", () => {
    // A column written but not selected is a number nothing can ever
    // show; a column selected but never written is a type that lies.
    const selected = RENTAL_BOOKING_COLS.split(",").map((c) => c.trim());
    for (const column of Object.keys(rentalQuoteColumns(priced()))) {
      expect(selected).toContain(column);
    }
  });

  it("stores exactly the numbers the renter was quoted", () => {
    const quote = priced();
    const shown = renterFacingQuote(quote);
    const stored = row(rentalQuoteColumns(quote));
    const view = projectRentalBooking(stored, granted());

    expect(view.startDate).toBe(shown.startDate);
    expect(view.endDate).toBe(shown.endDate);
    expect(view.baseAmountCents).toBe(shown.baseAmountCents);
    expect(view.renterTotalCents).toBe(shown.renterTotalCents);
    expect(view.depositAmountCents).toBe(shown.depositAmountCents);
    expect(view.feePayer).toBe(shown.feePayer);
    expect(view.currency).toBe(shown.currency);
  });

  it("counts nights identically on both sides of the write", () => {
    // The quote takes its figure from checkRange() and the view from
    // nightsBetween() — the same function, which is the point. The 5th
    // to the 8th is three nights and four occupied days.
    const quote = priced();
    const view = projectRentalBooking(row(rentalQuoteColumns(quote)), granted());
    expect(quote.nights).toBe(3);
    expect(view.nights).toBe(quote.nights);
  });

  it("carries the commission onto the row but not into a renter's view", () => {
    const quote = priced();
    const stored = row(rentalQuoteColumns(quote));

    expect(stored.fee_cents).toBe(quote.feeCents);
    expect(stored.operator_net_cents).toBe(quote.operatorNetCents);
    // Guard against a vacuous pass: a zero commission would satisfy the
    // omission below without proving anything was withheld.
    expect(quote.feeCents).toBeGreaterThan(0);

    const renterView = projectRentalBooking(stored, granted({ party: "renter" }));
    expect(renterView.feeCents).toBeUndefined();
    expect(renterView.operatorNetCents).toBeUndefined();

    const operatorView = projectRentalBooking(stored, granted({ party: "operator" }));
    expect(operatorView.feeCents).toBe(quote.feeCents);
    expect(operatorView.operatorNetCents).toBe(quote.operatorNetCents);
  });
});
