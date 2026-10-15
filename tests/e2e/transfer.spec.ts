import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T45 transfer page. Balances come from the mock wallet service (seeded at
 * MYR 1,234.50 in the main wallet), so each case starts from a fresh session.
 */
test.describe('transfer page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('transfers from main to a game wallet and updates the header balance', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('10');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    await expect(page.locator('header').getByText('RM 1,224.50').first()).toBeVisible();
  });

  test('rejects an amount above the available balance', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('99999');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'exceeds the available balance' })).toBeVisible();
  });

  test('blocks transferring a wallet to itself', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel('To').selectOption('main');
    await page.getByLabel(/Amount/).fill('1');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'two different wallets' })).toBeVisible();
  });

  test('double-clicking confirm moves the money once', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('10');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    const confirm = page.getByRole('button', { name: 'Confirm', exact: true });
    await confirm.dblclick();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    await expect(page.locator('header').getByText('RM 1,224.50').first()).toBeVisible();
  });

  test('transfer-all leaves every other wallet at zero', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await page.getByLabel('To').selectOption('pragmatic');
    await page.getByRole('button', { name: 'Transfer all' }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    const rows = page.locator('.transfer-credit__row');
    await expect(rows.filter({ hasText: 'Main wallet' }).locator('.transfer-credit__balance')).toHaveText('RM 0.00');
    await expect(rows.filter({ hasText: 'Joker' }).locator('.transfer-credit__balance')).toHaveText('RM 0.00');
  });
});
