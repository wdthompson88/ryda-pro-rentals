// Server-side PDF generator for the LLC member-register amendment.
// Renders a one-page document showing the new member's name, share
// count, the LLC's identifying info, and the effective date. This is
// intentionally a template — counsel should review the final wording
// before any of this is sent to a real member at scale. The component
// here is the rendering structure; the legal text passes through
// `legalCopy` so it can be swapped centrally.
//
// We render to a Node Buffer via @react-pdf/renderer's `renderToBuffer`
// and hand the buffer to Resend as an attachment.

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
  // Header band mirrors the brand band used in transactional emails.
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
});

export type AmendmentInput = {
  purchaseId: string;
  memberName: string;
  memberEmail: string;
  shares: number;
  assetLabel: string; // e.g. "2026 Ferrari 296 GTB" or "2024 Wajer 55 S"
  llcName: string;    // e.g. "RYDA F296 LLC"
  effectiveDate: string; // YYYY-MM-DD
  totalAmount: number; // dollars (not cents)
};

export function MemberRegisterAmendment(input: AmendmentInput) {
  return (
    <Document
      title={`${input.llcName} — Member Register Amendment`}
      author="RYDA LLC"
      subject={`Co-ownership share added for ${input.memberName}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.band}>
          <Text style={styles.bandLabel}>RYDA · Member Register</Text>
          <Text style={styles.bandTitle}>Amendment to LLC Operating Agreement</Text>
        </View>

        <Text style={styles.h1}>{input.llcName}</Text>

        <Text style={styles.body}>
          This amendment to the Operating Agreement of {input.llcName}
          ({"the LLC"}) records the addition of a new co-owner-member
          alongside the existing co-owners. It is effective on the
          date stated below. The LLC&rsquo;s underlying Operating
          Agreement, executed separately, governs all rights and
          obligations not amended herein.
        </Text>

        <Text style={styles.h2}>Member added</Text>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Name</Text>
          <Text style={styles.kvVal}>{input.memberName}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Email</Text>
          <Text style={styles.kvVal}>{input.memberEmail}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Asset</Text>
          <Text style={styles.kvVal}>{input.assetLabel}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Shares</Text>
          <Text style={styles.kvVal}>
            {input.shares} of 10 ({Math.round((input.shares / 10) * 1000) / 10}%)
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Capital contribution</Text>
          <Text style={styles.kvVal}>
            US ${input.totalAmount.toLocaleString()} (paid via Stripe;
            held in escrow until release to the LLC)
          </Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Effective date</Text>
          <Text style={styles.kvVal}>{input.effectiveDate}</Text>
        </View>
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>Reference</Text>
          <Text style={styles.kvVal}>{input.purchaseId}</Text>
        </View>

        <Text style={styles.h2}>Effect</Text>
        <Text style={styles.body}>
          The Member Register of {input.llcName} is hereby amended to
          include the above-named member as the holder of {input.shares}{" "}
          membership unit{input.shares > 1 ? "s" : ""}. All other terms
          of the Operating Agreement, including governance, distribution,
          transfer restrictions (12-month minimum hold), and the
          planned-exit doctrine, remain in full force.
        </Text>

        <View style={styles.signature}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigCaption}>Member signature</Text>
            <Text style={[styles.kvVal, { marginTop: 6 }]}>
              {input.memberName}
            </Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigCaption}>RYDA LLC, as managing member</Text>
            <Text style={[styles.kvVal, { marginTop: 6 }]}>
              Authorized signatory
            </Text>
          </View>
        </View>

        <Text style={styles.fineprint}>
          This amendment is generated by the RYDA platform from
          authenticated payment + identity records. Co-ownership shares
          are membership interests in a member-managed LLC and are not
          registered securities; they are not offered for investment
          purposes. Members hold a registered legal interest in a
          single-purpose LLC. The full Operating Agreement and
          Management Services Agreement govern day-to-day operations
          and dispute resolution.
        </Text>
      </Page>
    </Document>
  );
}

// Server-only entry point. Returns a Buffer ready to attach to a
// Resend email.
export async function renderAmendmentPdf(input: AmendmentInput): Promise<Buffer> {
  return await renderToBuffer(<MemberRegisterAmendment {...input} />);
}
