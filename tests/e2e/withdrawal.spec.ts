import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T56: the withdrawal page's chrome — the "What to verify" table, the
 * verified-account row with the plus tile, the limits/reminder block — with the
 * four standard fetch states. The reference page's own chunk was never captured
 * (my_mywithdrawal.html is a 0-byte 302), so the copy assertions pin the Fluent
 * strings the shared bundle carries (see site/_scratch/t56-research.md).
 */
test.describe('withdrawal page', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('lists the verified account, its status table and the limits', async ({ page }) => {
    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');

    // Only a verified account can receive a payout (reference getMyBankAccVerified):
    // the demo seed carries one verified and one unverified account.
    const options = page.locator('#bankAccountId option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toHaveText('Please select');
    await expect(options.nth(1)).toHaveText('Maybank **** 4471');

    // The MY gate lists mobile + email; the demo profile's check is pending.
    const rows = page.locator('.withdraw-verify__list-body');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Mobile Number');
    await expect(rows.nth(1)).toContainText('Email');
    await expect(
      page.getByText('Please verify your Mobile Number and Email to unlock Withdrawal function.'),
    ).toBeVisible();
    await expect(page.locator('.withdraw-verify-now')).toHaveCount(2);

    await expect(page.locator('.withdraw-info__limits')).toHaveText('Min 200.00 / Max 50,000.00');
    await expect(page.getByText('Friendly Reminder')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Bank Account' })).toBeVisible();
  });

  test('the SG market gates on the bank-account row too', async ({ page }) => {
    await page.goto('/sg/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');

    const rows = page.locator('.withdraw-verify__list-body');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Mobile Number');
    await expect(rows.nth(1)).toContainText('Bank Account');
    await expect(rows.nth(2)).toContainText('Email');
    // One verified account is bound, so the middle row is green.
    await expect(rows.nth(1).locator('.withdraw-verify__verified')).toHaveText('Verified');
  });

  test('shows the loading state while the info is in flight, then ready', async ({ page }) => {
    await page.route('**/api/withdrawal/info', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'loading');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');
  });

  test('a failed load shows the error state and Retry recovers', async ({ page }) => {
    await page.route('**/api/withdrawal/info', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: '1', msg: 'boom', d: null }),
      }),
    );

    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'error');
    await expect(page.getByText('Could not load the withdrawal details.')).toBeVisible();

    await page.unroute('**/api/withdrawal/info');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');
  });

  test('an empty account list guides to the bind step', async ({ page }) => {
    await page.route('**/api/withdrawal/info', async (route) => {
      const body = await (await route.fetch()).json();
      await route.fulfill({
        json: {
          ...body,
          d: {
            ...body.d,
            bankAccounts: body.d.bankAccounts.map((account: { verified: boolean }) => ({
              ...account,
              verified: false,
            })),
          },
        },
      });
    });

    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'empty');
    await expect(page.getByText('No Available Bank')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add Bank Account' })).toBeVisible();
    await expect(page.locator('#bankAccountId')).toHaveCount(0);
  });

  test('mobile 375: the phone card wraps the header and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');

    await expect(page.locator('.withdraw-header__wrapper')).toBeVisible();
    await expect(page.locator('.withdraw-verify-now').first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});

/**
 * T58: the request form under the account row. Demo account has turnover still
 * owed (promotion ro-1), so the form starts disabled. The success path clears
 * that gate on the info route and answers the POST with a canned success, since
 * the server reads its turnover itself. The server rules are covered by the unit
 * tests; the pending row is the same store the unit test reads.
 */
test.describe('withdrawal request', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('owed turnover disables the form and explains why', async ({ page }) => {
    await page.goto('/my/account/withdrawal');
    await expect(page.getByTestId('withdrawal-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByText('You still have remaining turnover')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit withdrawal request' })).toBeDisabled();
  });

  test('rejects a below-minimum and an above-maximum amount without posting', async ({ page }) => {
    await clearTurnover(page);
    let posts = 0;
    await page.route('**/api/withdrawal/requests', (route) => {
      posts += 1;
      return route.continue();
    });
    await page.goto('/my/account/withdrawal');
    await page.locator('#bankAccountId').selectOption({ label: 'Maybank **** 4471' });

    const amount = page.getByLabel('Amount', { exact: true });
    const submit = page.getByRole('button', { name: 'Submit withdrawal request' });

    await amount.fill('19.99');
    await submit.click();
    await expect(page.getByText('Below the minimum withdrawal amount')).toBeVisible();

    await amount.fill('50,000.01');
    await submit.click();
    await expect(page.getByText('Above the maximum withdrawal amount')).toBeVisible();
    expect(posts).toBe(0);
  });

  test('refuses an amount the wallet cannot cover before posting', async ({ page }) => {
    await clearTurnover(page);
    let posts = 0;
    await page.route('**/api/withdrawal/requests', (route) => {
      posts += 1;
      return route.continue();
    });
    await page.goto('/my/account/withdrawal');
    await page.locator('#bankAccountId').selectOption({ label: 'Maybank **** 4471' });
    await page.getByLabel('Amount', { exact: true }).fill('50,000');
    await page.getByRole('button', { name: 'Submit withdrawal request' }).click();
    await expect(page.getByText('Amount exceeds your main wallet balance.')).toBeVisible();
    expect(posts).toBe(0);
  });

  test('a double submit posts once and debits the wallet once', async ({ page }) => {
    await clearTurnover(page);
    let posts = 0;
    await page.route('**/api/withdrawal/requests', async (route) => {
      posts += 1;
      await route.fulfill({
        json: {
          status: '0',
          msg: 'Done',
          d: { id: 'wd_e2e', reference: 'WD-E2E', amountMinor: 50_000, methodLabel: 'Maybank **** 4471', createdAt: new Date().toISOString(), replayed: false },
        },
      });
    });
    await page.goto('/my/account/withdrawal');
    await page.locator('#bankAccountId').selectOption({ label: 'Maybank **** 4471' });
    await page.getByLabel('Amount', { exact: true }).fill('500');
    await page.getByRole('button', { name: 'Submit withdrawal request' }).click();

    const confirm = page.getByRole('button', { name: 'Confirm' });
    await confirm.dblclick();
    await expect(page.getByRole('dialog').getByText('Successfully', { exact: true })).toBeVisible();
    expect(posts).toBe(1);
  });
});

/** Turnover is a promotion field; the success path clears it in the page's own info payload. */
async function clearTurnover(page: Page) {
  await page.route('**/api/withdrawal/info', async (route) => {
    const body = await (await route.fetch()).json();
    await route.fulfill({
      json: { ...body, d: { ...body.d, turnoverRemainingMinor: 0 } },
    });
  });
}
