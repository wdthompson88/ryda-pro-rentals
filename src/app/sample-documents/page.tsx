import { SiteHeader } from "@/components/site-header";
import {
  SampleDocumentsPageTemplate,
  type SampleDocumentGroup,
} from "@/components/shared/sample-documents-page";

export const metadata = {
  title: "Sample documents — RYDA",
  description:
    "The legal and operational documents RYDA uses. Request the redacted packet to review with your counsel.",
};

const DOCS: SampleDocumentGroup[] = [
  {
    category: "Legal · LLC structure",
    items: ["Operating Agreement", "Management Services Agreement", "Subscription Agreement"],
  },
  {
    category: "Vehicle · acquisition & condition",
    items: ["Pre-Purchase Inspection Report", "Certificate of Insurance", "Title Evidence", "Quarterly Condition Report"],
  },
  {
    category: "Operational · use & service",
    items: ["Booking Rules & Fair-Use Policy", "Damage Reserve Policy"],
  },
];

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
              "We'll send a redacted packet you can hand to your counsel and tax advisor before any commitment is made.",
            links: [
              {
                href: "/contact?type=Membership&note=Sample%20documents%20packet#form",
                label: "Request the full packet →",
              },
            ],
          },
          docs: DOCS,
          requestHref: "/contact?type=Membership&note=Request%20sample%20doc#form",
          cta: {
            title: "Want the packet for a specific car?",
            body:
              "Pick the vehicle you're considering and we'll tailor the redacted packet to that LLC.",
            links: [{ href: "/portfolio", label: "Pick a car →" }],
          },
        }}
      />
    </>
  );
}
