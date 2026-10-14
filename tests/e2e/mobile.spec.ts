import { expect, test } from '@playwright/test';

/**
 * The 375x812 pass: the mobile shell must appear instead of the desktop one, the
 * drawer must open and close, a tap on a card must reveal Play Now / Demo, and the
 * screenshots for review come out of these runs.
 */
test.use({ viewport: { width: 375, height: 812 } });

const SHOTS = 'C:/Users/senheng/Desktop/Claude Code/Clone web ECL/site/_scratch/shots';

test('mobile shell replaces the desktop shell', async ({ page }) => {
  await page.goto('/my');

  // Desktop chrome is in the DOM but must not be displayed at this width.
  await expect(page.locator('aside[aria-label="Side navigation"]')).toBeHidden();
  await expect(page.getByLabel('Open menu')).toBeVisible();
  await expect(page.getByLabel('Quick navigation')).toBeVisible();
  await expect(page.getByText('Install the BRAND app')).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/t14-mobile-home.png` });
});

test('drawer opens, navigates and closes', async ({ page }) => {
  await page.goto('/my');

  const drawer = page.getByLabel('Mobile navigation');

  // Closed: off-screen and marked inert, so nothing inside is reachable.
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await expect(drawer).not.toBeInViewport();

  await page.getByLabel('Open menu').click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(drawer).toBeInViewport();
  await expect(drawer.getByText('Slots')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/t14-mobile-drawer.png` });

  await page.getByLabel('Close menu').click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await expect(drawer).not.toBeInViewport();
});

test('a tap reveals Play Now and Demo on a card', async ({ page }) => {
  await page.goto('/my/slots?provider=pragmatic&tab=all');

  const card = page.locator('article[data-game-id]').first();
  const overlay = card.locator('div.absolute.inset-0');
  await expect(overlay).toHaveCSS('opacity', '0');

  await page.locator('[aria-label^="Show actions for"]').first().click();
  await expect(overlay).toHaveCSS('opacity', '1');
  await page.screenshot({ path: `${SHOTS}/t14-mobile-card-tapped.png` });

  const before = page.url();
  await card.locator('a[data-mode="real"]').click();
  await page.waitForTimeout(300);
  expect(page.url()).toBe(before);
});

test('mobile screenshots for the other key pages', async ({ page }) => {
  for (const [route, name] of [
    ['/my/livecasino', 't14-mobile-livecasino'],
    ['/my/ranking-board', 't14-mobile-ranking'],
    ['/my/login', 't14-mobile-login'],
  ] as const) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
});
