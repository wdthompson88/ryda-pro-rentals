# RYDA · DNS records to add at Namecheap

Add these to Namecheap → Domain List → `ryda.pro` → Manage → Advanced DNS.
Six records total (Vercel = 3, Resend = 3, optional DMARC = 1).

## 1. Vercel — apex + www

These point `ryda.pro` and `www.ryda.pro` at the Vercel deployment.

| Type  | Host | Value                                       | TTL       | Why |
|-------|------|---------------------------------------------|-----------|-----|
| A     | `@`  | `216.198.79.1`                              | Automatic | Vercel anycast (rank-1, lower latency) |
| A     | `@`  | `64.29.17.1`                                | Automatic | Vercel anycast (rank-1, second IP)     |
| CNAME | `www`| `aea25f39129b6862.vercel-dns-017.com.`      | Automatic | Project-keyed www → routed to ryda-web |

**Fallbacks** (use these if Namecheap rejects the project-keyed CNAME or
multiple A records on `@`):

| Type  | Host | Value                       | Notes |
|-------|------|-----------------------------|-------|
| A     | `@`  | `76.76.21.21`               | Single rank-2 IP — works if Namecheap won't accept two A records |
| CNAME | `www`| `cname.vercel-dns.com.`     | Generic shared CNAME |

After Namecheap propagates (usually 5–30 min), `https://ryda.pro` and
`https://www.ryda.pro` both serve the production deployment;
`www.ryda.pro` 308-redirects to apex.

## 2. Resend — domain authentication for transactional email

These let `notifications@ryda.pro`, `support@ryda.pro`, etc. send via
the existing `RESEND_API_KEY` (already configured in Vercel).

| Type | Host                  | Value                                                                            | Priority | TTL  |
|------|-----------------------|----------------------------------------------------------------------------------|----------|------|
| TXT  | `resend._domainkey`   | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDKeWreNV8QscUcj9X/tFUBySbzxBJNoOLCO7SkMdQNuOWbrp0/1tA+Cs9McwZAYWkGrzt5h47REDk6mWljrt7LgYb+fSGVuHCxNeFm1YTyDjIRsWrUw8JdwC1x0u8+mzrOx+GyKBYccRCqNlXc8ynr8pC8e7511I1lBxHcA4K1XwIDAQAB` | —        | Auto |
| MX   | `send`                | `feedback-smtp.us-east-1.amazonses.com`                                          | 10       | Auto |
| TXT  | `send`                | `v=spf1 include:amazonses.com ~all`                                              | —        | Auto |

After all three propagate, click "Verify DNS Records" in
https://resend.com/domains/36680276-f60a-4c05-84f9-6e30aca5a90b. Should
flip to "Verified" within a few minutes.

## 3. (Recommended) DMARC

Resend doesn't add a DMARC record automatically, but a `p=none` policy
helps deliverability and gives you visibility into who's spoofing your
domain. Optional but cheap.

| Type | Host     | Value                                       | TTL  |
|------|----------|---------------------------------------------|------|
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@ryda.pro;` | Auto |

(After 30 days at `p=none` with no false positives, escalate to
`p=quarantine`. Don't go straight to `p=reject` — it'll block your own
mail if anything is misconfigured.)

## 4. (Future) Email host MX records

Once you pick an email host (Workspace, Fastmail, etc.), they'll give
you 3-5 more MX records to add to receive mail at `@ryda.pro`. Those
go on the apex (`@`) host, NOT on `send` (which is reserved for
Resend's bounce processing above).

For example, Google Workspace MX records would look like:
```
MX  @  smtp.google.com.  Priority 1
```
(Workspace simplified to a single MX a few years ago. Fastmail uses
`in1-smtp.messagingengine.com` and `in2-smtp.messagingengine.com`.)

## Order of operations

1. Add Vercel records (Section 1).
2. Wait ~5 min, verify `https://ryda.pro` resolves to the production
   deployment.
3. Add Resend records (Section 2).
4. Wait ~5 min, click "Verify DNS Records" in the Resend dashboard.
5. Optional: add DMARC record (Section 3).
6. Pick email host, add their MX records.

## After verification

- The temporary full-access Resend key (`re_6V3wcFQL...`) should be
  **revoked** in https://resend.com/api-keys. Don't keep a full-access
  key live in chat-history; the production runtime only needs the
  existing send-only key.
- Consider rotating `SUPABASE_ACCESS_TOKEN` (also exposed in chat
  earlier) via https://supabase.com/dashboard → Account → Access
  Tokens.

## Verification commands (run after each section)

After Vercel records (Section 1):
```sh
dig ryda.pro A +short      # should show 216.198.79.1 and/or 64.29.17.1
dig www.ryda.pro CNAME +short  # should show aea25f39...vercel-dns-017.com.
curl -sI https://ryda.pro/  # should return HTTP/2 200 once cert provisions (~1-3 min)
```

After Resend records (Section 2):
```sh
dig resend._domainkey.ryda.pro TXT +short    # should show the p=MIGf... value
dig send.ryda.pro MX +short                   # should show feedback-smtp.us-east-1.amazonses.com
dig send.ryda.pro TXT +short                  # should show v=spf1 include:amazonses.com ~all
```
