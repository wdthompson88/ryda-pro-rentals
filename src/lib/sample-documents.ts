import "server-only";

import { readFile } from "fs/promises";
import path from "path";

export type SampleDocumentCategory =
  | "Legal · LLC structure"
  | "Vehicle · acquisition & condition"
  | "Operational · use & service";

export type SampleDocument = {
  slug: string;
  title: string;
  category: SampleDocumentCategory;
  summary: string;
  filename: string;
  downloadName: string;
  status: "redacted_sample_draft";
};

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    slug: "operating-agreement",
    title: "Operating Agreement",
    category: "Legal · LLC structure",
    summary: "Member-managed LLC governance, share register, voting, transfers, defaults, and sale mechanics.",
    filename: "operating-agreement.md",
    downloadName: "RYDA-sample-operating-agreement.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "management-services-agreement",
    title: "Management Services Agreement",
    category: "Legal · LLC structure",
    summary: "RYDA's service-provider scope, reporting duties, insurance coordination, fees, and transition rights.",
    filename: "management-services-agreement.md",
    downloadName: "RYDA-sample-management-services-agreement.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "subscription-agreement",
    title: "Subscription Agreement",
    category: "Legal · LLC structure",
    summary: "Member admission, buyer representations, capital contribution, and closing conditions.",
    filename: "subscription-agreement.md",
    downloadName: "RYDA-sample-subscription-agreement.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "pre-purchase-inspection-report",
    title: "Pre-Purchase Inspection Report",
    category: "Vehicle · acquisition & condition",
    summary: "Marque-specialist inspection format for mechanical, cosmetic, road-test, and acquisition findings.",
    filename: "pre-purchase-inspection-report.md",
    downloadName: "RYDA-sample-pre-purchase-inspection-report.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "certificate-of-insurance",
    title: "Certificate of Insurance",
    category: "Vehicle · acquisition & condition",
    summary: "Sample coverage summary, named insured structure, deductibles, exclusions, and policy-control disclaimer.",
    filename: "certificate-of-insurance.md",
    downloadName: "RYDA-sample-certificate-of-insurance.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "title-evidence",
    title: "Title Evidence",
    category: "Vehicle · acquisition & condition",
    summary: "Closing checklist for title, lien, bill-of-sale, authority, and registration evidence.",
    filename: "title-evidence.md",
    downloadName: "RYDA-sample-title-evidence.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "quarterly-condition-report",
    title: "Quarterly Condition Report",
    category: "Vehicle · acquisition & condition",
    summary: "Quarterly member-facing status report for usage, service, condition notes, reserves, and attachments.",
    filename: "quarterly-condition-report.md",
    downloadName: "RYDA-sample-quarterly-condition-report.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "booking-rules-fair-use-policy",
    title: "Booking Rules & Fair-Use Policy",
    category: "Operational · use & service",
    summary: "Shared-calendar entitlement, peak windows, cancellation rules, handover, guests, and prohibited uses.",
    filename: "booking-rules-fair-use-policy.md",
    downloadName: "RYDA-sample-booking-rules-fair-use-policy.md",
    status: "redacted_sample_draft",
  },
  {
    slug: "damage-reserve-policy",
    title: "Damage Reserve Policy",
    category: "Operational · use & service",
    summary: "Reserve funding, covered uses, damage attribution, insurance claims, and reconciliation.",
    filename: "damage-reserve-policy.md",
    downloadName: "RYDA-sample-damage-reserve-policy.md",
    status: "redacted_sample_draft",
  },
];

const DOC_DIR = path.join(process.cwd(), "docs", "sample-documents");

export function getSampleDocument(slug: string): SampleDocument | null {
  return SAMPLE_DOCUMENTS.find((doc) => doc.slug === slug) ?? null;
}

export function getSampleDocumentGroups() {
  const categories: SampleDocumentCategory[] = [
    "Legal · LLC structure",
    "Vehicle · acquisition & condition",
    "Operational · use & service",
  ];
  return categories.map((category) => ({
    category,
    items: SAMPLE_DOCUMENTS.filter((doc) => doc.category === category),
  }));
}

export async function readSampleDocument(slug: string) {
  const doc = getSampleDocument(slug);
  if (!doc) return null;
  const fullPath = path.join(DOC_DIR, doc.filename);
  const content = await readFile(fullPath, "utf8");
  return { doc, content };
}

