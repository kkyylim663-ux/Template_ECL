import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T46 history page. Rows come from the mock `history` array (340 rows, newest
 * 2026-10-16T21:33), and the date windows are anchored on that newest row so
 * the fixture's fixed dates never rot. The reference switches the whole column
 * set with the type select and draws a DataTables table: 10 rows a page,
 * simple_numbers paging, a Search box and sortable headers.
 */
test.describe('history page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('switches the table columns with the type select', async ({ page }) => {
    await page.goto('/my/account/history');
    const table = page.locator('.history-table table');
    const type = page.getByLabel('Searching History');
    // The sort indicator rides inside the sorted header cell.
    const headers = async () =>
      (await table.locator('thead th').allTextContents()).map((cell) => cell.replace(/[▲▼]/g, ''));
    await expect(type).toHaveValue('deposit');
    expect(await headers()).toEqual(['Deposit', 'Amount', 'Type', 'Status', 'Reason']);

    await type.selectOption('transfer');
    expect(await headers()).toEqual(['Date', 'From', 'To', 'Amount', 'Status']);

    await type.selectOption('promo');
    expect(await headers()).toEqual(['Date', 'Time', 'Amount', 'Type', 'Status', 'Reason']);

    await type.selectOption('bet');
    expect(await headers()).toEqual(['Date', 'Transaction Count', 'Turnover', 'Win Lose', 'Real Bet']);
    // The reference hides its Event group until the betting type is chosen.
    await expect(page.getByLabel('Event')).toBeVisible();
    await type.selectOption('withdrawal');
    await expect(page.getByLabel('Event')).toHaveCount(0);
  });

  test('pages ten rows at a time with the edges disabled', async ({ page }) => {
    await page.goto('/my/account/history');
    const rows = page.locator('.history-table tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(page.locator('.history-info')).toContainText('Showing 1 to 10 of');
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    const firstRow = await rows.first().textContent();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('.history-info')).toContainText('Showing 11 to 20 of');
    await expect(rows.first()).not.toHaveText(firstRow ?? '');
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  test('the quick ranges narrow the window to the newest day', async ({ page }) => {
    await page.goto('/my/account/history');
    const info = page.locator('.history-info');
    const monthTotal = Number(/(\d+) entries/.exec((await info.textContent()) ?? '')?.[1] ?? 0);
    expect(monthTotal).toBeGreaterThan(10);

    await page.getByRole('button', { name: 'Today' }).click();
    const dayTotal = Number(/(\d+) entries/.exec((await info.textContent()) ?? '')?.[1] ?? 0);
    expect(dayTotal).toBeGreaterThan(0);
    expect(dayTotal).toBeLessThan(monthTotal);
    // Every visible row sits on the fixture's newest day, 2026-10-16.
    const dates = await page.locator('.history-table tbody tr td:first-child').allTextContents();
    expect(dates.length).toBe(dayTotal);
    for (const date of dates) expect(date).toBe('16/10/2026');
    await expect(page.locator('#transactionDate')).toHaveValue('16/10/2026 - 16/10/2026');
  });

  test('search narrows the rows and clearing restores them', async ({ page }) => {
    await page.goto('/my/account/history');
    const info = page.locator('.history-info');
    const before = (await info.textContent()) ?? '';
    await page.getByLabel('Search:').fill('cancelled');
    await expect(info).not.toHaveText(before);
    await expect(page.locator('.history-table tbody tr').first()).toContainText('Cancelled');
    await page.getByLabel('Search:').fill('');
    await expect(info).toHaveText(before);
  });

  test('an unmatched search shows the reference empty text', async ({ page }) => {
    await page.goto('/my/account/history');
    await page.getByLabel('Search:').fill('zzzz-no-match');
    await expect(page.locator('.history-table .history-empty')).toHaveText('No data available in table');
    await expect(page.locator('.history-info')).toContainText('Showing 0 to 0 of 0 entries');
  });

  test('sorting flips the first column order', async ({ page }) => {
    await page.goto('/my/account/history');
    const firstDates = page.locator('.history-table tbody tr td:first-child');
    const newest = await firstDates.first().textContent();
    await page.getByRole('button', { name: 'Sort by Deposit' }).click();
    await expect(firstDates.first()).not.toHaveText(newest ?? '');
    await page.getByRole('button', { name: 'Sort by Deposit' }).click();
    await expect(firstDates.first()).toHaveText(newest ?? '');
  });

  test('the rollover block lists the reference rows', async ({ page }) => {
    await page.goto('/my/account/history');
    const turnover = page.locator('.turnover-table');
    await expect(turnover.locator('tbody tr')).toHaveCount(4);
    await expect(turnover).toContainText('Turnover Requirement');
    await expect(turnover).toContainText('Promotion Turnover');
    await expect(turnover).toContainText('Latest Deposit Turnover');
    await expect(turnover).toContainText('Total Turnover Requirement');
    await expect(turnover).toContainText('Current Turnover');
  });

  test('mobile keeps the page free of horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/history');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('.history-table tbody tr')).toHaveCount(10);
  });
});
