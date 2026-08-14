// Help center content. Single source of truth for /help, /help/[category],
// and /help/[category]/[slug]. Articles render from `body` blocks. Keep this
// file pruned and accurate, these pages are public-facing.
//
// ─────────────────────────────────────────────────────────────────────
// RYDA PROVIDES NO VEHICLE SERVICES. Terms §2, the Platform Disclaimer,
// /about, /faq and /trust-and-safety all state in writing that RYDA does
// not own, store, insure, maintain or operate any vehicle on the
// platform. This file is footer-linked and public, so anything here that
// contradicts that makes those statements false.
//
// Do not reintroduce, anywhere in this file:
//   - RYDA-provided insurance, coverage, waivers or policy limits
//   - a RYDA roadside number, a 24/7 line, or "RYDA Service"
//   - replacement vehicles dispatched by RYDA
//   - claims opened, adjusters coordinated or repairs arranged by RYDA
//   - RYDA storage, servicing, detailing, fuelling or inspection
//   - vehicle delivery or prep by RYDA (operators deliver, on their terms)
//   - a card on file, a stored payment method, or a RYDA statement/invoice
//
// The one payment rail is a Stripe Checkout link RYDA emails after the
// operator confirms, created on the OPERATOR's connected account with
// RYDA's commission as a platform fee — see /api/admin/inquiries/[id]/
// payment-link. Never write "RYDA never touches your payment"; the
// honest promise is "no card at request". Operators are never named on
// customer-facing surfaces (D6): "a vetted Miami operator".
//
// "Vetted" is defined in exactly one place — /trust-and-safety, under
// "What 'vetted' actually means" — and there it means the operator
// completed Stripe Connect onboarding, which verifies their business
// and bank details. It does not mean an inspection, an insurance
// check, a licence check or a background check, none of which this
// codebase performs. A HelpBlock cannot render a link, so an article
// body has no way to route a reader to that definition: do not use the
// word in one.
//
// The co-ownership help centre was deleted on 2026-08-13, not rewritten.
// The `shares` and `legal` categories are gone, along with every
// article about membership tiers, claiming a share, the Operating
// Agreement, member-managed LLCs, transfers, K-1s, a member dashboard,
// a booking calendar, fair-use caps, referral credits and the 2027 LA
// and NY markets. None of that product exists. Do not reintroduce any
// of it, and do not add a response-time promise — nothing in this
// codebase measures one.
// ─────────────────────────────────────────────────────────────────────

export type HelpBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "h3"; text: string }
  | { type: "callout"; tone?: "info" | "warn"; text: string };

export type HelpArticle = {
  slug: string;
  q: string;
  summary: string;
  body: HelpBlock[];
};

export type HelpCategory = {
  slug: string;
  icon: string;
  title: string;
  blurb: string;
  articles: HelpArticle[];
};

