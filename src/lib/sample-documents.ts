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
  sourceFilename: string;
  pdfFilename: string;
  downloadName: string;
  fileFormat: "pdf";
  status: "redacted_sample_draft";
};

function sampleDocument(
  slug: string,
  title: string,
  category: SampleDocumentCategory,
  summary: string,
): SampleDocument {
  const pdfFilename = `RYDA-sample-${slug}.pdf`;
  return {
    slug,
    title,
    category,
    summary,
    sourceFilename: `${slug}.md`,
    pdfFilename,
    downloadName: pdfFilename,
    fileFormat: "pdf",
    status: "redacted_sample_draft",
  };
}

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  sampleDocument(
    "operating-agreement",
    "Operating Agreement",
    "Legal · LLC structure",
    "Member-managed LLC governance, share register, voting, transfers, defaults, and sale mechanics.",
  ),
  sampleDocument(
    "management-services-agreement",
    "Management Services Agreement",
    "Legal · LLC structure",
    "RYDA's service-provider scope, reporting duties, insurance coordination, fees, and transition rights.",
  ),
  sampleDocument(
    "subscription-agreement",
    "Subscription Agreement",
    "Legal · LLC structure",
    "Member admission, buyer representations, capital contribution, and closing conditions.",
  ),
  sampleDocument(
    "pre-purchase-inspection-report",
    "Pre-Purchase Inspection Report",
    "Vehicle · acquisition & condition",
    "Marque-specialist inspection format for mechanical, cosmetic, road-test, and acquisition findings.",
  ),
  sampleDocument(
    "certificate-of-insurance",
    "Certificate of Insurance",
    "Vehicle · acquisition & condition",
    "Sample coverage summary, named insured structure, deductibles, exclusions, and policy-control disclaimer.",
  ),
  sampleDocument(
    "title-evidence",
    "Title Evidence",
    "Vehicle · acquisition & condition",
    "Closing checklist for title, lien, bill-of-sale, authority, and registration evidence.",
  ),
  sampleDocument(
    "quarterly-condition-report",
    "Quarterly Condition Report",
    "Vehicle · acquisition & condition",
    "Quarterly member-facing status report for usage, service, condition notes, reserves, and attachments.",
  ),
  sampleDocument(
    "booking-rules-fair-use-policy",
    "Booking Rules & Fair-Use Policy",
    "Operational · use & service",
    "Shared-calendar entitlement, peak windows, cancellation rules, handover, guests, and prohibited uses.",
  ),
  sampleDocument(
    "damage-reserve-policy",
    "Damage Reserve Policy",
    "Operational · use & service",
    "Reserve funding, covered uses, damage attribution, insurance claims, and reconciliation.",
  ),
];

const DOC_DIR = path.join(process.cwd(), "docs", "sample-documents");
const PDF_DIR = path.join(DOC_DIR, "pdf");

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

export async function readSampleDocumentPdf(slug: string) {
  const doc = getSampleDocument(slug);
  if (!doc) return null;
  const fullPath = path.join(PDF_DIR, doc.pdfFilename);
  const content = await readFile(fullPath);
  return { doc, content };
}
