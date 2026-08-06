import Link from "next/link";
import { HiddenWhenAuthed } from "@/components/auth-aware";

export type MembershipTierKey = "core" | "blue" | "black";
export type MembershipCellValue = string | boolean;

export type MembershipFeatureGroup = {
  group: string;
  items: {
    label: string;
    core: MembershipCellValue;
    blue: MembershipCellValue;
    black: MembershipCellValue;
  }[];
};

export type MembershipTier = {
  key: MembershipTierKey;
  name: string;
  price: string;
  priceSub: string;
  tagline: string;
  cta: string;
};

export type MembershipDetail = {
  tier: string;
  detail: string;
};

export type MembershipPageData = {
  accent: "red" | "marine";
  hero: {
    eyebrow: string;
    title: React.ReactNode;
    body: string;
  };
  tiers: MembershipTier[];
  features: MembershipFeatureGroup[];
  /** Optional per-tier detail breakdown ("what each tier includes").
   *  Removed from /membership in May 2026 per user feedback (felt
   *  redundant with the tier comparison cards above). Boats page
   *  still uses it. */
  math?: {
    intro: string;
    details: MembershipDetail[];
  };
  eligibility: React.ReactNode[];
  cta: {
    headline: string;
    body: string;
    href: string;
  };
  brandLabel: string;
};

