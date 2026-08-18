// Mirror the static partner fleet (src/lib/partner-fleet.ts) into
// public.rental_listings, so every /rent/[symbol] URL that renders today
// gains a DB listing row — and therefore a calendar and a server-priced
// quote.
//
// Usage:
//   npx tsx scripts/seed-rental-listings.ts            # dry run (default)
//   npx tsx scripts/seed-rental-listings.ts --apply    # write
//
// Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (auto-loaded from .env.local at project root, grant-admin.ts's idiom).
//
// WHY THIS SCRIPT EXISTS
// 0044 gave the marketplace a listings table; nothing has ever written to
// it. Meanwhile /rent and /rent/[symbol] resolve from the hand-authored
// PARTNER_VEHICLES array, and GET /api/rental-availability/[slug] resolves
// a slug to a rental_listings row. With the table empty every car answers
// `{ available: false, reason: 'not_configured' }`, the date picker falls
// back to plain date inputs, and the booking loop — which is fully built —
// is unreachable on all 37 cars. This closes exactly that gap and nothing
// else.
//
// DRY RUN IS THE DEFAULT, deliberately. This writes to the same table the
// public browse path reads, and `status = 'active'` is what makes a row
// publicly visible (0044's RLS). A seed that silently published 37 cars on
// an operator's behalf is not a seed, it is a deploy.
//
// ── What this DOES NOT seed, and why ────────────────────────────────────
//
// PHOTOS. rental_listing_photos and hero_photo_path stay empty. 0044
// constrains hero_photo_path to `partner_id/%` inside the
// rental-car-photos bucket, so writing one would require uploading 37
// cars' galleries first — and the static heroes are absolute
// static.wixstatic.com URLs, not files this script holds. /rent/[symbol]
// still renders photos through getPartnerGallery(), so nothing regresses:
// the listing row supplies the CALENDAR and the PRICE, the static array
// keeps supplying the pictures. Migrating media is its own task.
//
// VIN. Left null (0044 allows it). The static array has no VINs. A
// fabricated VIN would fail 0044's 17-char check or, worse, pass it and
// become a fake identifier on a real car.
//
// AVAILABILITY ROWS. None. 0046 is default-open: a listing with no
// rental_availability rows is fully open inside its operating window,
// which for a listing that sets no window is "today through
// booking_horizon_days" (180). That is the correct starting state — the
// operator subtracts days they cannot serve. See the WARNING the script
// prints on --apply.

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";
import { PARTNER_VEHICLES, type PartnerVehicle } from "../src/lib/partner-fleet";

// ── env ─────────────────────────────────────────────────────────────────

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run `vercel env pull .env.local` first (AGENTS.md § Secrets).",
  );
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");

// The operator every static car belongs to. PartnerVehicle.partner is
// typed to this one literal, so the array cannot currently carry a second
// operator — but the lookup goes through the value rather than a constant
// so adding one is a data change, not a code change.
const PARTNER_NAME = "GM LUXE";

// ── mapping ─────────────────────────────────────────────────────────────

