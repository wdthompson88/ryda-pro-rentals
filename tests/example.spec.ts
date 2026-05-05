// Smoke tests against the RYDA marketing surface. Validates that
// the Round-2 research work (exit doctrine, Miami peak windows,
// asset detail anatomy, learn hub) renders correctly post-deploy.
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
  test('renders the three-vertical splitter', async ({ page }) => {
    await page.goto('/');
    // The splitter shows three columns: Cars, Boats, Planes.
    // Each renders inside a Link to its vertical landing page.
    await expect(page.getByRole('link', { name: /cars/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /boats/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /planes/i })).toBeVisible();
  });
});

test.describe('how-it-works', () => {
  test('exit doctrine deep-dive renders both paths', async ({ page }) => {
    await page.goto('/how-it-works#exit');
    // Hero of the new section
    await expect(
      page.getByRole('heading', { name: /how you get out, in detail/i }),
    ).toBeVisible();
    // Both path badges
    await expect(page.getByText(/default · planned exit/i)).toBeVisible();
    await expect(page.getByText(/alternate · early transfer/i)).toBeVisible();
    // Doctrine reaffirmation block — three pillars
    await expect(page.getByText(/members vote/i).first()).toBeVisible();
    await expect(page.getByText(/no public market/i)).toBeVisible();
    await expect(page.getByText(/k-1, not 1099-b/i)).toBeVisible();
  });

  test('miami peak-window calendar renders concrete events', async ({
    page,
  }) => {
    await page.goto('/how-it-works#booking');
    await expect(
      page.getByText(/peak protection · miami calendar/i),
    ).toBeVisible();
    // Key events that members would actually plan around. If any of
    // these go missing the calendar lost specificity and we want to
    // catch it.
    await expect(page.getByText(/f1 miami grand prix/i)).toBeVisible();
    await expect(page.getByText(/art basel miami beach/i)).toBeVisible();
    await expect(page.getByText(/holiday week \+ nye/i)).toBeVisible();
  });
});

test.describe('asset detail page', () => {
  test('Ferrari 296 page renders Rally-anatomy editorial sections', async ({
    page,
  }) => {
    await page.goto('/markets/f296');
    // Hashtag-style section eyebrows
    await expect(page.getByText(/#F296 · provenance/i)).toBeVisible();
    await expect(
      page.getByText(/#F296 · originality/i),
    ).toBeVisible();
    // Provenance milestones
    await expect(page.getByText(/built at maranello/i)).toBeVisible();
    await expect(page.getByText(/acquired by ryda/i)).toBeVisible();
    // Listing-card / spec-strip sanity check
    await expect(
      page.getByRole('heading', { name: /ferrari 296/i }).first(),
    ).toBeVisible();
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
