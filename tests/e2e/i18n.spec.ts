import { expect, test } from '@playwright/test';

/**
 * i18n: the language lives in the `brand_lang` cookie, so switching must change
 * the shell without a reload and survive a refresh. Only the selected language
 * may reach the browser — the other three stay on the server.
 */
const SHOTS = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';

test('desktop: switching the language updates the shell and survives a reload', async ({ page }) => {
  await page.goto('/my');
  await expect(page.getByRole('button', { name: 'Games', exact: true })).toBeVisible();

  await page.getByLabel('Language').click();
  await page.locator('[role="option"]').getByRole('button', { name: '简体中文' }).click();

  // Immediate: no navigation, the shell re-renders in place.
  await expect(page.getByRole('button', { name: '游戏', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await page.screenshot({ path: `${SHOTS}/t15-desktop-zh.png` });

  // Persistent: the cookie is the source of truth, so a refresh keeps Chinese.
  await page.reload();
  await expect(page.getByRole('button', { name: '游戏', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');

  // And back to English through the same control.
  await page.getByLabel('语言').click();
  await page.locator('[role="option"]').getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'Games', exact: true })).toBeVisible();
});

test('mobile: the drawer carries its own language switcher', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/my');

  await page.getByLabel('Open menu').click();
  // At this width the desktop rail is display:none, so the only complementary
  // landmark in the accessibility tree is the drawer. (`aria-label` is itself
  // translated, so it cannot be the anchor here.)
  const drawer = page.getByRole('complementary');
  await expect(drawer).toBeInViewport();

  await drawer.getByRole('button', { name: 'Tiếng Việt' }).click();

  await expect(drawer.getByRole('button', { name: 'Trò chơi' })).toBeVisible();
  await expect(page.getByLabel('Điều hướng di động')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.screenshot({ path: `${SHOTS}/t15-mobile-vi-drawer.png` });
});

test('only the selected language reaches the browser', async ({ request }) => {
  const zhHans = await (await request.get('/my', { headers: { cookie: 'brand_lang=zh-Hans' } })).text();
  expect(zhHans).toContain('游戏');
  expect(zhHans).not.toContain('遊戲');
  expect(zhHans).not.toContain('Trò chơi');

  const vi = await (await request.get('/my', { headers: { cookie: 'brand_lang=vi' } })).text();
  expect(vi).toContain('Trò chơi');
  expect(vi).not.toContain('游戏');
});
