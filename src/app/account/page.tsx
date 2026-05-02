import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DemoBanner } from "@/components/demo-banner";

export const metadata = { title: "My Account — RYDA" };

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <DemoBanner />

      {/* Hero / status */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
            Account
          </p>
          <h1 className="mt-4 font-display text-4xl font-light text-ink sm:text-5xl">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-mute">
            Member since April 2026 · RYDA Blue · Miami
          </p>
        </div>
      </section>

      {/* Quick stats */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Cars co-owned" value="2" sub="Ferrari 296 + McLaren 750S" />
            <Stat label="Days used this year" value="14" sub="Of 68 entitled" />
            <Stat label="Days remaining" value="54" sub="Across all shares" />
            <Stat label="Upcoming bookings" value="3" sub="Next: May 12" />
          </div>
        </div>
      </section>

      {/* Action grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Your account</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card title="My Cars" desc="2 vehicles · 1 share each" href="/portfolio" />
            <Card title="Bookings" desc="3 upcoming · next May 12" href="/bookings" />
            <Card title="Messages" desc="2 unread" href="/messages" />
            <Card title="Membership" desc="RYDA Blue · renews Apr 27, 2027" href="/membership" />
            <Card title="Payment methods" desc="Visa ••• 4729 · Bank ACH" />
            <Card title="Verification" desc="KYC verified · Driving record clean" />
            <Card title="Documents" desc="Operating Agreement · MSA · insurance certificates" />
            <Card title="Notifications" desc="Push: on · Email: weekly digest" />
            <Card title="Security" desc="2FA on · 1 active session" />
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Recent activity</h2>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Activity label="Booking confirmed" detail="Ferrari 296 GTB · May 12 – May 14" date="2 hours ago" />
            <Activity label="Inspection report posted" detail="McLaren 750S Spider · 2,140 mi" date="Yesterday" />
            <Activity label="Quarterly mgmt fee paid" detail="$1,700, Ferrari 296 LLC" date="3 days ago" />
            <Activity label="Welcome to RYDA Blue" detail="Annual membership active" date="2 weeks ago" />
            <Activity label="Co-ownership share confirmed" detail="McLaren 750S, 1 of 10 shares" date="3 weeks ago" />
          </ul>
        </div>
      </section>

      {/* Upcoming charges */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Upcoming charges</h2>
          <ul className="mt-6 divide-y divide-rule rounded-xl border border-rule bg-surface">
            <Charge label="White-glove delivery (Apr 28)" amount="—" sub="Blue tier, included" />
            <Charge label="Q3 management fee · Ferrari 296" amount="$1,700" sub="Due Jul 1, 2026" />
            <Charge label="Q3 management fee · McLaren 750S" amount="$1,500" sub="Due Jul 1, 2026" />
            <Charge label="Annual insurance · Ferrari 296" amount="$1,833" sub="Due Sep 15, 2026" />
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-12 text-center text-cream/60">
        <p className="text-xs">
          Sample dashboard · Member-area features ship at Miami launch.
          See <Link href="/membership" className="text-red hover:text-red-deep">/membership</Link> for what's included.
        </p>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  const subColor =
    tone === "up" ? "text-red" : tone === "down" ? "text-red" : "text-mute";
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="text-xs uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink tabular-nums">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subColor}`}>{sub}</p>}
    </div>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href?: string }) {
  if (!href) {
    return (
      <div className="block rounded-2xl border border-rule bg-surface p-6">
        <p className="font-display text-lg text-ink">{title}</p>
        <p className="mt-2 text-sm text-ink-soft">{desc}</p>
        <p className="mt-4 text-xs font-medium text-mute">Available at launch</p>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-rule bg-surface p-6 transition-shadow hover:shadow-md"
    >
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{desc}</p>
      <p className="mt-4 text-xs font-medium text-red">Open →</p>
    </Link>
  );
}

function Activity({
  label,
  detail,
  date,
}: {
  label: string;
  detail: string;
  date: string;
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{detail}</p>
      </div>
      <p className="text-xs text-mute">{date}</p>
    </li>
  );
}

function Charge({ label, amount, sub }: { label: string; amount: string; sub: string }) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-mute">{sub}</p>
      </div>
      <p className="font-medium text-ink tabular-nums">{amount}</p>
    </li>
  );
}
