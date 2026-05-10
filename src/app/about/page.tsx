import { SiteHeader } from "@/components/site-header";
import { AboutPageTemplate, type AboutPerson } from "@/components/shared/about-page";

export const metadata = {
  title: "About",
  description:
    "A US member-managed supercar co-ownership platform. Our story, our team, our mission.",
};

const FOUNDERS: AboutPerson[] = [
  {
    name: "Ryan Galli",
    role: "Co-Founder · CEO / CTO",
    image: "/team/ryan.jpg",
    bio: "Co-founder and CEO of RYDA. Currently runs Fixed Income Executive Search at Odin Partners NY, placing senior front-office talent at banks and macro hedge funds. Bucknell Psychology.",
  },
  {
    name: "Dave Thompson",
    role: "Co-Founder · CFO / COO",
    image: "/team/dave.jpg",
    bio: "Co-founder leading capital structuring and operational diligence. Manager, Private Equity Services at SolomonEdwards. Previously spent 3+ years in Investment Banking at Ziegler covering Healthcare M&A, analyst through senior associate. Diamond Capital Advisors before that. SIE + Series 79 certified. Bucknell Economics.",
  },
  {
    name: "Stefano Galli",
    role: "Co-Founder · CRO / CSO",
    image: "/team/stefano.jpg",
    bio: "Co-founder and strategic advisor with 30+ years in institutional equity markets. Managing Director, Global Equity Sales at Evercore ISI (9+ years). Previously Director of Global Equities Research Sales at Bank of America Merrill Lynch in London, Senior Portfolio Manager at Artio Global Management ($75B AUM at peak) and 8 years in research sales at Merrill Lynch. Wharton MBA, Civil Engineering and Economics at Delaware.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <AboutPageTemplate
        data={{
          accent: "red",
          hero: {
            eyebrow: "About",
            title: <>A different way to <span className="italic">own a supercar.</span></>,
            body:
              "Buying one outright costs more than most people care to put in a driveway. Renting is for an afternoon, not a relationship. RYDA is the third option — co-ownership, with professionals operating the car and a clean LLC structure underneath.",
          },
          story: {
            title: "Our story",
            paragraphs: [
              "RYDA started in Florida. Ryan and Dave rented a Lamborghini for a weekend and ran the numbers on Sunday night: solo ownership was unworkable, renting was hollow.",
              "The math worked, the structure worked, the buyer pool was there. The middle ground, real co-ownership of real supercars, with professional ops and a clean LLC wrapper — just didn't exist in the US.",
              "We built RYDA to fill that gap, member-managed LLCs, professional ops, US markets. Miami first: highest per-capita luxury auto density, no state income tax, year-round driving.",
            ],
          },
          founderLetter: {
            eyebrow: "A note from our founder",
            title: "What we're trying to build, in plain English.",
            paragraphs: [
              "I'm going to keep this short. There are roughly three honest ways to put a supercar in your driveway in the United States today. You can buy one outright, which costs $250,000 to $1,000,000 of capital plus $40,000 to $80,000 a year to keep — and the car sits idle 90% of the year. You can rent one for $2,000–$3,000 a day from a marketplace where coverage and quality vary by host. Or you can join a club that hands you rotating access for an annual fee that's consumed regardless of how much you drive.",
              "None of those was the right answer for us, or for any of our friends who actually wanted to drive an exotic. RYDA is the alternative. It's a real ownership stake, title held by a single-purpose LLC where you and up to four other verified members are the registered owners. We run the operations under a separate Management Services Agreement, the same way an aviation club runs the jets it doesn't own.",
              "The math is simple: a $34K share in a Ferrari 296, plus $7,080 a year for insurance, storage, maintenance and reserves, gets you up to 32 days behind the wheel and a real exit at year two. We model the residual at 90% of buy-in. We don't pretend the car appreciates, it depreciates, and the model accounts for it. What you walk away with isn't a return. It's the experience of having actually driven a Ferrari, on real roads, for the kind of money that doesn't require selling an equity position to pull off.",
              "Miami launches Q3 2026. If this fits how you actually want to use a supercar, own a piece, drive it ~32 days a year, never deal with the operational side, sign up and we'll be in touch.",
            ],
            signer: { name: "Ryan Galli", role: "Co-founder & CEO, RYDA", image: "/team/ryan.jpg", bio: "" },
            // Per dual-audit Finding 2: founding-cohort buyers ($68K
            // minimum) want a founder call first, not an account.
            // Talk-to-a-founder is primary; account creation is for
            // members who already know they want in.
            links: [
              { href: "/contact?type=Membership#form", label: "Talk to a founder" },
              { href: "/signup", label: "Create an account →", authedHidden: true },
            ],
          },
          mission: {
            quote:
              '"To make ownership of extraordinary vehicles possible for more enthusiasts, responsibly, transparently and with a community-first experience."',
            values: [
              { title: "Transparency", body: "Every co-owner sees every cost, every report and every document. No hidden fees. Ever." },
              { title: "Exclusivity", body: "Membership is earned, not bought. Every member is verified. Every vehicle is vetted." },
              { title: "Excellence", body: "Premium preparation and handover for every booking. Our standard does not vary." },
              { title: "Integrity", body: "Asset-backed ownership with unambiguous legal documentation. We do what we say." },
            ],
          },
          team: {
            mode: "cards",
            title: "Founders",
            body: "Three co-founders combining executive search, investment banking and three decades of institutional equity markets.",
            people: FOUNDERS,
          },
          hq: {
            title: "Headquarters",
            facts: [
              { label: "Legal entity", value: "RYDA LLC" },
              { label: "Structure", value: "Member-managed LLC per vehicle" },
              { label: "Headquarters", value: "Miami, FL, by appointment" },
              { label: "Operating markets", value: "Miami (2026) · LA (2027) · NY (2027)" },
              { label: "General", value: "hello@ryda.pro" },
              { label: "Press", value: "press@ryda.pro" },
              { label: "Partnerships", value: "partners@ryda.pro" },
              { label: "Investors (RYDA Inc.)", value: "See /investors" },
            ],
          },
          cta: {
            title: "Become a member.",
            body:
              "Miami launches Q3 2026. The founding cohort closes ahead of launch. Talk to a founder to walk through the structure, the operating agreement, and the specific car you'd want a share in.",
            links: [
              { href: "/contact?type=Membership#form", label: "Talk to a founder" },
              { href: "/signup", label: "Create an account →", authedHidden: true },
            ],
          },
        }}
      />
    </>
  );
}
