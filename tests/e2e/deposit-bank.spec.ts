import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T52: the bank-transfer form. The contract follows the old form's
 * `#bank-info-tpl` (pick a bank -> its account details appear) plus the
 * dictionary's `bank_copy_msg` for the copy control.
 */
test.describe('deposit bank transfer form', () => {
  // The copy button writes to the real clipboard.
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('rejects a submit without a bank, an amount and the terms - and sends nothing', async ({
    page,
  }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/deposit/bank')) posts.push(request.url());
    });

    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await expect(form).toBeVisible();

    await form.getByRole('button', { name: 'Submit deposit request' }).click();
    await expect(form.getByText('Choose a bank account')).toBeVisible();
    await expect(form.getByText('Enter the amount to deposit')).toBeVisible();
    await expect(form.getByText('You must accept the terms to continue')).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test('checks the amount against the bank limits and refuses non-numbers', async ({ page }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    const amount = form.getByLabel('Amount', { exact: true });
    const submit = form.getByRole('button', { name: 'Submit deposit request' });

    // The field only ever holds a grouped figure: letters never appear in it.
    await amount.fill('abc');
    await expect(amount).toHaveValue('');
    await amount.fill('12345');
    await expect(amount).toHaveValue('12,345');

    await form.getByRole('radio', { name: 'Maybank' }).click();

    await amount.fill('49.99');
    await submit.click();
    await expect(form.getByText('Below the minimum deposit amount')).toBeVisible();

    await amount.fill('50,000.01');
    await submit.click();
    await expect(form.getByText('Above the maximum deposit amount')).toBeVisible();
  });

  test('a quick-amount pill fills the field', async ({ page }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form.getByRole('button', { name: 'RM 500' }).click();
    await expect(form.getByLabel('Amount', { exact: true })).toHaveValue('500');
  });

  test('picking a bank reveals its account details; copy toasts and fills the clipboard', async ({
    page,
  }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await expect(page.getByTestId('bank-detail')).toHaveCount(0);

    await form.getByRole('radio', { name: 'Maybank' }).click();
    const detail = page.getByTestId('bank-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Bank Account Name');
    await expect(detail).toContainText('5142 8890 4471');

    await detail.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByText('Copied', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('5142 8890 4471');
  });

  test('a valid submit shows the transaction id, and the button is disabled while in flight', async ({
    page,
  }) => {
    let posts = 0;
    await page.route('**/api/deposit/bank', async (route) => {
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        json: {
          status: '0',
          msg: 'Done',
          d: {
            transactionId: 'DEP-TEST',
            bankId: 'maybank',
            amountMinor: 10000,
            createdAt: '2026-10-17T00:00:00+08:00',
          },
        },
      });
    });

    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form.getByRole('radio', { name: 'Maybank' }).click();
    await form.getByLabel('Amount', { exact: true }).fill('100');
    await form.getByRole('checkbox').check();

    const submit = form.getByRole('button', { name: 'Submit deposit request' });
    await submit.click();
    // One click, one request: the button cannot be pressed again while pending.
    await expect(form.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
    await expect(page.getByText('Transaction ID: DEP-TEST')).toBeVisible();
    expect(posts).toBe(1);
  });

  test('mobile 375: the form fits and overflows neither axis', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form.getByRole('radio', { name: 'CIMB Bank' }).click();
    await expect(page.getByTestId('bank-detail')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Submit deposit request' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
