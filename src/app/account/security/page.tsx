"use client";

// /account/security — login credentials + session controls.
//
// Real, working today (Supabase auth):
//   - Change password (requires current password as a re-auth step
//     so a stolen-cookie attacker can't pivot to "change password
//     and lock the real owner out")
//   - Change email (Supabase sends confirmation to BOTH addresses;
//     the change only commits when both are clicked)
//   - Sign out everywhere (revokes all sessions for this user across
//     every device + browser)
//
// Stubs with clearly-labeled "ships at launch" copy:
//   - Two-factor (TOTP) enrollment — Supabase MFA factors API exists
//     but the QR + verify UI is its own design pass
//   - Session list — Supabase doesn't expose a session inventory by
//     default; we'd need to log sessions ourselves to show device +
//     last-seen. Surfacing as "All your sessions" with a global
//     sign-out button is the meaningful 80% today.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SecurityPage() {
  return (
    <div className="space-y-12">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
          Login & security
        </p>
        <h1 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
          Keep your account safe.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Change your sign-in email and password, sign out of every device, and
          (soon) turn on two-factor authentication.
        </p>
      </header>

      <ChangeEmailCard />
      <ChangePasswordCard />
      <TwoFactorCard />
      <SessionsCard />
      <DangerZoneCard />
    </div>
  );
}

// ── Email ─────────────────────────────────────────────────────

function ChangeEmailCard() {
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      setCurrentEmail(data.user.email ?? "");
      // Supabase exposes new_email when a change is in flight (waiting
      // for the user to click both confirmation links).
      const pending = (data.user as { new_email?: string }).new_email;
      if (pending) setPendingEmail(pending);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || submitting) return;
    if (!newEmail.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError("That's already your email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setDone(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ email: newEmail });
      if (err) throw err;
      setPendingEmail(newEmail);
      setDone(
        "Check both inboxes (current + new) and click the confirmation links to complete the change.",
      );
      setNewEmail("");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title="Email"
      hint="The address where we send sign-in links and account notices."
    >
      <Row>
        <span className="text-xs uppercase tracking-wider text-mute">
          Current
        </span>
        <span className="text-sm text-ink">{currentEmail || "—"}</span>
      </Row>
      {pendingEmail && (
        <Row>
          <span className="text-xs uppercase tracking-wider text-mute">
            Pending
          </span>
          <span className="text-sm text-ink">
            {pendingEmail}{" "}
            <span className="text-xs text-mute">(awaiting confirmation)</span>
          </span>
        </Row>
      )}

      {!editing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setDone(null);
            setError(null);
          }}
          className={btnSecondary}
        >
          Change email
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-rule pt-4">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              New email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputCls}
              placeholder="you@example.com"
            />
          </label>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={btnPrimary}
            >
              {submitting ? "Sending confirmation…" : "Send confirmation"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setNewEmail("");
              }}
              className={btnGhost}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {done && <SuccessBanner>{done}</SuccessBanner>}
    </Card>
  );
}

// ── Password ─────────────────────────────────────────────────

function ChangePasswordCard() {
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentEmail(data.user.email);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || submitting) return;

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    if (next === current) {
      setError("New password is the same as the old one.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setDone(null);
    try {
      // Re-auth with current password first. If a session got stolen
      // and an attacker tries to change the password from /account, we
      // want the current password as a barrier. signInWithPassword
      // returns 400 on bad creds without invalidating the existing
      // session.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: current,
      });
      if (signInErr) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateErr) throw updateErr;

      setDone("Password updated. You stay signed in on this device; sign out of every other device below if you suspect a breach.");
      setEditing(false);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card
      title="Password"
      hint="At least 8 characters. We don't enforce a complexity rule, but length helps."
    >
      {!editing ? (
        <>
          <Row>
            <span className="text-xs uppercase tracking-wider text-mute">
              Status
            </span>
            <span className="text-sm text-ink">Set</span>
          </Row>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setDone(null);
              setError(null);
            }}
            className={btnSecondary}
          >
            Change password
          </button>
          <p className="mt-2 text-[11px] text-mute">
            Forgot it?{" "}
            <Link href="/signin" className="text-red hover:text-red-deep">
              Reset via magic link
            </Link>
            .
          </p>
        </>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-rule pt-4">
          {/* Hidden username field improves browser autofill UX. */}
          <input
            type="email"
            value={currentEmail}
            autoComplete="username"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Current password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              New password
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-mute">
              Confirm new password
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
          </label>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={btnPrimary}
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setCurrent("");
                setNext("");
                setConfirm("");
              }}
              className={btnGhost}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {done && <SuccessBanner>{done}</SuccessBanner>}
    </Card>
  );
}

