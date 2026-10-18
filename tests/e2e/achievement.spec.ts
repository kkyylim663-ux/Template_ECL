import { rm } from 'node:fs/promises';
import { mockDataFile } from './mock-data';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T64: the achievement page (`/account/achievement`, the reference's
 * `/my/personal-achievement`). The reference is JS-rendered and its chunk was
 * never captured, so the rung state comes from the fixture's own columns and
 * claiming is two-sided by design, like rebates: the server marks the rung
 * claimed (so a reload cannot pay twice) and the browser credits the mock
 * wallet and mirrors the payout into history.
 *
 * The claim store's file survives across runs, so it is dropped once before the
 * suite: the seed (no claims at all — the fixture marks its own claimed row) is
 * the state every assertion below starts from.
 */
const STORE = mockDataFile('achievement-claims.json');

test.beforeAll(async () => {
  await rm(STORE, { force: true });
});

test.describe('achievement page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('draws the ladder from the fixture, one card per rung', async ({ page }) => {
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByRole('heading', { name: 'Current status' })).toBeVisible();

    // The live-casino fixture: rungs 30.00 / 100.00 / 450.00 / 900.00 / 1,500.00,
    // claimed, claimable, then three not reached.
    const cards = page.getByTestId('achievement-card');
    await expect(cards).toHaveCount(5);
    await expect(cards.nth(0)).toHaveAttribute('data-id', 'ac-1');
    await expect(cards.nth(0)).toHaveAttribute('data-status', 'claimed');
    await expect(cards.nth(1)).toHaveAttribute('data-id', 'ac-2');
    await expect(cards.nth(1)).toHaveAttribute('data-status', 'claimable');
    await expect(cards.nth(4)).toHaveAttribute('data-status', 'in-progress');

    // The summary boxes carry the fixture's numbers: the product turnover, and
    // the nearest rung beyond the claimed 30.00 — which is 100.00, so this
    // period's rung to reach is 70.00 (the live-casino claimable sits there).
    await expect(page.getByTestId('achievement-turnover')).toContainText('1,500');
    await expect(page.getByTestId('achievement-next')).toContainText('70');
    await expect(cards.nth(1)).toContainText('Bonus RM 10.00');
    await expect(cards.nth(1)).toContainText('RM 100 or above');
    await expect(page.getByTestId('achievement-claim').nth(1)).toBeEnabled();
    await expect(page.getByTestId('achievement-claim').nth(3)).toBeDisabled();

    // The seed writes no claim record: the fixture's own claimed row is not a claim here.
    await expect(page.getByText('No reward claimed yet.')).toBeVisible();
  });

  test('claiming credits the wallet once, writes a record and lands in history', async ({ page }) => {
    // This test asserts exact record counts, so it starts from the seed: the
    // store file is dropped like the suite's own beforeAll does.
    await rm(STORE, { force: true });

    // The achievement page is standalone (no account shell), so the balance is
    // read on the rebates page, which carries the account menu.
    await page.goto('/my/account/rebates');
    const balance = page.locator('.account-menu__profile-balance-amount').first();
    await expect(balance).toHaveText('1,622.50');

    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');

    await page.getByTestId('achievement-claim').nth(1).click();
    await expect(page.getByText('Table regular claimed')).toBeVisible();
    await expect(page.getByText('RM 10.00 has been credited to your main wallet.')).toBeVisible();
    await page.keyboard.press('Escape');

    // The rung flips, the button goes dead and the record appears.
    await expect(page.getByTestId('achievement-card').nth(1)).toHaveAttribute('data-status', 'claimed');
    await expect(page.getByTestId('achievement-claim').nth(1)).toBeDisabled();
    await expect(page.getByTestId('achievement-record')).toHaveCount(1);
    await expect(page.getByTestId('achievement-record')).toContainText('AC-');
    await page.goto('/my/account/rebates');
    await expect(balance).toHaveText('1,632.50');

    // The payout lands in history as a promo row.
    await page.goto('/my/account/history');
    await page.getByLabel('Searching History').selectOption('promo');
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'MYR 10.00' })).toHaveCount(1);
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'Table regular' })).toHaveCount(1);
  });

  test('the server refuses a repeat, replays a key, and refuses a rung not reached', async ({
    page,
  }) => {
    // The store from the test above is dropped, so ac-2 is claimable server-side
    // again — which is what makes the 409 below a server rule, not a stale one.
    await rm(STORE, { force: true });
    // A fresh key on a rung already claimed pays nothing.
    const first = await page.request.post('/api/achievements/claim', {
      data: { achievementId: 'ac-2', idempotencyKey: 'e2e-achievement-first' },
    });
    expect(first.status()).toBe(200);
    expect((await first.json()).d.replayed).toBe(false);
    const again = await page.request.post('/api/achievements/claim', {
      data: { achievementId: 'ac-2', idempotencyKey: 'e2e-achievement-second' },
    });
    expect(again.status()).toBe(409);

    // The key that made the claim replays the original record.
    const replay = await page.request.post('/api/achievements/claim', {
      data: { achievementId: 'ac-2', idempotencyKey: 'e2e-achievement-first' },
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).d.replayed).toBe(true);

    // A rung the fixture never marked claimable is refused.
    const early = await page.request.post('/api/achievements/claim', {
      data: { achievementId: 'ac-3', idempotencyKey: 'e2e-achievement-early' },
    });
    expect(early.status()).toBe(400);
    expect((await early.json()).status).toBe('211');

    // A claimed rung stays claimed on the page.
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('achievement-claim').nth(1)).toBeDisabled();
    await expect(page.getByTestId('achievement-record')).toHaveCount(1);

    // Leave the seed for the next test in the file.
    await rm(STORE, { force: true });
  });

  test('switching the category redraws the ladder from that product', async ({ page }) => {
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');

    await page.getByRole('button', { name: 'Slot Games' }).click();
    await expect(page.getByTestId('achievement-card').nth(0)).toHaveAttribute('data-id', 'ac-11');
    await expect(page.getByTestId('achievement-card').nth(1)).toHaveAttribute('data-id', 'ac-12');
    // The fixture gives all three products the same turnover ladder, so the
    // figure only proves the rail follows the selected product's rows.
    await expect(page.getByTestId('achievement-turnover')).toContainText('1,500');
    await expect(page.getByTestId('achievement-next')).toContainText('70');

    await page.getByRole('button', { name: 'Sports' }).click();
    await expect(page.getByTestId('achievement-card').nth(0)).toHaveAttribute('data-id', 'ac-6');
  });

  test('shows the loading state, then the error state, and Retry recovers', async ({ page }) => {
    await page.route('**/api/achievements', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'loading');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
    await page.unroute('**/api/achievements');

    await page.route('**/api/achievements', (route) =>
      route.fulfill({ status: 500, json: { status: '1', msg: 'achievements unavailable', d: null } }),
    );
    await page.reload();
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'error');
    await page.unroute('**/api/achievements');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
  });

  test('an account with no achievement rows shows the empty state', async ({ page }) => {
    await page.route('**/api/achievements', (route) =>
      route.fulfill({
        status: 200,
        json: { status: '0', msg: 'Done', d: { achievements: [], claims: [] } },
      }),
    );
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'empty');
    await expect(page.getByText('No achievement is running yet.')).toBeVisible();
  });

  test('a failed claim leaves the rung untouched', async ({ page }: { page: Page }) => {
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
    // Sports' first claimable rung — the live-casino one is claimed by the test above.
    await page.getByRole('button', { name: 'Sports' }).click();
    await expect(page.getByTestId('achievement-card').nth(1)).toHaveAttribute('data-id', 'ac-7');
    await expect(page.getByTestId('achievement-card').nth(1)).toHaveAttribute('data-status', 'claimable');

    await page.route('**/api/achievements/claim', (route) =>
      route.fulfill({ status: 500, json: { status: '1', msg: 'achievements unavailable', d: null } }),
    );
    await page.getByTestId('achievement-claim').nth(1).click();
    await expect(page.getByText('Reward not claimed')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.unroute('**/api/achievements/claim');
    await expect(page.getByTestId('achievement-card').nth(1)).toHaveAttribute('data-status', 'claimable');
  });

  test('the phone layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('achievement-card').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
