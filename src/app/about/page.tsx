import { SiteHeader } from "@/components/site-header";
import { AboutPageTemplate, type AboutPerson } from "@/components/shared/about-page";

// Rental-only About page. The previous version described a
// "member-managed supercar co-ownership platform" and closed on a
// founding-cohort pitch — share pricing, residual modelling, LLC
// structure. None of that product exists in this repo, so it is gone
// rather than restated.
//
// What is left is the true, short story: RYDA lists exotic cars that
// independent Miami operators own and operate, makes them findable in
// one place, and earns a referral commission from the operator on
// bookings it sends them. No fabricated numbers, no operator names,
// and no claim that RYDA "never touches" payment — RYDA does send the
// Stripe Checkout link; it is created on the operator's own connected
// account. The honest promise is "no card at request".
//
// Must stay consistent with /how-it-works, /legal/terms and
// /legal/disclaimer.

export const metadata = {
  title: "About",
  description:
    "RYDA is a rental marketplace for exotic cars in Miami. The cars belong to vetted independent operators; RYDA makes them findable and keeps the operator's price the price.",
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
            title: <>Miami&apos;s exotic fleets, <span className="italic">one front door.</span></>,
            body:
              "RYDA is a rental marketplace for exotic cars in Miami. Every car on it is owned and operated by an independent local operator we've vetted. Our job is to make finding one straightforward — one grid, one request, your dates — and to make sure the operator's price is the price you pay.",
          },
          story: {
            title: "Why RYDA exists",
            paragraphs: [
              "Miami is not short of exotic cars for rent. What it lacks is one place to see them. The fleets are independent, their inventory lives across separate sites and social accounts, and comparing them means starting the same conversation over again with each one.",
              "RYDA puts that inventory in one grid and turns the search into a single request. You pick the car and the dates; the operator who runs it comes back to you directly, confirms what is actually available and what it actually costs, and closes the rental on their own contract and insurance.",
              "We don't own cars, store them, insure them or drive them — the operators do all of that, and they were doing it before us. What RYDA adds is discovery. That is also how it gets paid: the operator pays a referral commission on the bookings we send them. It is charged to the operator, never added to your price.",
            ],
          },
          founderLetter: {
            eyebrow: "A note from our founder",
            title: "The short version, in plain English.",
            paragraphs: [
              "RYDA does not own a single car. Every vehicle you see here belongs to an independent Miami operator who buys it, garages it, insures it and hands over the keys. We are the front door, not the fleet.",
              "So the request you send is exactly that — a request. No card is taken, no vehicle is reserved, and it is not a booking until the operator has confirmed your dates and the final price with you directly. If you both agree, we email a Stripe Checkout link created on that operator's own connected account: the rental is paid to them, and our commission is collected as a platform fee on the same charge. The rental itself closes on their contract and their insurance, which is also the reason they, not us, are the ones who confirm it.",
              "The part that matters most to us is the price. Requesting through RYDA never costs more than going direct, because our commission comes out of the operator's side rather than on top of yours. That is the entire business model, and it only works if the cars are worth renting and the operators are worth recommending — which is why we are slower about who we list than we are about anything else.",
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
              '"To make renting an extraordinary car in Miami as simple as choosing one — and to keep the operator\'s price the price."',
            values: [
              { title: "One request", body: "Pick the car, send your dates. No card at request, nothing to subscribe to, and no membership standing between you and the fleet." },
              { title: "The operator's price", body: "RYDA never marks up a rental. Our commission is charged to the operator on bookings we send them, and never added to what you pay." },
              { title: "Vetted operators", body: "Every listing is run by a Miami operator we've reviewed, including their business and bank details through Stripe. Vetting is not a warranty, and we don't dress it up as one." },
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
              { label: "What we do", value: "Referral marketplace for exotic-car rentals" },
              { label: "The vehicles", value: "Owned and operated by independent operators" },
              { label: "Headquarters", value: "Miami, FL, by appointment" },
              { label: "General", value: "hello@ryda.pro" },
              { label: "Press", value: "press@ryda.pro" },
              { label: "Partnerships", value: "partners@ryda.pro" },
            ],
          },
          cta: {
            title: "See the cars.",
            body:
              "Browse the Miami fleet, send your dates, and a vetted operator confirms availability and price directly with you. No card at request.",
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
