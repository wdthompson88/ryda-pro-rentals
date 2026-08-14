import { SiteHeader } from "@/components/site-header";
import { AboutPageTemplate, type AboutPerson } from "@/components/shared/about-page";

// Rental-only About page. The previous version described a
// "member-managed supercar co-ownership platform" and closed on a
// founding-cohort pitch — share pricing, residual modelling, LLC
// structure. None of that product exists in this repo, so it is gone
// rather than restated.
//
// No fabricated numbers, no operator names,
// and no claim that RYDA "never touches" payment — RYDA does send the
// Stripe Checkout link; it is created on the operator's own connected
// account. The honest promise is "no card at request".
//
// Must stay consistent with /how-it-works, /legal/terms and
// /legal/disclaimer.

// The `description` is set here on purpose. Next merges metadata per
// top-level key, so a page without one inherits the root layout's — a
// page with no description is not a page with no claim. The line below
// restates the hero body and the referral model already on this page.
export const metadata = {
  title: "About",
  description:
    "RYDA is a referral marketplace for car rental in Miami. Every car is owned and operated by an independent local operator; RYDA owns none of them.",
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
    bio: "Co-founder, running finance and operations. Manager, Private Equity Services at SolomonEdwards. Previously spent 3+ years in Investment Banking at Ziegler covering Healthcare M&A, analyst through senior associate. Diamond Capital Advisors before that. SIE + Series 79 certified. Bucknell Economics.",
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
            title: "About RYDA",
            // "we've vetted" deleted from the end of this sentence. A
            // bare, unqualified "vetted" in the hero is the same
            // screening claim /how-it-works, /rent, /rent/[symbol] and
            // the inquiry form all had it deleted from.
            //
            // "vetted" is defined in exactly one place —
            // /trust-and-safety, "What 'vetted' actually means" — and
            // every other use is supposed to route there. The mission
            // grid renders plain strings, so a value card cannot carry
            // that link; the word is therefore dropped from this page
            // entirely. The former "Vetted operators" card is now
            // "Verified through Stripe", which states the mechanism the
            // code actually gates on (payment-link creation requires
            // stripe_account_id + stripe_onboarded_at) instead of
            // asserting a roster or a review broader than Stripe.
            body:
              "Every car is owned and operated by an independent local operator.",
          },
          story: {
            title: "Why RYDA exists",
            paragraphs: [
              "We don't own cars, store them, insure them or drive them. What RYDA adds is discovery. That is also how it gets paid: the operator pays a referral commission on the bookings we send them. It is charged to the operator, never added to your price.",
            ],
          },
          founderLetter: {
            eyebrow: "A note from our founder",
            title: "The short version, in plain English.",
            paragraphs: [
              "RYDA does not own a single car. Every vehicle you see here belongs to an independent Miami operator who buys it, garages it, insures it and hands over the keys. We are the front door, not the fleet.",
              "So the request you send is exactly that — a request. No card is taken, no vehicle is reserved, and it is not a booking until the operator has confirmed your dates and the final price with you directly. If you both agree, we email a Stripe Checkout link created on that operator's own connected account: the rental is paid to them, and our commission is collected as a platform fee on the same charge. The rental itself closes on their contract and their insurance, which is also the reason they, not us, are the ones who confirm it.",
            ],
            signer: { name: "Ryan Galli", role: "Co-founder & CEO, RYDA", image: "/team/ryan.jpg", bio: "" },
            // No membership exists in this product, so there is nothing
            // to be sold on and no founder call to book. The two links
            // are the only two next steps: see the cars, or save 30
            // seconds on the next request.
            links: [
              { href: "/rent", label: "Browse the fleet" },
              { href: "/signup", label: "Create an account →", authedHidden: true },
            ],
          },
          mission: {
            quote:
              '"To make renting a car in Miami as simple as choosing one — and to keep the operator\'s price the price."',
            values: [
              { title: "One request", body: "Pick the car, send your dates. No card at request, nothing to subscribe to, and no membership standing between you and the fleet." },
              { title: "The operator's price", body: "RYDA never marks up a rental. Our commission is charged to the operator on bookings we send them, and never added to what you pay." },
              { title: "Verified through Stripe", body: "Before RYDA can send a payment link for a car, the operator who runs it completes Stripe Connect onboarding, which verifies their business and bank details. That is not a warranty, and we don't dress it up as one." },
              { title: "Plain terms", body: "We describe what the platform actually does — including that the payment link comes from us — rather than whatever would sound most reassuring." },
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
              { label: "Headquarters", value: "Miami, FL" },
              { label: "General", value: "hello@ryda.pro" },
              { label: "Press", value: "press@ryda.pro" },
              { label: "Partnerships", value: "partners@ryda.pro" },
            ],
          },
          cta: {
            title: "See the cars.",
            body:
              // "vetted" deleted here for the same reason as the hero.
              "Browse the Miami fleet, send your dates, and an operator confirms availability and price directly with you. No card at request.",
            links: [
              { href: "/rent", label: "Browse the fleet" },
              { href: "/how-it-works", label: "How it works →", variant: "secondary" },
            ],
          },
        }}
      />
    </>
  );
}
