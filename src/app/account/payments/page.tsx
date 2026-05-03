"use client";

// /account/payments — payment-method management. Stripe Customer
// Portal is the right home for this once members have transacted; we
// surface a one-click portal-open CTA + a placeholder list for now.
//
// We deliberately don't render saved-card numbers in our own UI. The
// Stripe Customer Portal handles add/remove/default + receipt PDFs +
// dispute initiation, all PCI-DSS compliant out of the box. The
// alternative — building card UI ourselves — burns engineering hours
// and adds compliance scope for no member benefit.

import Link from "next/link";

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Payments
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Cards, banks, and receipts.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Saved payment methods, default card, and your full receipt history
          live in the Stripe Customer Portal. We open it as a member-scoped
          session — no separate password.
        </p>
      </header>

      <Card title="Saved payment methods">
        <ListRow
          icon="$"
          label="Visa ending 4729"
          sub="Default · expires 09/28"
          status="Active"
        />
        <ListRow
          icon="🏦"
          label="Bank ACH · Chase ••5512"
          sub="Used for management fees"
          status="Active"
        />
        <ListRow
          icon="$"
          label="Mastercard ending 1109"
          sub="Backup"
          status="Active"
        />
        <button
          type="button"
          disabled
          className={`${btnSecondary} mt-4 cursor-not-allowed opacity-60`}
        >
          Open Stripe Customer Portal — wires at first transaction
        </button>
        <p className="mt-2 text-[11px] text-mute">
          The portal session opens at billing.stripe.com via a one-time link
          we generate from the server (no separate password). Add / remove /
          set-default + receipt downloads happen there.
        </p>
      </Card>

      <Card title="Recent receipts" hint="Last 5 charges. Full history in the portal.">
        <ListRow icon="●" label="Q2 management fee · Ferrari 296" sub="Apr 1, 2026" status="$3,540" />
        <ListRow icon="●" label="Q2 management fee · McLaren 750S" sub="Apr 1, 2026" status="$3,450" />
        <ListRow icon="●" label="Annual membership · RYDA Blue" sub="Apr 27, 2026" status="$500" />
        <ListRow icon="●" label="Co-ownership share · McLaren 750S" sub="Apr 13, 2026" status="$32,500" />
        <ListRow icon="●" label="Co-ownership share · Ferrari 296" sub="Apr 13, 2026" status="$28,000" />
      </Card>

      <Card title="Tax documents" hint="K-1s and 1099-INTs from each LLC you co-own. Generated annually.">
        <p className="text-sm text-mute">
          No tax documents yet — your first K-1 ships in early 2027 (covering
          2026). You'll get an email when it's available; downloads from{" "}
          <Link href="/account/documents" className="text-red hover:text-red-deep">
            Documents
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}

const btnSecondary =
  "inline-flex h-11 items-center justify-center rounded-full border border-rule bg-cream-2 px-6 text-sm font-medium text-ink transition-colors hover:border-red hover:text-red";

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-rule bg-surface p-6 sm:p-8">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {hint && <p className="mt-1 max-w-xl text-xs text-mute">{hint}</p>}
      <div className="mt-5 space-y-1">{children}</div>
    </section>
  );
}

function ListRow({
  icon,
  label,
  sub,
  status,
}: {
  icon: string;
  label: string;
  sub: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-rule py-3 last:border-b-0">
      <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-2 text-sm text-ink">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-mute">{sub}</p>
      </div>
      <p className="text-sm tabular-nums text-ink">{status}</p>
    </div>
  );
}
