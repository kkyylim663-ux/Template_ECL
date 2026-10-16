import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T47 pending transactions. The six waiting requests run from 2026-10-16T10:12
 * (newest, also the mock clock's anchor) back to 2026-10-12T20:15; the cancel
 * window is 24h from each request's own timestamp, so tx-9/10/11 can be
 * cancelled while tx-2/5/12 show "Window closed". (The empty table state is decided by visiblePendingRows — see
 * tests/unit/pending.test.ts — and cannot be reached through this fixture,
 * because a closed-window request stays listed.)
 */
test.describe('pending transactions', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('lists the waiting requests with their status tags', async ({ page }) => {
    await page.goto('/my/account/pending');
    const rows = page.locator('.pending-table tbody tr[data-pending]');
    await expect(rows).toHaveCount(6);
    await expect(page.locator('.pending-status--processing')).toHaveCount(2);
    await expect(page.locator('.pending-status--pending')).toHaveCount(4);
    await expect(page.locator('.pending-table tbody')).toContainText('DP-260316-5521');
  });

  test('the reference question can be declined or accepted', async ({ page }) => {
    await page.goto('/my/account/pending');
    const row = page.locator('[data-pending="tx-9"]');
    await row.getByRole('button', { name: 'CANCEL TRANSACTION' }).click();
    await expect(page.getByText('Are you sure want to cancel the transaction?')).toBeVisible();

    await page.getByRole('button', { name: 'No', exact: true }).click();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'CANCEL TRANSACTION' }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByText('Your deposits transaction has been cancelled.')).toBeVisible();
    await expect(page.locator('[data-pending="tx-9"]')).toHaveCount(0);
  });

  test('a cancelled request moves to history and stays gone', async ({ page }) => {
    await page.goto('/my/account/pending');
    await page.locator('[data-pending="tx-9"]').getByRole('button', { name: 'CANCEL TRANSACTION' }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.locator('[data-pending="tx-9"]')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('[data-pending="tx-9"]')).toHaveCount(0);
    await expect(page.locator('.pending-table tbody tr[data-pending]')).toHaveCount(5);

    // The history table merges the cancellation in, with the reference's status.
    await page.goto('/my/account/history');
    const cancelled = page.locator('.history-table tbody tr', { hasText: 'Cancelled by member' });
    await expect(cancelled).toHaveCount(1);
    await expect(cancelled).toContainText('Cancelled');
    await expect(cancelled).toContainText('DuitNow QR');
  });

  test('a withdrawal cancellation reads back in history type too', async ({ page }) => {
    await page.goto('/my/account/pending');
    await page.locator('[data-pending="tx-10"]').getByRole('button', { name: 'CANCEL TRANSACTION' }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.getByText('Your withdrawal transaction has been cancelled.')).toBeVisible();

    await page.goto('/my/account/history');
    await page.getByLabel('Searching History').selectOption('withdrawal');
    const cancelled = page.locator('.history-table tbody tr', { hasText: 'Cancelled by member' });
    await expect(cancelled).toHaveCount(1);
    await expect(cancelled).toContainText('Maybank **** 4471');
  });

  test('a request outside the window shows the error instead', async ({ page }) => {
    await page.goto('/my/account/pending');
    const row = page.locator('[data-pending="tx-2"]');
    await expect(row.locator('.pending-countdown')).toHaveAttribute('data-open', 'false');
    await expect(row.locator('.pending-countdown')).toHaveText('Window closed');

    await row.getByRole('button', { name: 'CANCEL TRANSACTION' }).click();
    await expect(page.getByText('This request can no longer be cancelled.')).toBeVisible();
    await expect(row).toBeVisible();
  });

  test('the newest request counts down inside its window', async ({ page }) => {
    await page.goto('/my/account/pending');
    const chip = page.locator('[data-pending="tx-9"] .pending-countdown');
    await expect(chip).toHaveAttribute('data-open', 'true');
    await expect(chip).toHaveText(/Cancel within \d\d:\d\d:\d\d/);
  });
});
