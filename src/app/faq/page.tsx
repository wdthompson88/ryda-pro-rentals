import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FaqPageTemplate, type FaqSection } from "@/components/shared/faq-page";

export const metadata = {
  title: "FAQ",
  description:
    "How renting through RYDA works: what a request is and isn't, when and how you pay, whose contract and insurance the rental closes on, and who to call if something goes wrong.",
};

// Every answer below is checked against shipped behaviour, not against
// the pitch. The three sources of truth this page must never contradict:
//
//   src/components/rental-inquiry-form.tsx  — what the request actually
//     collects and promises (no card, 30-day cap, account-alongside).
//   src/app/api/rental-inquiry/route.ts     — where the lead goes, what
//     the customer confirmation email says.
//   src/lib/partner-contacts.ts             — who the routing email
//     ACTUALLY reaches. partnerInquiryEmail() looks the operator up in
//     PARTNER_INQUIRY_EMAILS and falls back to the team inbox; that map
//     is currently empty, so today every lead lands at RYDA and a person
//     forwards it. When a real operator address is added there, the
//     first two answers below need revisiting.
//   src/app/api/admin/inquiries/[id]/payment-link/route.ts — the pay
//     link: created on the OPERATOR's connected account, RYDA's
//     commission as an application fee, live for 24 hours.
//
// Three phrasings are banned outright. "RYDA never touches your payment"
// is false — the Checkout link is created and emailed by RYDA. "No
// payment through RYDA" is the same lie in a nicer coat, and it reads
// as bait-and-switch the moment that email lands. State the mechanism;
// the honest promise is "no card at request". And "your request goes
// straight to the operator" is false while the map above is empty: a
// customer told "instantly" who then waits on a manual forward trusts
// us less than one who was told there is a person in the middle.
//
// Operators are not named here (D6). "A vetted Miami operator" until
// they introduce themselves on reply.

