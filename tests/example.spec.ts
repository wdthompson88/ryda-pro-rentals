// Smoke tests against the RYDA marketing surface. Validates that the
// rental-first restructure (Aug 2026 pivot: landing story on /, browse
// grid at /rent, lead-gen how-it-works) plus the surviving learn hub
// render correctly post-deploy.
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
      page.getByText(/straight to the operator/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/collected as a platform fee/i).first(),
    ).toBeVisible();
  });
});

// NOTE: /learn survives the co-ownership strip by operator decision, but
// its *copy* is still the old co-ownership curriculum and is queued for a
// content audit. This test asserts what the page says today on purpose —
// when the audit rewrites the hub, this spec should fail loudly rather
// than let a half-rewritten page ship unnoticed.
test.describe('learn hub', () => {
  test('renders the 5 stages', async ({ page }) => {
    await page.goto('/learn');
    await expect(
      page.getByRole('heading', { name: /how co-ownership/i }),
    ).toBeVisible();
    // The five stage labels — Understand / Choose / Buy / Drive / Exit
    for (const stage of ['Understand', 'Choose', 'Buy', 'Drive', 'Exit']) {
      await expect(page.getByText(stage, { exact: false }).first()).toBeVisible();
    }
  });
});
