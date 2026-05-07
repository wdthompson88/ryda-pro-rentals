# RYDA Operational Tracker — Status Synthesis

Cross-referenced the 212-task operational tracker (`Ryda Operational
Tracker_v01.xlsx`) against the live codebase + this session's commit
history. Status updates applied to a copy of the original at
[`./Ryda Operational Tracker_v01-with-status.xlsx`](./Ryda%20Operational%20Tracker_v01-with-status.xlsx)
— original preserved in `~/Downloads/`.

## Headline numbers

| | Count |
|---|---|
| **Complete** (verified shipped) | **17** |
| **In Progress** (partial — code-side done, awaiting external input) | **16** |
| **N/A** (deferred to later phase) | **8** |
| **Not Started** (real-world action needed) | **171** |
| **Total** | 212 |
| **% Complete** | 8% |

## Where progress is concentrated

| Workstream | Done | WIP | N/A | Pending | Total | % |
|---|---:|---:|---:|---:|---:|---:|
| **Technology & Platform** | **10** | **6** | 1 | 6 | 23 | **43%** |
| Data Privacy & Security | 3 | 2 | 0 | 9 | 14 | 21% |
| Marketing & GTM | 3 | 1 | 0 | 19 | 23 | 13% |
| Operations — Co-Ownership | 1 | 1 | 0 | 24 | 26 | 4% |
| Legal & Contracts | 0 | 5 | 1 | 13 | 19 | 0% (5 partial) |
| Finance & Accounting | 0 | 1 | 1 | 13 | 15 | 0% |
| Company Formation | 0 | 0 | 1 | 15 | 16 | 0% |
| Tax & Compliance | 0 | 0 | 1 | 14 | 15 | 0% |
| Insurance | 0 | 0 | 1 | 12 | 13 | 0% |
| HR & People | 0 | 0 | 2 | 13 | 15 | 0% |
| Operations — Rental | 0 | 0 | 0 | 16 | 16 | 0% |
| Ongoing Compliance | 0 | 0 | 0 | 17 | 17 | 0% |

The picture is honest: **the platform is 43% built, the business
around it is 0%.** Everything that's a code/digital problem has been
heavily addressed in this session. Everything that requires real-world
action — entity formation, lawyer engagement, insurance bind, partner
contracts, vehicle acquisition — is at zero.

## What's marked Complete (17 items)

### Technology & Platform (10)
| # | Task | Where it lives |
|---|---|---|
| 79 | Domain + DNS | ryda.pro · Cloudflare DNS · Vercel deploy. `docs/dns-records-namecheap.md` |
| 80 | Brand identity | Wordmark logo + Fraunces+Inter + brand red `#DC4747` + `src/app/globals.css` color tokens. Logo at `/profile-image` |
| 82 | MVP platform scope | `src/app/{rent,bookings,signup,markets}/` — full vertical |
| 83 | Member signup + KYC | Stripe Identity at `src/app/api/kyc/{start,status,webhook}/` |
| 85 | Co-ownership marketplace | `src/app/markets/[symbol]` with full anatomy (provenance + originality + ops disclosure + classic.com live widget + curated comparables) |
| 86 | Co-owner dashboard | `src/app/{account,my-cars,portfolio,inside}/` |
| 87 | Stripe integration | Idempotent webhooks, atomic compare-and-set fulfillment. `src/app/api/share-purchase/` |
| 89 | Admin dashboard | `src/app/admin/{,llc,comparables,vehicle-enrichment,audit}/` |
| 93 | Analytics | PostHog + Vercel Analytics + GSC + Bing Webmaster + Sentry |
| 98 | Market-specific landing pages | `src/app/locations/{,miami,los-angeles,new-york}/` |

### Data Privacy & Security (3)
| # | Task | Where it lives |
|---|---|---|
| 107 | Encryption at rest + transit | TLS via Vercel/Cloudflare · Supabase encryption · Stripe tokenization |
| 108 | Access controls | `auth.users.app_metadata.role === 'admin'` (service-role-only writable). `src/lib/admin-auth.ts` |
| 112 | PCI-DSS via Stripe | All payments via Stripe Checkout — no raw card data ever touches RYDA |

### Marketing & GTM (3)
| # | Task | Where it lives |
|---|---|---|
| 173 | Brand identity (same as 80) | — |
| 174 | ryda.pro live | Auto-deploy from `main` to Vercel; SEO infra (JSON-LD, sitemap, robots, OG) all wired |
| 175 | Waitlist landing page | `src/app/api/waitlist/route.ts` + `/signup` flow |

### Operations — Co-Ownership (1)
| # | Task | Where it lives |
|---|---|---|
| 158 | Vehicle LLC formation process | Provider-agnostic adapter at `src/lib/llc-formation/` + Firstbase client + mock-mode. Admin UI at `/admin/llc/{,new,[id]}/`. Migration `0022` for `llc_entities` + `llc_formation_events` tables |

## What's In Progress — code-side done, external input pending (16)

These are the natural "ready to flip on" items once the corresponding
external work lands:

| # | Task | What's done | What's blocking |
|---|---|---|---|
| 19 | Rental booking terms / waiver | Drafts at `/legal/terms` + `/sample-documents` UI | Lawyer review |
| 20 | Co-Owner Agreement template | LLC amendment PDF at `src/lib/llc-amendment-pdf.tsx`; sample doc surface | Securities counsel review |
| 21 | Vehicle LLC OA template | Per-vehicle amendment PDF generated | Full OA template awaiting legal |
| 22 | Share transfer/exit protocol | Documented at `/how-it-works#exit` + `/faq` (90-day hold, 75% supermajority) | Formal legal template |
| 25 | Privacy + terms | Drafts at `/legal/{privacy,terms,cookies,accessibility,disclaimer}` | Audit flagged: needs named-processor list + GDPR section |
| 45 | Commission tracking | Stripe webhooks track all payments; `share_purchases` + `bookings` tables | Reporting layer + partner-payout rails |
| 84 | Rental booking flow | Listings + booking UI at `src/app/rent/[symbol]` | Static dates; calendar wiring (audit T2.8) |
| 88 | Automated emails | Resend wired for: auth, share-purchase fulfillment, ops alerts | Missing: booking confirmation, KYC failed, ACH bounced |
| 90 | Inspection photo upload | `PhotoGallery` component + lightbox | Admin-side upload flow |
| 92 | Email marketing | Resend transactional | No Klaviyo/Mailchimp marketing nurture |
| 95 | Backup / DR | Supabase auto-backups + Vercel rollbacks | Formal DR plan document |
| 99 | Business email | Cloudflare Email Routing forwards `support@ryda.pro` to Gmail | Real Workspace/Fastmail mailboxes |
| 101 | Uptime monitoring | Sentry installed | PagerDuty/Datadog setup |
| 102 | Privacy laws | CCPA + FL covered in `/legal/privacy` | GDPR section + named processors (audit T3.1) |
| 105 | Privacy policy | Drafts shipped | Audit flagged: expansion needed |
| 169 | Share transfer/exit process | UI at `/admin/comparables/[symbol]` for valuation comps; documented at `/how-it-works#exit` | Formal legal protocol |
| 176 | Email nurture sequence | Auth magic-link wired | Marketing automation tooling |

## What's N/A — deferred to later phase (8)

| # | Task | Why deferred |
|---|---|---|
| 9 | Foreign LLC CA + NY | Q3 2026 launch is FL-only. Scoped for 2027 expansion |
| 33 | Platform development agreement | Built in-house — IP vests in RYDA LLC by default |
| 44 | Payroll system | No employees yet (contractors only) |
| 58 | Form 940/941 | Not applicable until first W-2 |
| 70 | D&O insurance | Required by institutional investors; not yet relevant |
| 81 | Platform vendor selection | Built in-house |
| 123 | Payroll setup | Same as 44 |
| 124 | Workers comp | Triggers at 4+ FL employees |

## Top 12 most urgent — what to start this week

Sorted by gating effect on first revenue dollar:

1. **#11 Retain legal counsel** with fractional-ownership/securities experience. Until this lands, items 17, 20, 21, 22 remain "drafts in code" not "executable contracts." The biggest single bottleneck.
2. **#17 SEC counsel review** — confirm in writing the LLC structure doesn't require registration. Cannot solicit a single co-owner without this.
3. **#1–4 Form RYDA LLC + EIN + bank accounts.** Firstbase scaffold is ready (mock-mode). Sign up + flip `FIRSTBASE_MODE=live` once lawyer green-lights.
4. **#12 Retain CPA** with LLC pass-through experience. Drives chart of accounts, sales tax registration, K-1 process.
5. **#66–67 Specialty exotic insurance broker + fleet policy** — Hagerty / Chubb / specialty broker. Cannot acquire vehicle one without this in writing.
6. **#147 Storage facility in Miami** — climate-controlled, 24/7 access. Site copy claims this exists; needs to.
7. **#149 Detailing partner in Miami** — pre/post handover detail SLA.
8. **#54 FL sales tax registration** — required before first rental booking.
9. **#150 Roadside assistance** for co-ownership vehicles.
10. **#177 Claim social handles** + upload profile pic from `~/Desktop/ryda-profile-1080.png`. Playbook ready at `docs/social-launch-playbook.md`.
11. **#182–183 Referral partner program** — luxury real estate agents in Miami. Compounding channel.
12. **#181 150+ qualified waitlist signups** before vehicle acquisition. Validates demand.

Items 1–4 are sequential. Items 5–9 are operational ops. Items 10–12
can run in parallel with the above.

## Recommended next-7-days plan

| Day | Action |
|---|---|
| Mon | Email partnerships@firstbase.io for Partner API access. Sign up at firstbase.io. Email 3 specialty insurance brokers (Hagerty, Chubb, Travelers high-value). Email 3 securities lawyers in FL. |
| Tue | Phone screens with returning lawyers + insurance brokers. Visit 2 candidate Miami storage facilities. |
| Wed | Sign engagement letters with lawyer + CPA. Schedule SEC counsel review call. |
| Thu | Sign storage facility LOI. Begin RYDA LLC formation via Firstbase (Delaware). |
| Fri | Kick off SEC review on Co-Owner Agreement + Vehicle LLC OA templates we already drafted in code. |
| Sat–Sun | Claim social handles, upload profile pic, schedule first 5 IG posts from `docs/social-launch-playbook.md`. |

## Updated tracker file

The XLSX with 44 status updates + recomputed dashboard is at:

```
ryda-web/docs/Ryda Operational Tracker_v01-with-status.xlsx
```

Original file in `~/Downloads/` left untouched. Open the new file in
Excel/Numbers — Status column reflects current state, Notes column
points at specific files/commits where applicable.