const SECTIONS: FaqSection[] = [
  {
    title: "Requesting a car",
    questions: [
      {
        q: "What happens when I send a request?",
        a: "It comes to RYDA first, and a copy of it lands in your inbox straight away. From there a person here passes it to the vetted Miami operator who runs that car — that hand-off is done by hand rather than automatically, so it isn't instant. The operator then comes back to you directly to confirm whether your dates are open and what the final price is. No card is taken at any point in that, and nothing is charged.",
      },
      {
        q: "Is a request a booking?",
        a: "No. A request does not reserve the car and does not hold your dates. The rate and the availability on a listing come from the operator and stay indicative until they confirm them — either can change before then. You have a booking when you and the operator have agreed the dates and the price, and the rental is paid.",
      },
      {
        q: "How quickly will an operator get back to me?",
        a: "Your request reaches RYDA the moment you send it, and we email you a copy at the same time. Getting it in front of the operator is a manual step at our end, and the reply after that runs on the operator's own clock — so we don't put a number on either, and we won't promise you one on their behalf. If your dates are tight and it has gone quiet, reply to that confirmation email: the reply comes back to RYDA, and we'll chase it.",
      },
      {
        q: "Can I ask for delivery?",
        a: "Yes — put the address in the note on the request form. Most operators deliver and collect across the region, but the delivery windows, the minimum rental length and the rate are theirs, and they confirm the details when they reply.",
      },
      {
        q: "Can I rent for longer than 30 days?",
        a: "The request form covers rentals up to 30 days. For anything longer, message us through the contact form and we'll arrange it with the operator directly.",
      },
    ],
  },
  {
    title: "Price and payment",
    questions: [
      {
        q: "When do I pay, and who am I paying?",
        a: "No card at request. Once you and the operator have agreed the dates and the price, RYDA emails you a Stripe Checkout link. The charge is created on the operator's own Stripe account, so the rental price is paid to them — their business name is what you'll see on the Stripe page. The link is live for 24 hours; if it lapses before you use it, reply to the email and we'll send a fresh one.",
      },
      {
        q: "Does RYDA mark up the price or add a booking fee?",
        a: "No. Your price is the operator's price, and requesting through RYDA never costs more than going direct. Operators pay RYDA a referral commission on the bookings we send them — the standard rate is 15% — and it is collected as a platform fee on that same charge, out of what the operator receives. It is never added to your side.",
      },
      {
        q: "Is there a security deposit?",
        a: "That is the operator's call, and most ask for one. The deposit, the mileage allowance, the fuel policy and what happens on a late return are all set in the operator's rental agreement, and they confirm them with you before you pay. Where an operator has given us a mileage figure it's on the listing; where they haven't, the listing says the operator confirms it rather than inventing a number.",
      },
      {
        q: "What if I need to cancel, or want a refund?",
        a: "Cancellation and refund rights come from the operator's rental agreement, and the operator issues any refund — the money sits on their Stripe account, not RYDA's. Read that agreement before you sign it: the terms differ between operators and between cars.",
      },
    ],
  },
  {
    title: "The rental itself",
    questions: [
      {
        q: "Who am I actually renting from?",
        a: "An independent Miami operator who owns and runs the car. RYDA lists the vehicle, vets the operator and passes your request to them. RYDA does not own, store, insure, maintain or operate any vehicle on the platform, and is not a party to your rental agreement.",
      },
      {
        q: "Why don't listings say which company owns the car?",
        a: "Because until there's a booking, an operator's fleet and their open dates are theirs to publish, not ours. Every car on the grid is run by an operator we have vetted, and the operator introduces themselves by name when they reply to your request.",
      },
      {
        q: "Whose contract and insurance is the rental on?",
        a: "The operator's, on both counts. They hand you their own rental agreement and the car is covered by their own policy — the same terms you'd get going to them directly. Ask them about the coverage limits and the damage deductible before you sign: RYDA is not the insurer and can't answer for a policy we don't hold.",
      },
      {
        q: "What do I need to qualify to drive?",
        a: "The requirements are the operator's and can differ by car. Listings show the general bar — 28 or older, with at least five years of licensed driving — and the operator confirms their own requirements when they reply, typically a valid licence, proof of insurance and a security deposit.",
      },
      {
        q: "Something's wrong with the car. Who do I call?",
        a: "The operator, first and fast. They are the party to your rental agreement, they hold the insurance, and roadside, a swap or a damage claim are theirs to handle. If you can't reach them, reply to any RYDA email about the booking or use the contact form — we hold the request and booking records and will help where we reasonably can, but we can't settle a dispute we aren't a party to.",
      },
      {
        q: "Where does RYDA operate?",
        a: "Miami, and only Miami for now. Every car on the grid is run by a Miami operator, and most deliver across the region — Miami Beach, Fort Lauderdale, Palm Beach, Naples and the Keys are ordinary drop-offs, on the operator's own delivery terms.",
      },
    ],
  },
  {
    title: "Your RYDA account",
    questions: [
      {
        q: "Do I need an account to request a car?",
        a: "The request form creates one as you go — your email and a password sit alongside your dates. Thirty seconds, no card, nothing to subscribe to and nothing to cancel. If you already have an account, sign in first and your name and phone fill themselves in.",
      },
      {
        q: "What does the account actually do?",
        a: "Two things. It saves your details so the next request fills itself in, and it keeps every request you've sent in one place at /account/requests, with where each one stands — sent, with the operator, booked. Requests you send before confirming your email are still received and still passed to the operator; they appear in your dashboard once you've confirmed it.",
      },
      {
        q: "What do you do with my details?",
        a: "Your name, email, any phone number you give us, your dates and your note go to the operator, so they can reply to you — that is what the request is for. Marketing email is a separate tick-box on the form and you can change your mind any time on your profile. The rest is in the Privacy Policy.",
      },
    ],
  },
];

// Note: FAQPage Schema.org JSON-LD is emitted by FaqPageTemplate
// itself (see src/components/shared/faq-page.tsx). Adding a second
// page-level <script> would emit the same FAQPage block twice and
// risk confusing Google's rich-result parser. Per codex review of
// the cleanup batch.

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <FaqPageTemplate
        data={{
          accent: "red",
          hero: {
            eyebrow: "FAQ",
            title: "The questions people ask before they send a request.",
            body: (
              <>
                How a request works, when you pay, and who you&apos;re
                actually renting from. Anything we haven&apos;t covered?{" "}
                <Link href="/contact#form" className="text-red hover:text-red-deep">
                  Ask us
                </Link>
                , and it lands here when it comes up.
              </>
            ),
          },
          sections: SECTIONS,
          cta: {
            title: "Still have a question?",
            body: "Ask a real person — or skip ahead and browse the cars. The fleet is one request away.",
            links: [
              { href: "/rent", label: "Browse the fleet" },
              { href: "/contact#form", label: "Ask a question", variant: "secondary" },
            ],
          },
        }}
      />
    </>
  );
}
