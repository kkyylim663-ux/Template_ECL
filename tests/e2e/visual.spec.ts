import { rm } from 'node:fs/promises';
import { mockDataFile } from './mock-data';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
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
  // The achievement page (T64), the ticket centre (T65), the number game's slip
  // (T67) and the prediction board (T68) have the same shape of store.
  await rm(mockDataFile('rebate-claims.json'), { force: true });
  await rm(mockDataFile('achievement-claims.json'), { force: true });
  await rm(mockDataFile('ticket-store.json'), { force: true });
  await rm(mockDataFile('voucher-store.json'), { force: true });
  await rm(mockDataFile('numbergame-bets.json'), { force: true });
  await rm(mockDataFile('prediction-bets.json'), { force: true });
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
  // T81: the two mock chat rooms.
  '/my/chat',
  '/my/livechat',
];

const MEMBER_ROUTES = [
  '/my/account/deposit',
  '/my/account/withdrawal',
  '/my/account/transfer',
  // T81: the wallet page the dock opens.
  '/my/account/wallet',
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

/** The home hero rotates on a JS interval — captured with reduced motion. */
const CAROUSEL_ROUTES = new Set(['/my']);

async function captureRoute(
  page: Page,
  context: BrowserContext,
  viewport: (typeof VIEWPORTS)[number],
  route: string,
) {
  if (MEMBER_ROUTES.includes(route)) {
    await signIn(context);
  }
  if (route === '/my/account/tickets') {
    // The ticket centre (T65) ticks a live countdown per ticket whose text
    // width also sizes its column: the mask hides the tick, but not the
    // layout it induces ("17h 29m" vs "7h 3m" reflows the table). Freeze the
    // page clock before the first script runs so the capture is stable.
    await page.clock.setFixedTime(new Date('2026-10-18T12:00:00+08:00'));
  }
  await page.goto(route);
  if (route.startsWith('/my/account/deposit/gateway')) {
    // The gateway page is short, so every shell/footer link enters the
    // viewport and Next prefetches all of them (40+ RSC requests). That
    // tail can starve `networkidle` past the timeout, so this route waits
    // for its own settled state instead — the capture is the same.
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
  } else {
    await page.waitForLoadState('networkidle');
  }
  await expect(page).toHaveScreenshot(`${viewport.name}-${slug(route)}.png`, {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
    // The ticket centre (T65) ticks a live countdown per ticket, so that
    // column is masked instead of pinning a particular second.
    mask: route === '/my/account/tickets' ? [page.locator('.ticket-countdown')] : undefined,
  });
}

for (const viewport of VIEWPORTS) {
  const viewportSize = { width: viewport.width, height: viewport.height };

  test.describe(`visual ${viewport.name}`, () => {
    test.use({ viewport: viewportSize });

    for (const route of [...ROUTES, ...MEMBER_ROUTES].filter((r) => !CAROUSEL_ROUTES.has(r))) {
      test(`${route}`, async ({ page, context }) => {
        await captureRoute(page, context, viewport, route);
      });
    }
  });

  // `animations: 'disabled'` cannot freeze the hero — the carousel advances on
  // a JS interval, not a CSS animation — so a capture could land on slide 2
  // while the baseline holds slide 1. BannerCarousel keeps slide 1 under
  // prefers-reduced-motion, so only this route runs with it.
  test.describe(`visual ${viewport.name} carousel`, () => {
    test.use({ viewport: viewportSize, reducedMotion: 'reduce' });

    for (const route of CAROUSEL_ROUTES) {
      test(`${route}`, async ({ page, context }) => {
        await captureRoute(page, context, viewport, route);
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
        // Voucher is the Function group's first row, and drawer groups start collapsed.
        await page.getByLabel('Mobile navigation').getByRole('button', { name: 'Function' }).click();
        await page.locator('[data-voucher="drawer"]').click();
      } else {
        await page.locator('[data-voucher="header"]').click();
      }

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByTestId('voucher-wallet')).toHaveAttribute('data-state', 'ready');
      await expect(dialog).toHaveScreenshot(`${viewport.name}-voucher-dialog.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    });
  });
}
