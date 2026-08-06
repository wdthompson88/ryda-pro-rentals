"use client";

// /account/verification — read-only display of the member's
// verification state. KYC (Stripe Identity) is the only real one
// today; driving record + marine operator's license are stubs that
// will be wired to Checkr / USCG vendors later.
//
// KYC: queries the kyc_verifications table directly via the Supabase
// JS client (RLS already filters to the calling user). Shows the
// freshest row's status. Members can re-trigger verification via the
// existing /api/kyc/start endpoint when they're not yet verified.

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase";

type KycRow = {
  status:
    | "requires_input"
    | "requires_action"
    | "processing"
    | "verified"
    | "canceled"
    | "failed"
    | string;
  updated_at: string;
  failure_code: string | null;
  failure_reason: string | null;
};

const STATUS_LABEL: Record<string, { text: string; tone: "ok" | "wait" | "warn" | "off" }> = {
  verified: { text: "Verified", tone: "ok" },
  processing: { text: "Processing", tone: "wait" },
  requires_input: { text: "Action required", tone: "warn" },
  requires_action: { text: "Action required", tone: "warn" },
  canceled: { text: "Canceled", tone: "off" },
  failed: { text: "Failed", tone: "warn" },
};

export default function VerificationPage() {
  const [kyc, setKyc] = useState<KycRow | "none">("none");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("kyc_verifications")
        .select("status, updated_at, failure_code, failure_reason")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (err) {
        // Table missing in preview, or no rows yet — both are fine,
        // surface as "no record".
        setKyc("none");
      } else {
        setKyc(data && data[0] ? (data[0] as KycRow) : "none");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startKyc() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await authedFetch("/api/kyc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: "/account/verification" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `KYC failed (${res.status}).`);
      }
      const j = await res.json();
      if (typeof j.url === "string") {
        window.location.href = j.url;
        return;
      }
      throw new Error("No verification URL returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start verification.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Verification
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Who you are, on file.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Co-ownership and rentals require identity + driving-record checks.
          Numbers, photos, and document IDs stay with the verification vendor —
          we keep only the pass / fail status.
        </p>
      </header>

      {/* KYC ──────────────────────────────────────────── */}
      <Card
        title="Identity (KYC)"
        hint="Government-issued ID + selfie via Stripe Identity. Required once before your first co-ownership share or rental."
      >
        {loading ? (
          <p className="text-sm text-mute">Loading…</p>
        ) : (
          <>
            <Row>
              <span className="text-xs uppercase tracking-wider text-mute">
                Status
              </span>
              {kyc === "none" ? (
                <Pill tone="off">Not started</Pill>
              ) : (
                (() => {
                  const s = STATUS_LABEL[kyc.status] ?? {
                    text: kyc.status,
                    tone: "off" as const,
                  };
                  return <Pill tone={s.tone}>{s.text}</Pill>;
                })()
              )}
            </Row>
            {kyc !== "none" && (
              <Row>
                <span className="text-xs uppercase tracking-wider text-mute">
                  Last updated
                </span>
                <span className="text-sm text-ink">
                  {new Date(kyc.updated_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </Row>
            )}
            {kyc !== "none" && kyc.failure_reason && (
              <Row>
                <span className="text-xs uppercase tracking-wider text-mute">
                  Reason
                </span>
                <span className="text-sm text-ink">
                  {kyc.failure_reason}
                </span>
              </Row>
            )}
            {error && <ErrorBanner>{error}</ErrorBanner>}
            {(kyc === "none" || kyc.status !== "verified") && (
              <button
                type="button"
                onClick={startKyc}
                disabled={starting}
                className={btnPrimary}
              >
                {starting
                  ? "Opening Stripe Identity…"
                  : kyc === "none"
                    ? "Start verification"
                    : "Restart verification"}
              </button>
            )}
            {kyc !== "none" && kyc.status === "verified" && (
              <p className="text-[11px] text-mute">
                Re-verify only if your ID changes (renewal, name change, etc.).
              </p>
            )}
          </>
        )}
      </Card>

      {/* Driving record (stub) ─────────────────────────── */}
      <Card
        title="Driving record"
        hint="Pulled from a third-party DMV vendor (Checkr) before your first car rental. Re-pulled annually."
      >
        <Row>
          <span className="text-xs uppercase tracking-wider text-mute">Status</span>
          <Pill tone="off">Not yet checked</Pill>
        </Row>
        <button
          type="button"
          disabled
          className={`${btnSecondary} cursor-not-allowed opacity-60`}
        >
          Initiate driving-record check — ships with rentals
        </button>
        <p className="text-[11px] text-mute">
          Trigger happens automatically the first time you book a car rental.
          Members under 28 or with at-fault incidents in the last 5 years are
          ineligible by carrier policy.
        </p>
      </Card>

      {/* Marine operator (stub) ─────────────────────────── */}
      <Card
        title="Marine operator's license"
        hint="USCG-issued for vessels over 26 feet. Required for boat charters where the member operates."
      >
        <Row>
          <span className="text-xs uppercase tracking-wider text-mute">Status</span>
          <Pill tone="off">Not on file</Pill>
        </Row>
        <button
          type="button"
          disabled
          className={`${btnSecondary} cursor-not-allowed opacity-60`}
        >
          Upload license — coming Q3 2026
        </button>
      </Card>
    </div>
  );
}

const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60";
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
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      {children}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "wait" | "warn" | "off";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-success/10 text-success-deep"
      : tone === "wait"
        ? "bg-warn/15 text-warn-deep"
        : tone === "warn"
          ? "bg-red/10 text-red"
          : "bg-mute/15 text-mute";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
      {children}
    </p>
  );
}
