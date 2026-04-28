"use client";

import { useState } from "react";
import Link from "next/link";
import { Vehicle, formatUSD } from "@/lib/market-data";

type StepKey = "review" | "verify" | "documents" | "fund" | "confirm";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "verify", label: "Verify" },
  { key: "documents", label: "Documents" },
  { key: "fund", label: "Fund" },
  { key: "confirm", label: "Confirm" },
];

type Props = {
  vehicle: Vehicle;
  initialShares: number;
};

export function BuyFlow({ vehicle, initialShares }: Props) {
  const [step, setStep] = useState<StepKey>("review");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [kycComplete, setKycComplete] = useState(false);
  const [oaSigned, setOaSigned] = useState(false);
  const [msaSigned, setMsaSigned] = useState(false);
  const [signature, setSignature] = useState("");
  const [fundingMethod, setFundingMethod] = useState<"wire" | "ach" | null>(null);

  const shares = initialShares;
  const totalPrice = vehicle.pricePerShare * shares;
  const annualMgmtFee = (vehicle.fullPrice * 0.12 * shares) / vehicle.shares;
  const closingFee = 1500;
  const grandTotal = totalPrice + closingFee;

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  function go(next: StepKey) {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="bg-cream">
      {/* Progress header */}
      <div className="border-b border-rule bg-cream/90 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-5 sm:px-10">
          <Link
            href={`/markets/${vehicle.symbol.toLowerCase()}`}
            className="text-xs font-medium uppercase tracking-[0.2em] text-mute hover:text-ink"
          >
            ← Cancel and return to {vehicle.ticker}
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    i < stepIdx
                      ? "bg-red text-cream"
                      : i === stepIdx
                      ? "bg-ink text-cream"
                      : "border border-rule bg-surface text-mute"
                  }`}
                >
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span
                  className={`hidden sm:inline ${
                    i === stepIdx ? "font-medium text-ink" : "text-mute"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 ${i < stepIdx ? "bg-red" : "bg-rule"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-12 sm:px-10 lg:grid-cols-12">
        {/* Main */}
        <main className="lg:col-span-8">
          {step === "review" && (
            <ReviewStep
              vehicle={vehicle}
              shares={shares}
              totalPrice={totalPrice}
              closingFee={closingFee}
              grandTotal={grandTotal}
              annualMgmtFee={annualMgmtFee}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              onContinue={() => go("verify")}
            />
          )}
          {step === "verify" && (
            <VerifyStep
              kycComplete={kycComplete}
              setKycComplete={setKycComplete}
              onBack={() => go("review")}
              onContinue={() => go("documents")}
            />
          )}
          {step === "documents" && (
            <DocumentsStep
              vehicle={vehicle}
              shares={shares}
              oaSigned={oaSigned}
              setOaSigned={setOaSigned}
              msaSigned={msaSigned}
              setMsaSigned={setMsaSigned}
              signature={signature}
              setSignature={setSignature}
              onBack={() => go("verify")}
              onContinue={() => go("fund")}
            />
          )}
          {step === "fund" && (
            <FundStep
              grandTotal={grandTotal}
              fundingMethod={fundingMethod}
              setFundingMethod={setFundingMethod}
              vehicle={vehicle}
              onBack={() => go("documents")}
              onContinue={() => go("confirm")}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              vehicle={vehicle}
              shares={shares}
              grandTotal={grandTotal}
            />
          )}
        </main>

        {/* Sticky summary */}
        <aside className="lg:col-span-4">
          <div className="sticky top-32 rounded-2xl border border-rule bg-surface p-6">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-cream-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vehicle.hero}
                alt={vehicle.name}
                className={`h-full w-full object-cover ${vehicle.flipImage ? "-scale-x-100" : ""}`}
                style={{ objectPosition: vehicle.imagePosition ?? "center" }}
              />
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-red">
              {vehicle.year} · {vehicle.brand}
            </p>
            <p className="mt-1 font-display text-xl text-ink">{vehicle.name}</p>
            <dl className="mt-5 space-y-2 border-t border-rule pt-5 text-sm">
              <SummaryRow label={`${shares} share${shares > 1 ? "s" : ""}`} value={formatUSD(totalPrice)} />
              <SummaryRow label="Closing fee" value={formatUSD(closingFee)} />
              <div className="border-t border-rule pt-3">
                <SummaryRow
                  label={<span className="font-display text-base text-ink">Total today</span>}
                  value={
                    <span className="font-display text-lg text-ink tabular-nums">
                      {formatUSD(grandTotal)}
                    </span>
                  }
                />
              </div>
            </dl>
            <p className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-3 text-[11px] leading-relaxed text-mute">
              Plus ~{formatUSD(annualMgmtFee)}/year in management fees (paid quarterly to the LLC).
              Locked in at signing for the first year.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Step 1: Review ──────────────────────────────────────────────

function ReviewStep({
  vehicle,
  shares,
  totalPrice,
  closingFee,
  grandTotal,
  annualMgmtFee,
  termsAccepted,
  setTermsAccepted,
  onContinue,
}: {
  vehicle: Vehicle;
  shares: number;
  totalPrice: number;
  closingFee: number;
  grandTotal: number;
  annualMgmtFee: number;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  onContinue: () => void;
}) {
  const sharesPercent = Math.round((shares / vehicle.shares) * 1000) / 10;
  const usageDays = Math.round(50 * shares);
  const usageMiles = (4000 * shares).toLocaleString();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Step 1 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Review your share
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Confirm what you're buying, what it entitles you to, and what it costs to operate
          before you proceed to verification.
        </p>
      </div>

      <Section title="What you're buying">
        <Bullet label="Vehicle" value={`${vehicle.year} ${vehicle.name}`} />
        <Bullet label="Position" value={`${shares} of ${vehicle.shares} shares (${sharesPercent}%)`} />
        <Bullet label="Legal entity" value={`Single-purpose Delaware LLC`} />
        <Bullet label="Stored in" value={vehicle.market} />
      </Section>

      <Section title="Annual usage entitlement">
        <Bullet label="Driving days" value={`Up to ${usageDays} days/year`} />
        <Bullet label="Mileage" value={`${usageMiles} miles/year`} />
        <Bullet
          label="Track day"
          value={vehicle.trackEligible ? "Eligible (rider per event)" : "Not eligible"}
        />
        <Bullet label="Bookings" value="Shared calendar with co-owners. Fair-use rules apply during peak season." />
      </Section>

      <Section title="What it costs">
        <Bullet label="Today (one-time)" value={formatUSD(grandTotal)} bold />
        <Bullet label="—  Share price" value={formatUSD(totalPrice)} />
        <Bullet label="—  Closing & paperwork fee" value={formatUSD(closingFee)} />
        <Bullet
          label={`Ongoing (per share, year)`}
          value={`~${formatUSD(annualMgmtFee)}`}
          bold
        />
        <Bullet
          label="—  What it covers"
          value="Insurance, storage, scheduled maintenance, reserves, registration."
        />
      </Section>

      <div className="rounded-2xl border border-rule bg-cream-2/40 p-5 text-sm">
        <p className="font-medium text-ink">A few things to know</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
          <li>12-month minimum hold from your closing date before selling on the secondary market.</li>
          <li>Shares are LLC membership interests offered under Reg D 506(c) — accredited investors only.</li>
          <li>You'll be added to the vehicle's insurance policy at closing.</li>
          <li>Any vehicle modifications, sale, or replacement requires a 75% co-owner vote.</li>
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-surface p-4 text-sm">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 accent-red"
        />
        <span className="text-ink">
          I understand I'm buying an LLC membership interest, not a registered security; that
          shares are illiquid for the first 12 months; and that vehicle valuations can move down
          as well as up.
        </span>
      </label>

      <ButtonRow
        rightLabel="Continue to verification"
        rightDisabled={!termsAccepted}
        onRight={onContinue}
      />
    </div>
  );
}

// ── Step 2: Verify ──────────────────────────────────────────────

function VerifyStep({
  kycComplete,
  setKycComplete,
  onBack,
  onContinue,
}: {
  kycComplete: boolean;
  setKycComplete: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [kycRunning, setKycRunning] = useState(false);

  function fakeRunKyc() {
    setKycRunning(true);
    setTimeout(() => {
      setKycRunning(false);
      setKycComplete(true);
    }, 2200);
  }

  const ready = kycComplete;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Step 2 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Verify your identity
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Standard KYC. We use Persona for identity verification — government ID
          and a selfie match. Required to be added to the LLC's insurance policy
          and to drive the vehicle. RYDA never sees raw documents.
        </p>
      </div>

      {/* KYC */}
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-red">Identity (KYC)</p>
            <p className="mt-2 font-display text-xl text-ink">Verify your identity</p>
            <p className="mt-2 text-sm text-ink-soft">
              Government-issued ID + selfie match. Powered by Persona. Typically
              takes 2–5 minutes. We also pull a clean recent driving record check.
            </p>
          </div>
          {kycComplete && (
            <span className="shrink-0 rounded-full bg-[#00C805]/15 px-3 py-1 text-xs font-medium text-[#00A300]">
              Verified ✓
            </span>
          )}
        </div>

        {!kycComplete && !kycRunning && (
          <button
            type="button"
            onClick={fakeRunKyc}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-red"
          >
            Start identity verification →
          </button>
        )}

        {kycRunning && (
          <div className="mt-5 flex items-center gap-3 text-sm text-ink-soft">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red" />
            <span>Persona is verifying… typically 5–10 seconds.</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-rule bg-cream-2/40 p-5 text-sm">
        <p className="font-medium text-ink">A note on what this isn't.</p>
        <p className="mt-2 text-ink-soft">
          RYDA is a luxury access platform, not an investment product. We do
          not require accredited-investor verification. Co-ownership stakes
          are not registered securities and are not offered for investment
          purposes — you're buying the right to use a real car you co-own.
        </p>
      </div>

      <ButtonRow
        leftLabel="Back"
        onLeft={onBack}
        rightLabel="Continue to documents"
        rightDisabled={!ready}
        onRight={onContinue}
      />
    </div>
  );
}

// ── Step 3: Documents ──────────────────────────────────────────────

function DocumentsStep({
  vehicle,
  shares,
  oaSigned,
  setOaSigned,
  msaSigned,
  setMsaSigned,
  signature,
  setSignature,
  onBack,
  onContinue,
}: {
  vehicle: Vehicle;
  shares: number;
  oaSigned: boolean;
  setOaSigned: (v: boolean) => void;
  msaSigned: boolean;
  setMsaSigned: (v: boolean) => void;
  signature: string;
  setSignature: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const ready = oaSigned && msaSigned && signature.trim().length >= 4;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Step 3 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Sign your documents
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Two documents: the LLC Operating Agreement (governs how you and your
          co-owners run the LLC together) and the Management Services Agreement
          (the contract between the LLC and RYDA for operations). Both via
          secure e-signature.
        </p>
      </div>

      <DocCard
        title={`${vehicle.name} LLC — Operating Agreement`}
        meta="34 pages · Reviewed by counsel · Member-managed structure"
        summary={[
          "The LLC is member-managed — you and your co-owners hold authority over material decisions.",
          "Governs decision-making (75% supermajority for sale, replacement, modifications).",
          "Defines fair-use rules during peak and off-season.",
          "Sets remedies if a co-owner stops paying (30-day cure, then forced transfer).",
          "12-month minimum hold; member-to-member transfer mechanics; 3% transfer fee.",
          "Mandatory mediation, then arbitration in Wilmington, Delaware.",
        ]}
        signed={oaSigned}
        onSign={() => setOaSigned(true)}
      />

      <DocCard
        title={`${vehicle.name} LLC — Management Services Agreement`}
        meta={`12 pages · LLC ↔ RYDA · Your ${shares} seat${shares > 1 ? "s" : ""}`}
        summary={[
          `Engages RYDA as the operating service provider for the LLC.`,
          `Your position: ${shares} of ${vehicle.shares} seats. Buy-in: ${formatUSD(vehicle.pricePerShare * shares)}.`,
          "Defines RYDA's services: storage, insurance, scheduling, maintenance, concierge, member services.",
          "Defines the 12% annual management fee charged to the LLC and paid pro-rata by members.",
          "RYDA is a service provider — not a manager of the LLC. Members retain LLC governance.",
          "Acknowledgment that co-ownership is for personal use, not investment.",
        ]}
        signed={msaSigned}
        onSign={() => setMsaSigned(true)}
      />

      {/* Signature */}
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-red">E-signature</p>
        <p className="mt-2 font-display text-xl text-ink">Type your full legal name to sign</p>
        <p className="mt-2 text-sm text-ink-soft">
          By typing your name and clicking Continue, you agree this is your legally binding
          electronic signature on both documents above.
        </p>
        <input
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Full legal name"
          className="mt-5 h-12 w-full rounded-xl border border-rule bg-cream-2/40 px-4 font-display text-xl italic text-ink placeholder:text-mute focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20"
        />
      </div>

      <ButtonRow
        leftLabel="Back"
        onLeft={onBack}
        rightLabel="Continue to funding"
        rightDisabled={!ready}
        onRight={onContinue}
      />
    </div>
  );
}

// ── Step 4: Fund ──────────────────────────────────────────────

function FundStep({
  grandTotal,
  fundingMethod,
  setFundingMethod,
  vehicle,
  onBack,
  onContinue,
}: {
  grandTotal: number;
  fundingMethod: "wire" | "ach" | null;
  setFundingMethod: (v: "wire" | "ach" | null) => void;
  vehicle: Vehicle;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const ready = fundingMethod !== null && confirmedTransfer;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">Step 4 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Fund your share
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Send {formatUSD(grandTotal)} to the LLC's escrow account. Funds are held until your
          documents and verifications clear, then released to the LLC and your share is recorded.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FundingOption
          method="wire"
          label="Wire transfer"
          detail="Fastest. Same-day or next-day settlement. Recommended for amounts above $50K."
          selected={fundingMethod === "wire"}
          onSelect={() => setFundingMethod("wire")}
        />
        <FundingOption
          method="ach"
          label="ACH transfer"
          detail="Free. 3–5 business day settlement. Recommended for amounts under $50K."
          selected={fundingMethod === "ach"}
          onSelect={() => setFundingMethod("ach")}
        />
      </div>

      {fundingMethod === "wire" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-red">Wire instructions</p>
          <p className="mt-2 font-display text-xl text-ink">
            {vehicle.name} LLC — Escrow Account
          </p>
          <dl className="mt-5 space-y-3 border-t border-rule pt-5 text-sm">
            <KvRow label="Bank" value="JPMorgan Chase, N.A." />
            <KvRow label="Bank address" value="270 Park Ave, New York, NY 10017" />
            <KvRow label="ABA / Routing" value="021000021" mono />
            <KvRow
              label="Account number"
              value={`9874-${Math.abs(hashCode(vehicle.symbol)).toString().padStart(6, "0").slice(0, 6)}`}
              mono
            />
            <KvRow label="Beneficiary" value={`${vehicle.name} LLC, Delaware`} />
            <KvRow
              label="Reference / memo"
              value={`Subscription · ${vehicle.symbol} · [your name]`}
              mono
            />
            <KvRow label="Amount" value={formatUSD(grandTotal)} mono />
          </dl>
          <p className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-4 text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Important:</strong> include your full legal name in the
            wire memo so we can match the transfer to your subscription. Wires received without a
            matching memo are returned.
          </p>
        </div>
      )}

      {fundingMethod === "ach" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-red">ACH transfer</p>
          <p className="mt-2 font-display text-xl text-ink">Connect your bank</p>
          <p className="mt-2 text-sm text-ink-soft">
            Securely link your bank account through Plaid. Once linked, we initiate the transfer
            and notify you when it settles.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-red"
          >
            Connect with Plaid →
          </button>
          <p className="mt-3 text-xs text-mute">
            Plaid integration is wired client-side; the actual handoff completes once a bank is
            linked.
          </p>
        </div>
      )}

      {fundingMethod && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-surface p-4 text-sm">
          <input
            type="checkbox"
            checked={confirmedTransfer}
            onChange={(e) => setConfirmedTransfer(e.target.checked)}
            className="mt-1 h-4 w-4 accent-red"
          />
          <span className="text-ink">
            {fundingMethod === "wire"
              ? "I've initiated the wire transfer from my bank with the matching memo."
              : "I've connected my bank and authorized the ACH transfer."}
          </span>
        </label>
      )}

      <ButtonRow
        leftLabel="Back"
        onLeft={onBack}
        rightLabel="Submit"
        rightDisabled={!ready}
        onRight={onContinue}
      />
    </div>
  );
}