// ── Two-factor (stub) ──────────────────────────────────────────

function TwoFactorCard() {
  return (
    <Card
      title="Two-factor authentication"
      hint="Add a second factor to every sign-in (TOTP authenticator app)."
    >
      <Row>
        <span className="text-xs uppercase tracking-wider text-mute">Status</span>
        <span className="text-sm text-ink">Off</span>
      </Row>
      <button type="button" disabled className={`${btnSecondary} cursor-not-allowed opacity-60`}>
        Enable 2FA — coming Q3 2026
      </button>
      <p className="mt-2 text-[11px] text-mute">
        Will use TOTP via an authenticator app (Google Authenticator, 1Password,
        Authy). Recovery codes generated at enrollment.
      </p>
    </Card>
  );
}

// ── Sessions / sign-out ────────────────────────────────────────

function SessionsCard() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOutEverywhere() {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      // Global scope revokes EVERY session for this user — every
      // browser, every tab, every device. Local sign-out (default)
      // would only kill this device's session.
      const { error: err } = await supabase.auth.signOut({ scope: "global" });
      if (err) throw err;
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out everywhere.");
      setSigningOut(false);
    }
  }

  return (
    <Card
      title="Active sessions"
      hint="Signing out everywhere ends every active login across all devices."
    >
      <Row>
        <span className="text-xs uppercase tracking-wider text-mute">
          This device
        </span>
        <span className="text-sm text-ink">Active now</span>
      </Row>
      <Row>
        <span className="text-xs uppercase tracking-wider text-mute">
          Other devices
        </span>
        <span className="text-sm text-mute">
          Per-device session list ships at Miami launch
        </span>
      </Row>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <button
        type="button"
        onClick={onSignOutEverywhere}
        disabled={signingOut}
        className={`inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {signingOut ? "Signing out…" : "Sign out of every device"}
      </button>
    </Card>
  );
}

// ── Danger zone ────────────────────────────────────────────────

function DangerZoneCard() {
  return (
    <Card
      title="Danger zone"
      hint="Account deletion + data export live on the Privacy & data page."
    >
      <Link
        href="/account/privacy"
        className="inline-flex h-11 items-center justify-center rounded-full border border-rule px-6 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        Manage privacy & data →
      </Link>
    </Card>
  );
}

// ── Layout primitives ──────────────────────────────────────────

const inputCls =
  "mt-2 h-11 w-full rounded-xl border border-rule bg-cream px-4 text-sm text-ink placeholder:text-mute focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";
const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-60";
const btnSecondary =
  "inline-flex h-11 items-center justify-center rounded-full border border-rule bg-cream-2 px-6 text-sm font-medium text-ink transition-colors hover:border-red hover:text-red";
const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-ink-soft transition-colors hover:text-ink";

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
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg text-ink">{title}</h2>
      </div>
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

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-red/40 bg-red/5 px-4 py-3 text-sm text-red">
      {children}
    </p>
  );
}

function SuccessBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-success/40 bg-success/5 px-4 py-3 text-sm text-success-deep">
      {children}
    </p>
  );
}
