/**
 * Responsibility: end-to-end proof that the page lists, renders, filters and
 * cross-navigates markdown through the real browser boundary.
 *
 * Pedagogical decision: the File System Access API picker is a native dialog
 * that cannot be driven, so each test disables it (forcing the
 * `webkitdirectory` fallback) and feeds the bundled sample-docs/ folder via
 * Playwright's file chooser. This exercises the same pipeline as the API path.
 */
import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const sampleDir = fileURLToPath(new URL('../sample-docs', import.meta.url));

/** Load the page with the FS Access API disabled, then choose sample-docs/ via the fallback. */
async function openSampleFolder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true });
  });
  await page.goto('/');

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /choose folder/i }).click(),
  ]);
  await chooser.setFiles(sampleDir);

  // Confirm we genuinely exercised the fallback path.
  await expect(page.locator('#folder-path')).toHaveValue(/fallback picker/);
}

test.describe('Markdown Renderer', () => {
  test('lists only markdown files from the chosen folder, sorted', async ({ page }) => {
    await openSampleFolder(page);

    const items = page.locator('.file-list__item');
    await expect(items).toHaveCount(2); // guide.md, index.md — not the .svg
    await expect(items.nth(0)).toContainText('guide.md');
    await expect(items.nth(1)).toContainText('index.md');
  });

  test('renders a selected file with headings, a highlighted code block and a table', async ({ page }) => {
    await openSampleFolder(page);
    await page.locator('.file-list__item', { hasText: 'index.md' }).click();

    await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
    await expect(page.locator('#content pre code.hljs')).toBeVisible(); // highlight.js applied
    await expect(page.locator('#content table')).toBeVisible();
  });

  test('filters the sidebar by filename', async ({ page }) => {
    await openSampleFolder(page);

    await page.locator('#file-filter').fill('guide');
    const items = page.locator('.file-list__item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('guide.md');
  });

  test('resolves a relative image to a same-folder blob URL', async ({ page }) => {
    await openSampleFolder(page);
    await page.locator('.file-list__item', { hasText: 'guide.md' }).click();

    await expect(page.locator('#content img')).toHaveAttribute('src', /^blob:/);
  });

  test('navigates internal markdown links within the viewer', async ({ page }) => {
    await openSampleFolder(page);
    await page.locator('.file-list__item', { hasText: 'guide.md' }).click();

    await page.locator('#content a', { hasText: 'home page' }).first().click();
    await expect(page.locator('#content h1')).toHaveText('Sample Docs — Home');
  });

  test('opens external links in a new tab', async ({ page }) => {
    await openSampleFolder(page);
    await page.locator('.file-list__item', { hasText: 'index.md' }).click();

    const external = page.locator('#content a', { hasText: 'the marked project' });
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
  });
});
