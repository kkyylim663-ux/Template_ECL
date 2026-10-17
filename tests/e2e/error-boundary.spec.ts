import { expect, test, type Page } from '@playwright/test';

/**
 * T74: the boundaries and the fallback pages they render. Both forced failures
 * are mock-only hooks (`?boom=1`, the sibling of the deposit receipt's
 * `?receiptFail=1`), so this suite runs against a mock build like all others.
 *
 * The shell's header and footer boxes are fixed-position wrappers with no height
 * of their own, so "the chrome survived" is asserted through things that occupy
 * space: the fallback sitting inside the AppShell's `main`, the desktop footer,
 * and the mobile quick-navigation bar.
 */

const FALLBACK = '[data-testid="error-fallback"]';
const ERROR_HEADING = 'Something went wrong';
const OFFLINE_HEADING = 'You appear to be offline';

function collectConsole(page: Page): string[] {
  const lines: string[] = [];
  page.on('console', (message) => lines.push(message.text()));
  return lines;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('error boundaries', () => {
  test('a page error shows the fallback, reports it, and Retry recovers (/dev, no shell)', async ({
    page,
  }) => {
    const lines = collectConsole(page);
    await page.goto('/dev/error-test?boom=1');

    await expect(page.locator(FALLBACK)).toBeVisible();
    await expect(page.getByRole('heading', { name: ERROR_HEADING })).toBeVisible();
    expect(
      lines.filter((line) => line.includes('[report-error] Error: T74 error boundary test')),
    ).toHaveLength(1);

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator(FALLBACK)).toBeHidden();
    await expect(page.locator('[data-testid="error-test-recovered"]')).toBeVisible();
  });

  test('/dev/error-test without boom is a 404 (mock-only route)', async ({ page }) => {
    const response = await page.goto('/dev/error-test');
    expect(response?.status()).toBe(404);
  });

  test('the shell survives a page error and Retry restores the page', async ({ page }) => {
    await page.goto('/my/offline');
    await expect(page.getByRole('heading', { name: OFFLINE_HEADING })).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    await page.goto('/my/offline?boom=1');
    // The fallback renders where the page would: inside the AppShell's main.
    await expect(page.locator(`main ${FALLBACK}`)).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await page.screenshot({ path: '_scratch/shots/t74-in-shell-desktop.png' });

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator(FALLBACK)).toBeHidden();
    await expect(page.getByRole('heading', { name: OFFLINE_HEADING })).toBeVisible();
  });

  test('the offline page keeps the mobile chrome and overflows nothing at 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/offline');
    await expect(page.getByRole('heading', { name: OFFLINE_HEADING })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: '_scratch/shots/t74-offline-mobile.png' });

    await page.goto('/my/offline?boom=1');
    await expect(page.locator(`main ${FALLBACK}`)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: '_scratch/shots/t74-in-shell-mobile.png' });
  });

  test('a page that calls notFound() under a region gets the region 404 with a home link', async ({
    page,
  }) => {
    const response = await page.goto('/my/promotion/nope-123');

    expect(response?.status()).toBe(404);
    await expect(page.locator('[data-testid="region-not-found"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
  });

  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 375, height: 812 }],
  ] as const) {
    test(`an unmatched URL renders the root 404 at ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const response = await page.goto('/my/no-such-page');

      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
      // The root 404 has no region to link back to, so both markets stand in.
      expect(await page.locator('main a:visible').count()).toBeGreaterThan(0);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `_scratch/shots/t74-404-${name}.png` });
    });
  }
});
