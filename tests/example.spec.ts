// Smoke tests against the RYDA marketing surface. Validates that the
// rental-first restructure (Aug 2026 pivot: landing story on /, browse
// grid at /rent, lead-gen how-it-works) plus the surviving asset-detail
// and learn-hub surfaces render correctly post-deploy.
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
    await expect(page.getByText(/never through ryda/i).first()).toBeVisible();
  });

  test('parked co-ownership program keeps its quiet pointer', async ({
    page,
  }) => {
    await page.goto('/how-it-works');
    // The 2027 waitlist pointer at the end of the page — one of the
    // two sanctioned co-ownership references (the other is the
    // footer's Cars column link).
    await expect(
      page.getByRole('link', { name: /founding member waitlist/i }),
    ).toBeVisible();
  });
});

test.describe('asset detail page', () => {
  test('Ferrari 458 listing page renders title + ops disclosure', async ({
    page,
  }) => {
    await page.goto('/portfolio/f458');
    // Listing title (year prefix from callsite, name from Vehicle.name).
    await expect(
      page.getByRole('heading', { name: /ferrari 458/i }).first(),
    ).toBeVisible();
    // Ops disclosure block — shipped on every listing.
    await expect(page.getByText(/care & custody/i).first()).toBeVisible();
    // Live market embed section heading (classic.com widget).
    await expect(page.getByText(/live market data/i).first()).toBeVisible();
  });
});

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
