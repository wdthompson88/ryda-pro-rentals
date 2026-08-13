// Smoke tests against the RYDA marketing surface. Validates that the
// rental-first restructure (Aug 2026 pivot: landing story on /, browse
// grid at /rent, lead-gen how-it-works) renders correctly post-deploy.
//
// Run locally:    npm run test:e2e
// Run UI mode:    npm run test:e2e:ui
// Run vs prod:    PLAYWRIGHT_BASE_URL=https://ryda.pro npm run test:e2e
//
// These are smoke tests — they verify the right sections render,
// not that copy is character-perfect. If we change a heading word
// the test should fail loudly, not silently.

import { test, expect } from '@playwright/test';

test.describe('home page', () => {
  test('renders the rental-first landing story', async ({ page }) => {
    await page.goto('/');
    // Hero: rental-first headline + the one CTA into the browse grid.
    await expect(
      page.getByRole('heading', { name: /one request away/i }),
    ).toBeVisible();
    await expect(page.locator('a[href="/rent"]').first()).toBeVisible();
    // Featured fleet section renders its heading.
    await expect(
      page.getByRole('heading', { name: /the cars miami asks for by name/i }),
    ).toBeVisible();
    // How-it-works teaser links through to the full page.
    await expect(
      page.locator('a[href="/how-it-works"]').first(),
    ).toBeVisible();
  });

  test('hero car is not repeated in the featured grid', async ({ page }) => {
    await page.goto('/');
    // Hero image + three featured cards, each a distinct car with a
    // distinct photo. Guards the FEATURED[0]-in-both-places regression.
    const detailLinks = page.locator('a[href^="/rent/"]');
    await expect(detailLinks).toHaveCount(4);
    const hrefs = await detailLinks.evaluateAll((els) =>
      els.map((el) => el.getAttribute('href')),
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const photoSrcs = await page
      .locator('a[href^="/rent/"] img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')));
    expect(new Set(photoSrcs).size).toBe(photoSrcs.length);
  });
});

test.describe('how-it-works', () => {
  test('renders the three-step lead-gen model', async ({ page }) => {
    await page.goto('/how-it-works');
    // Hero of the rental-first page.
    await expect(
      page.getByRole('heading', { name: /one request\. a named operator/i }),
    ).toBeVisible();
    // The three steps.
    await expect(page.getByText(/request with dates/i).first()).toBeVisible();
    await expect(page.getByText(/operator confirms/i).first()).toBeVisible();
    // Commission-transparency section — the whole business model.
    await expect(
      page.getByRole('heading', { name: /referral commission/i }),
    ).toBeVisible();
    // Where the money goes. The page must describe the mechanism the code
    // actually implements — a fee-only Stripe Connect direct charge against
    // the operator's connected account, with RYDA's cut riding along as
    // application_fee_amount — and must never promise that RYDA holds,
    // guarantees, or never touches payment. AGENTS.md forbids that claim
    // outright, so this asserts the mechanism rather than a reassurance.
    await expect(
      page.getByText(/collected as a platform fee/i).first(),
    ).toBeVisible();
    // A third assertion here pinned /straight to the operator/i. That
    // phrasing is false and the assertion was holding it in place:
    // PARTNER_INQUIRY_EMAILS in src/lib/partner-contacts.ts is empty —
    // its one entry is commented out pending a signed referral
    // agreement — so partnerInquiryEmail() returns the RYDA team
    // fallback for every listing and each lead is triaged and passed on
    // by hand. A smoke test may not require a page to keep saying
    // something the code contradicts, so it is gone rather than
    // reworded; the routing copy itself is the copy pass's to fix.
  });
});

// The 'learn hub' describe block lived here. It pinned the /learn
// co-ownership curriculum (the "How co-ownership works" heading and the
// Understand → Choose → Buy → Drive → Exit stage labels) so a rewrite
// would fail loudly instead of shipping half-done. /learn was not
// rewritten — it was deleted, along with /journal, /events and
// /careers, because all four described a co-ownership business RYDA
// does not run. There is no rental equivalent to re-point these
// assertions at, so the block is gone rather than weakened.
