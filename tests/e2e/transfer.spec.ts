import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T45 transfer page. Balances come from the mock wallet service (seeded at
 * MYR 1,234.50 in the main wallet), so each case starts from a fresh session.
 *
 * The reference posts straight from the form and only keeps a Yes/No dialog
 * for Transfer All (sdk.js: submitHandler -> walletTransfer -> showAlertMsg,
 * plus the static #transferAllModal), so no confirm step is expected here.
 */
test.describe('transfer page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('transfers from main to a game wallet and updates the header balance', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('10');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    // A transfer only moves money between wallets, so the headline total (main + games) stays put.
    await expect(page.locator('header').getByText('RM 1,622.50').first()).toBeVisible();
    await expect(page.getByTestId('wallet-total')).toHaveText('RM 1,622.50');
  });

  test('rejects an amount above the available balance', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('99999');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'exceeds the available balance' })).toBeVisible();
  });

  test('blocks transferring a wallet to itself', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel('To', { exact: true }).selectOption('main');
    await page.getByLabel(/Amount/).fill('1');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'two different wallets' })).toBeVisible();
  });

  test('double-clicking submit moves the money once', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('10');
    await page.getByRole('button', { name: 'Submit', exact: true }).dblclick();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    // Moved once: total assets unchanged, main wallet down by exactly 10.00.
    await expect(page.locator('header').getByText('RM 1,622.50').first()).toBeVisible();
    await expect(
      page.locator('.transfer-credit__row').filter({ hasText: 'Main wallet' }).locator('.transfer-credit__balance'),
    ).toHaveText('RM 1,224.50');
  });

  test('transfer all sends every available provider balance back to main', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByRole('button', { name: 'Transfer all' }).click();
    await expect(page.getByText('Are you sure to transfer all balance back to Main wallet?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    const rows = page.locator('.transfer-credit__row');
    // pragmatic 250.00 + joker 50.00 join the 1,234.50 already in main; the
    // offline jili wallet (88.00) is skipped.
    await expect(rows.filter({ hasText: 'Main wallet' }).locator('.transfer-credit__balance')).toHaveText('RM 1,534.50');
    await expect(rows.filter({ hasText: 'Pragmatic' }).locator('.transfer-credit__balance')).toHaveText('RM 0.00');
    await expect(rows.filter({ hasText: 'Joker' }).locator('.transfer-credit__balance')).toHaveText('RM 0.00');
    // Total assets never change when money only moves between wallets.
    await expect(page.locator('header').getByText('RM 1,622.50').first()).toBeVisible();
  });
});
