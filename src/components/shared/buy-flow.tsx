"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatUSD, type Vehicle } from "@/lib/market-data";
import { type Boat } from "@/lib/boat-data";
import { authedFetch } from "@/lib/api-fetch";
import { ACQUISITION_FEE_PCT, computeFees } from "@/lib/fees";

type StepKey = "review" | "verify" | "documents" | "fund" | "confirm";

// Funding methods. "card" and "ach" route through Stripe Checkout
// (the only difference is which payment_method_types Stripe surfaces);
// "wire" stays as instructional copy with emailed details; "crypto"
// is referral-only (regulated US exchange partner); "liquidity" is a
// self-arranged HELOC/SBLOC/pledged-asset line that the member uses
// to fund a wire; "finance" is a referral to an independent lender
// who underwrites a co-ownership share loan. RYDA does not extend
// credit on either path.
type FundingMethod = "ach" | "wire" | "card" | "crypto" | "liquidity" | "finance";

type BuyAsset = Vehicle | Boat;

export type BuyFlowConfig = {
  vertical: "cars" | "boats";
  accent: "red" | "marine";
  returnHref: string;
  returnLabel: string;
  checkoutAssetKey: "vehicleSymbol" | "boatSlug";
  checkoutAssetValue: string;
  labels: {
    asset: string;
    assetLower: string;
    storageLabel: string;
    storageValue: string;
    usageDays: string;
    distanceLabel: string;
    distanceValue: string;
    insuranceUse: string;
    operationVerb: string;
    depreciationAsset: string;
    kycUse: string;
    noteAsset: string;
    walkthroughTitle: string;
    walkthroughBody: string;
    marketsHref: string;
    marketsLabel: string;
  };
  extraReviewBullets?: readonly { label: string; value: string }[];
};

export function buildBuyFlowConfig(
  asset: Vehicle,
  vertical: "cars",
): BuyFlowConfig;
export function buildBuyFlowConfig(
  asset: Boat,
  vertical: "boats",
): BuyFlowConfig;
export function buildBuyFlowConfig(
  asset: BuyAsset,
  vertical: "cars" | "boats",
): BuyFlowConfig {
  if (vertical === "boats") {
    const boat = asset as Boat;
    return {
      vertical,
      accent: "marine",
      returnHref: `/boats/portfolio/${boat.slug.toLowerCase()}`,
      returnLabel: boat.hullId,
      checkoutAssetKey: "boatSlug",
      checkoutAssetValue: boat.slug,
      labels: {
        asset: "Boat",
        assetLower: "boat",
        storageLabel: "Hailing port",
        storageValue: boat.market,
        usageDays: "Cruising days",
        distanceLabel: "Nautical miles",
        distanceValue: `${(boat.nmPerYear).toLocaleString()} nm/year`,
        insuranceUse: "operate the boat",
        operationVerb: "operate",
        depreciationAsset: "boat",
        kycUse: "boat",
        noteAsset: "boat",
        walkthroughTitle: "Boat walkthrough",
        walkthroughBody:
          "A 30-minute walkthrough on the boat (controls, etiquette, condition baseline) before your first cruise.",
        marketsHref: "/boats/portfolio",
        marketsLabel: "Back to markets",
      },
      extraReviewBullets: [
        {
          label: "Caribbean charter",
          value: boat.captainIncluded ? "Eligible (crewed)" : "Not eligible",
        },
      ],
    };
  }

  const vehicle = asset as Vehicle;
  return {
    vertical,
    accent: "red",
    returnHref: `/markets/${vehicle.symbol.toLowerCase()}`,
    returnLabel: vehicle.ticker,
    checkoutAssetKey: "vehicleSymbol",
    checkoutAssetValue: vehicle.symbol,
    labels: {
      asset: "Vehicle",
      assetLower: "vehicle",
      storageLabel: "Stored in",
      storageValue: vehicle.market,
      usageDays: "Driving days",
      distanceLabel: "Mileage",
      distanceValue: `${(vehicle.milesPerYear).toLocaleString()} miles/year`,
      insuranceUse: "drive the vehicle",
      operationVerb: "drive",
      depreciationAsset: "car",
      kycUse: "vehicle",
      noteAsset: "car",
      walkthroughTitle: "Vehicle walkthrough",
      walkthroughBody:
        "A 30-minute walkthrough on the vehicle (controls, etiquette, condition baseline) before your first drive.",
      marketsHref: "/markets",
      marketsLabel: "Back to markets",
    },
  };
}

