import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T40 visual regression: every route at desktop 1440×900 and mobile 375×812.
 * Baselines live in tests/e2e/visual.spec.ts-snapshots/. Regenerate with
 * `pnpm playwright test visual --update-snapshots` only after a reviewed change.
 */
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
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

function slug(route: string) {
  return route.replace(/^\/my\/?/, '').replace(/[/?&=]+/g, '-').replace(/^-|-$/g, '') || 'home';
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
        });
      });
    }
  });
}
