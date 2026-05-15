// Synthetic-buyer end-to-end smoke test.
//
// Walks the entry surfaces of the buy flow on the marketing-demo
// path (no real Stripe charges, no real Supabase persistence, no
// real Stripe Identity / Dropbox Sign integration). Asserts that
// each surface renders the right structure so a regression in any
// step is caught before deploy.
//
// What this test guards (audit Finding #2):
//   - Portfolio listings render and link to detail pages
//   - Vehicle detail page renders title, acquisition badge, order
//     panel, and a working "Buy a share" CTA
//   - Buy flow Step 1 (Review) renders the shares stepper +
//     vehicle summary + Continue
//   - Buy flow Step 2 (Verify) renders the Stripe-Identity KYC
//     entry point (we can't auto-complete KYC without a real
//     Stripe Identity test session — see the manual runbook)
//   - Member-area surfaces (/messages, /votes) render the unauth
//     state correctly when the synthetic buyer is signed out
//
// What it does NOT cover:
//   - Steps 3-5 of the buy flow (Documents, Fund, Confirm) —
//     gated behind KYC completion which requires a real Stripe
//     Identity flow. See docs/SYNTHETIC_BUYER_TEST.md for the
//     manual walk-through.
//   - Real Stripe checkout, Supabase persistence, Dropbox Sign
//     embedded signing, email confirmations.
//
// Run locally:    npm run test:e2e -- synthetic-buyer
// Run vs prod:    PLAYWRIGHT_BASE_URL=https://ryda.pro npm run test:e2e -- synthetic-buyer
// UI mode:        npm run test:e2e:ui synthetic-buyer

import { test, expect } from "@playwright/test";

// First-page-load in dev mode is slow because Turbopack compiles
// pages on demand; the buy flow page can take 8-15s on cold start.
// Bump nav timeout to 60s so cold-compile doesn't trip the test.
test.use({ navigationTimeout: 60_000 });

// Pick a known-stable vehicle. Ferrari 458 is the older, lower-
// price unit in the fleet — least likely to be replaced or have
// shares-available drift that could trip the test.
const SAMPLE_VEHICLE_SYMBOL = "f458";
const SAMPLE_VEHICLE_NAME = /ferrari 458/i;

test.describe("synthetic buyer journey — Cars", () => {
  test("portfolio listings render and link to vehicle detail", async ({
    page,
  }) => {
    await page.goto("/portfolio");
    // The portfolio page renders a grid of vehicle cards. Each card
    // links to /portfolio/<symbol>. We don't enumerate every vehicle
    // — just verify our test target is reachable.
    const link = page
      .getByRole("link", { name: SAMPLE_VEHICLE_NAME })
      .first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(
      new RegExp(`/portfolio/${SAMPLE_VEHICLE_SYMBOL}/?$`, "i"),
    );
  });

  test("vehicle detail page renders title + acquisition badge + order panel", async ({
    page,
  }) => {
    await page.goto(`/portfolio/${SAMPLE_VEHICLE_SYMBOL}`);
    // Title (year prefix from callsite, name from Vehicle.name).
    await expect(
      page.getByRole("heading", { name: SAMPLE_VEHICLE_NAME }).first(),
    ).toBeVisible();
    // Acquisition badge — from #6, defaults to 'Sourced' when not set.
    await expect(page.getByText(/sourced/i).first()).toBeVisible();
    await expect(page.getByText(/acquisition status/i).first()).toBeVisible();
    // Order panel renders the "Reserve N shares directly →"
    // button. Codex round-1 catch: the prior `per share` regex
    // was too broad — also matched the main detail facts so
    // it'd pass even if the OrderPanel disappeared. Scope to
    // the actual reserve button instead.
    await expect(
      page.getByRole("button", { name: /reserve \d+ share/i }).first(),
    ).toBeVisible();
  });

  test("buy flow Step 1 renders the review surface", async ({ page }) => {
    await page.goto(`/portfolio/${SAMPLE_VEHICLE_SYMBOL}/buy`);
    // Step counter.
    await expect(page.getByText(/step 1 of 5/i)).toBeVisible();
    // Vehicle name appears in the review summary.
    await expect(
      page.getByText(SAMPLE_VEHICLE_NAME).first(),
    ).toBeVisible();
    // Continue button to advance to Step 2.
    await expect(
      page.getByRole("button", { name: /continue/i }),
    ).toBeVisible();
  });

  test("buy flow Step 2 renders the KYC verify surface", async ({ page }) => {
    await page.goto(`/portfolio/${SAMPLE_VEHICLE_SYMBOL}/buy`);
    // Step 1 has a terms checkbox that gates the Continue button.
    // Tick it before advancing.
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /continue/i }).click();
    // Step 2 surface.
    await expect(page.getByText(/step 2 of 5/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /verify your identity/i }),
    ).toBeVisible();
    // Codex round-1 catch: also assert the actual KYC entry-point
    // button. The 'disabled Continue' assertion alone would still
    // pass if the Stripe Identity start button disappeared.
    await expect(
      page.getByRole("button", { name: /start identity verification/i }),
    ).toBeVisible();
    // 'Continue to documents' stays disabled until KYC is complete
    // — we can't auto-complete that here (Stripe Identity needs a
    // real session). Asserting the disabled state confirms the
    // gate is active. See docs/SYNTHETIC_BUYER_TEST.md for manual
    // KYC walk-through.
    const continueBtn = page.getByRole("button", {
      name: /continue to documents/i,
    });
    await expect(continueBtn).toBeDisabled();
  });
});

test.describe("member-area unauth states", () => {
  test("/messages renders sign-in CTA when signed out", async ({ page }) => {
    await page.goto("/messages");
    // Page title.
    await expect(
      page.getByRole("heading", { name: /co-owner threads/i }),
    ).toBeVisible();
    const signin = page.locator('a[href="/signin?next=/messages"]');
    const unavailable = page.getByText(/messaging requires the live backend/i);
    await expect(signin.or(unavailable)).toBeVisible();
    if ((await signin.count()) > 0) {
      await expect(signin).toBeVisible();
    }
  });

  test("/votes renders sign-in CTA when signed out", async ({ page }) => {
    await page.goto("/votes");
    await expect(
      page.getByRole("heading", { name: /llc governance votes/i }),
    ).toBeVisible();
    const signin = page.locator('a[href="/signin?next=/votes"]');
    const unavailable = page.getByText(/voting requires the live backend/i);
    await expect(signin.or(unavailable)).toBeVisible();
    if ((await signin.count()) > 0) {
      await expect(signin).toBeVisible();
    }
  });
});