// "100 mi/day" → 100. Returns null for an absent or unparseable string
// rather than guessing: 0044 checks miles_included_per_day > 0, and a
// wrong mileage allowance is a term of the rental.
function milesPerDay(v: PartnerVehicle): number | null {
  if (!v.milesIncluded) return null;
  const m = v.milesIncluded.match(/(\d[\d,]*)\s*mi/i);
  if (!m) return null;
  const n = Number.parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Dollars → cents. The static array holds whole dollars; Math.round
// guards a future fractional rate rather than truncating it.
function cents(dollars: number): number {
  return Math.round(dollars * 100);
}

type ListingSeed = {
  partner_id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  category: string;
  market: string;
  daily_rate_cents: number;
  regular_rate_cents: number | null;
  miles_included_per_day: number | null;
  status: string;
};

function toSeed(v: PartnerVehicle, partnerId: string): ListingSeed {
  const daily = cents(v.dailyRate);
  const regular = cents(v.regularRate);
  return {
    partner_id: partnerId,
    slug: v.slug,
    make: v.make,
    model: v.model,
    year: v.year ?? null,
    // 0044 keeps category free text; PartnerCategory's values ("Exotic",
    // "SUV", …) are already the vocabulary /rent filters on, so they pass
    // through unchanged rather than being re-coded into a second one.
    category: v.category,
    market: v.market,
    daily_rate_cents: daily,
    // 0044 checks regular_rate_cents >= daily_rate_cents. The static array
    // is meant to hold a sticker above the discounted rate, but a data
    // entry error the other way round would fail the insert for the whole
    // batch — so an inverted pair drops the sticker rather than blocking
    // the car. Reported in the summary.
    regular_rate_cents: regular >= daily ? regular : null,
    miles_included_per_day: milesPerDay(v),
    // 'active' is what 0044's RLS makes publicly readable, and these cars
    // are already public on /rent today — seeding them 'draft' would show
    // a calendar to nobody.
    status: "active",
  };
}

// ── run ─────────────────────────────────────────────────────────────────

async function main() {
  const db = createClient(url!, serviceKey!, {
    auth: { persistSession: false },
  });

  // 1) The operator row. Never created here: partners carries
  //    commission_rate and the Connect account id, so conjuring one would
  //    invent commercial terms for a real operator. If it is missing, the
  //    /admin/partners flow is where it belongs.
  const partnerRes = await db
    .from("partners")
    .select("id, name, status")
    .eq("name", PARTNER_NAME)
    .maybeSingle();

  if (partnerRes.error) {
    console.error(`Reading partners failed: ${partnerRes.error.message}`);
    console.error(
      "If this says the relation does not exist, migration 0041 has not been applied.",
    );
    process.exit(1);
  }
  if (!partnerRes.data) {
    console.error(
      `No partners row named ${JSON.stringify(PARTNER_NAME)}.\n` +
        "Create the operator in /admin/partners first — this script will not\n" +
        "invent commission terms or a Stripe account for a real operator.",
    );
    process.exit(1);
  }

  const partnerId = partnerRes.data.id as string;
  console.log(`Operator: ${PARTNER_NAME} (${partnerId})`);
  if (partnerRes.data.status !== "active") {
    console.log(`  note: partner status is '${partnerRes.data.status}'`);
  }

  // 2) What already exists, so a re-run reports rather than duplicating.
  //    slug is unique on rental_listings (0044), which is what makes this
  //    script idempotent.
  const existingRes = await db
    .from("rental_listings")
    .select("slug")
    .in(
      "slug",
      PARTNER_VEHICLES.map((v) => v.slug),
    );

  if (existingRes.error) {
    console.error(`Reading rental_listings failed: ${existingRes.error.message}`);
    console.error(
      "If this says the relation does not exist, migration 0044 has not been applied.",
    );
    process.exit(1);
  }

  const existing = new Set((existingRes.data ?? []).map((r) => r.slug as string));
  const rows = PARTNER_VEHICLES.map((v) => toSeed(v, partnerId));
  const fresh = rows.filter((r) => !existing.has(r.slug));
  const stickerDropped = rows.filter((r) => r.regular_rate_cents === null);
  const noMileage = rows.filter((r) => r.miles_included_per_day === null);

  console.log(
    `\n${PARTNER_VEHICLES.length} static cars · ${existing.size} already seeded · ${fresh.length} to insert`,
  );
  if (stickerDropped.length > 0) {
    console.log(
      `  ${stickerDropped.length} dropped an inverted sticker rate: ${stickerDropped
        .map((r) => r.slug)
        .join(", ")}`,
    );
  }
  if (noMileage.length > 0) {
    console.log(`  ${noMileage.length} carry no mileage allowance`);
  }

  if (fresh.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  if (!apply) {
    console.log("\n── DRY RUN — nothing written. Re-run with --apply ──\n");
    for (const r of fresh.slice(0, 5)) {
      console.log(
        `  ${r.slug.padEnd(34)} ${r.make} ${r.model}  ` +
          `$${(r.daily_rate_cents / 100).toLocaleString()}/day  ` +
          `${r.category}  ${r.miles_included_per_day ?? "—"} mi/day`,
      );
    }
    if (fresh.length > 5) console.log(`  … and ${fresh.length - 5} more`);
    return;
  }

  // 3) Write. One statement, so a constraint violation on any car rolls
  //    the whole batch back rather than leaving a half-seeded fleet whose
  //    remainder a re-run would have to reconcile.
  const ins = await db.from("rental_listings").insert(fresh).select("slug");
  if (ins.error) {
    console.error(`\nInsert failed (nothing written): ${ins.error.message}`);
    process.exit(1);
  }

  console.log(`\nInserted ${ins.data?.length ?? 0} listings.`);
  console.log(
    "\nWARNING — every one is now PUBLIC and, per 0046's default-open model,\n" +
      "bookable for the next 180 days. No operator has set a blackout, because\n" +
      "there is no editor for them to set one in yet. Until that ships, an\n" +
      "approved request is the only thing that takes a day off the calendar.",
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
