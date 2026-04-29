import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { formatUSD } from "@/lib/market-data";

export async function generateStaticParams() {
  return [{ id: "PUR-00428" }];
}

export const metadata = { title: "Co-Ownership Buy-In — RYDA" };

const STAGES = [
  { name: "Eligibility", status: "done" },
  { name: "Documents", status: "done" },
  { name: "Payment", status: "current" },
  { name: "LLC amendment", status: "pending" },
  { name: "Welcome", status: "pending" },
];

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
          <Link
            href="/account"
            className="text-xs font-medium uppercase tracking-[0.2em] text-red hover:text-red-deep"
          >
            ← My account
          </Link>

          <p className="mt-6 text-xs text-mute">Buy-in {id}</p>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            Ferrari 296 GTB
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            1 seat · {formatUSD(56_667)} + {formatUSD(2_834)} acquisition fee
          </p>

          <div className="mt-3 inline-block rounded-full bg-red/10 px-3 py-1 text-xs font-medium text-red">
            Pending wire transfer · 1–3 business days
          </div>
        </div>
      </section>

      {/* Stage tracker */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Purchase progress</h2>
          <ol className="mt-8 space-y-4">
            {STAGES.map((s, i) => (
              <li
                key={s.name}
                className={`flex items-center gap-4 rounded-xl border p-5 ${
                  s.status === "current"
                    ? "border-red bg-red/5"
                    : s.status === "done"
                    ? "border-rule bg-surface"
                    : "border-rule bg-cream/40"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    s.status === "done"
                      ? "bg-[#00C805] text-cream"
                      : s.status === "current"
                      ? "border-2 border-red bg-cream text-red"
                      : "border border-rule bg-cream text-mute"
                  }`}
                >
                  {s.status === "done" ? "✓" : i + 1}
                </span>
                <div className="flex-1">
                  <p
                    className={`font-display text-base ${
                      s.status === "pending" ? "text-mute" : "text-ink"
                    }`}
                  >
                    {s.name}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {s.name === "Eligibility" && "KYC + driving-record verification complete"}
                    {s.name === "Documents" && "Co-Owner Agreement, LLC Operating Agreement, Management Services Agreement signed"}
                    {s.name === "Payment" && "Wire transfer initiated · awaiting bank confirmation"}
                    {s.name === "LLC amendment" && "RYDA legal will amend the LLC operating agreement"}
                    {s.name === "Welcome" && "Membership certificate + first booking access"}
                  </p>
                </div>
                {s.status === "done" && (
                  <span className="text-xs text-mute">Apr 27</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Wire instructions */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-2xl text-ink">Wire instructions</h2>
          <p className="mt-2 text-sm text-ink-soft">
            For your security, RYDA never displays escrow bank details in
            the browser. We've emailed the verified wire instructions —
            including your unique reference code — to the address on file.
            Always confirm wire details against the email before sending.
          </p>
          <div className="mt-6 rounded-2xl border border-rule bg-cream-2/40 p-6 text-sm text-ink-soft">
            <p>
              Total to wire:{" "}
              <span className="font-display text-lg text-ink tabular-nums">
                {formatUSD(59_501)}
              </span>
            </p>
            <p className="mt-2 text-xs text-mute">
              Reference code is unique to this purchase. Wires received
              without a matching reference are returned.
            </p>
          </div>
        </div>
      </section>

      {/* What happens next */}
      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          <h2 className="font-display text-2xl text-ink">What happens next</h2>
          <ul className="mt-6 space-y-4 text-sm">
            <Step
              n="1"
              t="Wire clears (1–3 business days)"
              d="Once your bank sends the wire, our bank confirms receipt within 1–3 business days."
            />
            <Step
              n="2"
              t="LLC amendment (1 business day)"
              d="RYDA legal amends the Ferrari 296 GTB LLC operating agreement to add you as a member."
            />
            <Step
              n="3"
              t="Member register entry"
              d="You'll receive your signed Operating Agreement and your entry in the LLC's member register by email. The vehicle appears in /my-cars."
            />
            <Step
              n="4"
              t="First booking unlocked"
              d="Once the certificate is issued, you can book your first session immediately."
            />
          </ul>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink hover:border-ink"
          >
            Question about this purchase?
          </Link>
        </div>
      </section>

      <section className="bg-ink py-10 text-center text-cream/60">
        <p className="text-xs">
          Sample purchase tracker. Live wire-confirmation logic ships at Miami launch.
        </p>
      </section>
    </>
  );
}

function Field({
  k,
  v,
  copy,
  emphasis,
}: {
  k: string;
  v: string;
  copy?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3 last:border-b-0">
      <dt className="text-xs uppercase tracking-wider text-mute">{k}</dt>
      <dd className="flex items-center gap-3">
        <span
          className={`tabular-nums ${
            emphasis ? "font-display text-lg text-ink" : "text-sm text-ink"
          }`}
        >
          {v}
        </span>
        {copy && (
          <button className="text-xs text-red hover:text-red-deep">Copy</button>
        )}
      </dd>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream font-display text-sm text-red">
        {n}
      </span>
      <div>
        <p className="font-medium text-ink">{t}</p>
        <p className="mt-0.5 text-ink-soft">{d}</p>
      </div>
    </li>
  );
}
