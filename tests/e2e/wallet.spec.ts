import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T81 wallet page — the reference's `/my/mywallet`, which the mobile dock's
 * Wallet entry opens: the finance pill row, the Total Balance strip with
 * Transfer All, the wallet list with OUT / IN and the tickets row.
 *
 * Balances come from the shared mock wallet service (seeded per browser), so
 * the assertions here only read relative changes and always wait for the
 * amounts: they land a beat after the first paint, once the session binds its
 * own wallet set.
 */
test.describe('wallet page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('shows the pill row, the total strip and every wallet', async ({ page }) => {
    await page.goto('/my/account/wallet');
    const pills = page.locator('.mobile-nav__link');
    await expect(pills).toHaveCount(5);
    await expect(pills.nth(0)).toHaveText('Wallet');
    await expect(pills.nth(3)).toHaveText('My Wallet');

    await expect(page.locator('.mobile-banking-header')).toContainText('Total Balance');
    await expect(page.locator('.walletBalance .wallet')).not.toHaveCount(0);
    await expect(page.locator('.wallet-ticket__wrapper')).toContainText('Ticket(s)');
  });

  test('OUT moves a game wallet balance back to the Main Wallet', async ({ page }) => {
    await page.goto('/my/account/wallet');
    const rows = page.locator('.walletBalance .wallet');

    /** The first row that has money and is not under maintenance. */
    const pick = () =>
      rows.evaluateAll((list) =>
        list.findIndex((row) => {
          const balance = row.querySelector('.balance')?.textContent?.trim();
          const out = row.querySelector('.out') as HTMLButtonElement | null;
          return balance !== '0.00' && out !== null && !out.disabled;
        }),
      );
    await expect.poll(pick).toBeGreaterThanOrEqual(0);
    const index = await pick();

    await rows.nth(index).locator('.out').click();
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    await expect(rows.nth(index).locator('.balance')).toHaveText('0.00');
  });

  test('Transfer All empties the available wallets into the Main Wallet', async ({ page }) => {
    await page.goto('/my/account/wallet');
    await page.locator('.mobile-banking-header__action').click();
    await expect(
      page.getByText('Are you sure to transfer all balance back to Main wallet?'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    // A wallet under maintenance keeps its balance — the reference skips those.
    const leftovers = await page.locator('.walletBalance .wallet').evaluateAll((list) =>
      list
        .filter((row) => !(row.querySelector('.out') as HTMLButtonElement | null)?.disabled)
        .map((row) => row.querySelector('.balance')?.textContent?.trim()),
    );
    expect(leftovers.length).toBeGreaterThan(0);
    expect(leftovers.every((balance) => balance === '0.00')).toBe(true);
  });
});
