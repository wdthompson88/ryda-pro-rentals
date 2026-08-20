// Tests for the payout decision (build loop 3B / decision D4).
//
// This function decides whether real money leaves RYDA's balance. The
// happy path is one test; the rest of this file is the two ways it can be
// wrong:
//
//   PAYING WHEN IT IS NOT OWED — twice, for a refunded booking, before
//   the trip, or from a charge that never landed. Irreversible by any
//   database rollback.
//
//   NOT PAYING WHEN IT IS — quieter and worse for the operator, because
//   nothing surfaces it unless something is looking.
//
// The ordering assertions are not stylistic. A caller shows the FIRST
// refusal, so an order that reported "finish your Stripe details" on a
// booking whose trip has not happened would send operators to fix things
// that were never the obstacle.

import { describe, it, expect } from "vitest";
import {
  PAYOUT_STATUS_STALE_AFTER_MS,
  decidePayout,
  isPayoutStatusStale,
  payoutBlockMessage,
  payoutBlockOwner,
  summarisePayouts,
  type PayoutBlockReason,
  type PayoutBooking,
  type PayoutPartner,
  type PayoutPayment,
} from "../rental-payout";

const READY_PARTNER: PayoutPartner = {
  id: "p1",
  name: "GM LUXE",
  stripe_account_id: "acct_live",
  payouts_enabled: true,
  details_submitted: true,
  transfers_capability: "active",
  payout_status_at: new Date().toISOString(),
};

const DONE_BOOKING: PayoutBooking = {
  id: "b1",
  status: "completed",
  end_date: "2026-09-15",
};

const SETTLED_PAYMENT: PayoutPayment = {
  id: "pay1",
  status: "paid",
  operator_net_cents: 281_775,
  refunded_cents: 0,
  stripe_transfer_id: null,
  transferred_at: null,
};

const decide = (over: {
  booking?: Partial<PayoutBooking>;
  payment?: Partial<PayoutPayment> | null;
  partner?: Partial<PayoutPartner>;
} = {}) =>
  decidePayout({
    booking: { ...DONE_BOOKING, ...over.booking },
    payment:
      over.payment === null
        ? null
        : { ...SETTLED_PAYMENT, ...(over.payment ?? {}) },
    partner: { ...READY_PARTNER, ...over.partner },
  });

describe("the payable case", () => {
  it("pays the operator's net on a completed, settled, unpaid booking", () => {
    const d = decide();
    expect(d).toEqual({
      payable: true,
      amountCents: 281_775,
      partnerId: "p1",
      paymentId: "pay1",
    });
  });

  it("nets a partial refund out of what is owed", () => {
    // The refund came out of the same charge, so the operator's share
    // shrinks by it.
    const d = decide({ payment: { refunded_cents: 81_775 } });
    expect(d.payable).toBe(true);
    if (d.payable) expect(d.amountCents).toBe(200_000);
  });
});

