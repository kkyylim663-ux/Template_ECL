import { readdirSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/**
 * T77: the e2e run is four journey suites plus the visual-regression suite —
 * one Playwright project per suite:
 *
 *   smoke   every public route answers; shell, metadata, keyboard, a11y
 *   game    browsing the lobbies, the Play Now gate and the mock game flows
 *   member  sign-in, transfer, deposits, withdrawals, the account pages
 *   content the content pages
 *   visual  the desktop/mobile screenshot baselines
 *
 * `pnpm test:e2e` (scripts/run-e2e-suites.mjs) runs the suites at once: each
 * gets its own `next start` on its own port and its own `MOCK_DATA_DIR`, so no
 * two suites can share a writable mock fixture. Inside a suite tests still run
 * serially (workers: 1) — one shared fixture directory per suite needs that.
 *
 * With no E2E_SUITE set, everything runs as one project on :3000 against
 * `.mock-data` (the pre-T77 behaviour) for ad-hoc runs like
 * `pnpm exec playwright test tests/e2e/visual.spec.ts`.
 */

const SUITES: Record<string, { port: number; specs: string[] }> = {
  smoke: {
    port: 3101,
    specs: [
      'smoke.spec.ts',
      'a11y.spec.ts',
      'keyboard.spec.ts',
      'mobile.spec.ts',
      'screenshots.spec.ts',
      'seo.spec.ts',
      'i18n.spec.ts',
      'i18n-coverage.spec.ts',
      'cache-headers.spec.ts',
      'error-boundary.spec.ts',
      'sentry-off.spec.ts',
    ],
  },
  game: {
    port: 3102,
    specs: [
      'game-flow.spec.ts',
      'launch-gate.spec.ts',
      'launch-adapter.spec.ts',
      'ranking-live.spec.ts',
      'numbergame.spec.ts',
      'prediction.spec.ts',
      'p5-flow.spec.ts',
    ],
  },
  member: {
    port: 3103,
    specs: [
      'auth-interaction.spec.ts',
      'register-account.spec.ts',
      'header-session.spec.ts',
      // Added while T77 was in flight (a login-then-navigate regression spec,
      // 2026-10-18): the coverage guard below refuses to run while any spec is
      // unassigned, so new specs must be placed here when they land.
      'login-then-navigate.spec.ts',
      'transfer.spec.ts',
      'deposit.spec.ts',
      'deposit-bank.spec.ts',
      'deposit-receipt.spec.ts',
      'deposit-promo.spec.ts',
      'deposit-gateway.spec.ts',
      'deposit-credit.spec.ts',
      'withdrawal.spec.ts',
      'withdrawal-settle.spec.ts',
      'banking-details.spec.ts',
      'profile.spec.ts',
      'inbox.spec.ts',
      'history.spec.ts',
      'pending.spec.ts',
      'wallet-consistency.spec.ts',
      'dev-wallet.spec.ts',
      'rebates.spec.ts',
      'achievement.spec.ts',
      'tickets.spec.ts',
      'voucher.spec.ts',
      'p4-flow.spec.ts',
      'member-flow.spec.ts',
    ],
  },
  content: {
    port: 3104,
    specs: ['content.spec.ts'],
  },
  visual: {
    port: 3105,
    specs: ['visual.spec.ts'],
  },
};

/** Every spec belongs to exactly one suite — a typo or a new file must not hide. */
{
  const onDisk = readdirSync('tests/e2e').filter((f) => f.endsWith('.spec.ts'));
  const assigned = Object.entries(SUITES).flatMap(([name, s]) => s.specs.map((f) => [f, name]));
  const seen = new Map<string, string>();
  for (const [file, suite] of assigned) {
    const prev = seen.get(file);
    if (prev) throw new Error(`playwright.config: ${file} is in both ${prev} and ${suite}`);
    seen.set(file, suite);
  }
  const missing = onDisk.filter((f) => !seen.has(f));
  const stale = [...seen.keys()].filter((f) => !onDisk.includes(f));
  if (missing.length) throw new Error(`playwright.config: not in any suite: ${missing.join(', ')}`);
  if (stale.length) throw new Error(`playwright.config: listed but missing on disk: ${stale.join(', ')}`);
}

const suiteName = (process.env.E2E_SUITE ?? '').trim();
const suite = suiteName ? SUITES[suiteName] : undefined;
if (suiteName && !suite) {
  throw new Error(`unknown E2E_SUITE "${suiteName}" — expected one of ${Object.keys(SUITES).join(', ')}`);
}

const port = suite ? Number(process.env.E2E_PORT) || suite.port : 3000;
const mockDir = suite ? `.mock-data/${suiteName}` : '.mock-data';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  /**
   * The T40 baselines were captured before the suites existed, so their file
   * names carry no project suffix — keep that path stable in every project.
   */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}',
  fullyParallel: false,
  workers: 1,
  outputDir: suite ? `test-results/${suiteName}` : 'test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: suite ? `playwright-report/${suiteName}` : 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE ?? `http://127.0.0.1:${port}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    /** T77: a failed test keeps its trace in test-results/<suite>/ (replay with `playwright show-trace`). */
    trace: 'retain-on-failure',
  },
  webServer: {
    command: suite ? `pnpm exec next start -p ${port}` : 'pnpm start',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    // The settle route is mock-mode only (like /dev/wallet); this keeps a run
    // able to drive it even if someone builds with NEXT_PUBLIC_USE_MOCK=0.
    // MOCK_DATA_DIR gives the suite its own writable mock fixtures (T77).
    env: { ENABLE_MOCK_SETTLE: '1', MOCK_DATA_DIR: mockDir },
  },
  projects: suite ? [{ name: suiteName, testMatch: suite.specs }] : [{ name: 'all' }],
});
