import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T68: the prediction board. The five status tabs filter the cards, a card's
 * outcome buttons collect picks into the slip (one per fixture), the `Bet Now`
 * dialog picks too, the stake window is checked before any request, and one
 * submit end to end: the server books the ticket once, the stake leaves the main
 * wallet once, the ticket mirrors into history, and a reload neither re-books nor
 * re-charges.
 *
 * The store's file survives across runs, so it is dropped before every test —
 * each case starts with an empty "Prediction Tickets".
 */
const STORE = join(process.cwd(), '.mock-data', 'prediction-bets.json');

test.describe('prediction', () => {
  test.beforeEach(async ({ context }) => {
    await rm(STORE, { force: true });
    await signIn(context);
  });

  test('the five status pills each filter the cards', async ({ page }) => {
    await page.goto('/my/prediction');
    await expect(page.locator('.pd-card')).toHaveCount(6);

    await page.getByRole('link', { name: 'Active', exact: true }).click();
    await expect(page).toHaveURL(/status=active$/);
    await expect(page.locator('.pd-card')).toHaveCount(2);

    await page.getByRole('link', { name: 'Upcoming', exact: true }).click();
    await expect(page).toHaveURL(/status=upcoming$/);
    await expect(page.locator('.pd-card')).toHaveCount(3);

    await page.getByRole('link', { name: 'Ended', exact: true }).click();
    await expect(page).toHaveURL(/status=ended$/);
    await expect(page.locator('.pd-card')).toHaveCount(1);
    // The ended card's own actions are closed.
    await expect(page.locator('.pd-card .pd-card__btn--disabled')).toBeDisabled();
    await expect(page.locator('.pd-card__odd').first()).toBeDisabled();

    await page.getByRole('link', { name: 'All', exact: true }).click();
    await expect(page.locator('.pd-card')).toHaveCount(6);
  });

  test('a card outcome adds to the slip, a second click removes it, and the dialog picks too', async ({
    page,
  }) => {
    await page.goto('/my/prediction');
    const nba = page.locator('[data-fixture="fx-nba-1"]');
    await nba.getByRole('button', { name: /Northern Lions vs Straits Ravens: Home/ }).click();

    const slip = page.getByTestId('prediction-slip');
    await expect(slip.locator('.pd-slip__row')).toHaveCount(1);
    await expect(slip.locator('.pd-slip__row')).toContainText('Northern Lions');
    await expect(slip.locator('.pd-slip__row')).toContainText('Home 1.85');
    await expect(slip.locator('.pd-slip__figures')).toContainText('Picks: 1');
    await expect(slip.locator('.pd-slip__figures')).toContainText('Total: RM 1.00');
    await expect(slip.locator('.pd-slip__figures')).toContainText('Potential payout: RM 1.85');

    // The same outcome again un-picks it.
    await nba.getByRole('button', { name: /Northern Lions vs Straits Ravens: Home/ }).click();
    await expect(slip.locator('.pd-slip__row')).toHaveCount(0);
    await expect(slip.locator('.pd-slip__note')).toBeVisible();

    // Bet Now opens the reference's pick dialog; SUBMIT adds the chosen outcome.
    await nba.getByRole('button', { name: 'Bet Now' }).click();
    const dialog = page.getByTestId('prediction-pick-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Northern Lions vs Straits Ravens');
    await dialog.getByRole('button', { name: /Away/ }).click();
    await page.getByTestId('prediction-pick-submit').click();
    await expect(dialog).toBeHidden();
    await expect(slip.locator('.pd-slip__row')).toContainText('Away 1.95');
  });

  test('the slip holds one pick per fixture and refuses a fourth fixture', async ({ page }) => {
    await page.goto('/my/prediction');
    const pick = async (fixture: string, option: string) => {
      await page
        .locator(`[data-fixture="${fixture}"]`)
        .getByRole('button', { name: new RegExp(`: ${option}$`) })
        .click();
    };

    await pick('fx-nba-1', 'Home');
    // Another outcome of the same fixture replaces the pick rather than adding one.
    await pick('fx-nba-1', 'Away');
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__row')).toHaveCount(1);
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__row')).toContainText('Away');

    await pick('fx-fifa-1', 'Draw');
    await pick('fx-uefa-2', 'Home');
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__row')).toHaveCount(3);

    await pick('fx-nba-2', 'Home');
    await expect(page.getByText('One slip holds at most three picks.')).toBeVisible();
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__row')).toHaveCount(3);
  });

  test('a stake outside the window is refused without calling the server', async ({ page }) => {
    await page.goto('/my/prediction');
    await expect(page.getByTestId('prediction-tickets')).toHaveAttribute('data-state', 'empty');

    let posts = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/prediction/bets')) posts += 1;
    });

    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();
    await page.locator('#pd-stake').fill('0.50');
    await page.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByText('The bet amount is below the minimum.')).toBeVisible();
    expect(posts).toBe(0);

    // An empty slip is refused too, before any request.
    await page.locator('#pd-stake').fill('2.00');
    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();
    await page.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByRole('heading', { name: 'Ticket not placed' })).toBeVisible();
    expect(posts).toBe(0);
  });

  test('places a ticket: the stake leaves the wallet once and the ticket reaches history', async ({
    page,
  }) => {
    await page.goto('/my/prediction');
    await expect(page.locator('.pd-slip__credit')).toContainText('RM 1,622.50');

    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();
    await page.locator('[data-fixture="fx-fifa-1"]').getByRole('button', { name: /: Draw$/ }).click();
    await page.locator('#pd-stake').fill('2.00');
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__figures')).toContainText(
      'Total: RM 4.00',
    );

    await page.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByRole('heading', { name: 'Ticket placed' })).toBeVisible();
    // Two picks at 2.00 each: 1,622.50 − 4.00.
    await expect(page.locator('.pd-slip__credit')).toContainText('RM 1,618.50');
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__row')).toHaveCount(0);

    const tickets = page.getByTestId('prediction-tickets');
    await expect(tickets).toHaveAttribute('data-state', 'ready');
    await expect(tickets.locator('tbody tr')).toHaveCount(1);
    await expect(tickets.locator('tbody tr').first()).toContainText('RM 4.00');

    // The history page shows the ticket under the prediction event.
    await page.goto('/my/account/history');
    await page.locator('#tsType').selectOption('bet');
    await page.locator('#gamecode').selectOption('prediction');
    const row = page.locator('tbody tr').first();
    await expect(row).toContainText('MYR 4.00');
    await expect(row).toContainText('17/10/2026');
  });

  test('a reload neither re-books the ticket nor charges the stake twice', async ({ page }) => {
    await page.goto('/my/prediction');
    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();
    await page.locator('#pd-stake').fill('3.00');
    await page.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByRole('heading', { name: 'Ticket placed' })).toBeVisible();
    await expect(page.locator('.pd-slip__credit')).toContainText('RM 1,619.50');

    await page.reload();
    await expect(page.locator('.pd-slip__credit')).toContainText('RM 1,619.50');
    await expect(page.getByTestId('prediction-tickets').locator('tbody tr')).toHaveCount(1);
  });

  test('Rules opens the prediction rules and Escape closes them', async ({ page }) => {
    await page.goto('/my/prediction');
    await page.getByRole('button', { name: 'Rules' }).first().click();
    await expect(page.getByRole('heading', { name: 'Prediction rules' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Prediction rules' })).toBeHidden();
  });

  test('375: the cards, the slip and the tickets table fit the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/prediction');
    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

test.describe('prediction for a guest', () => {
  test('SUBMIT asks for a login first', async ({ page }) => {
    await page.goto('/my/prediction');
    await expect(page.locator('.pd-slip__credit')).toContainText('RM 0.00');
    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();
    await page.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByRole('heading', { name: 'Please login first' })).toBeVisible();
  });
});
