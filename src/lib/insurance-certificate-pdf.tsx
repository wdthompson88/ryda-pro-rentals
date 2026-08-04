// Server-side PDF generator for the per-LLC, per-member insurance
// certificate. Mirrors the visual conventions of llc-amendment-pdf
// and reservation-agreement-pdf so all RYDA legal documents look
// like siblings.
//
// PURPOSE
// Members named in an LLC's Operating Agreement need to be listed
// as "named insured" on the LLC's primary auto policy. A member
// who picks up the Ferrari at the Wynwood facility may be asked by
// concierge / law enforcement / a partner facility to produce
// proof of coverage. This PDF is that proof, downloadable any time
// from /account/documents.
//
// PRE-BINDING POSTURE
// Per /how-it-works/#partners (May 2026 dual-audit Finding 4),
// insurance is bound by Hagerty / CHUBB / Travelers but the
// specific carrier per LLC is set when the LLC's first vehicle is
// formally acquired. Until carrier + policy data are present on
// llc_entities, this generator renders an explicit "binding pending"
// state rather than fake data. That keeps the document honest and
// avoids a member showing up with a fraudulent-looking cert.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

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
    color: "#514C47",
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
    width: 200,
    fontSize: 10,
    color: "#514C47",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kvVal: {
    fontSize: 11,
    color: "#1c1c1c",
    flex: 1,
  },
  kvValPending: {
    fontSize: 11,
    color: "#514C47",
    flex: 1,
    fontStyle: "italic",
  },
  pendingBanner: {
    marginTop: 24,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  pendingBannerLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#92400E",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pendingBannerBody: {
    fontSize: 11,
    color: "#1c1c1c",
    lineHeight: 1.5,
  },
  fineprint: {
    marginTop: 32,
    fontSize: 8,
    color: "#514C47",
    lineHeight: 1.5,
  },
});

export type InsuranceCertificateInput = {
  certificateId: string; // typically the LLC id
  memberName: string;
  memberEmail: string;
  llcName: string;
  assetLabel: string;
  // Insurance fields — null/undefined means "not yet bound", which
  // we render explicitly as Pending rather than blank.
  carrier: string | null;
  policyNumber: string | null;
  agreedValueCents: number | null;
  deductibleCents: number | null;
  effectiveDate: string | null;   // YYYY-MM-DD
  expirationDate: string | null;  // YYYY-MM-DD
  broker: string | null;
  // Issued-on date for THIS certificate (today, when generated).
  issuedOn: string;
};

function fmtUsd(cents: number | null): string {
  if (cents == null) return "Pending";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function InsuranceCertificate(input: InsuranceCertificateInput) {
  const isBound = Boolean(input.carrier && input.policyNumber);

  return (
    <Document
      title={`Certificate of Insurance — ${input.llcName} — ${input.memberName}`}
      author="RYDA LLC"
      subject={`Named-insured certificate for ${input.memberName} on ${input.assetLabel}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.band}>
          <Text style={styles.bandLabel}>RYDA · Member Documents</Text>
          <Text style={styles.bandTitle}>Certificate of Insurance</Text>
        </View>

        <Text style={styles.h1}>{input.llcName}</Text>

        <Text style={styles.body}>
          This Certificate of Insurance is issued by RYDA LLC as broker
          of record for the named LLC. It identifies the Member listed
          below as a named insured under the LLC&rsquo;s primary auto
          policy with respect to the Vehicle described below. Members
          should retain this certificate when operating the Vehicle
          and present it on request to law-enforcement, partner
          facilities, or RYDA concierge staff.
        </Text>

        {!isBound && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerLabel}>Binding pending</Text>
            <Text style={styles.pendingBannerBody}>
              The named LLC has not yet completed insurance binding.
              This certificate renders the structural facts; carrier,
              policy number, agreed-value and deductible will populate
              once binding completes (typically within 5 business days
              of LLC formation). Re-download this certificate after
              binding for the active policy details.
            </Text>
          </View>
        )}

        <Text style={styles.h2}>Named insured (Member)</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Name</Text>
          <Text style={styles.kvVal}>{input.memberName}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Email</Text>
          <Text style={styles.kvVal}>{input.memberEmail}</Text>
        </View>

        <Text style={styles.h2}>Vehicle</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Asset</Text>
          <Text style={styles.kvVal}>{input.assetLabel}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Holding entity</Text>
          <Text style={styles.kvVal}>{input.llcName}</Text>
        </View>

        <Text style={styles.h2}>Coverage</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Carrier</Text>
          {input.carrier ? (
            <Text style={styles.kvVal}>{input.carrier}</Text>
          ) : (
            <Text style={styles.kvValPending}>Pending</Text>
          )}
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Policy number</Text>
          {input.policyNumber ? (
            <Text style={styles.kvVal}>{input.policyNumber}</Text>
          ) : (
            <Text style={styles.kvValPending}>Pending</Text>
          )}
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Agreed value</Text>
          <Text
            style={
              input.agreedValueCents != null ? styles.kvVal : styles.kvValPending
            }
          >
            {fmtUsd(input.agreedValueCents)}
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Deductible</Text>
          <Text
            style={
              input.deductibleCents != null ? styles.kvVal : styles.kvValPending
            }
          >
            {fmtUsd(input.deductibleCents)}
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Effective</Text>
          {input.effectiveDate ? (
            <Text style={styles.kvVal}>{input.effectiveDate}</Text>
          ) : (
            <Text style={styles.kvValPending}>Pending</Text>
          )}
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Expires</Text>
          {input.expirationDate ? (
            <Text style={styles.kvVal}>{input.expirationDate}</Text>
          ) : (
            <Text style={styles.kvValPending}>Pending</Text>
          )}
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Broker of record</Text>
          <Text style={styles.kvVal}>
            {input.broker ?? "RYDA LLC, broker of record"}
          </Text>
        </View>

        <Text style={styles.fineprint}>
          Certificate id: {input.certificateId}. Issued: {input.issuedOn}.
          This certificate is informational and does not amend the
          underlying policy. In the event of conflict between this
          certificate and the policy, the policy controls. The
          policy&rsquo;s declarations page is available on request via{" "}
          coverage@ryda.pro. Members are also subject to the
          deductible terms set forth in the Operating Agreement and
          the Member Damage Schedule.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInsuranceCertificate(
  input: InsuranceCertificateInput,
): Promise<Buffer> {
  return renderToBuffer(<InsuranceCertificate {...input} />);
}
