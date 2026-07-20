/**
 * Responsibility: end-to-end proof that the page lists (as a folder tree),
 * renders, filters, refreshes and cross-navigates markdown through the real
 * browser boundary.
 *
 * Pedagogical decision: the File System Access API picker is a native dialog
 * that cannot be driven, so each test disables it (forcing the
 * `webkitdirectory` fallback) and feeds a folder via Playwright's file
 * chooser. This exercises the same pipeline as the API path — and the
 * fallback's refresh behaviour (re-open the picker, DR-MR-08) is exactly the
 * path a chooser can drive, so FR-9 is automatable end-to-end here.
 */
import { expect, test } from '@playwright/test';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { openFolder, sampleDir } from './fixture.js';

test.describe('Markdown Renderer', () => {
  test('refresh is disabled until a folder is chosen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#refresh-folder')).toBeDisabled();
  });

  test('shows the folder layout as a tree: dirs first, nested files hidden until expanded', async ({ page }) => {
    await openFolder(page);

    // Root level: the notes folder sorts before the two root files (FR-10).
    const rootItems = page.locator('#file-list > li');
    await expect(rootItems).toHaveCount(3);
    await expect(rootItems.nth(0).locator('> details.tree-dir > summary')).toHaveText('notes');
    await expect(rootItems.nth(1)).toContainText('guide.md');
    await expect(rootItems.nth(2)).toContainText('index.md');

    // Folders start collapsed (FR-11); no node exists for assets/ (no markdown).
    await expect(page.locator('.file-list__item', { hasText: 'changelog.md' })).toBeHidden();
    await expect(page.locator('.tree-dir > summary', { hasText: 'assets' })).toHaveCount(0);
  });

  test('drills down into a folder and renders a nested file', async ({ page }) => {
    await openFolder(page);

    await page.locator('.tree-dir > summary', { hasText: 'notes' }).click();
    const nested = page.locator('.file-list__item', { hasText: 'changelog.md' });
    await expect(nested).toBeVisible();

    await nested.click();
    await expect(page.locator('#content h1')).toHaveText('Changelog');
    await expect(page.locator('details.tree-dir[data-path="notes"]')).toHaveAttribute('open', '');
    await expect(nested).toHaveClass(/is-active/);
  });

  test('renders a selected file with headings, a highlighted code block and a table', async ({ page }) => {
    await openFolder(page);
    await page.locator('.file-list__item', { hasText: 'index.md' }).click();

    await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
    await expect(page.locator('#content pre code.hljs')).toBeVisible(); // highlight.js applied
    await expect(page.locator('#content table')).toBeVisible();
  });

  test('a file row is keyboard-focusable and Enter activates it', async ({ page }) => {
    await openFolder(page);

    const row = page.locator('.file-list__item', { hasText: 'index.md' });
    await row.focus();
    await expect(row).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
    await expect(row).toHaveClass(/is-active/);
  });

  test('filters as a flat list and restores the tree (with expansion) on clear', async ({ page }) => {
    await openFolder(page);
    await page.locator('.tree-dir > summary', { hasText: 'notes' }).click(); // expand first

    await page.locator('#file-filter').fill('guide');
    const items = page.locator('.file-list__item');
    await expect(items).toHaveCount(1);            // flat matched list (DR-MR-11)
    await expect(items.first()).toContainText('guide.md');
    await expect(page.locator('.tree-dir')).toHaveCount(0);

    await page.locator('#file-filter').fill('');   // clear → tree returns, still expanded
    await expect(page.locator('details.tree-dir[data-path="notes"]')).toHaveAttribute('open', '');
    await expect(page.locator('.file-list__item', { hasText: 'changelog.md' })).toBeVisible();
  });

  test('resolves a relative image to a same-folder blob URL', async ({ page }) => {
    await openFolder(page);
    await page.locator('.file-list__item', { hasText: 'guide.md' }).click();

    await expect(page.locator('#content img')).toHaveAttribute('src', /^blob:/);
  });

  test('navigates internal markdown links within the viewer', async ({ page }) => {
    await openFolder(page);
    await page.locator('.file-list__item', { hasText: 'guide.md' }).click();

    await page.locator('#content a', { hasText: 'home page' }).first().click();
    await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
  });

  test('reveals a nested file in the tree when reached via an internal link', async ({ page }) => {
    await openFolder(page);
    await page.locator('.file-list__item', { hasText: 'index.md' }).click();

    await page.locator('#content a', { hasText: 'changelog' }).click();
    await expect(page.locator('#content h1')).toHaveText('Changelog');
    // FR-11 reveal: the collapsed ancestor auto-expanded and the entry is active.
    await expect(page.locator('details.tree-dir[data-path="notes"]')).toHaveAttribute('open', '');
    await expect(page.locator('.file-list__item', { hasText: 'changelog.md' })).toHaveClass(/is-active/);
  });

  test('opens external links in a new tab', async ({ page }) => {
    await openFolder(page);
    await page.locator('.file-list__item', { hasText: 'index.md' }).click();

    const external = page.locator('#content a', { hasText: 'the marked project' });
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
  });

  test('refresh picks up a newly added file and keeps the open document', async ({ page }) => {
    // The fallback FileList is a snapshot, so refresh re-opens the picker
    // (DR-MR-08) — which is exactly what a Playwright file chooser can drive.
    const dir = mkdtempSync(join(tmpdir(), 'md-renderer-e2e-'));
    try {
      cpSync(sampleDir, dir, { recursive: true });

      await openFolder(page, dir);
      await expect(page.locator('#refresh-folder')).toBeEnabled();
      await page.locator('.file-list__item', { hasText: 'index.md' }).click();
      await page.locator('.tree-dir > summary', { hasText: 'notes' }).click(); // expand to prove state survives

      writeFileSync(join(dir, 'brand-new.md'), '# Brand New\n\nAdded after the first pick.\n');

      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('#refresh-folder').click(),
      ]);
      await chooser.setFiles(dir);

      // FR-9: the new file appears, the open document stays selected and rendered,
      // and the expanded folder stays expanded.
      await expect(page.locator('.file-list__item', { hasText: 'brand-new.md' })).toBeVisible();
      await expect(page.locator('.file-list__item.is-active')).toContainText('index.md');
      await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
      await expect(page.locator('details.tree-dir[data-path="notes"]')).toHaveAttribute('open', '');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('refresh reports a vanished open document', async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), 'md-renderer-e2e-'));
    try {
      cpSync(sampleDir, dir, { recursive: true });
      await openFolder(page, dir);
      await page.locator('.file-list__item', { hasText: 'guide.md' }).click();
      await expect(page.locator('#content h1')).toHaveText('Guide');

      rmSync(join(dir, 'guide.md'));

      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('#refresh-folder').click(),
      ]);
      await chooser.setFiles(dir);

      await expect(page.locator('.file-list__item', { hasText: 'guide.md' })).toHaveCount(0);
      await expect(page.locator('#content .notice')).toContainText('no longer exists');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
