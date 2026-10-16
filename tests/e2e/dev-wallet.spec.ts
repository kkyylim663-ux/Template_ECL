import { expect, test } from '@playwright/test';

/**
 * T45 supplement: the mock-only /dev/wallet simulator drives `walletService`,
 * so the ledger it lists is the same one the invariant is checked against —
 * `total = seed + Σ deposits − Σ withdrawals` with transfers neutral. The seed
 * totals MYR 1,622.50 (main 1,234.50, pragmatic 250.00, jili 88.00, joker 50.00).
 */
const TOTAL = 'MYR 1,622.50';

test.describe('dev wallet simulator', () => {
  test('deposit raises the total, writes the ledger and holds the invariant', async ({ page }) => {
    await page.goto('/dev/wallet');
    await expect(page.locator('.dev-wallet-total')).toHaveText(TOTAL);
    await expect(page.locator('.dev-wallet-check')).toHaveAttribute('data-holds', 'true');

    await page.locator('#dev-deposit').getByLabel('Amount').fill('100');
    await page.locator('#dev-deposit').getByRole('button', { name: 'Simulate deposit' }).click();

    await expect(page.locator('.dev-wallet-total')).toHaveText('MYR 1,722.50');
    await expect(page.locator('.dev-wallet-check')).toHaveAttribute('data-holds', 'true');
    const first = page.locator('.dev-ledger-row').first();
    await expect(first).toHaveAttribute('data-kind', 'deposit');
    await expect(first).toContainText('MYR 100.00');
  });

  test('withdrawal above the balance is rejected and changes nothing', async ({ page }) => {
    await page.goto('/dev/wallet');
    await page.locator('#dev-withdraw').getByLabel('Amount').fill('99999');
    await page.locator('#dev-withdraw').getByRole('button', { name: 'Simulate withdrawal' }).click();

    // Scoped: `getByRole('alert')` also matches Next's route announcer.
    await expect(page.locator('.dev-wallet-error')).toContainText('exceeds the available balance');
    await expect(page.locator('.dev-wallet-total')).toHaveText(TOTAL);
    await expect(page.locator('.dev-ledger-row')).toHaveCount(0);
  });

  test('withdrawal lowers the total and writes a ledger row', async ({ page }) => {
    await page.goto('/dev/wallet');
    await page.locator('#dev-withdraw').getByLabel('Amount').fill('22.50');
    await page.locator('#dev-withdraw').getByRole('button', { name: 'Simulate withdrawal' }).click();

    await expect(page.locator('.dev-wallet-total')).toHaveText('MYR 1,600.00');
    await expect(page.locator('.dev-wallet-check')).toHaveAttribute('data-holds', 'true');
    await expect(page.locator('.dev-ledger-row').first()).toHaveAttribute('data-kind', 'withdraw');
  });

  test('transfer moves money between wallets and keeps the total', async ({ page }) => {
    await page.goto('/dev/wallet');
    const main = page.locator('[data-wallet="main"] .dev-wallet-balance');
    await expect(main).toHaveText('MYR 1,234.50');

    await page.locator('#dev-transfer').getByLabel('Amount').fill('10');
    await page.locator('#dev-transfer').getByRole('button', { name: 'Simulate transfer' }).click();

    await expect(main).toHaveText('MYR 1,224.50');
    await expect(page.locator('[data-wallet="pragmatic"] .dev-wallet-balance')).toHaveText('MYR 260.00');
    await expect(page.locator('.dev-wallet-total')).toHaveText(TOTAL);
    await expect(page.locator('.dev-wallet-check')).toHaveAttribute('data-holds', 'true');
    await expect(page.locator('.dev-ledger-row').first()).toHaveAttribute('data-kind', 'transfer');
  });

  test('reset returns every balance and clears the ledger', async ({ page }) => {
    await page.goto('/dev/wallet');
    await page.locator('#dev-deposit').getByLabel('Amount').fill('100');
    await page.locator('#dev-deposit').getByRole('button', { name: 'Simulate deposit' }).click();
    await expect(page.locator('.dev-wallet-total')).toHaveText('MYR 1,722.50');

    await page.getByRole('button', { name: 'Reset to seed' }).click();
    await expect(page.locator('.dev-wallet-total')).toHaveText(TOTAL);
    await expect(page.locator('.dev-ledger-row')).toHaveCount(0);
    await expect(page.locator('.dev-wallet-check')).toHaveAttribute('data-holds', 'true');
  });
});
