# RYDA email aliases — inventory + provisioning checklist

Auto-generated audit (run `pnpm dlx grep-email-aliases` or the inline
recipe in this file's footer to refresh). Last refreshed 2026-05-04
against commit b78dd48 + post-audit-round-2 fixes.

## What references aliases @ryda.pro (or sibling domains)?

| Alias | Used by | What it sends/receives | Owner action |
|-------|---------|------------------------|--------------|
| `notifications@ryda.pro` | `lib/notify.ts` | Outbound transactional email FROM (Resend RYDA_NOTIFY_FROM env) | Required at launch |
| `support@ryda.pro` | site-footer.tsx, /contact, member emails | Member support inbound + outbound replies | Required at launch |
| `legal@ryda.pro` | OA/MSA documents, transfer-flow copy, /admin transfer ack notifications | Legal team's inbox for member-register amendments + transfer reviews | Required at launch |
| `ops@ryda.pro` | notifyTeam recipients (lib/notify.ts), admin action emails | Internal ops alerts (refunds, KYC overrides, transfer acks, share intents) | Required at launch |
| `kyc@ryda.pro` | Stripe Identity webhook fallback contact | Failed/processing KYC alerts | Required at launch |
| `info@ryda.pro` | About page, press copy | General inbound | Optional but conventional |

## Where each alias is hardcoded

> Run this from the repo root to refresh the inventory:
>
> ```sh
> grep -rn "@ryda\.\(com\|app\)" src/ docs/ supabase/ --include='*.{ts,tsx,sql,md}' \
>   | sort -u
> ```

Example output (truncated):

```
src/lib/notify.ts:23:    const recipients = ["ops@ryda.pro", "legal@ryda.pro"];
src/app/contact/page.tsx:48:        email "support@ryda.pro"
src/components/site-footer.tsx:44:    href: "mailto:support@ryda.pro"
```

## Provisioning order (Track 1 launch)

1. **Register `ryda.pro`** if not yet done (Track 1 hard dep).
2. **Email host**: Workspace / Fastmail / SimpleLogin — one of:
   - Google Workspace ($6/user/mo, ships Friday rollover with the
     domain). Best if you want shared mailboxes and Drive.
   - Fastmail ($3/user/mo, fastest-DKIM-setup, no shared inboxes).
   - SimpleLogin / ProtonMail aliases — fine for the small set above.
3. **Verify Resend domain** at https://resend.com/domains. Add SPF/DKIM
   /DMARC records to DNS (TXT records at the registrar). Wait for
   the green checkmark before flipping `RESEND_API_KEY` to live.
4. **Set the env vars on Vercel**:
   - `RESEND_API_KEY` (live key, not test)
   - `RYDA_NOTIFY_FROM` (e.g. `RYDA <notifications@ryda.pro>`)
   - `RYDA_NOTIFY_RECIPIENTS` (csv: `ops@ryda.pro,legal@ryda.pro`)
   - `RYDA_KYC_NOTIFY_RECIPIENTS` (csv: `kyc@ryda.pro,ops@ryda.pro`)
5. **Smoke test**: trigger one of each emitter:
   - Member transactional: `POST /api/auth/magic-link?test=1`
   - Ops alert: trigger a refund in /admin (will fire notifyTeam)
   - Wire instructions: submit a wire-funded share intent
   - Inbound deliverability: send a message via /contact

## Where this matters

If the launch ships before these aliases exist:

- `notifyTeam` swallows the Resend error and returns `{ ok: false }`.
  We've fixed every caller to NOT claim "ticket filed" without checking
  this, but ops still won't see the notifications. Webhook events
  succeed silently, and degraded states accumulate without ops alerts.
- Members who reply to confirmation emails will land at a non-existent
  address, and the bounce will trip Resend's deliverability score.
- The OA + MSA legal contact (`legal@ryda.pro`) is referenced in the
  member-signed documents — leaving it as a 404 in the signed PDF is
  legally risky and contractually inconsistent.

## Ops vs members

We deliberately keep these in two domains:

- `ops@ryda.pro` and `legal@ryda.pro` only receive outbound from RYDA's
  admin pipeline. They aren't published anywhere a member sees.
- `support@ryda.pro` is the public-facing line. All site copy points
  here, all reply-tos default here.

The split lets us route ops traffic to a dedicated Slack-bridged
mailbox without exposing it to spam scrapers from the public
surface.
