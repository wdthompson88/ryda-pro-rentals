import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "How your money is protected — RYDA",
  description:
    "Where your buy-in goes, how the LLC's funds are held, what happens if RYDA fails and what protections members have under the Operating Agreement.",
};

export default function MemberProtectionPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Member protection
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            How your money is{" "}
            <span className="italic">actually protected.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Wealthy buyers ask three questions before wiring six figures:
            where does my money go, who controls the asset, and what happens
            if something goes wrong. This is the operational answer to all
            three, without legal jargon.
          </p>
        </div>
      </section>

      {/* Money flow */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Where your buy-in goes
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Your money never touches RYDA's operating account.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-4">
            <Step
              n="01"
              title="Verified-bank escrow"
              body="Your buy-in wires to a segregated escrow account at a US-licensed escrow agent (not RYDA). The escrow agent holds the funds until all conditions are met: the LLC's vehicle title is clean, the insurance policy is bound, all members' KYC has cleared and counsel has verified the Operating Agreement is fully executed."
            />
            <Step
              n="02"
              title="Release to the LLC"
              body="Once conditions clear, escrow releases funds to the LLC's bank account, not to RYDA. The LLC is a separate legal entity with its own bank account, its own EIN and its own books. RYDA is a vendor to the LLC."
            />
            <Step
              n="03"
              title="LLC pays the seller"
              body="The LLC uses the pooled member capital to acquire the vehicle from the dealer or private seller, with title issued in the LLC's name. RYDA's role here is operational, sourcing, PPI, paperwork, not custodial. The LLC owns the asset on day one."
            />
            <Step
              n="04"
              title="Ongoing reserve"
              body="The LLC keeps an operating reserve in its own bank account, sized for ~12 months of insurance, storage, maintenance and contingency. This is the buffer that absorbs surprise costs without member assessments."
            />
          </div>
        </div>
      </section>

      {/* What "asset-backed" actually means, the comparison block */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What asset-backed actually means
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Three of the four are usage rights. Only one is an asset.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-ink-soft">
            "Asset-backed" is the difference between a contract with an
            operator and a legal interest in a real, titled vehicle.
            What happens to your access, and your money, if the
            platform behind it disappears?
          </p>
          <div className="mt-10 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-rule bg-cream-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-6 py-5 text-left">Model</th>
                    <th className="px-6 py-5 text-left">Backed by</th>
                    <th className="px-6 py-5 text-left">If the platform fails</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  <tr className="border-b border-rule">
                    <td className="px-6 py-4 text-ink-soft">Subscription / club</td>
                    <td className="px-6 py-4">A contract with the operator</td>
                    <td className="px-6 py-4">Lose access immediately</td>
                  </tr>
                  <tr className="border-b border-rule">
                    <td className="px-6 py-4 text-ink-soft">Lease</td>
                    <td className="px-6 py-4">A contract with the lessor</td>
                    <td className="px-6 py-4">Lessor reclaims the car</td>
                  </tr>
                  <tr className="border-b border-rule">
                    <td className="px-6 py-4 text-ink-soft">Daily rental</td>
                    <td className="px-6 py-4">A single-day contract</td>
                    <td className="px-6 py-4">Walk away</td>
                  </tr>
                  <tr className="bg-cream-2/60">
                    <td className="px-6 py-4 font-display text-base text-red">
                      RYDA co-ownership
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">
                      LLC ownership of the physical car
                    </td>
                    <td className="px-6 py-4 font-medium text-ink">
                      The LLC and the car still belong to the members
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-xs text-mute">
            Co-ownership shares are member-managed LLC interests.
            The vehicle is held on title in the LLC's name; you hold a
            registered legal interest in the LLC. Real asset, real
            ownership, not a financial instrument and not an
            investment offering.
          </p>
        </div>
      </section>

      {/* Asset custody */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Who controls what
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            The LLC owns the asset. You own a share of the LLC.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Pillar
              title="Vehicle title"
              body="Held in the LLC's name. RYDA does not appear on the title and never can. If RYDA were to disappear tomorrow, the LLC and its asset would still exist and the members would still be the legal owners."
            />
            <Pillar
              title="Insurance policy"
              body="Bound by an A-rated US carrier (Hagerty, Travelers or CHUBB tier), with the LLC named as primary insured and every approved member named as a named insured. RYDA is the broker of record, not the policyholder."
            />
            <Pillar
              title="Operating Agreement"
              body="Signed by every member at closing. Spells out voting thresholds (75% supermajority for sales, modifications, replacements), default remedies, distribution waterfall on dissolution and the process for transferring a share. This is the LLC's constitution."
            />
            <Pillar
              title="Management Services Agreement"
              body="A separate contract between the LLC (as principal) and RYDA (as service provider). Defines RYDA's scope: storage, insurance procurement, scheduling, maintenance coordination, member services. The MSA can be renewed or terminated by member vote per the Operating Agreement. RYDA is replaceable."
            />
          </div>
        </div>
      </section>

      {/* Edge cases */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            What if
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            The hard scenarios, plainly answered.
          </h2>

          <div className="mt-12 space-y-6">
            <Case
              q="What if RYDA, the company, fails?"
              a="The LLC and the asset survive. Title is in the LLC's name; the LLC has its own bank account and its own counsel. Members can vote to engage a successor service provider, sell the asset or wind the LLC down, whatever the Operating Agreement allows. Your share is protected from RYDA's solvency because RYDA never owned the asset to begin with."
            />
            <Case
              q="What if a co-owner stops paying their quarterly fees?"
              a="The Operating Agreement triggers a 30-day cure period with written notice and a small late fee. If the member doesn't cure, the LLC can force-transfer the delinquent share to another verified member at the most recent reference value. Proceeds first cover the unpaid amount, then any LLC-level transaction costs, then the rest goes to the former member. Other co-owners are not on the hook for the unpaid amount, the share itself secures the obligation."
            />
            <Case
              q="What happens on death of a co-owner?"
              a="The deceased member's share passes to their estate per their will or by intestacy. The estate has 90 days to either hold the share, transfer it to a beneficiary or list it for transfer through RYDA. The LLC continues operating uninterrupted. We recommend members add their share to estate planning documents at closing."
            />
            <Case
              q="What about divorce?"
              a="Co-ownership shares are personal property and subject to whatever marital-property rules apply in your state. If the share is awarded to a non-member spouse in a divorce settlement, that spouse must clear RYDA's standard verification (KYC, age, driving record) to take the seat, otherwise the share is sold and proceeds awarded. The LLC is not party to the divorce."
            />
            <Case
              q="What if the car gets totaled?"
              a="The LLC's agreed-value comprehensive policy pays out to the LLC. The members vote on what to do next: take the cash distribution and dissolve the LLC, or roll proceeds into a replacement vehicle (typically same model year). Most groups elect replacement. Distributions on dissolution are pro-rata to share count, after any outstanding LLC obligations."
            />
            <Case
              q="What if I want out before my 12-month minimum hold?"
              a="The 12-month hold is a hard floor. After it clears, you can transfer your share to another verified member at a price you negotiate. RYDA helps facilitate the LLC paperwork and charges a 3% transfer fee on the agreed price. If you genuinely cannot continue paying mid-hold, the LLC can in some cases work with you on a cure plan or accelerated transfer, but those are case-by-case, not contractual rights."
            />
            <Case
              q="Can RYDA change the management fee or terms unilaterally?"
              a="No. The annual all-in management fee (~7–9% of vehicle value, depending on the model) is set in the Management Services Agreement at LLC formation. RYDA cannot raise it without member approval. The agreement can be renewed or terminated by member vote per the Operating Agreement. If members vote to terminate, RYDA exits and the members can hire a new service provider (or self-manage)."
            />
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Read the documents
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            We'll send you the templates.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-soft">
            Every prospective member can request our document packet before
            applying, sample LLC Operating Agreement, sample Management
            Services Agreement, sample Pre-Purchase Inspection report,
            sample insurance certificate, and sample condition report.
            Reviewable by your counsel or accountant before any commitment.
          </p>
          <Link
            href="/contact?type=Membership&note=Sample%20document%20packet#form"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
          >
            Request the document packet →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-3xl sm:text-4xl">
            Talk to a founder.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            Real-money commitments deserve a real conversation. Drop your
            details and we'll set up a call this week.
          </p>
          <Link
            href="/contact?type=Membership&note=Schedule%20a%20call#form"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Schedule a call →
          </Link>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-display text-sm text-red">{n}</p>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Case({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="font-display text-lg text-ink">{q}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{a}</p>
    </div>
  );
}
