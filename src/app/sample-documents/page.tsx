import { SiteHeader } from "@/components/site-header";
import {
  SampleDocumentsPageTemplate,
  type SampleDocumentGroup,
} from "@/components/shared/sample-documents-page";
import { getSampleDocumentGroups } from "@/lib/sample-documents";

export const metadata = {
  title: "Sample documents",
  description:
    "The legal and operational documents RYDA uses. Request the redacted packet to review with your counsel.",
};

const DOCS: SampleDocumentGroup[] = getSampleDocumentGroups().map((group) => ({
  category: group.category,
  items: group.items.map((doc) => ({
    title: doc.title,
    meta: "Redacted sample · Markdown",
    purpose: doc.summary,
    href: `/api/sample-documents/${doc.slug}`,
    actionLabel: "Download sample",
  })),
}));

export default function SampleDocumentsPage() {
  return (
    <>
      <SiteHeader />
      <SampleDocumentsPageTemplate
        data={{
          accent: "red",
          hero: {
            eyebrow: "Sample documents",
            title: <>Read the paperwork <span className="italic">before you wire.</span></>,
            body:
              "Download redacted samples immediately, then request a tailored packet for the specific LLC you're considering.",
            links: [
              {
                href: "/contact?type=Membership&note=Sample%20documents%20packet#form",
                label: "Request tailored packet →",
              },
            ],
          },
          docs: DOCS,
          requestHref: "/contact?type=Membership&note=Request%20sample%20doc#form",
          cta: {
            title: "Want the packet for a specific car?",
            body:
              "Pick the vehicle you're considering and we'll tailor the documents to that LLC, asset, and member register.",
            links: [{ href: "/portfolio", label: "Pick a car →" }],
          },
        }}
      />
    </>
  );
}