describe("never pay when it is not owed", () => {
  it("refuses a booking that is still in progress", () => {
    // Paying while the car is out forfeits the only leverage anyone has
    // if it comes back damaged.
    const d = decide({ booking: { status: "in_progress" } });
    expect(d).toMatchObject({ payable: false, reason: "booking_not_completed" });
  });

  it.each(["requested", "confirmed", "declined", "expired", "cancelled"] as const)(
    "refuses a booking in status %s",
    (status) => {
      expect(decide({ booking: { status } })).toMatchObject({
        payable: false,
        reason: "booking_not_completed",
      });
    },
  );

  it("refuses when no payment exists at all", () => {
    // The check that keeps this safe while the charge rail is unbuilt:
    // no charge means no ledger row means no transfer, so RYDA cannot
    // pay an operator out of its own funds for a booking nobody paid.
    expect(decide({ payment: null })).toMatchObject({
      payable: false,
      reason: "no_payment",
    });
  });

  it.each(["pending", "expired", "canceled"] as const)(
    "refuses an unsettled payment in status %s",
    (status) => {
      expect(decide({ payment: { status } })).toMatchObject({
        payable: false,
        reason: "payment_not_settled",
      });
    },
  );

  it("refuses a refunded payment", () => {
    expect(decide({ payment: { status: "refunded" } })).toMatchObject({
      payable: false,
      reason: "payment_refunded",
    });
  });

  it("refuses while a dispute is open", () => {
    // The bank may already have pulled the funds; paying now means paying
    // with money RYDA no longer has.
    expect(decide({ payment: { status: "disputed" } })).toMatchObject({
      payable: false,
      reason: "payment_disputed",
    });
  });

  it("refuses a payout that already has a transfer id", () => {
    // 0051's UNIQUE stops the second ROW; it does not stop the second
    // TRANSFER, which has already moved money by the time the insert
    // fails. Hence the check here as well.
    expect(
      decide({ payment: { stripe_transfer_id: "tr_1" } }),
    ).toMatchObject({ payable: false, reason: "already_transferred" });
  });

  it("refuses one that has transferred_at but somehow no id", () => {
    expect(
      decide({ payment: { transferred_at: "2026-09-20T00:00:00Z" } }),
    ).toMatchObject({ payable: false, reason: "already_transferred" });
  });

  it("refuses when the refund consumed the whole net", () => {
    expect(
      decide({ payment: { refunded_cents: 281_775 } }),
    ).toMatchObject({ payable: false, reason: "nothing_owed" });
  });

  it("refuses when a refund somehow exceeds the net", () => {
    expect(
      decide({ payment: { refunded_cents: 400_000 } }),
    ).toMatchObject({ payable: false, reason: "nothing_owed" });
  });

  it("refuses when operator_net_cents was never recorded", () => {
    // Null on rows written before 0051. Treating null as zero is right:
    // a payout amount we cannot substantiate is not one to send.
    expect(
      decide({ payment: { operator_net_cents: null } }),
    ).toMatchObject({ payable: false, reason: "nothing_owed" });
  });
});

describe("the operator's account must be able to receive it", () => {
  it("refuses without a Connect account", () => {
    expect(decide({ partner: { stripe_account_id: null } })).toMatchObject({
      payable: false,
      reason: "no_connect_account",
    });
  });

  it("refuses when onboarding details are unfinished", () => {
    expect(decide({ partner: { details_submitted: false } })).toMatchObject({
      payable: false,
      reason: "details_not_submitted",
    });
  });

  it("refuses when payouts are disabled", () => {
    // The transfer would SUCCEED and the money would sit in the
    // operator's Stripe balance with no route to their bank — worse than
    // not paying, because the ledger would say paid.
    expect(decide({ partner: { payouts_enabled: false } })).toMatchObject({
      payable: false,
      reason: "payouts_disabled",
    });
  });

  it.each([null, "pending", "inactive", "something_new"] as const)(
    "fails closed on transfers_capability = %s",
    (cap) => {
      expect(
        decide({ partner: { transfers_capability: cap } }),
      ).toMatchObject({ payable: false, reason: "transfers_capability_inactive" });
    },
  );

  it("still reports the amount owed when the operator is the blocker", () => {
    // The money IS owed — it just cannot move. The reconciliation total
    // depends on this being non-zero.
    const d = decide({ partner: { payouts_enabled: false } });
    expect(d.payable).toBe(false);
    if (!d.payable) expect(d.amountCents).toBe(281_775);
  });

  it("reports zero owed when the booking is simply not finished", () => {
    // Not blocked money — a trip in progress. Folding it into the
    // blocked total would make the headline figure meaningless.
    const d = decide({ booking: { status: "confirmed" } });
    expect(d.payable).toBe(false);
    if (!d.payable) expect(d.amountCents).toBe(0);
  });
});

describe("refusal ORDER — the first reason must be the actionable one", () => {
  it("reports the trip before the operator's Stripe details", () => {
    const d = decide({
      booking: { status: "confirmed" },
      partner: { details_submitted: false, payouts_enabled: false },
    });
    expect(d).toMatchObject({ reason: "booking_not_completed" });
  });

  it("reports the missing payment before the operator's account", () => {
    const d = decide({
      payment: null,
      partner: { stripe_account_id: null },
    });
    expect(d).toMatchObject({ reason: "no_payment" });
  });

  it("reports an existing transfer before anything about the operator", () => {
    const d = decide({
      payment: { stripe_transfer_id: "tr_1" },
      partner: { payouts_enabled: false },
    });
    expect(d).toMatchObject({ reason: "already_transferred" });
  });
});

