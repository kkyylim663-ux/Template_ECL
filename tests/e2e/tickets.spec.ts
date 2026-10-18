import { rm } from 'node:fs/promises';
import { mockDataFile } from './mock-data';
import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T65: the ticket centre (`/account/tickets`, the reference's
 * `/my/ticket-center`). The reference renders the list from a client chunk that
 * was never captured, so the per-ticket rows, the tabs
 * (Available / Used / Expired) and the countdown are this build's; the card, the
 * three-button row, the Ticket History tabs and the event picker are the
 * reference's own. Two-sided by design: the server owns which tickets exist and
 * which are spent (a writable store), the browser runs the clock.
 *
 * The store's file survives across runs, so it is dropped before every test: the
 * seed (nothing redeemed, nothing spent) is the state every assertion starts
 * from.
 */
const STORE = mockDataFile('ticket-store.json');

/** The fixture holds 3 tickets for tk-1 (closing 18 Oct) and 1 for tk-2. */
const SEEDED_TICKETS = 4;

test.describe('ticket centre', () => {
  test.beforeEach(async ({ context }) => {
    await rm(STORE, { force: true });
    await signIn(context);
  });

  test('lists one row per ticket the fixture holds, under Available', async ({ page }) => {
    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('tickets-state')).toHaveAttribute('data-state', 'ready');

    const rows = page.getByTestId('ticket-row');
    await expect(rows).toHaveCount(SEEDED_TICKETS);
    await expect(rows.nth(0)).toHaveAttribute('data-id', 'tk-1-1');
    await expect(rows.nth(0)).toHaveAttribute('data-status', 'available');
    await expect(rows.nth(3)).toHaveAttribute('data-id', 'tk-2-1');
    await expect(rows.nth(0)).toContainText('TK-1-01');
    await expect(rows.nth(0)).toContainText('Euro Mini Winner draw');

    // The card's count and the list agree.
    await expect(page.getByTestId('tickets-held')).toContainText(`${SEEDED_TICKETS} / 200`);
    await expect(page.getByTestId('tickets-tab').filter({ hasText: 'Available' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('switches tabs: Used and Expired start empty', async ({ page }) => {
    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS);

    await page.locator('[data-tab="used"]').click();
    await expect(page.getByTestId('ticket-row')).toHaveCount(0);
    await expect(page.getByTestId('tickets-empty')).toBeVisible();

    await page.locator('[data-tab="expired"]').click();
    await expect(page.getByTestId('ticket-row')).toHaveCount(0);
    await expect(page.getByTestId('tickets-empty')).toBeVisible();

    await page.locator('[data-tab="available"]').click();
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS);
  });

  test('redeems a code once: the new ticket joins the list and survives a reload', async ({ page }) => {
    await page.goto('/my/account/tickets');
    await page.getByTestId('tickets-redeem').click();
    await page.getByLabel('Redemption code').fill('TICKET2026');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('TICKET2026 redeemed')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS + 1);
    await expect(page.getByTestId('tickets-held')).toContainText(`${SEEDED_TICKETS + 1} / 200`);
    await expect(page.getByTestId('ticket-row').filter({ hasText: 'TICKET2026-01' })).toHaveCount(1);

    await page.reload();
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS + 1);

    // The code is spent on the server: a fresh submit is a conflict.
    const replay = await page.request.post('/api/tickets/redeem', {
      data: { code: 'TICKET2026', idempotencyKey: 'e2e-second-submit' },
    });
    expect(replay.status()).toBe(409);
    await page.reload();
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS + 1);
  });

  test('rejects an empty field, an unknown code and an expired code', async ({ page }) => {
    await page.goto('/my/account/tickets');
    await page.getByTestId('tickets-redeem').click();

    // The field validates before anything is sent.
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('ticket-redeem-error')).toBeVisible();
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS);

    await page.getByLabel('Redemption code').fill('NOPE');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Code not found')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('tickets-redeem').click();
    await page.getByLabel('Redemption code').fill('EXPIREDCODE');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Code expired')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS);
  });

  test('spends a ticket from the event picker and shows it under Used', async ({ page }) => {
    await page.goto('/my/account/tickets');
    await page.getByRole('button', { name: /Use Tickets Now/ }).click();
    await expect(page.getByTestId('ticket-pick-grid')).toBeVisible();

    // Nothing selected: the reference's own behaviour is to close the dialog.
    await page.getByRole('button', { name: 'Go Now' }).click();
    await expect(page.getByTestId('ticket-pick-grid')).toBeHidden();

    await page.getByRole('button', { name: /Use Tickets Now/ }).click();
    await page.locator('[data-event="prediction"]').click();
    await expect(page.locator('[data-event="prediction"]')).toHaveClass(/selected/);
    await page.getByRole('button', { name: 'Go Now' }).click();
    await expect(page).toHaveURL(/\/my\/prediction$/);

    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS - 1);
    await page.locator('[data-tab="used"]').click();
    const used = page.getByTestId('ticket-row');
    await expect(used).toHaveCount(1);
    await expect(used).toHaveAttribute('data-id', 'tk-1-1');
    await expect(used).toHaveAttribute('data-status', 'used');
  });

  test('shows the countdown in the list and the ticket’s details on demand', async ({ page }) => {
    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('ticket-row').first()).toBeVisible();

    // The list ticks a live countdown against the ticket's own window.
    await expect(page.getByTestId('ticket-countdown').first()).toHaveText(/\d/);

    await page.getByTestId('ticket-open').first().click();
    const detail = page.getByTestId('ticket-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toHaveAttribute('data-id', 'tk-1-1');
    await expect(detail).toContainText('TK-1-01');
    await expect(detail).toContainText('Euro Mini Winner draw');
    await expect(detail).toContainText('Available');
    await expect(detail).toContainText(/\d+d \d+h \d+m \d+s/);

    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
  });

  test('an unreachable list shows the error state and Retry recovers it', async ({ page }) => {
    await page.route('**/api/tickets', (route) => route.abort());
    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('tickets-state')).toHaveAttribute('data-state', 'error');

    await page.unroute('**/api/tickets');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('tickets-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS);
  });

  test('mobile 375: the list and the picker fit the screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('ticket-row')).toHaveCount(SEEDED_TICKETS);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: /Use Tickets Now/ }).click();
    await expect(page.getByTestId('ticket-pick-grid')).toBeVisible();
    const dialogOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(dialogOverflow).toBeLessThanOrEqual(0);
  });
});