// ── Step 5: Confirm ──────────────────────────────────────────────

function ConfirmStep({
  vehicle,
  shares,
  grandTotal,
}: {
  vehicle: Vehicle;
  shares: number;
  grandTotal: number;
}) {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00C805]/15 text-3xl text-[#00A300]">
          ✓
        </div>
        <h1 className="mt-6 font-display text-4xl font-light text-ink sm:text-5xl">
          Welcome to RYDA.
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Your subscription is in. We'll send a confirmation email and a copy of your signed
          documents within the next few minutes.
        </p>
      </div>

      <div className="rounded-2xl border border-rule bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-red">Subscription</p>
        <dl className="mt-4 space-y-3 text-sm">
          <KvRow label="Vehicle" value={`${vehicle.year} ${vehicle.name}`} />
          <KvRow label="Position" value={`${shares} of ${vehicle.shares} shares`} />
          <KvRow label="Amount" value={formatUSD(grandTotal)} />
          <KvRow label="LLC" value={`${vehicle.name} LLC, Delaware`} />
          <KvRow label="Status" value="Pending — funds & verifications clearing" />
        </dl>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-mute">What happens next</p>
        <ol className="mt-4 space-y-3">
          <Timeline
            n="01"
            title="Verifications clear (typically 24h)"
            body="Persona returns identity verification, accreditation evidence is reviewed."
          />
          <Timeline
            n="02"
            title="Funds settle (1–5 business days)"
            body="Wires same-day; ACH 3–5 business days. We'll email when funds clear."
          />
          <Timeline
            n="03"
            title="Documents countersigned"
            body="RYDA's manager and the LLC counter-sign your Operating Agreement and Subscription Agreement."
          />
          <Timeline
            n="04"
            title="Share recorded; calendar opens"
            body="Your share is officially registered with the LLC. The booking calendar opens for your first reservation."
          />
          <Timeline
            n="05"
            title="Vehicle walkthrough"
            body="A 30-minute walkthrough on the vehicle (controls, etiquette, condition baseline) before your first drive."
          />
        </ol>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/portfolio"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red"
        >
          Go to my portfolio →
        </Link>
        <Link
          href="/markets"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
        >
          Back to markets
        </Link>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-red">{title}</p>
      <dl className="mt-4 space-y-3 text-sm">{children}</dl>
    </div>
  );
}

