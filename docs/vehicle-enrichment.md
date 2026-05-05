# RYDA · Vehicle data enrichment

Three data flows feed the vehicle listings:

| Flow | Source | Cost | What it does |
|---|---|---|---|
| **VIN decode** | NHTSA vPIC | Free | Canonical specs from a 17-char VIN |
| **Recall check** | NHTSA recalls API | Free | "0 active recalls" trust signal |
| **Spec sheet + images** | CarsXE | $15/mo (gated) | Richer specs (HP, torque, 0-60, MSRP) + hero/gallery images |
| **Comparable sales** | Manual curation from classic.com / BaT / RM Sotheby's | Human time | Named auction results displayed publicly with full attribution |

## Why no live valuation API?

Researched extensively (KBB, Edmunds, Marketcheck, Smartcar, AutoHub,
CarQuery, Hagerty, Bring a Trailer, classic.com).

**No public REST API gives accurate valuations on RYDA's price
points.** KBB caps near $200K. Marketcheck dealer-comps are
statistically noisy at exotic levels. Hagerty + classic.com + BaT
have the data but don't expose APIs.

**The moat**: hand-curated 3-5 named comparable sales per listing,
refreshed quarterly. Each comp shows the auction house, lot #, sale
date, and outbound link to the original listing. Costs ~5 hours per
quarter at 30 listings — pay a contractor, $500-1,500/quarter. The
result is more credible than any API-driven number because every
data point is a real transaction the buyer can verify.

## What's built

### Free, works out of the box
- `src/lib/vehicle-enrichment/vpic.ts` — `decodeVin()` and `getRecallsForVin()`
- `/api/admin/vin-decode` — POST `{ vin }` returns decoded specs + recall count
- `/admin/vehicle-enrichment` — admin VIN-decode tool

### Gated, scaffolded only
- `src/lib/vehicle-enrichment/carsxe.ts` — `getSpecsByVin()`, `getImagesByVin()`
- Mock-mode by default; set `CARSXE_API_KEY` in Vercel env to switch to live
- Same admin tool above invokes CarsXE if available

### Manual curation
- Migration `0023_vehicle_comparables.sql` — `vehicle_comparables` table, public read, admin write
- `/admin/comparables` — list of all comps grouped by vehicle, shows count per vehicle
- `/admin/comparables/[vehicle_symbol]` — add/edit/delete comps for one vehicle
- `RecentComparableSales` component on `/markets/[symbol]` — public display with attribution
- ISR with 5-min revalidate so newly-added comps surface within minutes

## How to use it

### When a new car arrives in the fleet

1. Open `/admin/vehicle-enrichment`
2. Paste the 17-char VIN → click Decode
3. Verify the decoded fields match what you have (year/make/model/engine)
4. Note the recall count — display "0 open recalls" as a trust signal
   in member-facing communications when it's zero
5. (Optional, if `CARSXE_API_KEY` set) the page shows the CarsXE
   spec sheet (HP, torque, 0-60) — copy into market-data.ts

### To curate comparables (quarterly cadence)

1. Open `/admin/comparables` to see which vehicles need fresh comps
2. Click into a vehicle (e.g. F296 — Ferrari 296 GTB)
3. In a new tab, open `https://www.classic.com/m/ferrari/296-gtb/`
4. Find 3-5 recent sales (last ~12 months preferred) — note auction
   house, date, lot #, sale price, source URL
5. Paste each into the form on the admin page
6. Save — the comp appears on the public listing within ~5 minutes
7. Repeat per vehicle

Time per session: ~5-10 min per vehicle, ~3-5 hours total per quarter
at 30 listings.

## Going live with CarsXE (optional)

CarsXE is a $15/mo upgrade that gives you:
- Richer spec sheets per VIN (HP, torque, 0-60, top speed, MSRP)
- Vehicle hero/gallery images (useful when you don't have your own
  professional photography yet)

Steps:
1. Sign up at https://api.carsxe.com (their pricing page is sometimes
   broken — start a chat with sales for current pricing)
2. Pick the Grow plan ($15/mo, 100K calls — overkill for our volume)
3. Generate an API key in their dashboard
4. Add `CARSXE_API_KEY=<key>` to Vercel env (production scope)
5. Optionally `CARSXE_MODE=mock` to keep it in mock-mode anyway
   (default behavior when key is set is live)
6. Redeploy
7. Test at `/admin/vehicle-enrichment` — paste a VIN, the CarsXE
   block should now show real data

## What was deliberately skipped

- **Marketcheck** ($299/mo entry, free tier too restrictive)
- **KBB Developer** (partner-only, doesn't cover exotics anyway)
- **Edmunds** (public API retired Feb 2018, partner-only)
- **Smartcar** (telematics, not valuation — wrong product)
- **AutoHub / CarQuery** (aggregate KBB which has the same exotic gap)
- **Hagerty / classic.com / BaT data licensing** (worth a sales
  conversation when fleet hits ~50 listings; too expensive at MVP)
- **Scraping classic.com or BaT** (TOS-prohibited; legally fragile)

## Future considerations

- **Hagerty partnership** — RYDA's profile (luxury fractional,
  insurance-adjacent) makes us a credible data licensee. Worth
  emailing biz dev when fleet ≥30 cars.
- **classic.com data licensing** — same. Their data IS the gold
  standard for our segment; they just don't self-serve. Sales
  conversation, $10-50K/yr ballpark.
- **VIN field on Vehicle type** — if we want per-vehicle recall
  status surfaced publicly, we need to add an optional `vin` field
  to Vehicle. Hold for now (VINs surface privacy concerns; better
  to fetch admin-side and surface the count without the VIN itself).
