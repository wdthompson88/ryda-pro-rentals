// Ops Disclosure block — the single biggest credibility delta vs.
// competitors. Pacaso, Kocomo, and Ember all hide this; Rally and
// Masterworks have versions of it but are weaker on per-asset detail.
//
// Lifted directly from Round 2 research (Codex + Claude A consensus).
// Eight named buckets: storage facility, service partner per marque,
// insurance, telematics, detailing cadence, hurricane protocol,
// dues calendar with included buckets, and the "no markup on third-
// party services" line if true for RYDA.
//
// All optional fields. Vehicles without populated values cleanly skip.
// Per-marque service partner is auto-derived from the brand.

import type { Vehicle } from "@/lib/market-data";

// Service-partner mapping by brand. Values are placeholder until real
// dealer relationships are signed; once real, swap in actual partner
// names + addresses. Keep "TBD" entries from rendering.
const SERVICE_PARTNER_BY_BRAND: Record<string, string> = {
  Ferrari: "Ferrari of Fort Lauderdale (factory-authorized)",
  Lamborghini: "Lamborghini Miami (factory-authorized)",
  McLaren: "McLaren Miami at Champion Auto Group",
  "Aston Martin": "Aston Martin Miami",
  // Catch-all for marques we haven't onboarded yet:
};

// Default ops disclosures shared across all vehicles. Per-vehicle
// overrides go on Vehicle.opsDisclosure if/when we add that type.
// Keeping this as a single source of truth simplifies updates as
// the partner network grows.
const DEFAULT_DISCLOSURE = {
  storage:
    "Climate-controlled garage in Miami's Wynwood arts district, 24/7 video monitoring, on-site security, segregated bays.",
  insurance:
    "Agreed-value comprehensive + $1M third-party liability per vehicle, written by Hagerty / Travelers / Chubb tier specialists. Every co-owner named as an insured.",
  telematics:
    "VIN-locked GPS + odometer + speed and geofence alerts via a fleet-grade telematics provider. Member consent recorded in the operating agreement.",
  detailing:
    "Full detail after every reservation. Quarterly paint correction. Annual ceramic refresh.",
  hurricaneProtocol:
    "When the National Hurricane Center cone places Miami within 48 hours, vehicles relocate inland to a hardened storage partner. No member action required.",
  duesCalendar:
    "Annual dues invoiced January 1 for the upcoming calendar year. Covers insurance, storage, scheduled service, detailing, telematics, and the maintenance reserve. Mid-year joiners pay a prorated balance.",
  reserveFund:
    "~12% of annual dues funds a maintenance reserve held in the LLC's bank, balance disclosed to members quarterly.",
  deficitHandling:
    "If actual operating costs exceed the dues budget for the year (rare; typically a major out-of-warranty repair), the deficit is divided equally among the members per the OA. Members vote on any deficit assessment >$2,500 per share.",
  noMarkup:
    "RYDA does not mark up insurance, storage, scheduled service, or repairs. All third-party services pass through to the LLC at cost; RYDA earns its management fee separately, disclosed in your dues breakdown.",
};

export function AssetOpsDisclosure({ vehicle }: { vehicle: Vehicle }) {
  const servicePartner = SERVICE_PARTNER_BY_BRAND[vehicle.brand];

  return (
    <section className="border-b border-rule bg-cream-2">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-red">
          <span className="opacity-70">#</span>
          {vehicle.ticker} · Care &amp; custody
        </p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            How this car is actually operated.
          </h2>
          <p className="text-xs text-mute">
            Updated as service partners and storage agreements are signed.
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          The line items every fractional-ownership site hides. Storage,
          service, insurance, telematics, hurricane protocol — named, in
          public, with the actual operating partners. Because if you're
          going to wire money for a 1/10 stake in a Ferrari, you should
          know exactly who's looking after it.
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Disclosure label="Storage" body={DEFAULT_DISCLOSURE.storage} />
          {servicePartner && (
            <Disclosure
              label={`${vehicle.brand} service`}
              body={`${servicePartner}. Service intervals follow the manufacturer's prescribed schedule; service records open to seated members through the document vault.`}
            />
          )}
          <Disclosure label="Insurance" body={DEFAULT_DISCLOSURE.insurance} />
          <Disclosure
            label="Telematics"
            body={DEFAULT_DISCLOSURE.telematics}
          />
          <Disclosure
            label="Detailing"
            body={DEFAULT_DISCLOSURE.detailing}
          />
          <Disclosure
            label="Hurricane protocol"
            body={DEFAULT_DISCLOSURE.hurricaneProtocol}
          />
          <Disclosure
            label="Dues calendar"
            body={DEFAULT_DISCLOSURE.duesCalendar}
          />
          <Disclosure
            label="Reserve fund + deficit handling"
            body={`${DEFAULT_DISCLOSURE.reserveFund} ${DEFAULT_DISCLOSURE.deficitHandling}`}
          />
        </ul>

        {/* No-markup commitment, full-width, brand-color treatment so
            it reads as the headline trust line that it is. Lifted
            directly from Drive Archipelago — the single most powerful
            credibility commitment in the fractional-ownership category
            that doesn't require regulatory disclosure. */}
        <div className="mt-8 rounded-2xl border border-red/30 bg-red/5 p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-red">
            No markup on third-party services
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {DEFAULT_DISCLOSURE.noMarkup}
          </p>
        </div>
      </div>
    </section>
  );
}

function Disclosure({ label, body }: { label: string; body: string }) {
  return (
    <li className="rounded-xl border border-rule bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
        {label}
      </p>
      <p
        className="mt-2 text-sm leading-relaxed text-ink-soft"
        // Allow `&amp;` and friends to render correctly when label
        // contains entities. Body is plain string so this is safe.
      >
        {body}
      </p>
    </li>
  );
}
