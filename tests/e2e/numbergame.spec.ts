import { rm } from 'node:fs/promises';
import { mockDataFile } from './mock-data';
import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T67: the number game's slip. Marking numbers, Random All / Reset, the stake
 * window, and one submit end to end: the server books the slip once, the stake
 * leaves the main wallet once, the slip mirrors into history, and a reload
 * neither re-books nor re-charges.
 *
 * The store's file survives across runs, so it is dropped before every test —
 * each case starts with an empty "My Bets".
 */
const STORE = mockDataFile('numbergame-bets.json');

/** The new history row carries its own date — the panel slices the ISO string's UTC day. */
function placedToday(): string {
  const iso = new Date().toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

test.describe('number game', () => {
  test.beforeEach(async ({ context }) => {
    await rm(STORE, { force: true });
    await signIn(context);
  });

  test('has a 49-number dial and fills the first line with six marks', async ({ page }) => {
    await page.goto('/my/numbergame');
    const dial = page.getByTestId('numbergame-dial');
    await expect(dial.getByRole('button')).toHaveCount(49);

    for (const value of [3, 11, 19, 26, 34, 42]) {
      await dial.getByRole('button', { name: String(value), exact: true }).click();
    }
    const lines = page.getByTestId('numbergame-lines');
    await expect(lines.locator('.ng-spin__manual-pill')).toHaveCount(1);
    await expect(lines.locator('.ng-spin__manual-pill')).toHaveText('3 11 19 26 34 42');
    await expect(page.locator('.ng-betslip__figures')).toContainText('Bets: 1');
    await expect(page.locator('.ng-spin__available-ticket')).toContainText('1');

    // A seventh number opens the second line rather than overfilling the first.
    await dial.getByRole('button', { name: '7', exact: true }).click();
    await expect(page.locator('.ng-spin__available-ticket')).toContainText('0');
    // The marked number un-picks on a second click.
    await dial.getByRole('button', { name: '7', exact: true }).click();
    await expect(page.locator('.ng-spin__available-ticket')).toContainText('1');
  });

  test('Random All fills both lines and Reset clears the slip', async ({ page }) => {
    await page.goto('/my/numbergame');
    await page.getByRole('button', { name: 'Random All' }).click();

    const lines = page.getByTestId('numbergame-lines');
    await expect(lines.locator('.ng-spin__manual-pill')).toHaveCount(2);
    await expect(page.locator('.ng-betslip__figures')).toContainText('Bets: 2');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(lines.locator('.ng-spin__manual-pill')).toHaveCount(0);
    await expect(lines.locator('.ng-spin__manual-add')).toHaveCount(2);
    await expect(page.locator('.ng-betslip__figures')).toContainText('Bets: 0');
  });

  test('a stake outside the window is refused without calling the server', async ({ page }) => {
    await page.goto('/my/numbergame');
    await expect(page.getByTestId('numbergame-bets')).toHaveAttribute('data-state', 'empty');

    let posts = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/numbergame/bets')) posts += 1;
    });

    await page.getByRole('button', { name: 'Random All' }).click();
    await page.locator('#ng-amount').fill('0.50');
    await page.getByRole('button', { name: 'Submit Now' }).click();
    await expect(page.getByText('The bet amount is below the minimum.')).toBeVisible();
    expect(posts).toBe(0);

    // An empty slip is refused too, before any request.
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.locator('#ng-amount').fill('2.00');
    await page.getByRole('button', { name: 'Submit Now' }).click();
    await expect(page.getByRole('heading', { name: 'Bet not placed' })).toBeVisible();
    expect(posts).toBe(0);
  });

  test('places a bet: the stake leaves the wallet once and the slip reaches history', async ({
    page,
  }) => {
    await page.goto('/my/numbergame');
    await expect(page.locator('.ng-spin__current-credit')).toContainText('RM 1,622.50');

    await page.getByRole('button', { name: 'Random All' }).click();
    await page.locator('#ng-amount').fill('1.50');
    await expect(page.locator('.ng-betslip__figures')).toContainText('Total: RM 3.00');

    await page.getByRole('button', { name: 'Submit Now' }).click();
    await expect(page.getByRole('heading', { name: 'Bet placed' })).toBeVisible();
    // One slip, two lines: 1,622.50 − 3.00.
    await expect(page.locator('.ng-spin__current-credit')).toContainText('RM 1,619.50');
    // The slip is empty again and the bet is listed.
    await expect(page.getByTestId('numbergame-lines').locator('.ng-spin__manual-add')).toHaveCount(2);
    const bets = page.getByTestId('numbergame-bets');
    await expect(bets).toHaveAttribute('data-state', 'ready');
    await expect(bets.locator('tbody tr')).toHaveCount(1);

    // The history page shows the bet under the game's own event: the reference's
    // bet table carries the date, 注数, turnover, win/lose and real bet — no
    // number list — so the row is the stake and the line count.
    await page.goto('/my/account/history');
    await page.locator('#tsType').selectOption('bet');
    await page.locator('#gamecode').selectOption('numberGame');
    const row = page.locator('tbody tr').first();
    await expect(row).toContainText('MYR 3.00');
    await expect(row).toContainText(placedToday());
  });

  test('a reload neither re-books the slip nor charges the stake twice', async ({ page }) => {
    await page.goto('/my/numbergame');
    await page.getByRole('button', { name: 'Random All' }).click();
    await page.locator('#ng-amount').fill('3.00');
    await page.getByRole('button', { name: 'Submit Now' }).click();
    await expect(page.getByRole('heading', { name: 'Bet placed' })).toBeVisible();
    await expect(page.locator('.ng-spin__current-credit')).toContainText('RM 1,616.50');

    await page.reload();
    await expect(page.locator('.ng-spin__current-credit')).toContainText('RM 1,616.50');
    await expect(page.getByTestId('numbergame-bets').locator('tbody tr')).toHaveCount(1);
  });

  test('Rules opens the number game rules and Escape closes them', async ({ page }) => {
    await page.goto('/my/numbergame');
    await page.getByRole('button', { name: 'Rules' }).click();
    await expect(page.getByRole('heading', { name: 'Number game rules' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Number game rules' })).toBeHidden();
  });

  test('375: the dial, the slip and the bets table fit the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/numbergame');
    await page.getByTestId('numbergame-dial').getByRole('button', { name: '7', exact: true }).click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe('number game for a guest', () => {
  test('Play next round asks for a login first', async ({ page }) => {
    await page.goto('/my/numbergame');
    await expect(page.locator('.ng-spin__current-credit')).toContainText('RM 0.00');
    await page.getByRole('link', { name: 'Play next round' }).click();
    await expect(page.getByRole('heading', { name: 'Please login first' })).toBeVisible();
  });
});
