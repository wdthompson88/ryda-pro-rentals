"use client";

// /account/documents — every signed agreement, generated amendment,
// and KYC summary the member has on file.
//
// Real wiring:
//   - llc_amendments rows (one per generated amendment / welcome
//     packet PDF; emailed to the buyer at checkout completion)
//   - document_signatures rows (signed OA / MSA / Subscription
//     Agreement requests, populated by Dropbox Sign webhook when
//     templates are configured)
//   - kyc_verifications row (the redacted summary of the Stripe
//     Identity check)
//
// Stub categories:
//   - Insurance certificates — populated when ops uploads them per LLC
//   - Tax forms (K-1 / 1099-INT) — generated annually
//
// Download buttons are present but no-op'd until a Supabase Storage
// path is wired (separate effort — out of scope for this pass).

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Amendment = {
  id: string;
  document_type: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  member_name: string;
  emailed: boolean;
  email_attempted_at: string | null;
  created_at: string;
};

type DocumentSignature = {
  id: string;
  document_type: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  // Joined from share_purchases via the FK relationship. Supabase
  // returns related rows as an array even for to-one relationships;
  // we always read [0]. Typed as an array to keep TS happy with the
  // generated row shape.
  share_purchases:
    | Array<{ vehicle_symbol: string | null; boat_slug: string | null }>
    | null;
};

type KycRow = {
  status: string;
  updated_at: string;
};

const DOC_LABEL: Record<string, string> = {
  member_register_amendment: "Member-register amendment",
  welcome_packet: "Welcome packet",
  operating_agreement_signed: "Operating Agreement (signed)",
  operating_agreement: "Operating Agreement",
  management_services_agreement: "Management Services Agreement",
  subscription_agreement: "Subscription Agreement",
};

// LLC the member is in — used to render per-LLC insurance certificates.
type MemberLlc = {
  id: string;
  llc_name: string;
  vehicle_symbol: string | null;
  boat_slug: string | null;
  insurance_carrier: string | null;
};

