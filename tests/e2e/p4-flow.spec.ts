import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { mockDataFile } from './mock-data';

/**
 * T60 (P4 quality gate): the two end-to-end journeys at both sizes, in the
 * shape T50's member flow established — one screenshot per step into
 * `_scratch/shots/`, and any console error or page error fails the run.
 *
 * Deposit: sign in → bank transfer (pick bank, copy, amount, terms, upload
 * step, skip) → payment gateway (order, `#pg-tpl` step, mock window ruling
 * success) → credit seen by the wallet, history and inbox.
 *
 * Withdrawal: banking details → request (confirm dialog, debit once) → pending
 * row → back office approves in /dev/wallet → the next member page settles it
 * into history and inbox. The demo fixture's promotion rollover (RM 540 owed)
 * is a rule this build keeps, so the info route is presented cleared and the
 * POST is answered from a row seeded into the same store the server reads —
 * the same pair T58/T59B established; everything after the request is real.
 */

const VIEWPORTS = [
  { label: 'desktop', viewport: { width: 1440, height: 900 } },
  { label: 'mobile', viewport: { width: 375, height: 812 } },
] as const;

type Row = {
  id: string;
  reference: string;
  idempotencyKey: string;
  bankAccountId: string;
  methodLabel: string;
  amountMinor: number;
  status: string;
  createdAt: string;
};

const FILE = mockDataFile('withdrawal-requests.json');

function readRequests(): Row[] {
  return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Row[]) : [];
}

function writeRequests(rows: Row[]) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(rows, null, 2), 'utf8');
}

/** Turnover is a promotion field; this journey clears it in the page's own info payload. */
async function clearTurnover(page: Page) {
  await page.route('**/api/withdrawal/info', async (route) => {
    const body = await (await route.fetch()).json();
    await route.fulfill({
      json: { ...body, d: { ...body.d, turnoverRemainingMinor: 0 } },
    });
  });
}

async function ledgerCount(page: Page, kind: string, amountMinor: number): Promise<number> {
  return page.evaluate(
    ([wantedKind, amount]) =>
      (
        JSON.parse(window.localStorage.getItem('brand:wallets:ledger:acct:u_1001') ?? '[]') as {
          kind: string;
          amountMinor: number;
        }[]
      ).filter((entry) => entry.kind === wantedKind && entry.amountMinor === amount).length,
    [kind, amountMinor] as const,
  );
}

