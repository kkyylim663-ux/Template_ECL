import { expect, test } from '@playwright/test';

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
    await context.addCookies([{ name: 'brand_session', value: 'demo', url: 'http://127.0.0.1:3000' }]);

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
