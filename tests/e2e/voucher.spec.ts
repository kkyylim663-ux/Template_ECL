import { rm } from 'node:fs/promises';
import { mockDataFile } from './mock-data';
import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T66: the Voucher (Promo Code) dialog — the reference's #voucherRedempModal,
 * opened from the header (a drawer opens the same dialog on phones). The five
 * results are the reference's own messages; the redeemed-voucher list under the
 * form is this build's. The store's file survives across runs, so it is dropped
 * before every test: the seed (nothing redeemed) is the state every assertion
 * starts from.
 */
const STORE = mockDataFile('voucher-store.json');
const BALANCE = '.account-menu__profile-balance-amount';

test.describe('voucher dialog', () => {
  test.beforeEach(async ({ context }) => {
    await rm(STORE, { force: true });
    await signIn(context);
  });

  test('redeems a code once: credited, listed and mirrored into history', async ({ page }) => {
    // An account page carries the balance readout this test watches.
    await page.goto('/my/account/rebates');
    await expect(page.locator(BALANCE).first()).toHaveText('1,622.50');

    await page.locator('[data-voucher="header"]').click();
    await expect(page.getByTestId('voucher-wallet')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('voucher-row')).toHaveCount(0);

    await page.locator('#voucherInput').fill('WELCOME188');
    await page.getByRole('button', { name: 'Submit' }).click();

    const result = page.getByTestId('voucher-result');
    await expect(result).toHaveAttribute('data-outcome', 'success');
    await expect(result).toContainText('Voucher successfully redeemed.');
    await expect(result).toContainText('RM 188.00 was credited to your wallet.');
    await expect(result).toContainText('Vouchers Left: 499');

    // The list carries the redeemed code, and the wallet moved exactly once.
    await expect(page.getByTestId('voucher-row')).toHaveCount(1);
    await expect(page.getByTestId('voucher-row')).toHaveAttribute('data-code', 'WELCOME188');
    await expect(page.getByTestId('voucher-row')).toHaveAttribute('data-status', 'active');
    await expect(page.locator(BALANCE).first()).toHaveText('1,810.50');

    // The code is spent on the server: a fresh submit is a conflict.
    const replay = await page.request.post('/api/vouchers/redeem', {
      data: { code: 'WELCOME188', idempotencyKey: 'e2e-second-submit' },
    });
    expect(replay.status()).toBe(409);

    // A reload keeps the row and does not credit a second time.
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator(BALANCE).first()).toHaveText('1,810.50');
    await page.locator('[data-voucher="header"]').click();
    await expect(page.getByTestId('voucher-row')).toHaveCount(1);

    // The payout lands in history as a promo row.
    await page.goto('/my/account/history');
    await page.getByLabel('Searching History').selectOption('promo');
    // The fixture already holds an "MYR 188.00" cashback row, so the voucher row
    // is found by its type and then checked for the amount.
    const historyRow = page.locator('.history-table tbody tr').filter({ hasText: 'Voucher WELCOME188' });
    await expect(historyRow).toHaveCount(1);
    await expect(historyRow).toContainText('MYR 188.00');
  });

  test('answers each rejection with the reference’s own message', async ({ page }) => {
    await page.goto('/my/account/rebates');
    await page.locator('[data-voucher="header"]').click();

    // Unknown code.
    await page.locator('#voucherInput').fill('NOPE');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'invalid');
    await expect(page.getByText('Invalid Voucher Code')).toBeVisible();

    // Outside its window: not started yet.
    await page.locator('#voucherInput').fill('SOONCODE');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute(
      'data-outcome',
      'not-redeemable',
    );
    await expect(
      page.getByText("The Voucher is not redeemable as it's haven't start or it's already expired"),
    ).toBeVisible();

    // Past its expiry — the same message, as on the reference.
    await page.locator('#voucherInput').fill('EXPIREDVOUCHER');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute(
      'data-outcome',
      'not-redeemable',
    );

    // Stock finished.
    await page.locator('#voucherInput').fill('SOLDOUTCODE');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'finished');
    await expect(page.getByText('The Vouchers are Finished Redeemed')).toBeVisible();

    // None of the four wrote a voucher or moved the wallet.
    await expect(page.getByTestId('voucher-row')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator(BALANCE).first()).toHaveText('1,622.50');
  });

  test('rejects the same code twice with “already redeemed”', async ({ page }) => {
    await page.goto('/my/account/rebates');
    await page.locator('[data-voucher="header"]').click();

    await page.locator('#voucherInput').fill('WELCOME188');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'success');

    await page.locator('#voucherInput').fill('WELCOME188');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'already');
    await expect(page.getByText('The Voucher is already redeemed')).toBeVisible();

    // Still one voucher, still credited once.
    await expect(page.getByTestId('voucher-row')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator(BALANCE).first()).toHaveText('1,810.50');
  });

  test('validates the field before anything is sent', async ({ page }) => {
    let posted = 0;
    await page.route('**/api/vouchers/redeem', (route) => {
      posted += 1;
      return route.continue();
    });

    await page.goto('/my');
    await page.locator('[data-voucher="header"]').click();

    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Enter a code first')).toBeVisible();

    await page.locator('#voucherInput').fill('AB');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Codes are 3-32 letters, digits or dashes.')).toBeVisible();

    expect(posted).toBe(0);
    await expect(page.getByTestId('voucher-row')).toHaveCount(0);
  });

  test('an unreachable voucher list shows the error state and Retry recovers it', async ({
    page,
  }) => {
    await page.route('**/api/vouchers', (route) => route.abort());
    await page.goto('/my');
    await page.locator('[data-voucher="header"]').click();
    await expect(page.getByTestId('voucher-wallet')).toHaveAttribute('data-state', 'error');

    await page.unroute('**/api/vouchers');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('voucher-wallet')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('voucher-row')).toHaveCount(0);
  });

  test('a guest is asked to sign in and nothing is sent', async ({ page, context }) => {
    // The beforeEach signs in; drop the cookie so this is the visitor's dialog.
    await context.clearCookies();
    await page.goto('/my');
    await page.locator('[data-voucher="header"]').click();
    await expect(page.getByTestId('voucher-wallet')).toHaveCount(0);

    await page.locator('#voucherInput').fill('WELCOME188');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Sign in to redeem a voucher.')).toBeVisible();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'guest');
  });

  test('mobile 375: the drawer opens the same dialog, and it fits the screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my');

    await page.getByLabel('Open menu').click();
    await page.locator('[data-voucher="drawer"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Voucher (Promo Code)' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.locator('#voucherInput').fill('WELCOME188');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-result')).toHaveAttribute('data-outcome', 'success');
    await expect(page.getByTestId('voucher-row')).toHaveCount(1);

    const dialogOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(dialogOverflow).toBeLessThanOrEqual(0);
  });
});
