import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * T70 (P5 quality gate): the P5 features as one member journey at both sizes —
 * the launch gate and adapter (T61/T62), rebates (T63), achievements (T64), the
 * ticket centre (T65), the voucher dialog (T66), the number game (T67), the
 * prediction slip (T68) and the Current LIVE board's own refresh (T69). Each
 * step asserts the outcome that feature's own spec established, so this spec is
 * the cross-feature check: they still compose inside one session, one wallet and
 * one history. One screenshot per step into `_scratch/shots/`.
 */

/** The writable stores the journey reads; the seed is the state it starts from. */
const WRITABLE_STORES = [
  'rebate-claims.json',
  'achievement-claims.json',
  'ticket-store.json',
  'voucher-store.json',
  'numbergame-bets.json',
  'prediction-bets.json',
] as const;

test.beforeEach(async () => {
  // Reset before *each* size: a claim is final in these stores, so the second
  // journey would otherwise start on the first one's leftovers (the rebates page
  // even falls through to the next payable period, T63).
  for (const name of WRITABLE_STORES) {
    await rm(join(process.cwd(), '.mock-data', name), { force: true });
  }
});

const VIEWPORTS = [
  { label: 'desktop', viewport: { width: 1440, height: 900 } },
  { label: 'mobile', viewport: { width: 375, height: 812 } },
] as const;

/** The header's total-assets figure (p4-flow reads it without a hover). */
const BALANCE = '.account-menu__profile-balance-amount';

/** A page's own money line — `.ng-spin__current-credit`, `.pd-slip__credit`… */
async function money(page: Page, selector: string): Promise<number> {
  return Number((await page.locator(selector).first().innerText()).replace(/[^\d.]/g, ''));
}

