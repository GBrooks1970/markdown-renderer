/**
 * Responsibility: shared E2E fixture loading — open the page with the File
 * System Access API disabled and feed a folder through the `webkitdirectory`
 * fallback via Playwright's file chooser.
 *
 * Extracted from renderer.spec.ts so the accessibility lane
 * (accessibility.spec.ts) reaches its states through exactly the same
 * pipeline the functional tests prove. See docs/design-document.md §8 for
 * why the fallback path is the automatable one.
 */
import { expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export const sampleDir = fileURLToPath(new URL('../sample-docs', import.meta.url));

/** Load the page with the FS Access API disabled, then choose `dir` via the fallback. */
export async function openFolder(page: Page, dir: string = sampleDir): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', { value: undefined, configurable: true });
  });
  await page.goto('/');

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /choose folder/i }).click(),
  ]);
  await chooser.setFiles(dir);

  // Confirm we genuinely exercised the fallback path.
  await expect(page.locator('#folder-path')).toHaveValue(/fallback picker/);
}