describe("blame and copy", () => {
  const ALL: PayoutBlockReason[] = [
    "booking_not_completed", "no_payment", "payment_not_settled",
    "payment_refunded", "payment_disputed", "already_transferred",
    "no_connect_account", "details_not_submitted", "payouts_disabled",
    "transfers_capability_inactive", "nothing_owed",
  ];

  it("gives every reason a distinct, non-empty message", () => {
    const seen = new Set(ALL.map(payoutBlockMessage));
    expect(seen.size).toBe(ALL.length);
    for (const m of seen) expect(m.length).toBeGreaterThan(0);
  });

  it("assigns the operator's own blockers to the operator", () => {
    for (const r of [
      "no_connect_account", "details_not_submitted",
      "payouts_disabled", "transfers_capability_inactive",
    ] as const) {
      expect(payoutBlockOwner(r)).toBe("operator");
    }
  });

  it("assigns a missing or unsettled charge to RYDA", () => {
    expect(payoutBlockOwner("no_payment")).toBe("ryda");
    expect(payoutBlockOwner("payment_not_settled")).toBe("ryda");
  });

  it("assigns an unfinished trip to time, not to a party", () => {
    expect(payoutBlockOwner("booking_not_completed")).toBe("time");
  });

  it("blames nobody for a settled outcome", () => {
    for (const r of [
      "payment_refunded", "payment_disputed",
      "already_transferred", "nothing_owed",
    ] as const) {
      expect(payoutBlockOwner(r)).toBe("none");
    }
  });
});

describe("readiness staleness", () => {
  it("treats never-asked as stale", () => {
    expect(isPayoutStatusStale(null)).toBe(true);
  });

  it("treats an unparseable timestamp as stale", () => {
    expect(isPayoutStatusStale("not a date")).toBe(true);
  });

  it("treats a fresh answer as fresh", () => {
    const now = Date.UTC(2026, 8, 20);
    expect(isPayoutStatusStale(new Date(now - 1000).toISOString(), now)).toBe(false);
  });

  it("treats an answer older than the window as stale", () => {
    const now = Date.UTC(2026, 8, 20);
    const old = new Date(now - PAYOUT_STATUS_STALE_AFTER_MS - 1000).toISOString();
    expect(isPayoutStatusStale(old, now)).toBe(true);
  });
});

describe("reconciliation summary", () => {
  const line = (
    id: string,
    decision: ReturnType<typeof decidePayout>,
  ) => ({ bookingId: id, partnerId: "p1", partnerName: "GM LUXE", decision });

  it("totals what could be sent right now", () => {
    const s = summarisePayouts([
      line("b1", decide()),
      line("b2", decide({ payment: { id: "pay2", refunded_cents: 81_775 } })),
    ]);
    expect(s.payableCount).toBe(2);
    expect(s.payableCents).toBe(281_775 + 200_000);
    expect(s.blockedCount).toBe(0);
  });

  it("counts owed-but-stuck money separately from trips in progress", () => {
    const s = summarisePayouts([
      line("b1", decide({ partner: { payouts_enabled: false } })), // owed, stuck
      line("b2", decide({ booking: { status: "confirmed" } })),    // not owed yet
    ]);
    // Both are "blocked" as reasons...
    expect(s.byReason.payouts_disabled).toBe(1);
    expect(s.byReason.booking_not_completed).toBe(1);
    // ...but only one is money sitting still.
    expect(s.blockedCount).toBe(1);
    expect(s.blockedCents).toBe(281_775);
  });

  it("groups by who has to act", () => {
    const s = summarisePayouts([
      line("b1", decide({ partner: { payouts_enabled: false } })),
      line("b2", decide({ partner: { details_submitted: false } })),
      line("b3", decide({ payment: null })),
      line("b4", decide({ booking: { status: "confirmed" } })),
    ]);
    expect(s.byOwner.operator).toBe(2);
    expect(s.byOwner.ryda).toBe(1);
    expect(s.byOwner.time).toBe(1);
  });

  it("is all zeroes for an empty ledger", () => {
    const s = summarisePayouts([]);
    expect(s).toEqual({
      payableCount: 0, payableCents: 0,
      blockedCount: 0, blockedCents: 0,
      byReason: {}, byOwner: {},
    });
  });
});
