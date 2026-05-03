"use client";

// /account/profile — editable personal info backed by Supabase
// auth.users.user_metadata. Saves via supabase.auth.updateUser
// ({ data: {...} }). The token never leaves the browser; RLS isn't
// involved because user_metadata is owned by the auth row itself.
//
// Fields:
//   - full_name        (legal name on insurance + LLC member register)
//   - preferred_name   (the casual one — what shows on /account)
//   - phone            (E.164-ish, free text — validation is light)
//   - date_of_birth    (age-verification on rentals)
//   - mailing address  (white-glove delivery, K-1s, insurance)
//
// On the email row we link to /account/security since email is an
// auth credential, not profile data — Supabase requires re-verification
// when it changes.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string;
  preferred_name: string;
  phone: string;
  date_of_birth: string; // YYYY-MM-DD
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const EMPTY: Profile = {
  full_name: "",
  preferred_name: "",
  phone: "",
  date_of_birth: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

function fromMetadata(meta: Record<string, unknown> | undefined): Profile {
  if (!meta) return EMPTY;
  const get = (k: string) =>
    typeof meta[k] === "string" ? (meta[k] as string) : "";
  return {
    full_name: get("full_name"),
    preferred_name: get("preferred_name"),
    phone: get("phone"),
    date_of_birth: get("date_of_birth"),
    address_line1: get("address_line1"),
    address_line2: get("address_line2"),
    city: get("city"),
    state: get("state"),
    postal_code: get("postal_code"),
    country: get("country") || "US",
  };
}

export default function ProfilePage() {
  const [email, setEmail] = useState<string>("");
  const [initial, setInitial] = useState<Profile>(EMPTY);
  const [form, setForm] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from Supabase auth on mount.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) {
        setLoading(false);
        return;
      }
      setEmail(data.user.email ?? "");
      const p = fromMetadata(data.user.user_metadata);
      setInitial(p);
      setForm(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dirty check — controls whether Save is enabled and whether the
  // discard banner shows.
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) && !loading;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || saving || !dirty) return;
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      const { data, error: err } = await supabase.auth.updateUser({
        data: { ...form },
      });
      if (err) throw err;
      const updated = fromMetadata(data.user?.user_metadata);
      setInitial(updated);
      setForm(updated);
      setSavedFlash(true);
      // Clear the flash after a few seconds so the page settles.
      setTimeout(() => setSavedFlash(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  function field<K extends keyof Profile>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Profile
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Your details.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          We use this to address you on the LLC member register, ship paperwork,
          and verify your age on rentals. Email and password live under{" "}
          <Link href="/account/security" className="text-red hover:text-red-deep">
            Login & security
          </Link>
          .
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-mute">Loading profile…</p>
      ) : (
        <form onSubmit={onSave} className="space-y-10">
          {/* Identity ─────────────────────────────────── */}
          <Section title="Identity" hint="Names + age verification">
            <Row>
              <Field label="Legal name" hint="As shown on your ID. Used on the LLC register.">
                <input
                  type="text"
                  autoComplete="name"
                  className={inputCls}
                  placeholder="Jane M. Doe"
                  {...field("full_name")}
                />
              </Field>
              <Field label="Preferred name" hint="What we call you in emails + the dashboard.">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Jane"
                  {...field("preferred_name")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Email" hint="To change, head to Login & security.">
                <input
                  type="email"
                  value={email}
                  disabled
                  className={`${inputCls} cursor-not-allowed bg-cream-2/60 text-mute`}
                />
              </Field>
              <Field label="Phone" hint="For booking-day SMS reminders.">
                <input
                  type="tel"
                  autoComplete="tel"
                  className={inputCls}
                  placeholder="+1 305 555 0145"
                  {...field("phone")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Date of birth" hint="Drivers must be 28+ to rent.">
                <input
                  type="date"
                  autoComplete="bday"
                  className={inputCls}
                  {...field("date_of_birth")}
                />
              </Field>
              <Field label="" hint="" />
            </Row>
          </Section>

          {/* Address ─────────────────────────────────── */}
          <Section
            title="Mailing address"
            hint="White-glove delivery, K-1 tax forms, insurance certificates."
          >
            <Row>
              <Field label="Address line 1">
                <input
                  type="text"
                  autoComplete="address-line1"
                  className={inputCls}
                  placeholder="123 Brickell Ave"
                  {...field("address_line1")}
                />
              </Field>
              <Field label="Address line 2" hint="Apt, suite, etc.">
                <input
                  type="text"
                  autoComplete="address-line2"
                  className={inputCls}
                  placeholder="Apt 4502"
                  {...field("address_line2")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="City">
                <input
                  type="text"
                  autoComplete="address-level2"
                  className={inputCls}
                  placeholder="Miami"
                  {...field("city")}
                />
              </Field>
              <Field label="State">
                <input
                  type="text"
                  autoComplete="address-level1"
                  className={inputCls}
                  placeholder="FL"
                  {...field("state")}
                />
              </Field>
            </Row>
            <Row>
              <Field label="ZIP / postal code">
                <input
                  type="text"
                  autoComplete="postal-code"
                  className={inputCls}
                  placeholder="33131"
                  {...field("postal_code")}
                />
              </Field>
              <Field label="Country">
                <select
                  className={inputCls}
                  autoComplete="country"
                  {...field("country")}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  <option value="GB">United Kingdom</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </Row>
          </Section>

          {/* Save bar ─────────────────────────────────── */}
          {error ? (
            <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
              {error}
            </p>
          ) : null}
          {savedFlash ? (
            <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
              Profile saved.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setForm(initial)}
              disabled={!dirty || saving}
              className="inline-flex h-12 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Discard
            </button>
            {dirty && (
              <p className="text-xs text-mute">Unsaved changes</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-60";

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
    <section>
      <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {hint && <p className="text-xs text-mute">{hint}</p>}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  if (!label && !children) return <div />;
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium uppercase tracking-wider text-mute">
          {label}
        </span>
      )}
      {children && <div className="mt-2">{children}</div>}
      {hint && <span className="mt-1 block text-[11px] text-mute">{hint}</span>}
    </label>
  );
}