function Bullet({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className={`text-mute ${bold ? "font-medium text-ink-soft" : ""}`}>{label}</dt>
      <dd className={`tabular-nums text-ink sm:text-right ${bold ? "font-display text-base" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function KvRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-mute">{label}</dt>
      <dd
        className={`text-ink sm:text-right ${
          mono ? "font-mono text-[13px] tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ButtonRow({
  leftLabel,
  onLeft,
  rightLabel,
  rightDisabled,
  onRight,
}: {
  leftLabel?: string;
  onLeft?: () => void;
  rightLabel: string;
  rightDisabled?: boolean;
  onRight: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
      {leftLabel ? (
        <button
          type="button"
          onClick={onLeft}
          className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
        >
          ← {leftLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onRight}
        disabled={rightDisabled}
        className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-red disabled:cursor-not-allowed disabled:opacity-40"
      >
        {rightLabel} →
      </button>
    </div>
  );
}

function DocCard({
  title,
  meta,
  summary,
  signed,
  onSign,
}: {
  title: string;
  meta: string;
  summary: string[];
  signed: boolean;
  onSign: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl text-ink">{title}</p>
          <p className="mt-1 text-xs text-mute">{meta}</p>
        </div>
        {signed && (
          <span className="shrink-0 rounded-full bg-[#00C805]/15 px-3 py-1 text-xs font-medium text-[#00A300]">
            Reviewed ✓
          </span>
        )}
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-mute">
        Two-page summary
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
        {summary.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-full border border-rule px-5 text-sm font-medium text-ink hover:border-ink"
        >
          Read the full document
        </button>
        {!signed && (
          <button
            type="button"
            onClick={onSign}
            className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-red"
          >
            I've reviewed
          </button>
        )}
      </div>
    </div>
  );
}

function FundingOption({
  method,
  label,
  detail,
  selected,
  onSelect,
}: {
  method: "wire" | "ach";
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-colors ${
        selected ? "border-red bg-red/5" : "border-rule bg-surface hover:border-ink-soft"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-red">
        {method === "wire" ? "Wire" : "ACH"}
      </span>
      <span className="font-display text-lg text-ink">{label}</span>
      <span className="text-sm text-ink-soft">{detail}</span>
    </button>
  );
}

function Timeline({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5 rounded-xl border border-rule bg-surface p-4">
      <span className="font-display text-sm text-red">{n}</span>
      <div>
        <p className="font-display text-base text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

// Deterministic mock account number suffix — same vehicle always gets the
// same fake account number so it looks consistent across reloads.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