for (const { label, viewport } of VIEWPORTS) {
  test(`the P5 features compose into one member journey at ${label}`, async ({ page }) => {
    const errors: string[] = [];
    /** The two browser-initiated noises p4-flow documents. */
    const benign = (message: ConsoleMessage) => {
      const url = message.location()?.url ?? '';
      return url.includes('/favicon.ico') || message.text().includes('Failed to fetch RSC payload for');
    };
    page.on('console', (message) => {
      if (message.type() === 'error' && !benign(message)) {
        const url = message.location()?.url;
        errors.push(url ? `${message.text()} @ ${url}` : message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    await page.setViewportSize(viewport);
    const shot = (step: string) =>
      page.screenshot({ path: `_scratch/shots/t70-p5flow-${label}-${step}.png` });

    // 1 — in through the form; the fixture seeds the wallet at 1,622.50
    await page.goto('/my/login');
    await page.fill('input[autocomplete="username"]', 'demo_player');
    await page.fill('input[autocomplete="current-password"]', 'Test1234!');
    await page.click('button.login-btn');
    await expect(page).toHaveURL(/\/my\/?$/);
    await shot('1-login');

    // 2 — T61/T62: a member with a balance is told this build does not launch
    // games and the page stays where it was (on a phone the cover needs a tap)
    await page.goto('/my/slots?provider=pragmatic&tab=all');
    const card = page.locator('article[data-game-id]').first();
    if (label === 'mobile') await card.click();
    await card.locator('a[data-mode="real"]').click();
    const gate = page.getByRole('dialog');
    await expect(gate).toContainText('This game will be available soon');
    await shot('2-launch-gate');
    await gate.getByRole('button', { name: 'Close', exact: true }).click();

    // 3 — T63: the first claimable rebate credits the wallet once
    await page.goto('/my/account/rebates');
    await expect(page.getByTestId('rebates-state')).toHaveAttribute('data-state', 'ready');
    await page.getByTestId('rebate-claim').first().click();
    await expect(page.getByText('RM 33.44 has been credited to your main wallet.')).toBeVisible();
    await expect(page.getByTestId('rebate-row').first()).toHaveAttribute('data-status', 'claimed');
    // The fixture's own record (RB-SEED0001) plus this claim.
    await expect(page.getByTestId('rebate-record')).toHaveCount(2);
    await shot('3-rebate-claimed');
    await page.keyboard.press('Escape');

    // 4 — T64: the reached rung pays and the ladder marks it claimed
    await page.goto('/my/account/achievement');
    await expect(page.getByTestId('achievement-state')).toHaveAttribute('data-state', 'ready');
    await page.getByTestId('achievement-claim').nth(1).click();
    await expect(page.getByText('RM 10.00 has been credited to your main wallet.')).toBeVisible();
    await expect(page.getByTestId('achievement-card').nth(1)).toHaveAttribute('data-status', 'claimed');
    await expect(page.getByTestId('achievement-record')).toHaveCount(1);
    await shot('4-achievement-claimed');
    await page.keyboard.press('Escape');

    // 5 — T65: a redemption code mints one ticket; the held count moves
    await page.goto('/my/account/tickets');
    await expect(page.getByTestId('tickets-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('ticket-row')).toHaveCount(4);
    await page.getByTestId('tickets-redeem').click();
    await page.getByLabel('Redemption code').fill('TICKET2026');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('TICKET2026 redeemed')).toBeVisible();
    await expect(page.getByTestId('ticket-row')).toHaveCount(5);
    await expect(page.getByTestId('tickets-held')).toContainText('5 / 200');
    await shot('5-ticket-redeemed');

    // 6 — T66: the voucher dialog — from the header on desktop, from the drawer
    // on a phone; WELCOME188 credits the wallet and joins the redeemed list
    await page.goto('/my/account/rebates');
    // The header figure arrives with the session; read it once it rendered.
    if (label === 'desktop') await expect.poll(() => money(page, BALANCE)).toBeGreaterThan(0);
    const balanceBefore = label === 'desktop' ? await money(page, BALANCE) : 0;
    if (label === 'mobile') {
      await page.getByLabel('Open menu').click();
      await page.locator('[data-voucher="drawer"]').click();
    } else {
      await page.locator('[data-voucher="header"]').click();
    }
    const voucher = page.getByRole('dialog');
    await expect(page.getByTestId('voucher-wallet')).toHaveAttribute('data-state', 'ready');
    await page.locator('#voucherInput').fill('WELCOME188');
    await voucher.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByTestId('voucher-row')).toHaveCount(1);
    await expect(page.getByTestId('voucher-row')).toHaveAttribute('data-code', 'WELCOME188');
    await shot('6-voucher-redeemed');
    if (label === 'desktop') {
      await expect.poll(() => money(page, BALANCE)).toBeCloseTo(balanceBefore + 188, 2);
    }

    // 7 — T67: two lines at 1.50 leave the wallet once and reach the bet list
    await page.goto('/my/numbergame');
    // The credit line fills in with the page's data; `0` is the loading state.
    await expect.poll(() => money(page, '.ng-spin__current-credit')).toBeGreaterThan(0);
    const ngCredit = await money(page, '.ng-spin__current-credit');
    await page.getByRole('button', { name: 'Random All' }).click();
    await page.locator('#ng-amount').fill('1.50');
    await expect(page.locator('.ng-betslip__figures')).toContainText('Total: RM 3.00');
    await page.getByRole('button', { name: 'Submit Now' }).click();
    await expect(page.getByRole('heading', { name: 'Bet placed' })).toBeVisible();
    await expect.poll(() => money(page, '.ng-spin__current-credit')).toBeCloseTo(ngCredit - 3, 2);
    const ngBets = page.getByTestId('numbergame-bets');
    await expect(ngBets).toHaveAttribute('data-state', 'ready');
    await expect(ngBets.locator('tbody tr')).toHaveCount(1);
    await shot('7-numbergame-bet');

    // 8 — T68: two picks at 2.00 empty the slip into one ticket
    await page.goto('/my/prediction');
    await expect.poll(() => money(page, '.pd-slip__credit')).toBeGreaterThan(0);
    const pdCredit = await money(page, '.pd-slip__credit');
    await page.locator('[data-fixture="fx-nba-1"]').getByRole('button', { name: /: Home$/ }).click();
    await page.locator('[data-fixture="fx-fifa-1"]').getByRole('button', { name: /: Draw$/ }).click();
    await page.locator('#pd-stake').fill('2.00');
    await expect(page.getByTestId('prediction-slip').locator('.pd-slip__figures')).toContainText(
      'Total: RM 4.00',
    );
    await page.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByRole('heading', { name: 'Ticket placed' })).toBeVisible();
    await expect.poll(() => money(page, '.pd-slip__credit')).toBeCloseTo(pdCredit - 4, 2);
    await expect(page.getByTestId('prediction-tickets').locator('tbody tr')).toHaveCount(1);
    await shot('8-prediction-ticket');

    // 9 — T69: the Current LIVE board re-reads itself — the fixture stamp gives
    // way and the rows that moved carry the mark
    await page.goto('/my/ranking-board?board=live');
    await expect(page.locator('.rb-table')).toBeVisible();
    await expect(page.locator('.rb-update p').first()).toContainText('2026-10-14 09:00');
    await expect(page.locator('.rb-update p').first()).not.toContainText('2026-10-14 09:00', {
      timeout: 25_000,
    });
    await shot('9-ranking-live');
    // Row moves and their `.rb-row--moved` mark are `ranking-live.spec.ts`'s own
    // subject — they need later steps to trade ranks, so this journey stops at
    // the refresh itself.

    // 10 — every P5 credit and both bets land in the one history
    await page.goto('/my/account/history');
    await page.locator('#tsType').selectOption('bet');
    await page.locator('#gamecode').selectOption('numberGame');
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'MYR 3.00' })).toHaveCount(1);
    await page.locator('#gamecode').selectOption('prediction');
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'MYR 4.00' })).toHaveCount(1);
    await page.locator('#tsType').selectOption('promo');
    for (const text of ['Slots rebate', 'Table regular', 'Voucher WELCOME188']) {
      await expect(page.locator('.history-table tbody tr').filter({ hasText: text })).toHaveCount(1);
    }
    await shot('10-history-all');

    expect(errors, 'console errors during the journey').toEqual([]);
  });
}
