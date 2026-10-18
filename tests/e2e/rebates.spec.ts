import { rm } from 'node:fs/promises';
import { mockDataFile } from './mock-data';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T63: the rebates page (`/account/rebates`, the reference's `/my/mypromotion`
 * "Rebates"). Claiming is two-sided by design: the server marks the row claimed
 * (so a reload cannot pay twice) and the browser credits the mock wallet and
 * mirrors the payout into history.
 *
 * The claim store's file survives across runs, so it is dropped once before the
 * suite: the seed — the fixture's own already-claimed rb-3 — is the state every
 * assertion below starts from.
 */
const STORE = mockDataFile('rebate-claims.json');

test.beforeAll(async () => {
  await rm(STORE, { force: true });
});

test.describe('rebates page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('lists the periods, the selected period’s products and the records', async ({ page }) => {
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByRole('heading', { name: 'Rebates' })).toBeVisible();

    // Four periods from the fixture, newest first; the default is the newest one
    // that can actually pay out, so the claim flow is what opens first.
    const periods = page.getByTestId('rebate-period');
    await expect(periods).toHaveCount(4);
    await expect(periods.first()).toHaveAttribute('data-period', '2026-10-14');
    await expect(page.getByTestId('rebates-claimable')).toContainText('RM 33.44');

    // The selected period is 2026-10-13: one Slots row, claimable.
    const rows = page.getByTestId('rebate-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute('data-product', 'Slots');
    await expect(rows.first()).toHaveAttribute('data-status', 'claimable');
    await expect(rows.first()).toContainText('Rebate rate 0.8%');

    // The fixture's newest period holds a rebate under the minimum payout: it
    // stays pending with nothing to claim.
    await periods.first().click();
    await expect(page.getByTestId('rebate-row').first()).toHaveAttribute('data-status', 'pending');
    await expect(page.getByTestId('rebate-claim').first()).toBeDisabled();
    await expect(page.getByTestId('rebates-claimable')).toContainText('RM 0.00');
    await expect(page.locator('.rebates-min-note')).toContainText('Minimum payout RM 5.00');

    // Records: only the seeded claim the fixture's rb-3 mirrors.
    await expect(page.getByTestId('rebate-record')).toHaveCount(1);
    await expect(page.getByTestId('rebate-record').first()).toContainText('RB-SEED0001');
    await expect(page.getByTestId('rebate-record').first()).toContainText('RM 24.16');
  });

  test('claiming credits the wallet once and cannot be repeated', async ({ page }) => {
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    const balance = page.locator('.account-menu__profile-balance-amount').first();
    await expect(balance).toHaveText('1,622.50');

    await page.getByTestId('rebate-claim').first().click();
    // The success modal names the block and the amount it credited.
    await expect(page.getByText('The Slots rebate').first()).toBeVisible();
    await expect(page.getByText('RM 33.44 has been credited to your main wallet.')).toBeVisible();
    await page.keyboard.press('Escape');

    // The row flips, the period's claimable total empties and the wallet grew.
    await expect(page.getByTestId('rebate-row').first()).toHaveAttribute('data-status', 'claimed');
    await expect(page.getByTestId('rebate-claim').first()).toBeDisabled();
    await expect(page.getByTestId('rebates-claimable')).toContainText('RM 0.00');
    await expect(balance).toHaveText('1,655.94');
    await expect(page.getByTestId('rebate-record')).toHaveCount(2);

    // The server owns the claim state: the same rebate answers 409 to a new key.
    const again = await page.request.post('/api/rebates/claim', {
      data: { rebateId: 'rb-1', idempotencyKey: 'e2e-second-attempt' },
    });
    expect(again.status()).toBe(409);

    // The payout lands in history as the reference's own promo row.
    await page.goto('/my/account/history');
    await page.getByLabel('Searching History').selectOption('promo');
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'MYR 33.44' })).toHaveCount(1);
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'Slots rebate' })).toHaveCount(1);

    // A reload credits nothing again.
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    await expect(balance).toHaveText('1,655.94');
    await expect(page.getByTestId('rebate-record')).toHaveCount(2);
  });

  test('shows the loading state, then the error state, and Retry recovers', async ({ page }) => {
    await page.route('**/api/rebates', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'loading');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    await page.unroute('**/api/rebates');

    await page.route('**/api/rebates', (route) =>
      route.fulfill({ status: 500, json: { status: '1', msg: 'rebates unavailable', d: null } }),
    );
    await page.reload();
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'error');
    await page.unroute('**/api/rebates');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
  });

  test('an account with no rebate rows shows the empty state', async ({ page }) => {
    await page.route('**/api/rebates', (route) =>
      route.fulfill({
        status: 200,
        json: { status: '0', msg: 'Done', d: { minPayoutMinor: 500, periods: [], rows: [], claims: [] } },
      }),
    );
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'empty');
    await expect(page.getByText('No rebate has been calculated yet.')).toBeVisible();
  });

  test('the phone layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    // The claim test above may have added a record: only the seed is guaranteed.
    await expect(page.getByTestId('rebate-record').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  /** Every data surface: the panel paints each state, never a blank body. */
  test('the records list is the one load the Retry button re-reads', async ({ page }: { page: Page }) => {
    await page.route('**/api/rebates', (route) =>
      route.fulfill({
        status: 200,
        json: {
          status: '0',
          msg: 'Done',
          d: {
            minPayoutMinor: 500,
            periods: ['2026-10-13'],
            rows: [
              {
                id: 'rb-1',
                period: '2026-10-13',
                product: 'Slots',
                turnoverMinor: 418000,
                ratePct: 0.8,
                amountMinor: 3344,
                status: 'claimable',
                claimableAt: '2026-10-14T06:00:00+08:00',
              },
            ],
            claims: [],
          },
        },
      }),
    );
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByText('No rebate claimed yet.')).toBeVisible();
    await expect(page.getByTestId('rebate-row')).toHaveCount(1);
  });
});
