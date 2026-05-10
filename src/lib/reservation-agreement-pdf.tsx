// Server-side PDF generator for the founding-cohort reservation
// agreement. Mirrors the structure of llc-amendment-pdf.tsx so the
// brand band, key-value table, signature block, and fineprint share
// visual conventions across all RYDA legal documents.
//
// LEGAL POSTURE
// This is a 1-page reservation agreement, NOT an Operating Agreement,
// NOT a security, NOT a subscription. It captures a refundable
// pre-LLC-formation commitment with three terms:
//   1. Member is reserving N shares in a forthcoming LLC for a
//      specific vehicle
//   2. Deposit is held in RYDA's segregated escrow account and
//      refunded if the cohort doesn't fill by `expires_at`
//   3. Upon LLC formation (5 reservations on the same vehicle), the
//      deposit converts to part of the share buy-in; member then
//      executes the full Operating Agreement separately
//
// The text below is template language that COUNSEL SHOULD REVIEW
// before being used at scale. The LLC-amendment template carries
// the same caveat. Per docs/RYDA_STRATEGIC_AUDIT.md the operational
// goal is to ship something that runs the MVP test in the next 14
// days, not something that's been blessed by every state's bar
// association.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

// Same palette + measurements as llc-amendment-pdf.tsx so the two
// documents look like siblings. Any future restyling should update
// both files together.
const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1c1c1c",
    backgroundColor: "#ffffff",
  },
  band: {
    backgroundColor: "#0e0e10",
    color: "#f4f1ec",
    padding: 18,
    marginBottom: 36,
    marginHorizontal: -56,
    paddingHorizontal: 56,
  },
  bandLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#DC4747",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  bandTitle: {
    fontSize: 18,
    color: "#f4f1ec",
    fontWeight: 500,
  },
  h1: {
    fontSize: 22,
    marginBottom: 16,
    fontWeight: 500,
  },
  h2: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: "#7a7670",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.55,
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e1d8",
  },
  kvKey: {
    width: 160,
    fontSize: 10,
    color: "#7a7670",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kvVal: {
    fontSize: 11,
    color: "#1c1c1c",
    flex: 1,
  },
  signature: {
    marginTop: 48,
    flexDirection: "row",
    gap: 32,
  },
  sigBlock: {
    flex: 1,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
    height: 36,
    marginBottom: 6,
  },
  sigCaption: {
    fontSize: 9,
    color: "#7a7670",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fineprint: {
    marginTop: 32,
    fontSize: 8,
    color: "#7a7670",
    lineHeight: 1.5,
  },
  // Numbered terms list — small index column + body column.
  termRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  termNum: {
    width: 22,
    fontSize: 11,
    fontWeight: 500,
  },
  termBody: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
  },
});

