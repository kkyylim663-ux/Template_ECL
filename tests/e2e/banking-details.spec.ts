import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T57: the Banking Details page (`/account/banks`) — the reference's
 * `/my/mybanks`. Its chunk was never captured, so the copy assertions pin what
 * the capture does carry: the resource's table keys and the old form's
 * validation / success / delete strings (see site/_scratch/t56-research.md §3.2).
 *
 * The page writes through the mock store (`lib/mock-withdrawal/banks.ts`), whose
 * file survives across runs, so every test that adds an account drops it again —
 * the seeded two are the state the withdrawal spec's assertions expect.
 */
const SEED_IDS = ['ba-1', 'ba-2'];
const ADDED_NUMBER = '123456784321';

async function cleanup(page: Page) {
  const info = await (await page.request.get('/api/withdrawal/info')).json();
  for (const account of info.d.bankAccounts as { id: string }[]) {
    if (!SEED_IDS.includes(account.id)) {
      await page.request.delete(`/api/withdrawal/banks/${account.id}`);
    }
  }
}

async function addAccount(page: Page, number: string) {
  const response = await page.request.post('/api/withdrawal/banks', {
    data: { bankId: 'rhb', accountName: 'Demo Player', accountNumber: number },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()).d as { id: string }).id;
}

test.describe('banking details page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test('lists the bound accounts masked, with status, default badge and the add form', async ({
    page,
  }) => {
    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByRole('heading', { name: 'Banking Details' })).toBeVisible();

    // The member menu carries the page (reference `/my/mybanks`); at desktop it
    // lives in the account menu, which only the header's own hover opens, so the
    // wiring is pinned by the link itself.
    await expect(page.locator('a[href="/my/account/banks"]')).toHaveCount(1);

    const headers = page.locator('.bank-table thead th');
    await expect(headers).toHaveText(['Bank', 'Account Number', 'Status', 'Action']);

    const rows = page.locator('.bank-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Maybank');
    // Only the last four digits are ever printed.
    await expect(rows.nth(0)).toContainText('**** 4471');
    await expect(rows.nth(0)).not.toContainText('514288904471');
    await expect(rows.nth(0).locator('.my-bank__verfied')).toHaveText('Verified');
    await expect(rows.nth(0).locator('.my-bank-default')).toHaveText('Default');

    await expect(rows.nth(1)).toContainText('CIMB Bank');
    await expect(rows.nth(1)).toContainText('**** 8890');
    await expect(rows.nth(1).locator('.my-bank-pending')).toHaveText('Pending');
    await expect(rows.nth(1).getByRole('button', { name: 'Set as default' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'New Bank' })).toBeVisible();
    await expect(page.locator('#bank-account-bank option')).toHaveCount(5);
    await expect(page.locator('#bank-account-bank option')).toHaveText([
      'Please select',
      'Maybank',
      'CIMB Bank',
      'RHB Bank',
      'Public Bank',
    ]);
    await expect(page.getByRole('button', { name: 'Add Bank Account' })).toBeVisible();
  });

  test("the withdrawal page's plus tile leads here", async ({ page }) => {
    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');

    await page.getByRole('link', { name: 'Add Bank Account' }).click();
    await expect(page).toHaveURL(/\/my\/account\/banks$/);
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');
  });

  test('validates the add form with the reference’s own wording, then binds', async ({ page }) => {
    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');

    // Empty submit: the old form's three messages (`err_add_acc_*`).
    await page.getByRole('button', { name: 'Add Bank Account' }).click();
    await expect(page.getByText('Choose a bank account')).toBeVisible();
    await expect(page.getByText('Enter the account name')).toBeVisible();
    await expect(page.getByText('Please enter your bank account no.')).toBeVisible();

    await page.selectOption('#bank-account-bank', 'rhb');
    await page.fill('#bank-account-name', 'Demo Player');
    await page.fill('#bank-account-number', '12345');
    await page.getByRole('button', { name: 'Add Bank Account' }).click();
    await expect(page.getByText('Enter 6–20 digits')).toBeVisible();

    // Separators are stripped as typed, like the reference's `#baNo`.
    await page.fill('#bank-account-number', `1234 5678 4321`);
    await expect(page.locator('#bank-account-number')).toHaveValue(ADDED_NUMBER);
    await page.getByRole('button', { name: 'Add Bank Account' }).click();

    // `bank_acc_success` / the resource's own success line.
    await expect(page.getByText('Bank Account has been successfully added!')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();

    const rows = page.locator('.bank-table tbody tr');
    await expect(rows).toHaveCount(3);
    const added = rows.filter({ hasText: '**** 4321' });
    await expect(added).toHaveCount(1);
    // A fresh account is Pending until its check lands (the reference's `bank_pending`).
    await expect(added.locator('.my-bank-pending')).toHaveText('Pending');
    await expect(added).toContainText('RHB Bank');
  });

  test('keeps the list at three accounts and the store refuses a fourth', async ({ page }) => {
    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');

    await page.selectOption('#bank-account-bank', 'rhb');
    await page.fill('#bank-account-name', 'Demo Player');
    await page.fill('#bank-account-number', ADDED_NUMBER);
    await page.getByRole('button', { name: 'Add Bank Account' }).click();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('.bank-table tbody tr')).toHaveCount(3);

    // The cap is the form's own limit — and the route's, not just the UI's.
    await expect(page.getByText('You can bind up to 3 bank accounts.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Bank Account' })).toHaveCount(0);

    const refused = await page.request.post('/api/withdrawal/banks', {
      data: { bankId: 'rhb', accountName: 'Demo Player', accountNumber: '999900001111' },
    });
    expect(refused.status()).toBe(409);
    expect((await refused.json()).status).toBe('207');

    // Free a slot again: now the store answers with the reference's own 205
    // ("Bank Account Has Been Registered") for a number it already holds.
    const info = await (await page.request.get('/api/withdrawal/info')).json();
    const added = (info.d.bankAccounts as { id: string }[]).find(
      (account) => !SEED_IDS.includes(account.id),
    );
    expect(added).toBeTruthy();
    await page.request.delete(`/api/withdrawal/banks/${added?.id}`);

    const duplicate = await page.request.post('/api/withdrawal/banks', {
      data: { bankId: 'rhb', accountName: 'Demo Player', accountNumber: '5142 8890 4471' },
    });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).status).toBe('205');
  });

  test('edits an account through the same form', async ({ page }) => {
    const id = await addAccount(page, ADDED_NUMBER);
    await page.goto('/my/account/banks');
    const row = page.locator(`.bank-table tbody tr[data-account="${id}"]`);
    await expect(row).toHaveCount(1);

    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit' })).toBeVisible();
    await expect(page.locator('#bank-account-bank')).toHaveValue('rhb');
    await expect(page.locator('#bank-account-number')).toHaveValue(ADDED_NUMBER);

    await page.selectOption('#bank-account-bank', 'maybank');
    await page.fill('#bank-account-name', 'Renamed Player');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Bank account updated.')).toBeVisible();
    await expect(row).toContainText('Maybank');
    await expect(row).toContainText('**** 4321');
    // Saving closed the edit form; with three accounts bound the add form stays
    // out of the way and the cap note takes its place.
    await expect(page.getByRole('heading', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByText('You can bind up to 3 bank accounts.')).toBeVisible();
  });

  test('deleting asks the reference’s question; the default badge moves on', async ({ page }) => {
    const id = await addAccount(page, ADDED_NUMBER);
    await page.goto('/my/account/banks');
    const row = page.locator(`.bank-table tbody tr[data-account="${id}"]`);
    await expect(row).toHaveCount(1);

    // `confirm_delete` — Cancel keeps it.
    await row.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Are you confirm to delete?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(row).toHaveCount(1);

    // Set the added account as the default, then delete it: the badge goes back
    // to the first account that is left (the store's own rule).
    await row.getByRole('button', { name: 'Set as default' }).click();
    await expect(page.getByText('Default bank account updated.')).toBeVisible();
    await expect(row.locator('.my-bank-default')).toHaveText('Default');

    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Bank account deleted.')).toBeVisible();
    await expect(page.locator('.bank-table tbody tr')).toHaveCount(2);
    await expect(page.locator('.bank-table tbody tr').nth(0).locator('.my-bank-default')).toHaveText(
      'Default',
    );
  });

  test('a fresh member sees the bind guidance instead of a table', async ({ page }) => {
    await page.route('**/api/withdrawal/info', async (route) => {
      const body = await (await route.fetch()).json();
      await route.fulfill({ json: { ...body, d: { ...body.d, bankAccounts: [] } } });
    });

    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'empty');
    await expect(
      page.getByText('You have not bound a bank account yet. Add one below.'),
    ).toBeVisible();
    await expect(page.locator('.bank-table')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add Bank Account' })).toBeVisible();
  });

  test('shows the loading state while the info is in flight, then ready', async ({ page }) => {
    await page.route('**/api/withdrawal/info', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'loading');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');
  });

  test('a failed load shows the error state and Retry recovers', async ({ page }) => {
    await page.route('**/api/withdrawal/info', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: '1', msg: 'boom', d: null }),
      }),
    );

    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'error');
    await expect(page.getByText('Could not load your bank accounts.')).toBeVisible();

    await page.unroute('**/api/withdrawal/info');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');
  });

  test('mobile 375: the table and form stay inside the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/banks');
    await expect(page.getByTestId('banking-details-state')).toHaveAttribute('data-state', 'ready');

    await expect(page.locator('.bank-table tbody tr')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Add Bank Account' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
