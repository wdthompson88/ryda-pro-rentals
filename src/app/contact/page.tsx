import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact",
  description:
    "Get in touch with RYDA — questions about a rental or a request you've sent, press, operator partnerships, and investor relations.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Contact</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            Talk to a real person.
          </h1>
        </div>
      </section>

      {/* 4-card grid */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* There is no membership and no co-ownership product in
                this platform, so the first card is the thing most
                people are actually writing in about: a car on /rent, or
                a request already sent. */}
            <ContactCard
              title="Rentals"
              subtitle="A car, a date, a request you've sent"
              detail="We'll answer it or pass it to the operator."
              cta="Ask about a rental"
              href="/contact?type=Rental#form"
            />
            <ContactCard
              title="Press"
              subtitle="Media inquiries"
              cta="Send a press inquiry"
              href="/contact?type=Press#form"
            />
            {/* RYDA has no dealer or insurance programme — it lists
                independent operators' cars and takes a referral
                commission. The partners it looks for are operators. */}
            <ContactCard
              title="Partnerships"
              subtitle="Operators & referral partners"
              cta="Send a partnership inquiry"
              href="/contact?type=Partnership#form"
            />
            <ContactCard
              title="Investors"
              subtitle="Investor relations"
              cta="Send an investor inquiry"
              href="/contact?type=Investor#form"
            />
          </div>
        </div>
      </section>

      {/* General contact form */}
      <section id="form" className="border-b border-rule">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 sm:px-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              General inquiries
            </h2>
            <p className="mt-4 max-w-md text-base text-ink-soft">
              For anything that doesn't fit the categories above. We'll route
              you to the right person.
            </p>
            <div className="mt-10 space-y-4 text-sm">
              <Row label="HQ" value="Miami, FL" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Prefer to talk. The #consultation anchor stays — /help links
          straight to it — but there is no membership, no advisor and no
          30-minute consultation to book. */}
      <section id="consultation" className="border-b border-rule bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-bright">
            Prefer to talk
          </p>
          <h2 className="mt-4 font-display text-4xl font-light sm:text-5xl">
            Rather talk it through?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-cream/70">
            There&apos;s no field on the form for that, so put it in the
            message: what you&apos;re after, and when you&apos;re
            reachable.
          </p>
          <Link
            href="/contact?type=Rental#form"
            className="mt-10 inline-flex h-11 items-center justify-center rounded-full bg-cream px-6 text-sm font-medium text-ink hover:bg-red hover:text-cream"
          >
            Send a note
          </Link>
        </div>
      </section>
    </>
  );
}

function ContactCard({
  title,
  subtitle,
  detail,
  cta,
  href,
}: {
  title: string;
  subtitle: string;
  /** Optional: cards whose only detail line was an unsubstantiated
   *  promise (a response-time SLA, a data room) now omit it. */
  detail?: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-rule bg-surface p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-red">{title}</p>
      <p className="mt-3 font-display text-lg text-ink">{subtitle}</p>
      {detail ? (
        <p className="mt-2 flex-1 text-sm text-ink-soft">{detail}</p>
      ) : (
        <div className="flex-1" />
      )}
      <Link
        href={href}
        className="mt-5 inline-flex items-center text-sm font-medium text-ink hover:text-red"
      >
        {cta} →
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-rule pb-2">
      <span className="text-mute">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
