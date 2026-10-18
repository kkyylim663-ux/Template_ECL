import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { mockDataFile } from './mock-data';
import { signIn } from './session';

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

/**
 * T59B withdrawal settlement. The back office (dev route) moves a pending
 * request to success or failed; the member's next account page settles it once:
 * a failure refunds the same amount to the main wallet, and either outcome
 * leaves one history row and one inbox notice. The demo account's turnover
 * gate would block a real submit, so the pending row is seeded into the same
 * mock file the request API writes.
 */
test.describe('withdrawal settlement', () => {
  const seeded: string[] = [];

  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test.afterEach(() => {
    cleanupSeeded(seeded.splice(0));
  });

  async function seedPending(amountMinor: number): Promise<string> {
    const id = `wd_e2e_${randomBytes(4).toString('hex')}`;
    const rows = readRequests();
    rows.unshift({
      id,
      reference: `WD-E2E-${id.slice(-6).toUpperCase()}`,
      idempotencyKey: `e2e-${id}`,
      bankAccountId: 'ba-1',
      methodLabel: 'Bank transfer',
      amountMinor,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    writeRequests(rows);
    return id;
  }

  /** Removes this run's seeded rows so the daily cap and the pending hold stay clean for other specs. */
  function cleanupSeeded(ids: string[]) {
    writeRequests(readRequests().filter((row) => !ids.includes(row.id)));
  }

  async function settle(page: Page, id: string, status: 'success' | 'failed') {
    const response = await page.request.post('/api/dev/withdrawal/status', { data: { id, status } });
    expect(response.status()).toBe(200);
  }

  /** How many main-wallet deposits of this amount sit in the ledger; a refund is one of them. */
  async function ledgerDeposits(page: Page, amountMinor: number): Promise<number> {
    return page.evaluate(
      (amount) =>
        (
          JSON.parse(window.localStorage.getItem('brand:wallets:ledger:acct:u_1001') ?? '[]') as {
            kind: string;
            amountMinor: number;
          }[]
        ).filter((entry) => entry.kind === 'deposit' && entry.amountMinor === amount).length,
      amountMinor,
    );
  }

  /** The result reaches the history table's Withdrawal view. */
  async function historyRow(page: Page, amount: string) {
    await page.getByLabel('Searching History').selectOption('withdrawal');
    return page.locator('.history-table tbody tr').filter({ hasText: `MYR ${amount}` });
  }

  test('a failed withdrawal refunds once and shows in history and inbox', async ({ page }) => {
    const id = await seedPending(21435);
    seeded.push(id);
    await settle(page, id, 'failed');

    await page.goto('/my/account/history');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('brand:withdrawal-settled')))
      .toContain(id);

    // Refresh twice: the refund is keyed by the request, so it never repeats.
    await page.reload();
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(window.localStorage.getItem('brand:withdrawal-records') ?? '[]').length),
      )
      .toBe(1);
    await expect.poll(() => ledgerDeposits(page, 21435)).toBe(1);

    const refunded = await historyRow(page, '214.35');
    await expect(refunded).toHaveCount(1);
    await expect(refunded).toContainText('Rejected');

    await page.goto('/my/account/inbox');
    await expect(page.getByText('Withdrawal update').first()).toBeVisible();
  });

  test('a successful withdrawal leaves no refund and records the approval', async ({ page }) => {
    const id = await seedPending(31415);
    seeded.push(id);

    // The back-office advance is the /dev page's own control.
    await page.goto('/dev/wallet');
    const pending = page.locator(`[data-withdrawal="${id}"]`);
    await expect(pending).toBeVisible();
    await pending.getByRole('button', { name: 'Approve' }).click();
    await expect(pending).toHaveAttribute('data-status', 'success');

    await page.goto('/my/account/history');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('brand:withdrawal-settled')))
      .toContain(id);

    const record = await page.evaluate(
      (requestId) =>
        (JSON.parse(window.localStorage.getItem('brand:withdrawal-records') ?? '[]') as {
          requestId: string;
          status: string;
          row: { status: string };
        }[]).find((item) => item.requestId === requestId),
      id,
    );
    expect(record).toMatchObject({ status: 'success', row: { status: 'approved' } });

    // A success never moves money: no deposit of that amount reaches the ledger.
    await expect.poll(() => ledgerDeposits(page, 31415)).toBe(0);

    const approved = await historyRow(page, '314.15');
    await expect(approved).toHaveCount(1);
    await expect(approved).toContainText('Approved');

    await page.goto('/my/account/inbox');
    await expect(page.getByText('Withdrawal update').first()).toBeVisible();
  });
});
