/**
 * Responsibility: define the single Playwright toolchain for the browser
 * end-to-end tests, and start the static page through a dependency-free dev
 * server so the tests exercise the same boundary a user reaches.
 *
 * Pedagogical decision: the File System Access API picker is a native OS dialog
 * that cannot be automated, so the E2E suite drives the `webkitdirectory`
 * fallback path (the picker is disabled per-test). This covers the same
 * enumeration -> render -> resolve pipeline. See docs/design-document.md §8.
 */
import { defineConfig, devices } from '@playwright/test';

const port = Number.parseInt(process.env.MR_PORT ?? '4180', 10);
const baseUrl = process.env.MR_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: baseUrl,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: baseUrl + '/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { MR_PORT: String(port) },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
