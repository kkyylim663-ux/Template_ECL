import { defineConfig } from '@playwright/test';

/**
 * Smoke suite. Uses the installed Chrome channel rather than downloading a
 * browser, and reuses a running `pnpm start` when there is one — so `pnpm test`
 * after `pnpm build` needs no extra setup.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE ?? 'http://127.0.0.1:3000',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'pnpm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    // The settle route is mock-mode only (like /dev/wallet); this keeps a run
    // able to drive it even if someone builds with NEXT_PUBLIC_USE_MOCK=0.
    env: { ENABLE_MOCK_SETTLE: '1' },
  },
});