export type ReservationInput = {
  reservationId: string;
  memberName: string;
  memberEmail: string;
  // Display label for the asset, e.g. "2026 Ferrari 296 GTB"
  assetLabel: string;
  // The forthcoming LLC's working name, e.g. "RYDA F296 LLC"
  prospectiveLlcName: string;
  // Number of shares being reserved (1-10, typically 2 under the
  // 2-share-minimum doctrine).
  sharesReserved: number;
  // Deposit dollar amount (NOT cents). Caller converts before passing.
  depositDollars: number;
  // ISO date strings (YYYY-MM-DD) — caller formats before passing
  // so we don't drag a date library into the renderer.
  effectiveDate: string;
  expirationDate: string;
};

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ReservationAgreement(input: ReservationInput) {
  return (
    <Document
      title={`RYDA Reservation Agreement — ${input.assetLabel}`}
      author="RYDA LLC"
      subject={`Pre-LLC-formation reservation for ${input.memberName}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.band}>
          <Text style={styles.bandLabel}>RYDA · Founding Cohort</Text>
          <Text style={styles.bandTitle}>Reservation Agreement</Text>
        </View>

        <Text style={styles.h1}>{input.assetLabel}</Text>

        <Text style={styles.body}>
          This Reservation Agreement (&ldquo;Agreement&rdquo;) is entered
          into between RYDA LLC, a Florida limited liability company
          (&ldquo;RYDA&rdquo;) and the Member identified below
          (&ldquo;Member&rdquo;) with respect to a forthcoming
          single-purpose limited liability company (&ldquo;the LLC&rdquo;)
          that will hold title to the Vehicle described below.
        </Text>

        <Text style={styles.h2}>Member</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Name</Text>
          <Text style={styles.kvVal}>{input.memberName}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Email</Text>
          <Text style={styles.kvVal}>{input.memberEmail}</Text>
        </View>

        <Text style={styles.h2}>Reservation</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Vehicle</Text>
          <Text style={styles.kvVal}>{input.assetLabel}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Forthcoming LLC</Text>
          <Text style={styles.kvVal}>{input.prospectiveLlcName}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Shares reserved</Text>
          <Text style={styles.kvVal}>
            {input.sharesReserved} of 10 (
            {((input.sharesReserved / 10) * 100).toFixed(0)}%)
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Refundable deposit</Text>
          <Text style={styles.kvVal}>{fmtUsd(input.depositDollars)}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Effective date</Text>
          <Text style={styles.kvVal}>{input.effectiveDate}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Reservation expires</Text>
          <Text style={styles.kvVal}>{input.expirationDate}</Text>
        </View>

        <Text style={styles.h2}>Terms</Text>

        <View style={styles.termRow}>
          <Text style={styles.termNum}>1.</Text>
          <Text style={styles.termBody}>
            <Text style={{ fontWeight: 500 }}>Deposit + escrow.</Text>
            {" "}Member will wire the refundable deposit shown above to
            RYDA&rsquo;s segregated escrow account. Member will receive
            wire instructions and a unique reference code separately by
            email. The deposit is held in escrow and not commingled with
            RYDA&rsquo;s operating funds.
          </Text>
        </View>

        <View style={styles.termRow}>
          <Text style={styles.termNum}>2.</Text>
          <Text style={styles.termBody}>
            <Text style={{ fontWeight: 500 }}>LLC formation trigger.</Text>
            {" "}Upon receipt of a minimum of five (5) executed
            reservation agreements and corresponding deposits for the
            Vehicle, RYDA will form the LLC, fund the vehicle purchase,
            and present the Operating Agreement and Management Services
            Agreement to all reserving Members for execution.
          </Text>
        </View>

        <View style={styles.termRow}>
          <Text style={styles.termNum}>3.</Text>
          <Text style={styles.termBody}>
            <Text style={{ fontWeight: 500 }}>Conversion.</Text>
            {" "}Upon Member&rsquo;s execution of the Operating Agreement
            and balance funding of the share buy-in, the deposit shown
            above is applied as a credit toward the share purchase
            price.
          </Text>
        </View>

        <View style={styles.termRow}>
          <Text style={styles.termNum}>4.</Text>
          <Text style={styles.termBody}>
            <Text style={{ fontWeight: 500 }}>Refund.</Text>
            {" "}If RYDA has not formed the LLC by the Reservation
            Expiration date above, or if Member elects in writing to
            withdraw before that date, RYDA will return the deposit in
            full to Member&rsquo;s wire-of-record within 5 business days,
            without deduction.
          </Text>
        </View>

        <View style={styles.termRow}>
          <Text style={styles.termNum}>5.</Text>
          <Text style={styles.termBody}>
            <Text style={{ fontWeight: 500 }}>Not a security.</Text>
            {" "}This Reservation Agreement is not an offer of, and
            Member&rsquo;s deposit is not paid for, any security as that
            term is defined under the Securities Act of 1933 or
            applicable state law. The forthcoming LLC will be
            member-managed; co-ownership interests are not registered
            securities and not offered for investment purposes.
          </Text>
        </View>

        <View style={styles.termRow}>
          <Text style={styles.termNum}>6.</Text>
          <Text style={styles.termBody}>
            <Text style={{ fontWeight: 500 }}>Governing law.</Text>
            {" "}This Agreement is governed by the laws of the State of
            Florida, without regard to its conflicts-of-laws principles.
            Any dispute will be resolved by binding arbitration
            administered by JAMS in Miami, Florida, except for
            small-claims matters which may be brought in court.
          </Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigCaption}>Member signature</Text>
            <Text style={styles.sigCaption}>{input.memberName}</Text>
            <Text style={styles.sigCaption}>Date: __________</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigCaption}>RYDA LLC</Text>
            <Text style={styles.sigCaption}>By: __________</Text>
            <Text style={styles.sigCaption}>Title: __________</Text>
            <Text style={styles.sigCaption}>Date: __________</Text>
          </View>
        </View>

        <Text style={styles.fineprint}>
          Reservation reference: {input.reservationId}. This document
          is generated by RYDA from current member-of-record data and
          is intended for execution within 14 days of the effective
          date above. RYDA reserves the right to update template
          language with notice prior to the Reservation Expiration
          date. Member acknowledges receipt of RYDA&rsquo;s Privacy
          Policy and Terms of Service available at ryda.pro/legal.
        </Text>
      </Page>
    </Document>
  );
}

/** Render the agreement to a Node Buffer. Used by:
 *  - POST /api/admin/prospects/[id]/reservation (initial generation
 *    + upload to private Storage bucket; URL stored on the row)
 *  - GET  /api/admin/reservations/[id]/pdf (re-render on demand for
 *    download / re-print) */
export async function renderReservationAgreement(
  input: ReservationInput,
): Promise<Buffer> {
  return renderToBuffer(<ReservationAgreement {...input} />);
}