export function MembershipPageTemplate({ data }: { data: MembershipPageData }) {
  const hover = data.accent === "marine" ? "hover:bg-marine hover:border-marine" : "hover:bg-red hover:border-red";
  const ctaHover = data.accent === "marine" ? "hover:bg-marine" : "hover:bg-red";

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-mute">
            {data.hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-light leading-[1.05] text-ink sm:text-6xl">
            {data.hero.title}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {data.hero.body}
          </p>
        </div>
      </section>

      <section className="border-b border-rule bg-cream-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {data.tiers.map((tier) => (
              <TierCard
                key={tier.key}
                tier={tier}
                features={data.features}
                accent={data.accent}
                brandLabel={data.brandLabel}
                signupHref={data.cta.href}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Compare every benefit.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-soft">
            Side-by-side, no fine print.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-rule bg-surface">
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Membership tier comparison — scroll horizontally to see all tiers"
              tabIndex={0}
            >
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-rule bg-cream-2">
                  <tr>
                    <th className="px-6 py-5 text-left">
                      <span className="text-xs uppercase tracking-wider text-mute">
                        Benefit
                      </span>
                    </th>
                    {data.tiers.map((tier) => {
                      const isAccentTier = tier.key === "blue";
                      const accentBg = data.accent === "marine" ? "bg-marine/5" : "bg-red/5";
                      const accentText = data.accent === "marine" ? "text-marine" : "text-red";
                      return (
                      <th
                        key={tier.key}
                        className={`px-6 py-5 text-center ${isAccentTier ? accentBg : ""}`}
                      >
                        <p
                          className={`text-xs uppercase tracking-wider ${
                            isAccentTier ? accentText : "text-mute"
                          }`}
                        >
                          {tier.name}
                        </p>
                        <p className="mt-1 font-display text-lg text-ink">
                          {tier.price}
                          <span className="text-xs text-ink-soft">
                            {tier.priceSub}
                          </span>
                        </p>
                      </th>
                    );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.features.map((group) => (
                    <Group key={group.group} group={group} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {data.math && (
        <section className="border-b border-rule bg-cream-2">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
            <h2 className="font-display text-3xl text-ink sm:text-4xl">
              What each tier includes.
            </h2>
            <p className="mt-4 text-base text-ink-soft">{data.math.intro}</p>

            <div className="mt-8 space-y-4">
              {data.math.details.map((detail) => (
                <Detail key={detail.tier} detail={detail} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Who can join?</h2>
          <ul className="mt-8 space-y-4 text-base text-ink-soft">
            {data.eligibility.map((item, index) => (
              <Bullet key={index}>{item}</Bullet>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-10">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            {data.cta.headline}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream/70">
            {data.cta.body}
          </p>
          <HiddenWhenAuthed>
            <Link
              href={data.cta.href}
              className={`mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink ${ctaHover} hover:text-cream`}
            >
              Sign up →
            </Link>
          </HiddenWhenAuthed>
        </div>
      </section>
    </>
  );

  function TierCard({
    tier,
    features,
    accent,
    brandLabel,
    signupHref,
  }: {
    tier: MembershipTier;
    features: MembershipFeatureGroup[];
    accent: "red" | "marine";
    brandLabel: string;
    signupHref: string;
  }) {
    const isBlue = tier.key === "blue";
    const isBlack = tier.key === "black";
    const above = isBlack ? "blue" : isBlue ? "core" : null;

    function isUpgrade(item: MembershipFeatureGroup["items"][number]) {
      if (!above) return item.core === true;
      const my = item[tier.key];
      const prev = item[above];
      if (my === false) return false;
      return prev === false || my !== prev;
    }

    const items = features.flatMap((group) => group.items.filter(isUpgrade)).slice(0, 7);
    const previousLabel = isBlack ? "Everything in Blue, plus" : isBlue ? "Everything in Core, plus" : null;
    const accentLine = isBlack
      ? "before:bg-gold"
      : isBlue && accent === "marine"
        ? "before:bg-marine-deep"
        : accent === "marine"
          ? "before:bg-marine"
          : isBlue
            ? "before:bg-marine"
            : "before:bg-red";
    const eyebrowColor = isBlack
      ? "text-gold"
      : isBlue && accent === "marine"
        ? "text-marine-deep"
        : accent === "marine"
          ? "text-marine"
          : isBlue
            ? "text-marine"
            : "text-red";

    return (
      <div
        className={`relative flex flex-col rounded-2xl border border-rule bg-surface p-8 before:absolute before:inset-x-0 before:top-0 before:h-[3px] ${accentLine}`}
      >
        <p className={`text-[10px] font-medium uppercase tracking-[0.22em] ${eyebrowColor}`}>
          {brandLabel} {tier.name}
        </p>
        <p className="mt-5 font-display text-5xl font-light text-ink">
          {tier.price}
          {tier.priceSub && (
            <span className="text-base text-mute">{tier.priceSub}</span>
          )}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {tier.tagline}
        </p>

        {previousLabel && (
          <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.2em] text-mute">
            {previousLabel}
          </p>
        )}

        <ul className={`${previousLabel ? "mt-3" : "mt-8"} flex-1 space-y-3 text-[14px]`}>
          {items.map((feature) => (
            <li key={feature.label} className="flex items-start gap-3 text-ink-soft">
              <span className="mt-1 text-mute">·</span>
              <span>
                <span className="text-ink">{feature.label}</span>
                {typeof feature[tier.key] === "string" && (
                  <span className="ml-1.5 text-xs italic text-mute">
                    ({feature[tier.key]})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <HiddenWhenAuthed>
          <Link
            href={signupHref}
            className={`mt-10 inline-flex h-12 items-center justify-center border border-ink bg-ink px-7 text-sm font-medium text-cream transition-colors ${hover}`}
          >
            {tier.cta}
          </Link>
        </HiddenWhenAuthed>
      </div>
    );
  }
}

function Group({ group }: { group: MembershipFeatureGroup }) {
  return (
    <>
      <tr className="border-b border-rule bg-cream-2/40">
        <td colSpan={4} className="px-6 py-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            {group.group}
          </span>
        </td>
      </tr>
      {group.items.map((feature) => (
        <tr key={feature.label} className="border-b border-rule last:border-b-0">
          <td className="px-6 py-4 text-ink">{feature.label}</td>
          <Cell value={feature.core} />
          <Cell value={feature.blue} accent />
          <Cell value={feature.black} />
        </tr>
      ))}
    </>
  );
}

function Cell({ value, accent }: { value: MembershipCellValue; accent?: boolean }) {
  const bg = accent ? "bg-cream-2/40" : "";
  let content: React.ReactNode;
  if (value === true) {
    content = (
      <span role="img" aria-label="Included">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
      </span>
    );
  } else if (value === false) {
    content = (
      <span role="img" aria-label="Not included" className="text-mute">
        <span aria-hidden>—</span>
      </span>
    );
  } else {
    content = <span className="text-ink">{value}</span>;
  }
  return <td className={`px-6 py-4 text-center text-sm ${bg}`}>{content}</td>;
}

function Detail({ detail }: { detail: MembershipDetail }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-5">
      <p className="font-display text-base text-ink">{detail.tier}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{detail.detail}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed">
      <span className="mt-1 text-mute">·</span>
      <span>{children}</span>
    </li>
  );
}
