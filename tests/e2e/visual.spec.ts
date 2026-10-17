import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T40 visual regression: every route at desktop 1440×900 and mobile 375×812.
 * Baselines live in tests/e2e/visual.spec.ts-snapshots/. Regenerate with
 * `pnpm playwright test visual --update-snapshots` only after a reviewed change.
 */
test.beforeAll(async () => {
  // The rebates page (T63) draws a records table backed by a writable store, and
  // a claim is final — so the captures pin the seeded state by dropping the
  // runtime file (the store falls back to mocks/rebate-claims.json). The
  // achievement page (T64) and the ticket centre (T65) have the same shape of
  // store.
  await rm(join(process.cwd(), '.mock-data', 'rebate-claims.json'), { force: true });
  await rm(join(process.cwd(), '.mock-data', 'achievement-claims.json'), { force: true });
  await rm(join(process.cwd(), '.mock-data', 'ticket-store.json'), { force: true });
  await rm(join(process.cwd(), '.mock-data', 'voucher-store.json'), { force: true });
});
const ROUTES = [
  '/my',
  '/my/slots?provider=pragmatic&tab=all',
  '/my/fast-game',
  '/my/livecasino',
  '/my/sports',
  '/my/esports',
  '/my/4d',
  '/my/numbergame',
  '/my/prediction',
  '/my/ranking-board',
  '/my/promotion',
  '/my/promotion/pr-welcome-188',
  '/my/update',
  '/my/update/up-061',
  '/my/vip',
  '/my/sponsor',
  '/my/about',
  '/my/contact',
  '/my/tnc',
  '/my/betting-rules',
  '/my/faq',
  '/my/faq/gettingstart',
  '/my/faq/finance',
  '/my/faq/statement',
  '/my/faq/games',
  '/my/faq/events',
  '/my/faq/promotions',
  '/my/faq/contactus',
  '/my/faq/downloadapp',
  '/my/login',
  '/my/register',
  '/my/forgot-password',
];

const MEMBER_ROUTES = [
  '/my/account/deposit',
  '/my/account/withdrawal',
  '/my/account/transfer',
  '/my/account/history',
  '/my/account/pending',
  '/my/account/inbox',
  '/my/account/rebates',
  '/my/account/achievement',
  '/my/account/tickets',
  '/my/account/profile',
  // T57: Banking Details — the bound-account table and its add form.
  '/my/account/banks',
  // T54: the deposit sub-pages — the gateway window's empty state and the four
  // result layouts (the no-order variants are deterministic).
  '/my/account/deposit/gateway?order=PG-MISSING',
  '/my/account/deposit/result?status=success',
  '/my/account/deposit/result?status=failed',
  '/my/account/deposit/result?status=processing',
  '/my/account/deposit/result?status=bogus',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

function slug(route: string) {
  return (
    route
      .replace(/^\/my\/?/, '')
      .replace(/[/?&=]+/g, '-')
      .replace(/^-|-$/g, '') || 'home'
  );
}

for (const viewport of VIEWPORTS) {
  test.describe(`visual ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of [...ROUTES, ...MEMBER_ROUTES]) {
      test(`${route}`, async ({ page, context }) => {
        if (MEMBER_ROUTES.includes(route)) {
          await signIn(context);
        }
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot(`${viewport.name}-${slug(route)}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.001,
          // The ticket centre (T65) ticks a live countdown per ticket, so that
          // column is masked instead of pinning a particular second.
          mask: route === '/my/account/tickets' ? [page.locator('.ticket-countdown')] : undefined,
        });
      });
    }
  });
}

// T66: the Voucher (Promo Code) dialog is not a route — it opens from the header
// (and from the drawer on phones). Captured as the panel itself, with the store
// reset above so the redeemed-voucher list is in its empty state.
for (const viewport of VIEWPORTS) {
  test.describe(`voucher dialog ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('voucher dialog', async ({ page, context }) => {
      await signIn(context);
      await page.goto('/my');
      if (viewport.name === 'mobile') {
        await page.getByLabel('Open menu').click();
        await page.locator('[data-voucher="drawer"]').click();
      } else {
        await page.locator('[data-voucher="header"]').click();
      }

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByTestId('voucher-wallet')).toHaveAttribute('data-state', 'ready');
      await expect(dialog).toHaveScreenshot(`${viewport.name}-voucher-dialog.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.001,
      });
    });
  });
}
