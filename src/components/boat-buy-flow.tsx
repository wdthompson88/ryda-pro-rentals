"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Boat, formatUSD } from "@/lib/boat-data";

type StepKey = "review" | "verify" | "documents" | "fund" | "confirm";

// Funding methods — wire/ACH stay as the default direct paths; the rest
// route the buyer to a partner conversation (we don't underwrite or
// custody outside funds). Pattern borrowed from Pacaso's
// "Co-ownership financing partners" treatment.
type FundingMethod = "wire" | "ach" | "liquidity" | "partner" | "crypto";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "verify", label: "Verify" },
  { key: "documents", label: "Documents" },
  { key: "fund", label: "Fund" },
  { key: "confirm", label: "Confirm" },
];

type Props = {
  boat: Boat;
  initialShares: number;
};

export function BoatBuyFlow({ boat, initialShares }: Props) {
  const [step, setStep] = useState<StepKey>("review");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [kycComplete, setKycComplete] = useState(false);
  const [oaSigned, setOaSigned] = useState(false);
  const [msaSigned, setMsaSigned] = useState(false);
  const [signature, setSignature] = useState("");
  const [fundingMethod, setFundingMethod] = useState<FundingMethod | null>(null);

  const shares = initialShares;
  const totalPrice = boat.pricePerShare * shares;
  // All-in annual contribution: insurance + storage + maintenance + reserves
  // + RYDA service fee, scaled per share. The 12% management fee is bundled
  // into annualOpCost — don't show only that piece as the total.
  const annualContribution = boat.annualOpCost * shares;
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
            href={`/boats/portfolio/${boat.slug.toLowerCase()}`}
            className="text-xs font-medium uppercase tracking-[0.2em] text-mute hover:text-ink"
          >
            ← Cancel and return to {boat.hullId}
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    i < stepIdx
                      ? "bg-marine text-cream"
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
                    className={`h-px flex-1 ${i < stepIdx ? "bg-marine" : "bg-rule"}`}
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
              boat={boat}
              shares={shares}
              totalPrice={totalPrice}
              closingFee={closingFee}
              grandTotal={grandTotal}
              annualContribution={annualContribution}
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
              boat={boat}
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
              boat={boat}
              onBack={() => go("documents")}
              onContinue={() => go("confirm")}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              boat={boat}
              shares={shares}
              grandTotal={grandTotal}
            />
          )}
        </main>

        {/* Sticky summary */}
        <aside className="lg:col-span-4">
          <div className="sticky top-32 rounded-2xl border border-rule bg-surface p-6">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-cream-2">
              <Image
                src={boat.hero}
                alt={`${boat.year} ${boat.name}`}
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className={`object-cover ${boat.flipImage ? "-scale-x-100" : ""}`}
                style={{ objectPosition: boat.imagePosition ?? "center" }}
              />
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-marine">
              {boat.year} · {boat.brand}
            </p>
            <p className="mt-1 font-display text-xl text-ink">{boat.name}</p>
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
              Plus ~{formatUSD(annualContribution)}/year in management fees (paid quarterly to the LLC).
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
  boat,
  shares,
  totalPrice,
  closingFee,
  grandTotal,
  annualContribution,
  termsAccepted,
  setTermsAccepted,
  onContinue,
}: {
  boat: Boat;
  shares: number;
  totalPrice: number;
  closingFee: number;
  grandTotal: number;
  annualContribution: number;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  onContinue: () => void;
}) {
  const sharesPercent = Math.round((shares / boat.shares) * 1000) / 10;
  const usageDays = boat.daysPerYear * shares;
  const usageMiles = (boat.nmPerYear * shares).toLocaleString();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">Step 1 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Review your share
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Confirm what you're buying, what it entitles you to, and what it costs to operate
          before you proceed to verification.
        </p>
      </div>

      <Section title="What you're buying">
        <Bullet label="Boat" value={`${boat.year} ${boat.name}`} />
        <Bullet label="Position" value={`${shares} of ${boat.shares} shares (${sharesPercent}%)`} />
        <Bullet label="Legal entity" value={`Single-purpose Delaware LLC`} />
        <Bullet label="Hailing port" value={boat.market} />
      </Section>

      <Section title="Annual usage entitlement">
        <Bullet label="Cruising days" value={`Up to ${usageDays} days/year`} />
        <Bullet label="Nautical miles" value={`${usageMiles} nm/year`} />
        <Bullet
          label="Caribbean charter"
          value={boat.captainIncluded ? "Eligible (crewed)" : "Not eligible"}
        />
        <Bullet label="Bookings" value="Shared calendar with co-owners. Fair-use rules apply during peak season." />
      </Section>

      <Section title="What it costs">
        <Bullet label="Today (one-time)" value={formatUSD(grandTotal)} bold />
        <Bullet label="—  Share buy-in" value={formatUSD(totalPrice)} />
        <Bullet label="—  Closing & paperwork fee" value={formatUSD(closingFee)} />
        <Bullet
          label={`Ongoing (per share, year)`}
          value={`~${formatUSD(annualContribution)}`}
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
          <li>12-month minimum hold from your closing date before transferring your share.</li>
          <li>The LLC is member-managed — you and your co-owners hold authority over material decisions.</li>
          <li>You'll be added to the boat's insurance policy at closing.</li>
          <li>Any boat modifications, sale, or replacement requires a 75% co-owner vote.</li>
          <li>Co-ownership stakes are not investments and the boat will depreciate over time.</li>
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-surface p-4 text-sm">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 accent-marine"
        />
        <span className="text-ink">
          I understand I'm joining a member-managed Delaware LLC alongside other co-owners;
          that this is not an investment and is not offered for investment purposes; that
          co-ownership shares are illiquid for the first 12 months; and that the boat will
          depreciate over time.
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
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">Step 2 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Verify your identity
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Standard KYC. We use Persona for identity verification — government ID
          and a selfie match. Required to be added to the LLC's insurance policy
          and to drive the boat. RYDA never sees raw documents.
        </p>
      </div>

      {/* KYC */}
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-marine">Identity (KYC)</p>
            <p className="mt-2 font-display text-xl text-ink">Verify your identity</p>
            <p className="mt-2 text-sm text-ink-soft">
              Government-issued ID + selfie match. Powered by Persona. Typically
              takes 2–5 minutes. We also pull a clean recent boating record check.
            </p>
          </div>
          {kycComplete && (
            <span className="shrink-0 rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
              Verified ✓
            </span>
          )}
        </div>

        {!kycComplete && !kycRunning && (
          <button
            type="button"
            onClick={fakeRunKyc}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream hover:bg-marine"
          >
            Start identity verification →
          </button>
        )}

        {kycRunning && (
          <div className="mt-5 flex items-center gap-3 text-sm text-ink-soft">
            <div className="h-3 w-3 animate-pulse rounded-full bg-marine" />
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
  boat,
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
  boat: Boat;
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
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">Step 3 of 5</p>
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
        title={`${boat.name} LLC — Operating Agreement`}
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
        title={`${boat.name} LLC — Management Services Agreement`}
        meta={`12 pages · LLC ↔ RYDA · Your ${shares} share${shares > 1 ? "s" : ""}`}
        summary={[
          `Engages RYDA as the operating service provider for the LLC.`,
          `Your position: ${shares} of ${boat.shares} shares. Buy-in: ${formatUSD(boat.pricePerShare * shares)}.`,
          "Defines RYDA's services: storage, insurance, scheduling, maintenance, member services.",
          "Defines the 12% annual management fee charged to the LLC and paid pro-rata by members.",
          "RYDA is a service provider — not a manager of the LLC. Members retain LLC governance.",
          "Acknowledgment that co-ownership is for personal use, not investment.",
        ]}
        signed={msaSigned}
        onSign={() => setMsaSigned(true)}
      />

      {/* Signature */}
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-marine">E-signature</p>
        <label
          htmlFor="buy-flow-signature"
          className="mt-2 block font-display text-xl text-ink"
        >
          Type your full legal name to sign
        </label>
        <p className="mt-2 text-sm text-ink-soft">
          By typing your name and clicking Continue, you agree this is your legally binding
          electronic signature on both documents above.
        </p>
        <input
          id="buy-flow-signature"
          name="signature"
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Full legal name"
          autoComplete="name"
          required
          aria-required="true"
          className="mt-5 h-12 w-full rounded-xl border border-rule bg-cream-2/40 px-4 font-display text-xl italic text-ink placeholder:text-mute focus:border-marine focus:outline-none focus:ring-2 focus:ring-marine/20"
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
  boat,
  onBack,
  onContinue,
}: {
  grandTotal: number;
  fundingMethod: FundingMethod | null;
  setFundingMethod: (v: FundingMethod | null) => void;
  boat: Boat;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  // Partner / liquidity-line / crypto paths are referral-only at this
  // stage; the user just needs to acknowledge they're starting the
  // partner intro, not actually fund anything live in the buy flow.
  const ready = fundingMethod !== null && confirmedTransfer;

  const confirmCopy: Record<FundingMethod, string> = {
    wire: "I've initiated the wire transfer from my bank with the matching memo.",
    ach: "I've connected my bank and authorized the ACH transfer.",
    liquidity:
      "I've started the draw against my liquidity line and will fund within 5 business days.",
    partner:
      "I'd like RYDA to introduce me to a financing partner before I fund.",
    crypto:
      "I've initiated the crypto transfer through the regulated exchange partner.",
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-marine">Step 4 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Fund your share
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Send {formatUSD(grandTotal)} to the LLC&apos;s escrow account. Funds
          are held until your documents and verifications clear, then released
          to the LLC and your share is recorded in the LLC&apos;s member
          register. Five payment paths — pick what fits.
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
          label="ACH transfer (post-launch)"
          detail="Free, 3–5 business day settlement. Ships shortly after the Miami launch — wire is the only funding option for now."
          selected={fundingMethod === "ach"}
          onSelect={() => setFundingMethod("ach")}
          disabled
        />
        <FundingOption
          method="liquidity"
          label="Liquidity line"
          detail="HELOC, SBLOC, or pledged-asset line through your existing bank. You wire the funds; we hold the share."
          selected={fundingMethod === "liquidity"}
          onSelect={() => setFundingMethod("liquidity")}
        />
        <FundingOption
          method="partner"
          label="Financing partner (referral)"
          detail="We introduce you to a specialty lender. They underwrite; you fund through them. RYDA does not extend credit."
          selected={fundingMethod === "partner"}
          onSelect={() => setFundingMethod("partner")}
        />
        <FundingOption
          method="crypto"
          label="Crypto (BTC, ETH, USDC)"
          detail="Routed through a regulated US exchange partner. Conversion to USD on receipt; LLC escrow always holds USD."
          selected={fundingMethod === "crypto"}
          onSelect={() => setFundingMethod("crypto")}
        />
      </div>

      {fundingMethod === "wire" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-marine">Wire instructions</p>
          <p className="mt-2 font-display text-xl text-ink">
            {boat.name} LLC — Escrow Account
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            For your security, RYDA never displays escrow bank details in the
            browser. Once you submit this step, we&apos;ll email the verified
            wire instructions for {boat.name} LLC&apos;s escrow account to
            your verified inbox, along with your unique reference code and
            the exact amount of {formatUSD(grandTotal)}.
          </p>
          <p className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-4 text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Important:</strong> always confirm
            wire details against the email. RYDA will never ask you to wire
            funds to a different bank or account by phone or text.
          </p>
        </div>
      )}

      {fundingMethod === "ach" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-marine">ACH transfer</p>
          <p className="mt-2 font-display text-xl text-ink">Bank connection ships post-launch</p>
          <p className="mt-2 text-sm text-ink-soft">
            ACH (via Plaid) ships shortly after the Miami launch. For now,
            please complete your buy-in by wire transfer — switch the option
            above. Wires settle in 1–2 business days.
          </p>
        </div>
      )}

      {fundingMethod === "liquidity" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-marine">
            Liquidity line
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            Draw from your existing line, wire to the LLC.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Common paths: a HELOC against your primary residence, a
            securities-backed line of credit (SBLOC) against your brokerage
            account, or a pledged-asset line at a private bank. Most members
            who go this route have the line open before they reach this step.
            RYDA does not arrange the line; your bank or wealth advisor does.
          </p>
          <p className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-4 text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Note:</strong> SBLOC and pledged-asset
            lines are typically the fastest path here. We&apos;ll email
            wire instructions on submit so you can fund directly from the line.
          </p>
        </div>
      )}

      {fundingMethod === "partner" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-marine">
            Financing partner (referral)
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            We&apos;ll introduce you to a specialty lender.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            For members who&apos;d rather not use cash or a liquidity line, we
            maintain a short list of independent lenders who underwrite
            co-ownership share purchases. They&apos;ll talk to you directly
            about rate, term, down payment, and approval. RYDA receives no
            fee from the lender; the introduction is at-cost.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-ink-soft">
            <li>• Submit means: we&apos;ll email a warm intro within 1 business day.</li>
            <li>• Typical close: 5–10 business days from intro.</li>
            <li>• Approval is between you and the lender.</li>
          </ul>
          <p className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-4 text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">No financial advice.</strong> RYDA
            doesn&apos;t recommend whether to finance vs. fund in cash. Talk
            to your accountant or wealth advisor.
          </p>
        </div>
      )}

      {fundingMethod === "crypto" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-marine">
            Crypto
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            BTC, ETH, or USDC — settled in USD to escrow.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Crypto buy-ins route through a regulated US exchange partner with
            full KYC/AML. You send crypto from your wallet; the partner
            converts to USD on receipt and wires the LLC&apos;s escrow account.
            The LLC always holds USD — no crypto sits on RYDA&apos;s balance
            sheet or the LLC&apos;s.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-ink-soft">
            <li>• Conversion at spot at the time of confirmation.</li>
            <li>• Network + exchange fees are paid by the buyer.</li>
            <li>• Confirmation typically &lt; 30 minutes for BTC/ETH; minutes for USDC.</li>
          </ul>
          <p className="mt-5 rounded-xl border border-rule bg-cream-2/40 p-4 text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Heads up:</strong> spot pricing
            volatility means the USD amount delivered to escrow may differ
            slightly from the quoted price; we true up by wire if there&apos;s
            a shortfall.
          </p>
        </div>
      )}

      {fundingMethod && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-surface p-4 text-sm">
          <input
            type="checkbox"
            checked={confirmedTransfer}
            onChange={(e) => setConfirmedTransfer(e.target.checked)}
            className="mt-1 h-4 w-4 accent-marine"
          />
          <span className="text-ink">{confirmCopy[fundingMethod]}</span>
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
  boat,
  shares,
  grandTotal,
}: {
  boat: Boat;
  shares: number;
  grandTotal: number;
}) {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-2 text-3xl text-ink">
          ✓
        </div>
        <h1 className="mt-6 font-display text-4xl font-light text-ink sm:text-5xl">
          Welcome to RYDA.
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Your co-ownership is in process. We'll send a confirmation email and a copy of your
          signed documents within the next few minutes.
        </p>
      </div>

      <div className="rounded-2xl border border-rule bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-marine">Your co-ownership</p>
        <dl className="mt-4 space-y-3 text-sm">
          <KvRow label="Boat" value={`${boat.year} ${boat.name}`} />
          <KvRow label="Position" value={`${shares} of ${boat.shares} shares`} />
          <KvRow label="Amount" value={formatUSD(grandTotal)} />
          <KvRow label="LLC" value={`${boat.name} LLC, Delaware (member-managed)`} />
          <KvRow label="Status" value="Pending — funds & verification clearing" />
        </dl>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-mute">What happens next</p>
        <ol className="mt-4 space-y-3">
          <Timeline
            n="01"
            title="Verification clears (typically 24h)"
            body="Persona returns identity verification and driving-record check."
          />
          <Timeline
            n="02"
            title="Funds settle (1–5 business days)"
            body="Wires same-day; ACH 3–5 business days. We'll email when funds clear."
          />
          <Timeline
            n="03"
            title="Documents countersigned"
            body="The LLC's existing co-owners (acting collectively, per the Operating Agreement) counter-sign your addition. The Management Services Agreement is executed between the LLC's members and RYDA — RYDA does not bind the LLC unilaterally."
          />
          <Timeline
            n="04"
            title="Share recorded; calendar opens"
            body="Your share is officially registered with the LLC. The booking calendar opens for your first reservation."
          />
          <Timeline
            n="05"
            title="Boat walkthrough"
            body="A 30-minute walkthrough on the boat (controls, etiquette, condition baseline) before your first drive."
          />
        </ol>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/portfolio"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-marine"
        >
          Go to my portfolio →
        </Link>
        <Link
          href="/boats/portfolio"
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
      <p className="text-xs font-medium uppercase tracking-wider text-marine">{title}</p>
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
        className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-marine disabled:cursor-not-allowed disabled:opacity-40"
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
          <span className="shrink-0 rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
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
      <p className="mt-5 text-xs text-mute">
        The full counsel-prepared document is sent to your verified email
        before signing — your e-signature here confirms you've reviewed both
        the summary above and the long-form version.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!signed && (
          <button
            type="button"
            onClick={onSign}
            className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-marine"
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
  disabled = false,
}: {
  method: FundingMethod;
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const tagLabel: Record<FundingMethod, string> = {
    wire: "Wire",
    ach: "ACH",
    liquidity: "Liquidity",
    partner: "Partner",
    crypto: "Crypto",
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-colors ${
        selected
          ? "border-marine bg-marine/5"
          : disabled
            ? "border-rule bg-surface opacity-60 cursor-not-allowed"
            : "border-rule bg-surface hover:border-ink-soft"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-marine">
        {tagLabel[method]}
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
      <span className="font-display text-sm text-marine">{n}</span>
      <div>
        <p className="font-display text-base text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

// Deterministic mock account number suffix — same boat always gets the
// same fake account number so it looks consistent across reloads.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
