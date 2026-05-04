"use client";

// /account/notifications — preferences for what kinds of mail/SMS/
// push the member gets. Persisted to auth.users.user_metadata so we
// don't need a separate table. Each toggle saves on change (no
// "Save" button) — small fields, low friction.
//
// Defaults (also enforced if a key is missing from metadata):
//   notif_email_digest      = "weekly"
//   notif_sms_enabled       = false
//   notif_push_enabled      = true
//   notif_marketing_enabled = true
//   notif_booking_updates   = true

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Prefs = {
  notif_email_digest: "off" | "daily" | "weekly";
  notif_sms_enabled: boolean;
  notif_push_enabled: boolean;
  notif_marketing_enabled: boolean;
  notif_booking_updates: boolean;
};

const DEFAULTS: Prefs = {
  notif_email_digest: "weekly",
  notif_sms_enabled: false,
  notif_push_enabled: true,
  notif_marketing_enabled: true,
  notif_booking_updates: true,
};

function fromMeta(meta: Record<string, unknown> | undefined): Prefs {
  if (!meta) return DEFAULTS;
  const digest = meta.notif_email_digest;
  return {
    notif_email_digest:
      digest === "off" || digest === "daily" || digest === "weekly"
        ? digest
        : DEFAULTS.notif_email_digest,
    notif_sms_enabled:
      typeof meta.notif_sms_enabled === "boolean"
        ? meta.notif_sms_enabled
        : DEFAULTS.notif_sms_enabled,
    notif_push_enabled:
      typeof meta.notif_push_enabled === "boolean"
        ? meta.notif_push_enabled
        : DEFAULTS.notif_push_enabled,
    notif_marketing_enabled:
      typeof meta.notif_marketing_enabled === "boolean"
        ? meta.notif_marketing_enabled
        : DEFAULTS.notif_marketing_enabled,
    notif_booking_updates:
      typeof meta.notif_booking_updates === "boolean"
        ? meta.notif_booking_updates
        : DEFAULTS.notif_booking_updates,
  };
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
      setPrefs(fromMeta(data.user.user_metadata));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save on change. Each toggle/select kicks updateUser, but with a
  // 250ms debounce so rapid clicks (e.g. flipping the digest cadence
  // from off → daily → weekly while deciding) only fire one save.
  // We snapshot the latest prefs at flush time so the save reflects
  // the most recent user intent.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPrefsRef = useRef<Prefs>(DEFAULTS);

  async function flushSave() {
    if (!supabase) return;
    const next = latestPrefsRef.current;
    setSaving(true);
    setError(null);
    try {
      // Merge — don't overwrite other metadata keys (full_name etc.).
      const { error: err } = await supabase.auth.updateUser({ data: { ...next } });
      if (err) throw err;
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  function persist(next: Prefs) {
    setPrefs(next);
    latestPrefsRef.current = next;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void flushSave();
      debounceRef.current = null;
    }, 250);
  }

  function toggle<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    return () => persist({ ...prefs, [key]: value });
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Notifications
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          What we tell you about.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Booking updates and security alerts always reach you (we'd be
          irresponsible to silence those). Everything else is your call.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-mute">Loading preferences…</p>
      ) : (
        <div className="space-y-6">
          {/* Digest cadence ─────────────────────────────────── */}
          <Section title="Email digest" hint="Recap of your fleet, bookings, and account.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["off", "weekly", "daily"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={toggle("notif_email_digest", opt)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    prefs.notif_email_digest === opt
                      ? "border-ink bg-ink text-cream"
                      : "border-rule bg-cream hover:border-ink"
                  }`}
                >
                  <p className="text-sm font-medium capitalize">
                    {opt === "off" ? "Off" : opt}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      prefs.notif_email_digest === opt ? "text-cream/70" : "text-mute"
                    }`}
                  >
                    {opt === "off"
                      ? "No recap email"
                      : opt === "weekly"
                        ? "Sundays at 6am ET"
                        : "Every morning at 7am ET"}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {/* Channels ───────────────────────────────────── */}
          <Section title="Channels" hint="What can reach you, and how.">
            <Toggle
              label="Booking updates"
              hint="Confirmation, day-before reminder, post-trip recap."
              checked={prefs.notif_booking_updates}
              onChange={(v) => persist({ ...prefs, notif_booking_updates: v })}
            />
            <Toggle
              label="SMS"
              hint="Day-of pickup texts. Standard message rates apply."
              checked={prefs.notif_sms_enabled}
              onChange={(v) => persist({ ...prefs, notif_sms_enabled: v })}
            />
            <Toggle
              label="Push notifications"
              hint="Browser + mobile-app notifications (when the app ships)."
              checked={prefs.notif_push_enabled}
              onChange={(v) => persist({ ...prefs, notif_push_enabled: v })}
            />
            <Toggle
              label="Marketing"
              hint="New launches, member events, partner offers. We send sparingly."
              checked={prefs.notif_marketing_enabled}
              onChange={(v) => persist({ ...prefs, notif_marketing_enabled: v })}
            />
          </Section>

          {/* Status footer ─────────────────────────────────── */}
          <div className="flex items-center gap-3 border-t border-rule pt-5 text-xs text-mute">
            {error ? (
              <span className="text-red">{error}</span>
            ) : saving ? (
              <span>Saving…</span>
            ) : savedFlash ? (
              <span className="text-emerald-700">Saved.</span>
            ) : (
              <span>Changes save automatically.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {hint && <p className="text-xs text-mute">{hint}</p>}
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 rounded-xl border border-rule bg-cream p-4 transition-colors hover:border-ink-soft">
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-mute">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-ink" : "bg-rule"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-cream shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
