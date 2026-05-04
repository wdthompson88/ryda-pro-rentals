# CRON_SECRET — generate + install

The `/api/cron/expire-transfers` route requires a `CRON_SECRET` env
var that matches the Bearer token Vercel sends with the daily cron
invocation. Without it, the route 500s and the daily transfer-expiry
+ drift-detection pass never runs.

## Generate

Run locally — never commit the value:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Or via openssl:

```sh
openssl rand -base64 32 | tr -d '=+/' | cut -c1-43
```

A fresh 32-byte base64url-encoded value (43 chars, URL-safe). Don't reuse
this across environments.

## Install on Vercel

Either via the dashboard or the Vercel CLI:

```sh
# Production
vercel env add CRON_SECRET production
# Paste the value when prompted.

# Preview
vercel env add CRON_SECRET preview
```

Vercel cron auth is automatic once this is set: the platform attaches
`Authorization: Bearer $CRON_SECRET` to every scheduled invocation.

## Verify

After deploy, the daily cron logs should show:

```
[cron · expire-transfers] expired N row(s)
[cron · drift-detect] ... (only if stuck-paid drift detected)
```

If you see `Forbidden` 403s in the cron log, the secret is unset or
mismatched.

## Manual invocation (dev)

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://ryda-web.vercel.app/api/cron/expire-transfers
```

Should return `{ "ok": true, "expired": 0, "stuck_paid": 0 }`.

## Notes

- The route uses `crypto.timingSafeEqual` for constant-time comparison
  so probe-based length attacks against the secret don't leak length.
- We deliberately bundle drift-detection into this same cron because
  Vercel Hobby tier limits the project to 1 cron schedule per day. If
  the project upgrades to Pro, the drift check can be split off into
  its own route at a different schedule.
