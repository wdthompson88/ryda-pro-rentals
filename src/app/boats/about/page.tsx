import { SiteHeader } from "@/components/site-header";
import { AboutPageTemplate } from "@/components/shared/about-page";

export const metadata = {
  title: "About RYDA Boats",
  description:
    "Why we built RYDA Boats. Member-managed LLCs, surveyed certified pre owned hulls, professional marine ops, three-year planned exit.",
};

export default function BoatsAboutPage() {
  return (
    <>
      <SiteHeader />
      <AboutPageTemplate
        data={{
          accent: "marine",
          hero: {
            eyebrow: "About RYDA Boats",
            title: "Real ownership, on the water.",
            body:
              "Solo yacht ownership is unworkable for most. Charter is hollow. RYDA Boats is the third option, a member-managed LLC per hull, surveyed certified pre owned vessels, and professional marine operations across a three-year hold.",
          },
          story: {
            title: "Our story (short)",
            paragraphs: [
              "A 55-foot Wajer is $1.95M to buy and $300K–$400K a year to operate (slip + captain + fuel + insurance + hurricane prep). A weekend charter is $14K–$22K. Most prospective owners drive a 32-day-a-year usage profile. Solo ownership is wildly inefficient at that load.",
              "RYDA Boats is the middle option: a single-purpose LLC holds title to a specific yacht, up to 5 members co-own with a 2-share minimum, and RYDA runs ops under a separate Management Services Agreement. Coast Guard documentation is in the LLC's name. Members hold registered legal interests, not club points.",
              "Boats run on Coast Guard documentation, marine survey workflows, and hurricane-driven seasonality. We built the operations stack, slip, captain, fuel, insurance, spring commissioning, fall lay-up, hurricane haul-out — so members can drive the calendar, not the asset.",
            ],
          },
          founderLetter: {
            eyebrow: "A note from our founder",
            title: "Why RYDA Boats, in plain English.",
            paragraphs: [
              "I'll keep this short. There are three honest ways to put a yacht in your life right now. You can buy one, and spend $300K–$800K a year keeping it serviceable while actually using it 32 days. You can charter at $14K–$22K per day from a marketplace where coverage and quality vary by owner. Or you can join a club that hands you rotating access to smaller boats for $30K–$60K/yr, fees that consume themselves with no asset behind them.",
              "None of that was the right answer for us, and none of it is the right answer for the buyers we've talked to. RYDA Boats is the alternative: a real ownership stake in a single-purpose LLC that holds title to a specific yacht, alongside up to four other verified members. The Coast Guard documentation is in the LLC's name. We run the operations under a separate services agreement, slip, captain, fuel, insurance, spring commissioning, fall lay-up, hurricane haul-out. You drive the calendar, we drive the asset.",
              "The economics: a ~$195K share in a Wajer 55, plus $32K/year for everything-included ops, gets you up to 30 days a year on the water and a real exit at year three. We model the residual at 85% of buy-in. Boats and cars depreciate differently, classic Rivas can appreciate, big sport yachts compress faster, and we don't pretend the numbers are guaranteed. What you walk away with isn't a return. It's the experience of actually living with a yacht for three years, in real water, without the part-time job.",
              "Miami launches Q3 2026. Create your account to browse the fleet and claim a share when the first hulls go live.",
            ],
            signer: { name: "Ryan Galli", role: "Co-founder & CEO, RYDA", image: "/team/ryan.jpg", bio: "" },
            links: [
              { href: "/signup", label: "Sign up →", authedHidden: true },
              { href: "/contact?type=Membership&note=RYDA+Boats#form", label: "Schedule a 30-minute call" },
            ],
          },
          mission: {
            tinted: true,
            eyebrowClassName: "text-mute",
            quote:
              "“To make ownership of exceptional yachts possible for more enthusiasts, responsibly, transparently, and with marine-grade ops handled by the team, not the owner.”",
            values: [
              { title: "Transparency", body: "Every co-owner sees every cost, every survey, every captain log. The reserve account is open-book." },
              { title: "Marine craft", body: "Captains employed via the LLC, surveys by SAMS-accredited surveyors, hurricane prep pre-arranged. The hard parts are pre-solved." },
              { title: "Excellence", body: "Service-grade provisioning, captain dispatch, and slip coordination on every charter and member day." },
              { title: "Integrity", body: "Asset-backed ownership, single-purpose LLC per hull, member voting. We do what we say." },
            ],
          },
          team: {
            mode: "link",
            title: "The team behind RYDA Boats.",
            body:
              "Three co-founders combining executive search, investment banking, and three decades of institutional equity markets. Marine operations are run by a dedicated boats team plus our partner yards in Miami, Connecticut, and the Caribbean.",
            href: "/about#founders",
            label: "Meet the founders →",
          },
          hq: {
            title: "RYDA Boats operations",
            facts: [
              { label: "Legal entity", value: "Single-purpose LLC per hull" },
              { label: "Operating market", value: "Miami flagship · launching Q3 2026" },
              { label: "Marina partner", value: "Coconut Grove · Island Gardens · Miami Beach Marina" },
              { label: "Captains", value: "USCG licensed, employed via the LLC" },
              { label: "Survey partner", value: "SAMS-accredited" },
              { label: "Insurance", value: "Hagerty Marine / CHUBB / Travelers, agreed-value" },
              { label: "General", value: "hello@ryda.pro" },
              { label: "Operations", value: "boats@ryda.pro" },
            ],
          },
          cta: {
            title: "Become a member.",
            body:
              "The first 60 boats members lock early-member pricing on Blue or Black for life. We're vetting now ahead of the Miami water launch, Q3 2026.",
            links: [
              { href: "/signup?next=/boats", label: "Sign up →" },
              { href: "/about", label: "About RYDA Cars", variant: "secondary" },
            ],
          },
        }}
      />
    </>
  );
}
