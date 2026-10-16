import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T51: the deposit method panel — the tab row lives in `?method=`, the catalog
 * fetch has the four standard states, and the fold blocks work on a phone.
 */
test.describe('deposit methods panel', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('tabs switch the content and sync the URL; a reload keeps the tab', async ({ page }) => {
    await page.goto('/my/account/deposit');
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'ready');

    const bank = page.getByRole('tab', { name: 'Bank Transfer & ATM' });
    await expect(bank).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Transfer to the account below')).toBeVisible();

    await page.getByRole('tab', { name: 'Payment Gateway' }).click();
    await expect(page).toHaveURL(/method=gateway/);
    await expect(page.getByText('Please proceed to payment gateway')).toBeVisible();
    await expect(page.getByText('FPX online banking')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Payment Gateway' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('deep links open the requested method; an unknown one falls back to bank', async ({ page }) => {
    await page.goto('/my/account/deposit?method=qr');
    await expect(page.getByRole('tab', { name: 'E-Wallet & QR' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('DuitNow QR')).toBeVisible();

    await page.goto('/my/account/deposit?method=nonsense');
    await expect(page.getByRole('tab', { name: 'Bank Transfer & ATM' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('shows the loading state while the catalog is in flight, then ready', async ({ page }) => {
    await page.route('**/api/deposit/methods', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto('/my/account/deposit');
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'loading');
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'ready');
  });

  test('a failed catalog shows the error state and Retry recovers', async ({ page }) => {
    await page.route('**/api/deposit/methods', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: '1', msg: 'boom', d: null }),
      }),
    );

    await page.goto('/my/account/deposit');
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'error');

    await page.unroute('**/api/deposit/methods');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'ready');
  });

  test('an empty catalog shows the empty state', async ({ page }) => {
    await page.route('**/api/deposit/methods', (route) =>
      route.fulfill({
        json: { status: '0', msg: 'Done', d: { methods: [], banks: [], channels: [] } },
      }),
    );

    await page.goto('/my/account/deposit');
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'empty');
  });

  test('mobile 375: folds a section and overflows neither axis', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/deposit');
    await expect(page.getByTestId('deposit-state')).toHaveAttribute('data-state', 'ready');

    const heading = page.getByRole('button', { name: 'How to deposit' });
    await expect(heading).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Transfer to the account below')).toBeVisible();

    await heading.click();
    await expect(heading).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText('Transfer to the account below')).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