for (const { label, viewport } of VIEWPORTS) {
  test(`the deposit and withdrawal journeys work at ${label}`, async ({ page }) => {
    const errors: string[] = [];
    /**
     * Two browser-initiated messages are noise, not app errors: the favicon
     * probe (icons are declared through metadata, there is no /favicon.ico
     * file — the 404 text itself does not name the URL, the location does),
     * and the mock gateway window aborting its own account-menu prefetches as
     * it closes. Everything else fails the run.
     */
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
      page.screenshot({ path: `_scratch/shots/t60-flow-${label}-${step}.png` });

    // 1 — sign in through the form, as the member would
    await page.goto('/my/login');
    await page.fill('input[autocomplete="username"]', 'demo_player');
    await page.fill('input[autocomplete="current-password"]', 'Test1234!');
    await page.click('button.login-btn');
    await expect(page).toHaveURL(/\/my\/?$/);
    await shot('1-login');

    // 2 — deposit, bank transfer leg: pick a bank, agree, the upload step, skip
    await page.goto('/my/account/deposit');
    const bankForm = page.getByTestId('deposit-bank-form');
    await expect(bankForm).toBeVisible();
    await bankForm.getByRole('radio', { name: 'Maybank' }).click();
    await expect(page.getByTestId('bank-detail')).toContainText('Maybank');
    await bankForm.getByLabel('Amount', { exact: true }).fill('100');
    await bankForm.getByRole('checkbox').check();
    await bankForm.getByRole('button', { name: 'Submit deposit request' }).click();

    const receipt = page.getByTestId('deposit-receipt');
    await expect(receipt).toContainText('Transaction ID : DEP-');
    await shot('2-deposit-upload');
    await receipt.getByRole('button', { name: 'Skip' }).click();
    const requestDialog = page.getByRole('dialog');
    await expect(requestDialog.getByText('Deposit request submitted')).toBeVisible();
    await expect(requestDialog.getByText(/Transaction ID: DEP-/)).toBeVisible();
    await shot('3-deposit-request');
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    // 3 — deposit, payment gateway leg: order → `#pg-tpl` step → mock window → success
    await page.goto('/my/account/deposit?method=gateway');
    const gatewayForm = page.getByTestId('deposit-gateway-form');
    await expect(gatewayForm).toBeVisible();
    await gatewayForm.getByLabel('Amount', { exact: true }).fill('123.45');
    await gatewayForm.getByRole('checkbox').check();
    await gatewayForm.getByRole('button', { name: 'Submit deposit request' }).click();
    const pgStep = page.getByTestId('gateway-pg-step');
    await expect(pgStep).toBeVisible();
    await shot('4-gateway-pg-step');

    const popupPromise = page.waitForEvent('popup');
    await pgStep.locator('#btnShowPg').click();
    const popup = await popupPromise;
    popup.on('console', (message) => {
      if (message.type() === 'error' && !benign(message)) errors.push(`[gateway] ${message.text()}`);
    });
    popup.on('pageerror', (error) => errors.push(`[gateway] pageerror: ${error.message}`));
    await expect(popup.getByTestId('gateway-state')).toHaveAttribute('data-state', 'ready');
    await popup.screenshot({ path: `_scratch/shots/t60-flow-${label}-5-gateway-window.png` });
    await popup.getByTestId('gateway-sim-success').click();

    await page.waitForURL(/\/my\/account\/deposit\/result\?status=success&order=PG-/);
    await expect(page.getByText('Deposit successful')).toBeVisible();
    await expect(page.getByTestId('result-details')).toHaveAttribute('data-state', 'ready');
    await shot('6-result-success');

    // The credit lands once: the same refresh never replays it.
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('brand:deposit-credited')), { timeout: 20000 })
      .toContain('PG-');
    await page.reload();
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('brand:deposit-records') ?? '[]').length),
      )
      .toBe(1);

    // 4 — the wallet, history and inbox all see the deposit
    await page.goto('/my/account/history');
    if (label === 'desktop') {
      // The account menu reads total assets (seed 1,622.50 plus this deposit).
      await expect(page.locator('.account-menu__profile-balance-amount').first()).toHaveText('1,745.95');
    }
    await expect(page.locator('.history-table tbody tr').filter({ hasText: 'MYR 123.45' })).toHaveCount(1);
    await shot('7-history-deposit');

    await page.goto('/my/account/inbox');
    await expect(page.getByText('Deposit recorded').first()).toBeVisible();
    await shot('8-inbox-deposit');

    // 5 — withdrawal: the bound accounts are the T57 seed's, masked
    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');
    const bankRows = page.locator('.bank-table tbody tr');
    await expect(bankRows).toHaveCount(2);
    await expect(bankRows.nth(0)).toContainText('**** 4471');
    await shot('9-banks');

    // 6 — the request: confirm dialog, then the pending row reaches the store
    const id = `wd_e2e_${randomBytes(4).toString('hex')}`;
    const seeded: Row = {
      id,
      reference: `WD-E2E-${id.slice(-6).toUpperCase()}`,
      idempotencyKey: `e2e-${id}`,
      bankAccountId: 'ba-1',
      methodLabel: 'Maybank **** 4471',
      amountMinor: 25075,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    writeRequests([seeded, ...readRequests()]);
    try {
      await clearTurnover(page);
      await page.route('**/api/withdrawal/requests', async (route) => {
        if (route.request().method() === 'GET') return route.continue();
        return route.fulfill({
          json: {
            status: '0',
            msg: 'Done',
            d: {
              id,
              reference: seeded.reference,
              amountMinor: seeded.amountMinor,
              methodLabel: seeded.methodLabel,
              createdAt: seeded.createdAt,
              replayed: false,
            },
          },
        });
      });

      await page.goto('/my/account/withdrawal');
      await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');
      await page.locator('#bankAccountId').selectOption({ label: 'Maybank **** 4471' });
      await page.getByLabel('Amount', { exact: true }).fill('250.75');
      await shot('10-withdrawal-form');
      await page.getByRole('button', { name: 'Submit withdrawal request' }).click();

      const confirm = page.getByRole('dialog');
      await expect(confirm.getByText('Withdraw RM 250.75 to Maybank **** 4471?')).toBeVisible();
      await shot('11-withdrawal-confirm');
      await confirm.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByRole('dialog').getByText('Successfully', { exact: true })).toBeVisible();
      await shot('12-withdrawal-success');
      await page.getByRole('button', { name: 'OK', exact: true }).click();

      // 7 — the pending page lists the request
      await page.goto('/my/account/pending');
      const pendingRow = page.locator(`[data-pending="${id}"]`);
      await expect(pendingRow).toBeVisible();
      await expect(pendingRow).toContainText(seeded.reference);
      await shot('13-pending');

      // 8 — the back office approves; the debit happened exactly once
      await page.goto('/dev/wallet');
      await expect(page.locator('.dev-wallet-total')).toHaveText('MYR 1,495.20');
      const devRow = page.locator(`[data-withdrawal="${id}"]`);
      await expect(devRow).toBeVisible();
      await shot('14-dev-wallet');
      await devRow.getByRole('button', { name: 'Approve' }).click();
      await expect(devRow).toHaveAttribute('data-status', 'success');

      // 9 — the member's next account page settles it: history and inbox agree
      await page.goto('/my/account/history');
      await expect
        .poll(() => page.evaluate(() => window.localStorage.getItem('brand:withdrawal-settled')))
        .toContain(id);
      expect(await ledgerCount(page, 'withdraw', 25075)).toBe(1);
      expect(await ledgerCount(page, 'deposit', 25075)).toBe(0);

      await page.getByLabel('Searching History').selectOption('withdrawal');
      const approved = page.locator('.history-table tbody tr').filter({ hasText: 'MYR 250.75' });
      await expect(approved).toHaveCount(1);
      await expect(approved).toContainText('Approved');
      await shot('15-history-approved');

      await page.goto('/my/account/inbox');
      await expect(page.getByText('Withdrawal update').first()).toBeVisible();
      await shot('16-inbox-withdrawal');
    } finally {
      writeRequests(readRequests().filter((row) => row.id !== id));
    }

    expect(errors, 'console errors during the journey').toEqual([]);
  });
}