export const HELP: HelpCategory[] = [
  // ── Getting started ──────────────────────────────────────────────
  {
    slug: "getting-started",
    icon: "→",
    title: "Getting started",
    blurb:
      "What RYDA is, and where the cars are.",
    articles: [
      {
        slug: "what-is-ryda",
        q: "What is RYDA, in one paragraph?",
        summary:
          "A referral marketplace for car rental in Miami. Every car listed is owned and run by an independent operator; RYDA lists it, passes your request on, and earns a referral commission from the operator when a booking completes.",
        body: [
          {
            type: "p",
            text: "RYDA does not own, store, insure, maintain, or operate any vehicle on the platform. Every car listed for rent is owned and run by an independent Miami operator, and the rental closes on that operator's own contract and their own insurance. RYDA lists the car, passes your request to the operator, and earns a referral commission from the operator when a booking completes.",
          },
        ],
      },
      {
        slug: "markets",
        q: "What markets is RYDA in?",
        summary:
          "Miami. Every car on the browse grid today is run by a Miami operator.",
        body: [
          {
            type: "p",
            text: "RYDA does not own or operate a fleet. It lists cars that independent operators own and run.",
          },
          {
            type: "p",
            text: "Every car on the browse grid today is run by a Miami operator.",
          },
        ],
      },
    ],
  },

  // ── Bookings & usage ─────────────────────────────────────────────
  {
    slug: "bookings",
    icon: "◷",
    title: "Bookings & usage",
    blurb:
      "Cancellations, mileage, second drivers, parking, storms, lost keys.",
    articles: [
      {
        slug: "cancellations",
        q: "Cancellations and refunds",
        summary:
          "Cancellation and refund rights come from the operator's rental agreement, not from RYDA. The operator issues any refund — the charge sits on their Stripe account.",
        body: [
          {
            type: "p",
            text: "RYDA does not set cancellation terms and cannot cancel a rental on your behalf. The rental is a contract between you and the operator, and their rental agreement governs it: the notice period, whether the deposit comes back, and how much of the price does.",
          },
          { type: "h3", text: "Before you've paid" },
          {
            type: "p",
            text: "A request is not a booking. It does not reserve the car and does not hold your dates, so there is nothing to cancel. If your plans change before the operator has confirmed, tell them, or reply to the RYDA email about the request and we'll pass it on.",
          },
          { type: "h3", text: "After you've paid" },
          {
            type: "p",
            text: "The Stripe Checkout link is created on the operator's own Stripe account, so the money is theirs to refund. Ask them in writing, quoting the dates and the amount. RYDA holds the request, the dates, the confirmed price and the charge, and will provide those records and help where it reasonably can — but it cannot order a refund or release a deposit.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Read the operator's cancellation clause before you pay, not after. Terms differ between operators and between cars, and that agreement takes precedence on everything it covers.",
          },
        ],
      },
      {
        slug: "mileage",
        q: "Mileage limits and overages",
        summary:
          "The mileage allowance and the overage rate are the operator's, set in their rental agreement. Where an operator has given us a figure, it's on the listing.",
        body: [
          {
            type: "p",
            text: "RYDA does not set a mileage cap and does not bill anyone for miles. Every allowance you are held to on a rental comes from the operator's rental agreement for the specific car.",
          },
          { type: "h3", text: "What the listing shows" },
          {
            type: "p",
            text: "Where an operator has given RYDA a daily mileage figure, it appears on the listing. Where they haven't, the listing says the operator confirms it rather than showing a number nobody can stand behind.",
          },
          { type: "h3", text: "Overages" },
          {
            type: "p",
            text: "The rate above the allowance, and how it's collected — typically against the security deposit — is set in the operator's agreement. Ask for the number before you sign, especially if you're planning distance.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Photograph the odometer at handover and at return. It is the cheapest way to settle a mileage argument.",
          },
        ],
      },
      {
        slug: "passengers",
        q: "Bringing a passenger or co-driver",
        summary:
          "Passengers are rarely restricted. A second driver has to be added by the operator, on their agreement and their insurance — RYDA cannot add anyone to a policy it does not hold.",
        body: [
          { type: "h3", text: "Passengers" },
          {
            type: "p",
            text: "Riding along is not the same as driving, and operators generally don't restrict who sits in the passenger seat. If there is a limit, it will be written in the rental agreement.",
          },
          { type: "h3", text: "A second driver" },
          {
            type: "p",
            text: "Anyone who takes the wheel has to be named as an authorised driver on the operator's rental agreement and covered by the operator's own policy. RYDA does not hold that policy, cannot add a driver to it, and is not a party to the agreement.",
          },
          {
            type: "p",
            text: "Ask the operator when they confirm your dates. Expect them to want the second driver's licence, and expect their own eligibility bar — age, licence history, proof of insurance — to apply to that person too. Get the addition written onto the agreement rather than agreed over the phone.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Letting an unlisted driver take the wheel breaches the operator's rental agreement and can leave the car uninsured. What follows — the deductible, the damage bill, the deposit — is set in that agreement, and RYDA is not a party to it.",
          },
        ],
      },
      {
        slug: "out-of-state-travel",
        q: "Can I take the car out of state?",
        summary:
          "That's the operator's call, written into their rental agreement. Geographic limits, cross-border rules and any transport are theirs — RYDA holds no policy and arranges no transport.",
        body: [
          {
            type: "p",
            text: "Where a rented car may be driven is set by the operator's rental agreement and by the operator's own insurance. RYDA does not insure any vehicle on the platform, so it cannot tell you what your rental covers. Ask the operator before you book, not after you've crossed a state line.",
          },
          { type: "h3", text: "What to ask" },
          {
            type: "ul",
            items: [
              "Whether the agreement limits driving to Florida, or to a set radius.",
              "Whether there is a daily mileage allowance, and what a long trip does to it.",
              "Whether leaving the state needs notice, and in what form.",
              "Whether the Mexican or Canadian border is permitted at all.",
              "Who to call for a breakdown far from home, and who pays for the tow.",
            ],
          },
          { type: "h3", text: "What RYDA can't do" },
          {
            type: "p",
            text: "RYDA does not arrange enclosed transport, does not escort a drive, and cannot add a rider to a policy it does not hold. If a trip needs any of that, it is arranged with the operator directly.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Get the geographic limit in writing before you go. Driving outside the area the agreement allows is the kind of breach that voids the cover behind the rental, and the bill for that lands on you.",
          },
        ],
      },
      {
        slug: "weather-and-storms",
        q: "What if there's a hurricane during my booking?",
        summary:
          "The operator decides — they own the car and hold the agreement. RYDA does not store vehicles, cannot recall one, and cannot issue a refund.",
        body: [
          {
            type: "p",
            text: "RYDA does not own, store or garage any vehicle on the platform, so there is no RYDA facility to recall a car to and no RYDA policy covering a storm. A named storm during your rental is handled by the operator, under their rental agreement.",
          },
          { type: "h3", text: "What to do" },
          {
            type: "ul",
            items: [
              "Contact the operator as soon as a watch or warning is issued. They are the only party who can agree an early return, a change of dates, or a refund.",
              "Follow their agreement on returning the car early — including where, and by when.",
              "Tell RYDA too. We hold the request, the dates, the confirmed price and the charge, and we'll provide those records and help where we reasonably can.",
            ],
          },
          { type: "h3", text: "Weather damage" },
          {
            type: "p",
            text: "Hail, flood and wind damage run through the operator's own insurance and the damage terms in their agreement. RYDA is not the insurer and cannot tell you what is covered or what the deductible is — ask the operator before you sign.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Renting in hurricane season? Ask what the agreement says about named storms before you pay. Terms differ between operators and between cars.",
          },
        ],
      },
      {
        slug: "airport-and-valet",
        q: "Can I park it at an airport or hotel valet?",
        summary:
          "Parking restrictions come from the operator's rental agreement, not from RYDA. Ask before you book, and photograph the car at every handover.",
        body: [
          {
            type: "p",
            text: "RYDA holds no insurance policy on any car here, so there is no RYDA rule about where one may be left. Overnight parking, airport parking, valet and self-park are governed by the operator's rental agreement — and operators do restrict them.",
          },
          { type: "h3", text: "Ask the operator about" },
          {
            type: "ul",
            items: [
              "Overnight parking, and whether it has to be secured or indoors.",
              "Airport parking, and whether off-airport lots are excluded.",
              "Valet — some agreements treat handing the keys to a third party as an unauthorised driver.",
              "How long the car may be left unattended, and where.",
            ],
          },
          { type: "h3", text: "If something happens in valet" },
          {
            type: "p",
            text: "Photograph the car when you hand it over and again when you get it back. A venue may carry its own garage-keepers cover; beyond that it is between the operator and their insurer, under their agreement. Report the damage to the operator immediately either way.",
          },
        ],
      },
      {
        slug: "lost-keys",
        q: "What if I lose the key fob?",
        summary:
          "Tell the operator immediately — they own the car and hold any spare. RYDA has no keys, no courier, and no card on file to charge.",
        body: [
          { type: "h3", text: "Call the operator first" },
          {
            type: "p",
            text: "They own the car, they hold the spare if there is one, and they are the only party who can get you moving again. RYDA does not hold keys for any vehicle on the platform and cannot dispatch one.",
          },
          { type: "h3", text: "What it costs" },
          {
            type: "p",
            text: "Exotic key fobs are expensive and generally have to be ordered and programmed through the manufacturer's dealer, so a replacement costs time as well as money. Who pays, and how much, is set in the operator's rental agreement — typically taken against the security deposit if there is one.",
          },
          { type: "h3", text: "How you'll be charged" },
          {
            type: "p",
            text: "Not by RYDA. RYDA keeps no card on file. The only charge it ever creates is the one-off Stripe Checkout link for the rental itself, on the operator's own Stripe account. A lost-key charge, like a cleaning fee or a damage bill, is collected by the operator under their agreement.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Photograph the keys with the car at handover, and agree in writing what a replacement costs before you drive away.",
          },
        ],
      },
    ],
  },

  // ── Insurance & claims ───────────────────────────────────────────
  {
    slug: "insurance",
    icon: "⛨",
    title: "Insurance & claims",
    blurb:
      "Whose insurance the rental is on, who handles damage and claims, and what RYDA does not cover.",
    articles: [
      {
        slug: "coverage",
        q: "Who insures the car I rent?",
        summary:
          "The operator. The rental closes on their own agreement and their own policy. RYDA provides no insurance of any kind and does not verify any operator's policy.",
        body: [
          {
            type: "p",
            text: "RYDA is not an insurer and not an insurance broker. Every car listed here belongs to an independent Miami operator, and the rental closes on that operator's own rental agreement and their own policy — the same cover you would get renting from them directly.",
          },
          { type: "h3", text: "What RYDA does not do" },
          {
            type: "ul",
            items: [
              "RYDA does not provide insurance, coverage, waivers, or protection products of any kind.",
              "RYDA does not verify an operator's policy, its limits, or its exclusions.",
              "RYDA is not a party to your rental agreement and cannot answer for a policy it does not hold.",
            ],
          },
          { type: "h3", text: "What to ask the operator, before you sign" },
          {
            type: "ul",
            items: [
              "The liability limit that applies to the car you're renting.",
              "Whether damage to the car itself is covered, and at what deductible.",
              "What the agreement expects from your own insurance, if anything.",
              "Whether they can send you a certificate of insurance.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Eligibility to rent a particular car — minimum age, licence, proof of your own insurance, deposit — is the operator's to set as well, and it differs between operators and between cars.",
          },
        ],
      },
      {
        slug: "deductible",
        q: "What do I pay if the car is damaged?",
        summary:
          "Whatever the operator's rental agreement says. RYDA sets no deductible, holds no policy, and cannot decide who was at fault.",
        body: [
          {
            type: "p",
            text: "Damage responsibility, the deductible and the security deposit are all set in the operator's rental agreement. RYDA is not a party to that agreement and does not set, collect, or waive any of them.",
          },
          { type: "h3", text: "Where the money comes from" },
          {
            type: "p",
            text: "The operator collects it, not RYDA. RYDA keeps no card on file — the only charge it creates is the one-off Stripe Checkout link for the rental itself, on the operator's own Stripe account. A deposit, a damage charge or a deductible is arranged with the operator and sits outside that link.",
          },
          { type: "h3", text: "Before you sign" },
          {
            type: "ul",
            items: [
              "Ask for the deductible in dollars, for the car you are actually renting.",
              "Ask what the security deposit is, when it is taken, and when it comes back.",
              "Photograph the car at handover and at return, from every angle.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "If the operator asks you for a deposit directly, that is theirs to arrange and it sits outside the RYDA payment link — ask them to put the terms in writing.",
          },
        ],
      },
      {
        slug: "file-claim",
        q: "How do I file a claim after an accident?",
        summary:
          "Not with RYDA. People first, then the police report, then the operator — they hold the agreement, the insurance and the claim. Tell RYDA afterwards; we hold the booking records.",
        body: [
          { type: "h3", text: "1. People, then the report" },
          {
            type: "p",
            text: "Medical help first if anyone is hurt, then move out of traffic if it is safe to. Get a police report: the operator's insurer will want it, and so will you.",
          },
          { type: "h3", text: "2. Document the scene" },
          {
            type: "p",
            text: "Photograph the car, the other vehicle, the scene, the plates and every bit of visible damage. Take the other party's name, phone, licence and insurance details, and the police report number.",
          },
          { type: "h3", text: "3. Call the operator" },
          {
            type: "p",
            text: "They are the counterparty on your rental. They hold the rental agreement, the insurance and the deposit, and the claim is filed by them, with their own insurer. RYDA does not open claims, does not coordinate adjusters and does not appoint a repair shop.",
          },
          { type: "h3", text: "4. Then tell RYDA" },
          {
            type: "p",
            text: "Send us the booking and what happened. RYDA holds the request, the dates, the confirmed price and the charge, and will provide those records and help where it reasonably can — but it cannot decide a dispute it is not a party to.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Don't admit fault at the scene, and don't sign anything from the other party's insurer. Let the carriers work it out.",
          },
        ],
      },
      {
        slug: "roadside",
        q: "Is there roadside assistance or a replacement car?",
        summary:
          "Not from RYDA. There is no RYDA roadside number and no replacement-vehicle guarantee. Roadside cover, if the rental has any, comes from the operator's agreement.",
        body: [
          {
            type: "p",
            text: "RYDA does not run a 24/7 line, does not dispatch roadside assistance and does not deliver replacement vehicles. Anything of that kind on your rental exists because the operator provides it, under their own rental agreement.",
          },
          { type: "h3", text: "If the car stops" },
          {
            type: "ul",
            items: [
              "Get somewhere safe, then call the operator. They own the car and are the fastest route to a tow, a fix, or a swap.",
              "Check the rental agreement and the glovebox — some cars carry the manufacturer's own roadside programme.",
              "Tell RYDA afterwards. We hold the booking records and will help where we reasonably can, and a pattern of complaints is grounds for pausing an operator's account.",
            ],
          },
          { type: "h3", text: "A replacement car" },
          {
            type: "p",
            text: "Whether you get one, and how quickly, is the operator's decision under their agreement. RYDA cannot promise a swap on their behalf and holds no fleet to swap from.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Ask before you book if the trip depends on it. A breakdown is a bad moment to discover the agreement never promised a replacement.",
          },
        ],
      },
      {
        slug: "unauthorized-driver",
        q: "What if someone else drives the car?",
        summary:
          "Only drivers named on the operator's rental agreement are covered. Adding one is the operator's decision, not RYDA's, and an unlisted driver can void their insurance.",
        body: [
          {
            type: "p",
            text: "The operator's rental agreement names who is allowed to drive, and the operator's policy covers those people and nobody else. RYDA does not hold that policy, cannot add a driver to it, and is not a party to the agreement.",
          },
          { type: "h3", text: "If an unlisted driver crashes" },
          {
            type: "p",
            text: "The consequences are written into the operator's rental agreement, and they are usually severe: the cover behind the rental can fall away entirely, leaving the damage to the car and any third-party claim with you. Read that section before you hand anyone the keys.",
          },
          { type: "h3", text: "Adding a driver properly" },
          {
            type: "p",
            text: "Ask the operator when they confirm your dates. Expect them to want the second driver's licence and to apply their own eligibility bar — the same one that applied to you. Get the addition written onto the agreement, not agreed over the phone.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "The 'quick drive around the block' moment is the expensive one. On some agreements, handing the keys to a valet counts too — check before you do it.",
          },
        ],
      },
      {
        slug: "voids-coverage",
        q: "What can void the operator's coverage?",
        summary:
          "The operator's rental agreement lists it, and it is theirs to enforce. Track use, racing, off-roading and unauthorised drivers are the usual restrictions.",
        body: [
          {
            type: "p",
            text: "RYDA provides no coverage, so there is nothing on RYDA's side to void. What matters is the operator's own policy and the use restrictions written into their rental agreement — break one of those and the cover behind your rental can disappear.",
          },
          { type: "h3", text: "What operators typically restrict" },
          {
            type: "ul",
            items: [
              "Track use, racing and any timed or competitive event.",
              "Off-roading, and driving on surfaces the agreement excludes.",
              "Additional drivers who aren't named on the agreement.",
              "Driving under the influence, or any use that is illegal.",
              "Commercial use — paid passengers, delivery, paid shoots — without written permission.",
              "Driving outside the geographic area the agreement allows.",
            ],
          },
          {
            type: "p",
            text: "RYDA's Terms name track use, racing, off-roading and unauthorised additional drivers as restrictions the operator sets. The binding version is the agreement you actually sign, and it varies between operators and between cars.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "If you're not sure whether something is allowed, ask the operator in writing before you do it. RYDA cannot give you that answer — it is not the insurer and does not hold the policy.",
          },
        ],
      },
    ],
  },

  // ── Maintenance & care ───────────────────────────────────────────
  {
    slug: "maintenance",
    icon: "⚙",
    title: "Maintenance & care",
    blurb:
      "Who services and stores the cars, what condition to expect at handover, and how to report damage during a rental.",
    articles: [
      {
        slug: "process",
        q: "Who maintains and stores the cars?",
        summary:
          "The operator does. RYDA does not own, store, service, clean or inspect any vehicle on the platform.",
        body: [
          {
            type: "p",
            text: "Every car listed here is owned and run by an independent Miami operator. Servicing, tyres, storage, cleaning and condition are theirs, on their own schedule and at their own cost. RYDA does not touch any of it.",
          },
          { type: "h3", text: "RYDA does not inspect the cars" },
          {
            type: "p",
            text: "Nobody from RYDA puts a car on a lift before it is listed. There is no RYDA condition report and no RYDA service log. Condition is the operator's responsibility, and the handover is where you check it.",
          },
          { type: "h3", text: "What that means at handover" },
          {
            type: "ul",
            items: [
              "Walk the car before you drive it, and photograph anything already marked.",
              "Check tyres, lights and warning messages, and say something before you leave rather than after.",
              "Get the operator's confirmation of any pre-existing damage in writing.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "If a car turns up in a state it shouldn't, tell the operator and tell RYDA. A pattern of complaints is grounds for pausing an operator's account, and while it is paused no new payment link can be created for their cars.",
          },
        ],
      },
      {
        slug: "report-damage",
        q: "How do I report damage during a rental?",
        summary:
          "To the operator, immediately and in writing. RYDA is not a party to the rental and cannot assess, price, charge or waive damage.",
        body: [
          { type: "h3", text: "At handover" },
          {
            type: "p",
            text: "Photograph the car before you drive it — every panel, the wheels, the interior, the fuel or charge level, the odometer — and send the set to the operator so the baseline is agreed by both of you. RYDA does not take condition photos and holds no record of the car's state.",
          },
          { type: "h3", text: "During the rental" },
          {
            type: "p",
            text: "If you cause damage or find it, tell the operator straight away and put it in writing. Prompt disclosure is treated very differently from damage discovered at return — check what your agreement says about the difference.",
          },
          { type: "h3", text: "At return" },
          {
            type: "p",
            text: "Photograph the car again at handback, at the same level of detail. That set, against the one from handover, is what settles an argument about what happened during your rental.",
          },
          {
            type: "callout",
            tone: "info",
            text: "How damage is assessed and charged is the operator's, under their agreement and usually against the security deposit. RYDA holds the request, the dates, the confirmed price and the charge, and will provide those records — but it cannot decide the outcome.",
          },
        ],
      },
      {
        slug: "ev-charging",
        q: "How is fuel or charging handled?",
        summary:
          "The operator's fuel policy governs it, and it lives in their rental agreement. RYDA does not fuel, charge or prepare any vehicle.",
        body: [
          {
            type: "p",
            text: "The level the car reaches you at, the level it has to come back at, and what a shortfall costs are all set in the operator's rental agreement. RYDA does not fuel or charge any vehicle and does not set that policy.",
          },
          { type: "h3", text: "Confirm before you drive away" },
          {
            type: "ul",
            items: [
              "The level the car is handed over at — photographed, and agreed by both of you.",
              "The level it has to be returned at, and the charge if it isn't.",
              "For an EV or plug-in hybrid: whether a cable or adapter is in the car, and which connector it takes.",
            ],
          },
          { type: "h3", text: "Charging or fuelling on the road" },
          {
            type: "p",
            text: "You pay for it unless the operator's agreement says otherwise. Ask whether the car carries a charging account or an adapter rather than assuming it does — and note that not every interstate exit has premium fuel.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Photograph the gauge or the state of charge at handover and at return, with the odometer in the same frame. It settles the argument before it starts.",
          },
        ],
      },
    ],
  },

  // ── Account & billing ────────────────────────────────────────────
  {
    slug: "account",
    icon: "◉",
    title: "Account & billing",
    blurb:
      "How a rental is actually paid, what RYDA stores, identity verification, closing your account.",
    articles: [
      {
        slug: "payment-methods",
        q: "How do I pay, and does RYDA keep my card?",
        summary:
          "There is no card on file. No card at request; once the operator confirms, RYDA emails one Stripe Checkout link, created on the operator's own Stripe account.",
        body: [
          { type: "h3", text: "No card at request" },
          {
            type: "p",
            text: "A request carries your name, your contact details and your dates. It takes no card, it is not a booking, and it does not reserve the car. Nothing is charged until you and the operator have agreed the dates and the price.",
          },
          { type: "h3", text: "One link, once" },
          {
            type: "p",
            text: "After the operator confirms, RYDA emails you a Stripe Checkout link. Stripe collects the card on its own hosted page — card details are never entered on ryda.pro. The charge is created on the operator's own connected Stripe account: the rental price settles to them, and RYDA's referral commission is collected as a platform fee on that same charge. The link is good for 24 hours; if it lapses before you use it, reply to the email and we'll send a fresh one.",
          },
          { type: "h3", text: "What RYDA stores" },
          {
            type: "p",
            text: "Per booking: the amount, the currency, RYDA's commission, a Stripe session reference, and whether the link is pending, paid or expired. No card number, no expiry date, no bank account. There is nothing to add, remove or set as a default at /account/payments.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "RYDA never asks for card details over the phone, and never asks for a wire, a bank transfer or a payment app. A payment request that reaches you before the operator has confirmed, or by any route other than a Stripe Checkout link, did not come from RYDA — send it to us before you pay it.",
          },
        ],
      },
      {
        slug: "billing",
        q: "How am I billed, and where's my receipt?",
        summary:
          "One charge per rental, on the operator's Stripe account. RYDA runs no billing account for renters and issues no statements.",
        body: [
          {
            type: "p",
            text: "There is no RYDA invoice, no monthly statement and no recurring charge for renting a car. A rental is paid once, through a Stripe Checkout link RYDA emails after the operator confirms your dates and your price.",
          },
          { type: "h3", text: "What's on the charge" },
          {
            type: "p",
            text: "The rental price the operator confirmed. RYDA's referral commission is collected as a platform fee on that same charge, out of what the operator receives — it is never added to your side. Requesting through RYDA costs the same as going direct.",
          },
          { type: "h3", text: "Your receipt" },
          {
            type: "p",
            text: "Stripe's own receipt for the charge, plus the two emails RYDA sends you: the payment link with the total on it, and the confirmation once the payment goes through. Those are the records of the rental on your side.",
          },
          { type: "h3", text: "Everything beyond the rental price" },
          {
            type: "p",
            text: "A security deposit, a cleaning fee, a fuel shortfall, a damage charge or a mileage overage is collected by the operator, under their rental agreement and by their own method. None of it appears on the RYDA link, and RYDA cannot charge or refund it.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Refunds are the operator's too — the money sits on their Stripe account, not RYDA's. RYDA will provide the booking records it holds.",
          },
        ],
      },
      {
        slug: "kyc",
        q: "KYC verification, what we collect and why",
        summary:
          "Government ID and a selfie match, run through Stripe Identity. RYDA never sees the raw documents and keeps only the verification result.",
        body: [
          { type: "h3", text: "What we collect" },
          {
            type: "ul",
            items: [
              "Government-issued photo ID (US driver's license, passport, or state ID).",
              "Selfie image for biometric match against the ID photo.",
              "Name, date of birth and address, as read from the document.",
            ],
          },
          { type: "h3", text: "Why we collect it" },
          {
            type: "p",
            text: "To confirm the person behind a RYDA account is who they say they are. RYDA does not add anyone to an insurance policy and does not run a driving-record check — eligibility to rent a particular car, including licence and driving history, is set and checked by the operator, not by RYDA.",
          },
          { type: "h3", text: "Where it's stored" },
          {
            type: "p",
            text: "Documents are processed by Stripe Identity. RYDA never sees raw ID images. We retain only the verification result and the name, address and date of birth Stripe reads from the document.",
          },
          { type: "h3", text: "Sharing" },
          {
            type: "p",
            text: "We don't share KYC data with anyone except state or federal regulators when legally required. RYDA does not pass it to an insurance carrier, because RYDA does not place insurance on any vehicle.",
          },
        ],
      },
      {
        slug: "close",
        q: "Closing my account",
        summary:
          "It is a request, not a switch. The delete-account flow at /account/privacy reaches the RYDA team and a person actions it. There is no subscription to cancel.",
        body: [
          { type: "h3", text: "How to close it" },
          {
            type: "p",
            text: "Use the delete-account flow at /account/privacy, or email hello@ryda.pro. Either way it reaches the RYDA team as a request: someone actions it by hand and replies to the email address on your account. Nothing is deleted automatically, and you stay signed in until it is.",
          },
          { type: "h3", text: "What closing does not do" },
          {
            type: "p",
            text: "It does not cancel a rental. Once a request has gone to an operator, the booking, the contract and any deposit are between you and them, and RYDA cannot take it back on your behalf.",
          },
          { type: "h3", text: "Asking for your data instead" },
          {
            type: "p",
            text: "The same page has a request-your-data button. That is a request too — there is no automatic export behind it. Someone puts the file together and replies to the email address on your account.",
          },
        ],
      },
    ],
  },

  // ── Vehicle use & etiquette ──────────────────────────────────────
  {
    slug: "vehicle-use",
    icon: "★",
    title: "Vehicle use & etiquette",
    blurb:
      "What you can and can't do behind the wheel. Aggressive driving, smoking, pets, road trips, car shows, kids in the cabin.",
    articles: [
      {
        slug: "aggressive-driving",
        q: "Can I track / drift / launch the car?",
        summary:
          "Track use, racing and timed events are excluded by most rental agreements — and it is the operator's agreement that decides, not RYDA.",
        body: [
          {
            type: "p",
            text: "RYDA owns no cars and provides no insurance, so it sets no rules about how one is driven. What binds you is the operator's rental agreement and the policy behind it.",
          },
          { type: "h3", text: "What agreements typically exclude" },
          {
            type: "ul",
            items: [
              "Track days, sanctioned or otherwise, and any timed or competitive event.",
              "Drag racing, drift events, gymkhana and autocross.",
              "Street racing and sustained high-RPM running on public roads.",
              "Off-roading, and any surface the agreement excludes.",
              "Disabling traction control, ABS or stability systems.",
            ],
          },
          { type: "h3", text: "What it costs to get this wrong" },
          {
            type: "p",
            text: "An excluded use is the classic way to lose the cover behind a rental. If the car is damaged while you were doing something the agreement prohibits, the repair bill can land on you in full, on top of whatever that agreement says about breach.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Spirited driving on a public road within the limit is a different thing from a timed event on a closed one. If you want the second, ask the operator in writing first.",
          },
        ],
      },
      {
        slug: "smoking-pets-food",
        q: "Smoking, pets, food, what's allowed?",
        summary:
          "The operator's rental agreement sets it, and the cleaning charges with it. Assume no smoking; ask about pets before you book.",
        body: [
          {
            type: "p",
            text: "RYDA does not clean, prepare or inspect any car here, and it does not set, collect or waive a cleaning charge. Every rule below comes from the operator's rental agreement, so read that — it is what you will actually be held to.",
          },
          { type: "h3", text: "Smoking and vaping" },
          {
            type: "p",
            text: "Assume it is prohibited unless the agreement says otherwise. Smoke odour in an exotic interior is expensive and slow to remove, and rental agreements price it accordingly. The charge, and how it is collected, is the operator's.",
          },
          { type: "h3", text: "Pets" },
          {
            type: "p",
            text: "Ask before you book rather than at handover. Whether an animal is allowed, and in what, is the operator's call, and it varies between operators and between cars.",
          },
          { type: "h3", text: "Food and drink" },
          {
            type: "p",
            text: "Usually tolerated, rarely welcomed — exotic interiors are typically Alcantara or hand-stitched leather, and neither forgives a spill. Cleaning beyond normal use is chargeable under most agreements, generally against the security deposit.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Coffee in the cup holder: fine. Coffee from a paper cup with a flimsy lid going through a corner: an expensive way to find out what the agreement's cleaning clause says.",
          },
        ],
      },
      {
        slug: "road-trips",
        q: "Can I take the car on a road trip?",
        summary:
          "Ask the operator first. Distance runs into their mileage allowance and their geographic limits, both set in the rental agreement.",
        body: [
          {
            type: "p",
            text: "Nothing about a long trip is RYDA's to approve. The mileage allowance, the rate above it, and the area the car may be driven in all come from the operator's rental agreement — and the insurance behind the rental is theirs too.",
          },
          { type: "h3", text: "Settle these before you go" },
          {
            type: "ul",
            items: [
              "The daily mileage allowance, and the per-mile rate above it.",
              "Whether the agreement limits driving to Florida, or to a set radius.",
              "Whether the operator wants notice of a long trip, and in what form.",
              "Who to call for a breakdown far from home, and who pays for the tow.",
            ],
          },
          { type: "h3", text: "Practical" },
          {
            type: "ul",
            items: [
              "Premium fuel is not on every interstate exit. Plan the stops.",
              "Hotels with secured indoor parking beat hoping for a good kerb — and some agreements require secured parking anyway.",
              "Bring a USB-C cable. Modern exotic infotainment is iPhone-default but cables are car-specific.",
              "Photograph the car and the odometer at the start and the end of the trip.",
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "Driving outside the area the agreement permits is a breach, and a breach is how the cover behind the rental disappears. Get the limit in writing.",
          },
        ],
      },
      {
        slug: "car-shows-photoshoots",
        q: "Can I take the car to a car show or photoshoot?",
        summary:
          "Personal photos, generally fine. Anything paid or commercial needs the operator's written permission — commercial use is excluded by most rental agreements.",
        body: [
          { type: "h3", text: "Casual meets and personal photos" },
          {
            type: "p",
            text: "Taking the car to a local meet, a coffee-and-cars Sunday, or photographing it for yourself is not usually restricted. If in doubt, the operator's rental agreement will say.",
          },
          { type: "h3", text: "Paid or commercial work" },
          {
            type: "p",
            text: "Brand shoots, paid social posts, music videos and anything you're compensated for count as commercial use, and commercial use is excluded by most rental agreements unless it has been agreed in writing. Ask the operator, get the permission onto the agreement, and expect them to price it.",
          },
          { type: "h3", text: "What RYDA can't do" },
          {
            type: "p",
            text: "RYDA cannot approve a shoot, add or quote an insurance rider, arrange a prep, or organise transport. It does not own the car, insure it, or hold the agreement — every one of those is the operator's.",
          },
          {
            type: "callout",
            tone: "warn",
            text: "Shooting commercially without written permission is the kind of breach that voids the cover behind the rental. If the car is damaged that day, the bill is yours.",
          },
        ],
      },
      {
        slug: "kids-and-baby-seats",
        q: "Can I install a child seat?",
        summary:
          "Usually yes, if the car has anchors and the operator agrees. RYDA does not fit seats, prepare vehicles, or deliver them.",
        body: [
          { type: "h3", text: "Whether the car takes one" },
          {
            type: "p",
            text: "Most modern exotics with rear seats carry ISOFIX/LATCH child-seat anchors; many two-seat configurations cannot take a child seat safely at all, because the airbag arrangement isn't designed for it and there is no rear seat to move to. Ask the operator about the specific car before you book.",
          },
          { type: "h3", text: "Ask the operator first" },
          {
            type: "p",
            text: "Fitting a seat is a change to their car. Confirm it is allowed, and confirm who fits it. RYDA does not fit child seats, does not prepare vehicles and does not deliver them.",
          },
          { type: "h3", text: "If you fit it yourself" },
          {
            type: "ul",
            items: [
              "Put a protector underneath. Buckles and anchor points mark leather and Alcantara.",
              "Don't over-tighten the anchors — exotic interior trim deforms.",
              "Take the seat out before you hand the car back, and photograph the seat area.",
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Damage from a badly fitted seat is damage under the operator's agreement, chargeable like any other. Photograph the seat area at handover and at return.",
          },
        ],
      },
    ],
  },
];

export function getCategory(slug: string) {
  return HELP.find((c) => c.slug === slug);
}

export function getArticle(categorySlug: string, articleSlug: string) {
  const cat = getCategory(categorySlug);
  if (!cat) return null;
  const article = cat.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return { category: cat, article };
}

// ── Search keywords ────────────────────────────────────────────────
// Synonyms and common phrasings keyed by `${categorySlug}/${articleSlug}`.
// These widen the search net so e.g. someone typing "totaled" finds the
// "What if the car is totaled?" article even if they don't use that exact
// phrase. Append to these when you notice common queries that miss.

const ARTICLE_KEYWORDS: Record<string, string[]> = {
  // Getting started
  "getting-started/what-is-ryda": ["overview", "introduction", "explain", "platform", "model", "company", "what is", "tell me about", "summary", "elevator pitch"],
  "getting-started/markets": ["where", "miami", "los angeles", "la", "new york", "ny", "city", "location", "available", "operating cities", "states", "regions"],

  // Bookings
  "bookings/cancellations": ["cancel", "reschedule", "refund", "no show", "cancellation fee", "change date", "back out", "withdraw"],
  "bookings/mileage": ["miles", "mileage", "overage", "kilometers", "limit", "annual miles", "exceed", "go over", "extra miles"],
  "bookings/passengers": ["passenger", "co-driver", "secondary driver", "spouse", "partner", "friend", "additional driver", "guests", "wife", "husband", "kids ride"],
  "bookings/out-of-state-travel": ["out of state", "another state", "state line", "border", "mexico", "canada", "long distance", "across country", "interstate", "transit"],
  "bookings/weather-and-storms": ["weather", "rain", "storm", "hurricane", "tornado", "snow", "hail", "ice", "tropical storm", "evacuation", "evacuate", "noaa"],
  "bookings/airport-and-valet": ["airport", "valet", "park at airport", "hotel", "parking lot", "leave the car", "overnight parking", "secured parking"],
  "bookings/lost-keys": ["lost key", "lost fob", "key fob", "missing key", "can't find key", "replacement key", "spare key", "locked out"],

  // Insurance
  "insurance/coverage": ["insurance", "covered", "policy", "liability", "comprehensive", "collision", "what's covered", "limits", "policy limits", "who insures", "certificate of insurance"],
  "insurance/deductible": ["deductible", "out of pocket", "i pay", "fault", "at-fault", "accident cost", "what do i pay", "if i crash"],
  "insurance/file-claim": ["claim", "accident", "crash", "collision", "what to do", "file a claim", "got in an accident", "rear ended", "hit by", "fender bender"],
  "insurance/roadside": ["roadside", "tow", "breakdown", "stuck", "flat tire", "battery", "lockout", "fuel", "won't start", "stranded", "replacement vehicle", "swap", "totaled", "write off", "total loss"],
  "insurance/unauthorized-driver": ["my friend", "let someone drive", "buddy drive", "girlfriend", "boyfriend", "uncle", "valet drive", "anyone else drive", "additional driver", "second driver"],
  "insurance/voids-coverage": ["void coverage", "no coverage", "won't be covered", "what voids", "dui", "drinking", "intoxicated", "impaired", "drugs", "racing"],

  // Maintenance
  "maintenance/process": ["maintenance", "service", "repair", "upkeep", "how is it maintained", "who fixes", "service interval", "storage", "stored", "garage", "inspection", "condition report", "detailing", "clean", "wash", "warranty"],
  "maintenance/report-damage": ["damage", "scratch", "dent", "scuff", "report", "i scratched", "i hit something", "curbed wheel", "rim damage", "paint chip"],
  "maintenance/ev-charging": ["ev", "electric", "charge", "charging", "plug in", "tesla", "supercharger", "battery", "level 2", "hybrid", "phev", "fuel", "gas", "petrol", "fuel policy", "full tank"],

  // Account
  "account/payment-methods": ["pay", "payment", "card", "ach", "bank", "credit card", "wire", "billing method", "amex", "visa", "mastercard", "stripe"],
  "account/billing": ["bill", "invoice", "charged", "statement", "billing cycle", "when am i charged", "monthly", "quarterly", "annual", "receipt", "auto pay"],
  "account/kyc": ["kyc", "id verification", "identity", "verify me", "documents required", "passport", "license", "selfie", "persona", "background check"],
  "account/close": ["cancel account", "leave", "quit", "close account", "deactivate", "delete account", "unsubscribe", "i'm done", "not interested"],

  // Vehicle use & etiquette
  "vehicle-use/aggressive-driving": ["drift", "drag race", "burnout", "launch", "launch control", "redline", "aggressive", "spirited", "drive fast", "speed", "race"],
  "vehicle-use/smoking-pets-food": ["smoke", "smoking", "vape", "vaping", "weed", "marijuana", "cigarette", "cigar", "pet", "dog", "cat", "food", "drink", "eat"],
  "vehicle-use/road-trips": ["road trip", "long drive", "drive cross country", "weekend trip", "long distance drive", "vacation drive", "tour"],
  "vehicle-use/car-shows-photoshoots": ["car show", "show car", "exhibition", "photoshoot", "photo shoot", "instagram", "social media", "youtube", "video", "filming", "music video", "brand deal"],
  "vehicle-use/kids-and-baby-seats": ["kid", "child", "baby", "infant", "toddler", "child seat", "car seat", "isofix", "latch", "family", "stroller"],
};

// ── Search ─────────────────────────────────────────────────────────

export type SearchResult = {
  category: HelpCategory;
  article: HelpArticle;
  score: number;
};

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "to", "of", "in", "on", "at", "for", "with",
  "and", "or", "but", "if", "then", "than", "as", "by", "from",
  "i", "me", "my", "you", "your", "we", "our", "it", "its",
  "this", "that", "these", "those", "what", "how", "why", "when", "where",
  "can", "should", "would", "could", "will", "shall", "may", "might",
  "ryda", // every article is about RYDA, no signal
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'$%\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function blockToText(b: HelpBlock): string {
  switch (b.type) {
    case "p":
    case "h3":
    case "callout":
      return b.text;
    case "ul":
      return b.items.join(" ");
  }
}

// Extract a 2–3 sentence conversational answer from an article. Uses the
// article's own summary first (always crafted as a one-line answer), then
// the first body paragraph for additional context. Skips lists, h3s, and
// callouts because they don't read as conversational answers.
export function extractAnswer(article: HelpArticle): string {
  const summary = article.summary.trim();
  const firstParagraph = article.body.find((b) => b.type === "p");
  if (firstParagraph && firstParagraph.type === "p") {
    const para = firstParagraph.text.trim();
    // Don't repeat content if the summary already covers it
    if (summary.length > 80 && para.startsWith(summary.slice(0, 40))) {
      return summary;
    }
    return `${summary}\n\n${para}`;
  }
  return summary;
}

export function searchHelp(query: string, limit = 4): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const category of HELP) {
    for (const article of category.articles) {
      const key = `${category.slug}/${article.slug}`;
      const keywords = ARTICLE_KEYWORDS[key] ?? [];

      const fields = {
        q: article.q.toLowerCase(),
        keywords: keywords.join(" ").toLowerCase(),
        summary: article.summary.toLowerCase(),
        body: article.body.map(blockToText).join(" ").toLowerCase(),
        category: category.title.toLowerCase(),
      };

      let score = 0;
      let exactPhraseHit = false;

      // Exact-phrase match in question or keywords is high signal
      const phrase = query.toLowerCase().trim();
      if (phrase.length > 4 && (fields.q.includes(phrase) || fields.keywords.includes(phrase))) {
        score += 30;
        exactPhraseHit = true;
      }

      for (const token of tokens) {
        if (fields.q.includes(token)) score += 10;
        if (fields.keywords.includes(token)) score += 8;
        if (fields.summary.includes(token)) score += 4;
        if (fields.body.includes(token)) score += 1;
        if (fields.category.includes(token)) score += 3;
      }

      // Penalize matches where only one of many tokens hit (low recall)
      if (!exactPhraseHit && tokens.length >= 3) {
        const hitCount = tokens.filter(
          (t) =>
            fields.q.includes(t) ||
            fields.keywords.includes(t) ||
            fields.summary.includes(t),
        ).length;
        if (hitCount === 1) score = Math.floor(score / 2);
      }

      if (score > 0) {
        results.push({ category, article, score });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
