import { expect, test } from '@playwright/test';
import { signIn } from './session';

/** Desktop screenshots for review, plus the two numbers T14 has to record. */
test.describe('desktop screenshots', () => {
  test('key pages at 1440x900', async ({ page }) => {
    const shots = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';

    for (const [route, name] of [
      ['/my', 't14-desktop-home'],
      ['/my/slots?provider=pragmatic&tab=all', 't14-desktop-slots'],
      ['/my/livecasino', 't14-desktop-livecasino'],
      ['/my/ranking-board', 't14-desktop-ranking'],
      ['/my/4d', 't14-desktop-4d'],
      ['/my/login', 't14-desktop-login'],
      ['/my/register', 't14-desktop-register'],
      ['/dev/components', 't14-desktop-components'],
    ] as const) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({ path: `${shots}/${name}.png` });
    }
  });

  test('account pages render with a session', async ({ page, context }) => {
    const shots = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';
    await signIn(context);

    for (const [route, name] of [
      ['/my/account/deposit', 't14-desktop-account-deposit'],
      ['/my/account/history', 't14-desktop-account-history'],
      ['/my/account/profile', 't14-desktop-account-profile'],
    ] as const) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({ path: `${shots}/${name}.png` });
    }
  });
});

/** T35: the four event pages, desktop and mobile, for the final review. */
test.describe('event screenshots (T35)', () => {
  const SHOTS = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';

  const ROUTES = [
    ['/my/4d', '4d'],
    ['/my/numbergame', 'numbergame'],
    ['/my/prediction', 'prediction'],
    ['/my/ranking-board', 'ranking'],
  ] as const;

  test('desktop at 1440x900', async ({ page }) => {
    for (const [route, name] of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/t35-desktop-${name}.png`, fullPage: true });
    }
  });

  test('mobile at 375x812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [route, name] of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/t35-mobile-${name}.png`, fullPage: true });
    }
  });
});

/** T28: the content pages, desktop and mobile, for the final review. */
test.describe('content screenshots (T28)', () => {
  const SHOTS = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';

  const ROUTES = [
    ['/my/promotion', 'promotion-list'],
    ['/my/promotion/pr-welcome-188', 'promotion-detail'],
    ['/my/update', 'update-list'],
    ['/my/update/up-061', 'update-detail'],
    ['/my/faq/finance', 'faq'],
    ['/my/vip', 'vip'],
    ['/my/sponsor', 'sponsor'],
    ['/my/about', 'about'],
    ['/my/contact', 'contact'],
    ['/my/tnc', 'tnc'],
    ['/my/betting-rules', 'betting-rules'],
  ] as const;

  test('desktop at 1440x900', async ({ page }) => {
    for (const [route, name] of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/t28-desktop-${name}.png`, fullPage: true });
    }
  });

  test('mobile at 375x812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [route, name] of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/t28-mobile-${name}.png`, fullPage: true });
    }
  });
});