export default function DocumentsPage() {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [kyc, setKyc] = useState<KycRow | null>(null);
  const [memberLlcs, setMemberLlcs] = useState<MemberLlc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // First pull share_holdings → asset symbols/slugs the member
      // currently holds. Then fetch the matching llc_entities rows.
      const holdingsRes = await supabase
        .from("share_holdings")
        .select("vehicle_symbol, boat_slug")
        .is("transferred_at", null);
      const holdings = (holdingsRes.data ?? []) as Array<{
        vehicle_symbol: string | null;
        boat_slug: string | null;
      }>;
      const heldVehicleSymbols = Array.from(
        new Set(holdings.map((h) => h.vehicle_symbol).filter(Boolean) as string[]),
      );
      const heldBoatSlugs = Array.from(
        new Set(holdings.map((h) => h.boat_slug).filter(Boolean) as string[]),
      );

      const [amRes, sigRes, kycRes, llcVehicleRes, llcBoatRes] =
        await Promise.all([
          supabase
            .from("llc_amendments")
            .select(
              "id, document_type, vehicle_symbol, boat_slug, member_name, emailed, email_attempted_at, created_at",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("document_signatures")
            .select(
              "id, document_type, status, signed_at, created_at, share_purchases(vehicle_symbol, boat_slug)",
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("kyc_verifications")
            .select("status, updated_at")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          // Two queries instead of one OR-clause because Supabase's
          // PostgREST OR syntax with empty arrays returns 0 rows;
          // splitting + concatenating client-side handles the empty
          // case cleanly.
          heldVehicleSymbols.length
            ? supabase
                .from("llc_entities")
                .select("id, llc_name, vehicle_symbol, boat_slug, insurance_carrier")
                .in("vehicle_symbol", heldVehicleSymbols)
            : Promise.resolve({ data: [] }),
          heldBoatSlugs.length
            ? supabase
                .from("llc_entities")
                .select("id, llc_name, vehicle_symbol, boat_slug, insurance_carrier")
                .in("boat_slug", heldBoatSlugs)
            : Promise.resolve({ data: [] }),
        ]);
      if (cancelled) return;
      setAmendments((amRes.data as Amendment[]) ?? []);
      setSignatures((sigRes.data as DocumentSignature[]) ?? []);
      setKyc(kycRes.data as KycRow | null);
      const allLlcs = [
        ...((llcVehicleRes.data as MemberLlc[]) ?? []),
        ...((llcBoatRes.data as MemberLlc[]) ?? []),
      ];
      // Dedup by id in case a member somehow has shares mapped to
      // both keys for the same LLC.
      const dedup = Array.from(
        new Map(allLlcs.map((l) => [l.id, l])).values(),
      );
      setMemberLlcs(dedup);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Documents
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Everything signed, on file.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Co-ownership agreements, generated amendments, KYC verification, and
          (eventually) insurance certificates and tax forms — all in one place.
          Signed PDFs live with Dropbox Sign; amendments are stored long-term.
        </p>
      </header>

      {/* Co-ownership agreements (Dropbox Sign) ───────────── */}
      <Section
        title="Co-ownership agreements"
        hint="Operating Agreement, MSA, and Subscription Agreement signed at the time of share purchase."
      >
        {loading ? (
          <Empty>Loading…</Empty>
        ) : signatures.length === 0 ? (
          <Empty>
            No agreements on file yet. Each share purchase mints one
            Operating Agreement, one Management Services Agreement, and one
            Subscription Agreement.
          </Empty>
        ) : (
          <DocList
            rows={signatures.map((s) => {
              const linked = s.share_purchases?.[0] ?? null;
              return {
                key: s.id,
                name: docLabel(
                  s.document_type,
                  linked?.vehicle_symbol ?? null,
                  linked?.boat_slug ?? null,
                ),
                sub: s.signed_at
                  ? `Signed ${formatDate(s.signed_at)}`
                  : `${capitalize(s.status)} · ${formatDate(s.created_at)}`,
                status: s.status === "signed" ? "available" : "pending",
              };
            })}
          />
        )}
      </Section>

      {/* Member-register amendments (server-rendered PDFs) ─── */}
      <Section
        title="Member-register amendments"
        hint="Each share purchase generates an amendment to the LLC's Operating Agreement that records you as a member. We email a copy at the time of purchase and keep one here for re-download."
      >
        {loading ? (
          <Empty>Loading…</Empty>
        ) : amendments.length === 0 ? (
          <Empty>
            No amendments yet. They appear here automatically once a share
            purchase is paid + fulfilled.
          </Empty>
        ) : (
          <DocList
            rows={amendments.map((a) => ({
              key: a.id,
              name: docLabel(a.document_type, a.vehicle_symbol, a.boat_slug),
              sub: a.emailed
                ? `Emailed ${formatDate(a.email_attempted_at ?? a.created_at)}`
                : a.email_attempted_at
                  ? `Email pending · ${formatDate(a.email_attempted_at)}`
                  : `Generated ${formatDate(a.created_at)}`,
              status: "available",
            }))}
          />
        )}
      </Section>

      {/* Identity (KYC summary) ─────────────────────────── */}
      <Section
        title="Identity"
        hint="Stripe Identity keeps a redacted summary; we don't store the documents themselves."
      >
        {loading ? (
          <Empty>Loading…</Empty>
        ) : !kyc ? (
          <Empty>
            No verification on file.{" "}
            <Link
              href="/account/verification"
              className="text-red hover:text-red-deep"
            >
              Start KYC →
            </Link>
          </Empty>
        ) : (
          <DocList
            rows={[
              {
                key: "kyc",
                name: "KYC verification summary",
                sub: `${capitalize(kyc.status)} · ${formatDate(kyc.updated_at)} · Stripe Identity`,
                status: kyc.status === "verified" ? "available" : "pending",
              },
            ]}
          />
        )}
      </Section>

      {/* Insurance certificates — generated on demand per LLC the
          member is in. PDF endpoint pulls policy data from
          llc_entities; if binding is incomplete the cert renders a
          "Binding pending" banner explicitly, so a cohort-1 member
          can still produce a structurally-correct cert immediately. */}
      <Section
        title="Insurance certificates"
        hint="One certificate of insurance per LLC, generated on demand. Each lists you as a named insured under the LLC's primary auto policy."
      >
        {loading ? (
          <Empty>Loading…</Empty>
        ) : memberLlcs.length === 0 ? (
          <Empty>
            Insurance certificates appear here once you co-own a share in an
            LLC. The certificate is generated on demand from your active policy
            data.
          </Empty>
        ) : (
          <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {memberLlcs.map((llc) => {
              const assetLabel = llc.vehicle_symbol
                ? llc.vehicle_symbol.toUpperCase()
                : llc.boat_slug;
              return (
                <li
                  key={llc.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-ink">{llc.llc_name}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {assetLabel} ·{" "}
                      {llc.insurance_carrier ? (
                        <>Carrier: {llc.insurance_carrier}</>
                      ) : (
                        <span className="text-mute italic">
                          Binding pending
                        </span>
                      )}
                    </p>
                  </div>
                  <a
                    href={`/api/account/llc/${llc.id}/insurance-certificate`}
                    className="rounded-full border border-rule bg-cream-2 px-4 py-1.5 text-xs font-medium text-ink hover:border-ink"
                  >
                    Download PDF
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Tax forms — stub */}
      <Section
        title="Tax forms"
        hint="K-1 and 1099-INT, generated annually for each LLC you co-own."
      >
        <Empty>
          Your first K-1 ships in February of the year following your first
          full tax year of co-ownership.
        </Empty>
      </Section>

      <p className="text-xs text-mute">
        Need a fresh copy of an agreement?{" "}
        <Link
          href="/contact?type=Documents"
          className="text-red hover:text-red-deep"
        >
          Contact RYDA legal
        </Link>{" "}
        and we'll re-send the signed PDF directly.
      </p>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────

function docLabel(
  type: string,
  vehicleSymbol: string | null,
  boatSlug: string | null,
): string {
  const base = DOC_LABEL[type] ?? capitalize(type.replace(/_/g, " "));
  const llc = vehicleSymbol
    ? `RYDA ${vehicleSymbol} LLC`
    : boatSlug
      ? `RYDA ${boatSlug.toUpperCase()} LLC`
      : null;
  return llc ? `${base} · ${llc}` : base;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── view primitives ────────────────────────────────────────────

function Section({
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
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-rule bg-cream-2/40 p-5 text-center text-sm text-ink-soft">
      {children}
    </div>
  );
}

type DocRow = {
  key: string;
  name: string;
  sub: string;
  status: "available" | "pending";
};

function DocList({ rows }: { rows: DocRow[] }) {
  return (
    <ul className="divide-y divide-rule">
      {rows.map((d) => (
        <li
          key={d.key}
          className="flex items-center justify-between gap-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-ink">{d.name}</p>
            <p className="text-xs text-mute">{d.sub}</p>
          </div>
          {d.status === "available" ? (
            <span className="inline-flex h-9 items-center justify-center rounded-full border border-rule bg-cream-2 px-4 text-xs font-medium text-ink-soft">
              Download — ships at launch
            </span>
          ) : (
            <span className="text-xs text-mute">Pending</span>
          )}
        </li>
      ))}
    </ul>
  );
}
