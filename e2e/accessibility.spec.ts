/**
 * Responsibility: the accessibility evidence lane (MR-09, portfolio P-08) —
 * axe-core scans of four representative UI states against WCAG 2.0/2.1 A/AA
 * rule tags. The states, tags, exclusions, and waiver policy are fixed by
 * docs/accessibility-lane.md; this spec must not claim more or less.
 *
 * Each test first reaches its state through the same assertions the
 * functional suite uses (a stable DOM makes axe deterministic), then scans.
 * Violations are attached as JSON so a red run is readable straight from the
 * Playwright report.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

import { openFolder } from './fixture.js';

/** The exact WCAG rule tags claimed by docs/accessibility-lane.md §4 (best-practice excluded). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Scan the current state, attach the violations as JSON evidence, and require zero. */
async function expectNoAxeViolations(page: Page, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach('axe-violations', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  expect(results.violations).toEqual([]);
}

test.describe('Accessibility lane (axe-core, WCAG 2.0/2.1 A+AA)', () => {
  // Review R-03 (LOW): axe-core's full-page scan is slow on a cold start (browser +
  // dev-server startup contending for CPU); give this lane headroom the rest of the
  // suite doesn't need, plus one CI retry for the same cold-start variance.
  test.describe.configure({ timeout: 60_000, retries: process.env.CI ? 1 : 0 });

  test('S1 — initial page, no folder chosen', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#refresh-folder')).toBeDisabled();

    await expectNoAxeViolations(page, testInfo);
  });

  test('S2 — tree populated and drilled into a folder', async ({ page }, testInfo) => {
    await openFolder(page);
    await page.locator('.tree-dir > summary', { hasText: 'notes' }).click();
    await expect(page.locator('.file-list__item', { hasText: 'changelog.md' })).toBeVisible();

    await expectNoAxeViolations(page, testInfo);
  });

  test('S3 — document rendered with headings, highlighted code and a table', async ({ page }, testInfo) => {
    await openFolder(page);
    await page.locator('.file-list__item', { hasText: 'index.md' }).click();
    await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
    await expect(page.locator('#content pre code.hljs')).toBeVisible();
    await expect(page.locator('#content table')).toBeVisible();

    await expectNoAxeViolations(page, testInfo);
  });

  test('S4 — filter showing the flat match list', async ({ page }, testInfo) => {
    await openFolder(page);
    await page.locator('#file-filter').fill('guide');
    const items = page.locator('.file-list__item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('guide.md');

    await expectNoAxeViolations(page, testInfo);
  });
});