const buyAccentClasses = {
  red: {
    text: "text-red",
    border: "border-red",
    borderError: "border-red/40",
    bg: "bg-red",
    bgSoft: "bg-red/5",
    hoverBg: "hover:bg-red",
    focus: "focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20",
    accent: "accent-red",
  },
  marine: {
    text: "text-marine",
    border: "border-marine",
    borderError: "border-marine/40",
    bg: "bg-marine",
    bgSoft: "bg-marine/5",
    hoverBg: "hover:bg-marine",
    focus: "focus:border-marine focus:outline-none focus:ring-2 focus:ring-marine/20",
    accent: "accent-marine",
  },
} as const;

const STEPS: { key: StepKey; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "verify", label: "Verify" },
  { key: "documents", label: "Documents" },
  { key: "fund", label: "Fund" },
  { key: "confirm", label: "Confirm" },
];

type Props = {
  asset: BuyAsset;
  initialShares: number;
  config: BuyFlowConfig;
};

export default function BuyFlow({ asset, initialShares, config }: Props) {
  const accent = buyAccentClasses[config.accent];
  const [step, setStep] = useState<StepKey>("review");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [kycComplete, setKycComplete] = useState(false);
  const [oaSigned, setOaSigned] = useState(false);
  const [msaSigned, setMsaSigned] = useState(false);
  const [signature, setSignature] = useState("");
  const [fundingMethod, setFundingMethod] = useState<FundingMethod | null>(null);

  const shares = initialShares;
  // Shared fee math with the API (lib/fees.ts) so the buyer-visible
  // total exactly matches the Stripe charge. acquisitionFee replaces
  // the old flat $1,500 "closing fee".
  const { buyIn: totalPrice, acquisitionFee, total: grandTotal } = computeFees(
    asset.pricePerShare,
    shares,
  );
  // All-in annual contribution: insurance + storage + maintenance + reserves
  // + RYDA service fee, scaled per share. The 12% management fee is bundled
  // into annualOpCost, don't show only that piece as the total.
  const annualContribution = asset.annualOpCost * shares;

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
            href={config.returnHref}
            className="text-xs font-medium uppercase tracking-[0.2em] text-mute hover:text-ink"
          >
            ← Cancel and return to {config.returnLabel}
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    i < stepIdx
                      ? `${accent.bg} text-cream`
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
                    className={`h-px flex-1 ${i < stepIdx ? accent.bg : "bg-rule"}`}
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
              asset={asset}
              config={config}
              shares={shares}
              totalPrice={totalPrice}
              acquisitionFee={acquisitionFee}
              grandTotal={grandTotal}
              annualContribution={annualContribution}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              onContinue={() => go("verify")}
            />
          )}
          {step === "verify" && (
            <VerifyStep
              config={config}
              kycComplete={kycComplete}
              setKycComplete={setKycComplete}
              onBack={() => go("review")}
              onContinue={() => go("documents")}
            />
          )}
          {step === "documents" && (
            <DocumentsStep
              asset={asset}
              config={config}
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
              config={config}
              grandTotal={grandTotal}
              fundingMethod={fundingMethod}
              setFundingMethod={setFundingMethod}
              asset={asset}
              shares={shares}
              signerName={signature}
              onBack={() => go("documents")}
              onContinue={() => go("confirm")}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              asset={asset}
              config={config}
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
                src={asset.hero}
                alt={`${asset.year} ${asset.name}`}
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className={`object-cover ${asset.flipImage ? "-scale-x-100" : ""}`}
                style={{ objectPosition: asset.imagePosition ?? "center" }}
              />
            </div>
            <p className={`mt-4 text-xs uppercase tracking-wider ${accent.text}`}>
              {asset.year} · {asset.brand}
            </p>
            <p className="mt-1 font-display text-xl text-ink">{asset.name}</p>
            <dl className="mt-5 space-y-2 border-t border-rule pt-5 text-sm">
              <SummaryRow label={`${shares} share${shares > 1 ? "s" : ""}`} value={formatUSD(totalPrice)} />
              <SummaryRow label={`${ACQUISITION_FEE_PCT}% acquisition fee`} value={formatUSD(acquisitionFee)} />
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
  asset,
  config,
  shares,
  totalPrice,
  acquisitionFee,
  grandTotal,
  annualContribution,
  termsAccepted,
  setTermsAccepted,
  onContinue,
}: {
  asset: BuyAsset;
  config: BuyFlowConfig;
  shares: number;
  totalPrice: number;
  acquisitionFee: number;
  grandTotal: number;
  annualContribution: number;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  onContinue: () => void;
}) {
  const accent = buyAccentClasses[config.accent];
  const sharesPercent = Math.round((shares / asset.shares) * 1000) / 10;
  const usageDays = asset.daysPerYear * shares;

  return (
    <div className="space-y-8">
      <div>
        <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accent.text}`}>Step 1 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Review your share
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Confirm what you're buying, what it entitles you to, and what it costs to operate
          before you proceed to verification.
        </p>
      </div>

      <Section accent={config.accent} title="What you're buying">
        <Bullet label={config.labels.asset} value={`${asset.year} ${asset.name}`} />
        <Bullet label="Position" value={`${shares} of ${asset.shares} shares (${sharesPercent}%)`} />
        <Bullet label="Legal entity" value={`Single-purpose LLC`} />
        <Bullet label={config.labels.storageLabel} value={config.labels.storageValue} />
      </Section>

      <Section accent={config.accent} title="Annual usage entitlement">
        <Bullet label={config.labels.usageDays} value={`Up to ${usageDays} days/year`} />
        <Bullet label={config.labels.distanceLabel} value={config.labels.distanceValue} />
        {config.extraReviewBullets?.map((bullet) => (
          <Bullet key={bullet.label} label={bullet.label} value={bullet.value} />
        ))}
        <Bullet label="Bookings" value="Shared calendar with co-owners. Fair-use rules apply during peak season." />
      </Section>

      <Section accent={config.accent} title="What it costs">
        <Bullet label="Today (one-time)" value={formatUSD(grandTotal)} bold />
        <Bullet label="—  Share buy-in" value={formatUSD(totalPrice)} />
        <Bullet label={`—  ${ACQUISITION_FEE_PCT}% acquisition fee`} value={formatUSD(acquisitionFee)} />
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
          <li>The LLC is member-managed, you and your co-owners hold authority over material decisions.</li>
          <li>You'll be added to the {config.labels.assetLower}'s insurance policy at closing.</li>
          <li>Any {config.labels.assetLower} modifications, sale, or replacement requires a 75% co-owner vote.</li>
          <li>Co-ownership stakes are not investments and the {config.labels.depreciationAsset} will depreciate over time.</li>
        </ul>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-surface p-4 text-sm">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className={`mt-1 h-4 w-4 ${accent.accent}`}
        />
        <span className="text-ink">
          I understand I'm joining a member-managed LLC alongside other co-owners;
          that this is not an investment and is not offered for investment purposes; that
          co-ownership shares are illiquid for the first 12 months; and that the {config.labels.depreciationAsset} will
          depreciate over time.
        </span>
      </label>

      <ButtonRow
        accent={config.accent}
        rightLabel="Continue to verification"
        rightDisabled={!termsAccepted}
        onRight={onContinue}
      />
    </div>
  );
}

// ── Step 2: Verify ──────────────────────────────────────────────

function VerifyStep({
  config,
  kycComplete,
  setKycComplete,
  onBack,
  onContinue,
}: {
  config: BuyFlowConfig;
  kycComplete: boolean;
  setKycComplete: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const accent = buyAccentClasses[config.accent];
  const [kycRunning, setKycRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch("/api/kyc/status");
        if (cancelled) return;
        if (res.ok) {
          const j = await res.json();
          if (j.verified) setKycComplete(true);
        }
      } catch {
        /* fall through */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setKycComplete]);

  async function startKyc() {
    if (kycRunning) return;
    setKycRunning(true);
    setError(null);
    try {
      const res = await authedFetch("/api/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.pathname }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `KYC failed (${res.status}).`);
      }
      const j = await res.json();
      if (j.kycVerified) {
        setKycComplete(true);
        return;
      }
      if (typeof j.url === "string") {
        window.location.href = j.url;
        return;
      }
      throw new Error("No verification URL returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start KYC.");
    } finally {
      setKycRunning(false);
    }
  }

  const ready = kycComplete;

  return (
    <div className="space-y-8">
      <div>
        <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accent.text}`}>Step 2 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Verify your identity
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Standard KYC. We use Stripe Identity, government ID and a
          selfie match. Required to be added to the LLC's insurance
          policy and to {config.labels.insuranceUse}. RYDA never sees raw
          documents, Stripe verifies them and returns a pass/fail.
        </p>
      </div>

      {/* KYC */}
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>Identity (KYC)</p>
            <p className="mt-2 font-display text-xl text-ink">Verify your identity</p>
            <p className="mt-2 text-sm text-ink-soft">
              Government-issued ID + live selfie. Powered by Stripe
              Identity. Typically takes 2–5 minutes. You'll be redirected
              to Stripe to complete the check, then return here.
            </p>
          </div>
          {kycComplete && (
            <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success-deep">
              Verified ✓
            </span>
          )}
        </div>

        {!kycComplete && (
          <button
            type="button"
            onClick={startKyc}
            disabled={kycRunning}
            className={`mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors ${accent.hoverBg} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {kycRunning ? "Opening Stripe…" : "Start identity verification →"}
          </button>
        )}

        {error ? (
          <p className={`mt-4 rounded-xl border ${accent.borderError} ${accent.bgSoft} px-4 py-3 text-sm ${accent.text}`}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-rule bg-cream-2/40 p-5 text-sm">
        <p className="font-medium text-ink">A note on what this isn't.</p>
        <p className="mt-2 text-ink-soft">
          RYDA is a luxury access platform, not an investment product. We do
          not require accredited-investor verification. Co-ownership stakes
          are not registered securities and are not offered for investment
          purposes — you&apos;re buying the right to use a real {config.labels.noteAsset}{" "}
          you co-own.
        </p>
      </div>

      <ButtonRow
        accent={config.accent}
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
  asset,
  config,
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
  asset: BuyAsset;
  config: BuyFlowConfig;
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
  const accent = buyAccentClasses[config.accent];
  const ready = oaSigned && msaSigned && signature.trim().length >= 4;

  return (
    <div className="space-y-8">
      <div>
        <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accent.text}`}>Step 3 of 5</p>
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
        accent={config.accent}
        title={`${asset.name} LLC, Operating Agreement`}
        meta="34 pages · Reviewed by counsel · Member-managed structure"
        summary={[
          "The LLC is member-managed, you and your co-owners hold authority over material decisions.",
          "Governs decision-making (75% supermajority for sale, replacement, modifications).",
          "Defines fair-use rules during peak and off-season.",
          "Sets remedies if a co-owner stops paying (30-day cure, then forced transfer).",
          "12-month minimum hold; member-to-member transfer mechanics; 3% transfer fee.",
          "Mandatory mediation, then arbitration in under AAA rules.",
        ]}
        signed={oaSigned}
        onSign={() => setOaSigned(true)}
      />

      <DocCard
        accent={config.accent}
        title={`${asset.name} LLC, Management Services Agreement`}
        meta={`12 pages · LLC ↔ RYDA · Your ${shares} share${shares > 1 ? "s" : ""}`}
        summary={[
          `Engages RYDA as the operating service provider for the LLC.`,
          `Your position: ${shares} of ${asset.shares} shares. Buy-in: ${formatUSD(asset.pricePerShare * shares)}.`,
          "Defines RYDA's services: storage, insurance, scheduling, maintenance, member services.",
          "Defines the 12% annual management fee charged to the LLC and paid pro-rata by members.",
          "RYDA is a service provider, not a manager of the LLC. Members retain LLC governance.",
          "Acknowledgment that co-ownership is for personal use, not investment.",
        ]}
        signed={msaSigned}
        onSign={() => setMsaSigned(true)}
      />

      {/* Signature */}
      <div className="rounded-2xl border border-rule bg-surface p-6">
        <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>E-signature</p>
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
          className={`mt-5 h-12 w-full rounded-xl border border-rule bg-cream-2/40 px-4 font-display text-xl italic text-ink placeholder:text-mute ${accent.focus}`}
        />
      </div>

      <ButtonRow
        accent={config.accent}
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
  config,
  grandTotal,
  fundingMethod,
  setFundingMethod,
  asset,
  shares,
  signerName,
  onBack,
  onContinue,
}: {
  config: BuyFlowConfig;
  grandTotal: number;
  fundingMethod: FundingMethod | null;
  setFundingMethod: (v: FundingMethod | null) => void;
  asset: BuyAsset;
  shares: number;
  signerName: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  const accent = buyAccentClasses[config.accent];
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripePaths: FundingMethod[] = ["card", "ach"];
  const isStripePath = fundingMethod !== null && stripePaths.includes(fundingMethod);
  const ready = isStripePath ? true : fundingMethod !== null && confirmedTransfer;

  const confirmCopy: Record<FundingMethod, string> = {
    ach: "Pay by ACH bank transfer on the next page (Stripe Checkout).",
    wire: "I've initiated the wire transfer from my bank with the matching memo.",
    card: "Pay by card on the next page (Stripe Checkout).",
    crypto:
      "I've initiated the crypto transfer through the regulated exchange partner.",
    liquidity:
      "I've started the draw against my liquidity line and will fund within 5 business days.",
    finance:
      "I'd like RYDA to introduce me to a financing partner before I fund.",
  };

  async function startStripeCheckout(method: "card" | "ach") {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/share-purchase/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [config.checkoutAssetKey]: config.checkoutAssetValue,
          shares,
          name: signerName.trim() || "RYDA member",
          paymentMethod: method,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Checkout failed (${res.status}).`);
      }
      const j = await res.json();
      if (typeof j.url === "string") {
        window.location.href = j.url;
        return;
      }
      throw new Error("Stripe didn't return a redirect URL.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  // Non-Stripe paths: lands a pending row + ops ticket via the
  // intent route so the buy flow doesn't silently advance with no
  // backing record. (Same pattern as buy-flow.tsx.)
  async function startNonStripeIntent(
    method: "wire" | "crypto" | "liquidity" | "finance",
  ) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/share-purchase/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [config.checkoutAssetKey]: config.checkoutAssetValue,
          shares,
          name: signerName.trim() || "RYDA member",
          fundingMethod: method,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Reservation failed (${res.status}).`);
      }
      const j = await res.json();
      window.location.href = `/share-purchase/${j.purchaseId}?intent=1`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record reservation.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (fundingMethod === "card" || fundingMethod === "ach") {
      void startStripeCheckout(fundingMethod);
      return;
    }
    if (
      fundingMethod === "wire" ||
      fundingMethod === "crypto" ||
      fundingMethod === "liquidity" ||
      fundingMethod === "finance"
    ) {
      void startNonStripeIntent(fundingMethod);
      return;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className={`text-xs font-medium uppercase tracking-[0.2em] ${accent.text}`}>Step 4 of 5</p>
        <h1 className="mt-3 font-display text-4xl font-light text-ink sm:text-5xl">
          Fund your share
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          Send {formatUSD(grandTotal)} to the LLC&apos;s escrow account. Funds
          are held until your documents and verifications clear, then released
          to the LLC and your share is recorded in the LLC&apos;s member
          register. Six funding paths, pick what fits.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FundingOption
          accent={config.accent}
          method="ach"
          label="ACH bank transfer (Stripe)"
          detail="Free, 3–5 business day settlement. Powered by Stripe Checkout."
          selected={fundingMethod === "ach"}
          onSelect={() => setFundingMethod("ach")}
        />
        <FundingOption
          accent={config.accent}
          method="wire"
          label="Wire transfer"
          detail="Fastest for large amounts. Same-day or next-day settlement. Recommended for buy-ins above $50K."
          selected={fundingMethod === "wire"}
          onSelect={() => setFundingMethod("wire")}
        />
        <FundingOption
          accent={config.accent}
          method="card"
          label="Card (Stripe)"
          detail="Settles immediately. Powered by Stripe Checkout. Card-network fees apply at checkout."
          selected={fundingMethod === "card"}
          onSelect={() => setFundingMethod("card")}
        />
        <FundingOption
          accent={config.accent}
          method="crypto"
          label="Crypto (BTC, ETH, USDC)"
          detail="Routed through a regulated US exchange partner. Conversion to USD on receipt; LLC escrow always holds USD."
          selected={fundingMethod === "crypto"}
          onSelect={() => setFundingMethod("crypto")}
        />
        <FundingOption
          accent={config.accent}
          method="liquidity"
          label="Liquidity line"
          detail="HELOC, SBLOC, or pledged-asset line through your existing bank. You wire the funds; we hold the share."
          selected={fundingMethod === "liquidity"}
          onSelect={() => setFundingMethod("liquidity")}
        />
        <FundingOption
          accent={config.accent}
          method="finance"
          label="Financing partner (referral)"
          detail="We introduce you to a specialty lender. They underwrite; you fund through them. RYDA does not extend credit."
          selected={fundingMethod === "finance"}
          onSelect={() => setFundingMethod("finance")}
        />
      </div>

      {fundingMethod === "wire" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>Wire instructions</p>
          <p className="mt-2 font-display text-xl text-ink">
            {asset.name} LLC, Escrow Account
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            For your security, RYDA never displays escrow bank details in the
            browser. Once you submit this step, we&apos;ll email the verified
            wire instructions for {asset.name} LLC&apos;s escrow account to
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
        <div className={`rounded-2xl border ${accent.border} ${accent.bgSoft} p-6`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>
            ACH bank transfer
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            Connect your bank on the next page (Stripe).
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            We never see your bank credentials. Stripe verifies the
            account, debits the buy-in via ACH, and holds the funds in
            escrow until your verifications clear, then releases them
            to the LLC. Settlement is 3–5 business days.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Total charged: <span className="font-medium text-ink tabular-nums">{formatUSD(grandTotal)}</span>
            {" "}(includes 5% acquisition fee).
          </p>
        </div>
      )}

      {fundingMethod === "card" && (
        <div className={`rounded-2xl border ${accent.border} ${accent.bgSoft} p-6`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>
            Card / bank checkout
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            You&apos;ll be redirected to Stripe to complete payment.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            We never see your card details. Stripe holds the funds
            until your verification clears, then releases them to the
            LLC&apos;s escrow account. You&apos;ll come back here to a
            real-time tracker once payment confirms.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Total charged: <span className="font-medium text-ink tabular-nums">{formatUSD(grandTotal)}</span>
            {" "}(includes 5% acquisition fee).
          </p>
        </div>
      )}

      {fundingMethod === "liquidity" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>
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

      {fundingMethod === "finance" && (
        <div className="rounded-2xl border border-rule bg-surface p-6">
          <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>
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
          <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>
            Crypto
          </p>
          <p className="mt-2 font-display text-xl text-ink">
            BTC, ETH, or USDC, settled in USD to escrow.
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Crypto buy-ins route through a regulated US exchange partner with
            full KYC/AML. You send crypto from your wallet; the partner
            converts to USD on receipt and wires the LLC&apos;s escrow account.
            The LLC always holds USD, no crypto sits on RYDA&apos;s balance
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

      {fundingMethod && !isStripePath && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule bg-surface p-4 text-sm">
          <input
            type="checkbox"
            checked={confirmedTransfer}
            onChange={(e) => setConfirmedTransfer(e.target.checked)}
            className={`mt-1 h-4 w-4 ${accent.accent}`}
          />
          <span className="text-ink">{confirmCopy[fundingMethod]}</span>
        </label>
      )}

      {error ? (
        <p className={`rounded-xl border ${accent.borderError} ${accent.bgSoft} px-4 py-3 text-sm ${accent.text}`}>
          {error}
        </p>
      ) : null}

      <ButtonRow
        accent={config.accent}
        leftLabel="Back"
        onLeft={onBack}
        rightLabel={
          isStripePath
            ? submitting
              ? "Opening Stripe…"
              : "Continue to payment →"
            : "Submit"
        }
        rightDisabled={!ready || submitting}
        onRight={handleSubmit}
      />
    </div>
  );
}

// ── Step 5: Confirm ──────────────────────────────────────────────

function ConfirmStep({
  asset,
  config,
  shares,
  grandTotal,
}: {
  asset: BuyAsset;
  config: BuyFlowConfig;
  shares: number;
  grandTotal: number;
}) {
  const accent = buyAccentClasses[config.accent];
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
        <p className={`text-xs font-medium uppercase tracking-wider ${accent.text}`}>Your co-ownership</p>
        <dl className="mt-4 space-y-3 text-sm">
          <KvRow label={config.labels.asset} value={`${asset.year} ${asset.name}`} />
          <KvRow label="Position" value={`${shares} of ${asset.shares} shares`} />
          <KvRow label="Amount" value={formatUSD(grandTotal)} />
          <KvRow label="LLC" value={`${asset.name} LLC, (member-managed)`} />
          <KvRow label="Status" value="Pending, funds & verification clearing" />
        </dl>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-mute">What happens next</p>
        <ol className="mt-4 space-y-3">
          <Timeline
            accent={config.accent}
            n="01"
            title="Verification clears (typically 24h)"
            body={
              config.vertical === "cars"
                ? "Stripe Identity returns identity verification and driving-record check."
                : "Stripe Identity returns identity verification."
            }
          />
          <Timeline
            accent={config.accent}
            n="02"
            title="Funds settle (1–5 business days)"
            body="Wires same-day; ACH 3–5 business days. We'll email when funds clear."
          />
          <Timeline
            accent={config.accent}
            n="03"
            title="Documents countersigned"
            body="The LLC's existing co-owners (acting collectively, per the Operating Agreement) counter-sign your addition. The Management Services Agreement is executed between the LLC's members and RYDA, RYDA does not bind the LLC unilaterally."
          />
          <Timeline
            accent={config.accent}
            n="04"
            title="Share recorded; calendar opens"
            body="Your share is officially registered with the LLC. The booking calendar opens for your first reservation."
          />
          <Timeline
            accent={config.accent}
            n="05"
            title={config.labels.walkthroughTitle}
            body={config.labels.walkthroughBody}
          />
        </ol>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/portfolio"
          className={`inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream ${accent.hoverBg}`}
        >
          Go to my portfolio →
        </Link>
        <Link
          href={config.labels.marketsHref}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-rule px-7 text-sm font-medium text-ink hover:border-ink"
        >
          {config.labels.marketsLabel}
        </Link>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────

function Section({
  title,
  children,
  accent = "red",
}: {
  title: string;
  children: React.ReactNode;
  accent?: "red" | "marine";
}) {
  const styles = buyAccentClasses[accent];
  return (
    <div className="rounded-2xl border border-rule bg-surface p-6">
      <p className={`text-xs font-medium uppercase tracking-wider ${styles.text}`}>{title}</p>
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
  accent = "red",
  leftLabel,
  onLeft,
  rightLabel,
  rightDisabled,
  onRight,
}: {
  accent?: "red" | "marine";
  leftLabel?: string;
  onLeft?: () => void;
  rightLabel: string;
  rightDisabled?: boolean;
  onRight: () => void;
}) {
  const styles = buyAccentClasses[accent];
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
        className={`inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream ${styles.hoverBg} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {rightLabel} →
      </button>
    </div>
  );
}

function DocCard({
  accent = "red",
  title,
  meta,
  summary,
  signed,
  onSign,
}: {
  accent?: "red" | "marine";
  title: string;
  meta: string;
  summary: string[];
  signed: boolean;
  onSign: () => void;
}) {
  const styles = buyAccentClasses[accent];
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
        before signing, your e-signature here confirms you've reviewed both
        the summary above and the long-form version.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!signed && (
          <button
            type="button"
            onClick={onSign}
            className={`inline-flex h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-cream ${styles.hoverBg}`}
          >
            I've reviewed
          </button>
        )}
      </div>
    </div>
  );
}

function FundingOption({
  accent = "red",
  method,
  label,
  detail,
  selected,
  onSelect,
  disabled = false,
}: {
  accent?: "red" | "marine";
  method: FundingMethod;
  label: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const styles = buyAccentClasses[accent];
  const tagLabel: Record<FundingMethod, string> = {
    ach: "ACH",
    wire: "Wire",
    card: "Card",
    crypto: "Crypto",
    liquidity: "Liquidity",
    finance: "Finance",
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-colors ${
        selected
          ? `${styles.border} ${styles.bgSoft}`
          : disabled
            ? "border-rule bg-surface opacity-60 cursor-not-allowed"
            : "border-rule bg-surface hover:border-ink-soft"
      }`}
    >
      <span className={`text-xs font-medium uppercase tracking-wider ${styles.text}`}>
        {tagLabel[method]}
      </span>
      <span className="font-display text-lg text-ink">{label}</span>
      <span className="text-sm text-ink-soft">{detail}</span>
    </button>
  );
}

function Timeline({
  accent = "red",
  n,
  title,
  body,
}: {
  accent?: "red" | "marine";
  n: string;
  title: string;
  body: string;
}) {
  const styles = buyAccentClasses[accent];
  return (
    <li className="flex gap-5 rounded-xl border border-rule bg-surface p-4">
      <span className={`font-display text-sm ${styles.text}`}>{n}</span>
      <div>
        <p className="font-display text-base text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
    </li>
  );
}

// Deterministic mock account number suffix, same boat always gets the
// same fake account number so it looks consistent across reloads.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
