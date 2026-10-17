import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T59A deposit credit. A gateway success credits the main wallet once (the
 * result page is the trigger), leaves one history row and one inbox notice,
 * and a refresh never credits again. Wallet state is per account in
 * localStorage, so the checks read the header balance the same way T42b does.
 */
test.describe('deposit credit', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  async function createOrder(page: Page, amountMinor: number): Promise<string> {
    const created = await page.request.post('/api/deposit/gateway', { data: { amountMinor } });
    const payload = (await created.json()) as { d: { orderId: string } };
    return payload.d.orderId;
  }

  async function ruleSuccess(page: Page, orderId: string): Promise<void> {
    const ruling = await page.request.post('/api/deposit/gateway/resolve', {
      data: { orderId, outcome: 'success' },
    });
    expect(((await ruling.json()) as { d: { firstRuling: boolean } }).d.firstRuling).toBe(true);
  }

  test('a successful gateway order credits once and shows in history and inbox', async ({ page }) => {
    // An odd amount keeps the history row unique among the fixture's deposits.
    const orderId = await createOrder(page, 12345);
    await ruleSuccess(page, orderId);
    await page.goto(`/my/account/deposit/result?status=success&order=${orderId}`);
    await expect(page.getByTestId('result-details')).toHaveAttribute('data-state', 'ready');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('brand:deposit-credited')), { timeout: 20000 })
      .toContain(orderId);

    // Reload twice: the credit is keyed by the order, so nothing moves again.
    await page.reload();
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('brand:deposit-records') ?? '[]').length), { timeout: 20000 })
      .toBe(1);

    // The main wallet grew once by the order's amount: the demo account's
    // MYR 1,622.50 headline plus 123.45.
    await page.goto('/my/account/history');
    await expect(page.locator('.account-menu__profile-balance-amount').first()).toHaveText('1,745.95');
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'MYR 123.45' })).toHaveCount(1);

    await page.goto('/my/account/inbox');
    await expect(page.getByText('Deposit recorded').first()).toBeVisible();
  });
});
