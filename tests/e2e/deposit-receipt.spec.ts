import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T53: the receipt step. The reference's `#rec-upload-tpl` — `Transaction ID :
 * <id>`, "Please upload bank deposit slip.", the Attachment field, UPLOAD / SKIP
 * and the `token` / `t` hidden fields — with T53's own rules: jpg / png / pdf,
 * one file, at most 5 MB, and a purely local upload (no request, nothing from
 * the file in storage or logs).
 */
const shouldBeRefused = 'Only JPG, PNG or PDF files are accepted';
const tooLarge = 'The file must be 5 MB or smaller';

/** Submits the bank form and waits for the receipt step it swaps in. */
async function openReceiptStep(page: Page, query = ''): Promise<void> {
  await page.goto(`/my/account/deposit${query}`);
  const form = page.getByTestId('deposit-bank-form');
  await form.getByRole('radio', { name: 'Maybank' }).click();
  await form.getByLabel('Amount', { exact: true }).fill('100');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Submit deposit request' }).click();
  await expect(page.getByTestId('deposit-receipt')).toBeVisible();
}

const receiptField = (page: Page) => page.locator('input[name="receipt"]');
const uploadButton = (page: Page) => page.getByRole('button', { name: 'Upload', exact: true });

test.describe('deposit receipt upload', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('the receipt step replaces the form; SKIP raises the success dialog', async ({ page }) => {
    await page.route('**/api/deposit/bank', async (route) => {
      await route.fulfill({
        json: {
          status: '0',
          msg: 'Done',
          d: {
            transactionId: 'DEP-TEST',
            token: 'MOCK-TOKEN-DEP-TEST',
            ticketid: 'MOCK-TICKET-DEP-TEST',
            bankId: 'maybank',
            amountMinor: 10000,
            createdAt: '2026-10-17T00:00:00+08:00',
          },
        },
      });
    });

    await openReceiptStep(page);
    const step = page.getByTestId('deposit-receipt');
    // The reference's contract lines, on the way to `_Deposit.showSuccess()`.
    await expect(step).toContainText('Transaction ID : DEP-TEST');
    await expect(step).toContainText('Please upload bank deposit slip.');
    await expect(step).toContainText('Attachment');
    await expect(page.getByText('Deposit request submitted')).toHaveCount(0);
    // …and the hidden token / ticketid the old form posted.
    await expect(page.locator('input[name="token"]')).toHaveValue('MOCK-TOKEN-DEP-TEST');
    await expect(page.locator('input[name="t"]')).toHaveValue('MOCK-TICKET-DEP-TEST');

    await step.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Deposit request submitted')).toBeVisible();
    await expect(page.getByText('Transaction ID: DEP-TEST.')).toBeVisible();
    // The flow is closed: the form is back, its amount cleared.
    await expect(page.getByTestId('deposit-receipt')).toHaveCount(0);
    await expect(page.getByLabel('Amount', { exact: true })).toHaveValue('');
  });

  test('UPLOAD with no attachment answers with the reference err_empty_receipt', async ({ page }) => {
    await openReceiptStep(page);
    await uploadButton(page).click();
    await expect(page.getByText('Please submit your RECEIPT')).toBeVisible();
  });

  test('refuses a file that is not jpg / png / pdf, showing nothing', async ({ page }) => {
    await openReceiptStep(page);
    await receiptField(page).setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a receipt'),
    });
    await expect(page.getByText(shouldBeRefused)).toBeVisible();
    await expect(page.getByTestId('receipt-name')).toHaveCount(0);
  });

  test('refuses a file over 5 MB but takes one exactly on the ceiling', async ({ page }) => {
    await openReceiptStep(page);
    await receiptField(page).setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByText(tooLarge)).toBeVisible();
    await expect(page.getByTestId('receipt-name')).toHaveCount(0);

    await receiptField(page).setInputFiles({
      name: 'exact.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(5 * 1024 * 1024),
    });
    await expect(page.getByTestId('receipt-name')).toHaveText('exact.pdf');
    await expect(page.getByText(tooLarge)).toHaveCount(0);
  });

  test('a picked PNG previews as a thumbnail, and delete clears it', async ({ page }) => {
    await openReceiptStep(page);
    await receiptField(page).setInputFiles({
      name: 'slip.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        // 1×1 transparent PNG.
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });

    const thumb = page.locator('.deposit-receipt__thumb');
    await expect(thumb).toBeVisible();
    await expect(thumb).toHaveAttribute('src', /^blob:/);
    await expect(page.getByTestId('receipt-name')).toHaveText('slip.png');
    await expect(page.locator('.deposit-receipt__size')).toHaveText(/\d+ (B|KB|MB)/);

    await page.getByRole('button', { name: 'Remove file' }).click();
    await expect(thumb).toHaveCount(0);
    await expect(page.getByTestId('receipt-name')).toHaveCount(0);
    await expect(page.getByText('Drag and drop a file here, or click to choose')).toBeVisible();
  });

  test('a dropped file is taken by the dropzone', async ({ page }) => {
    await openReceiptStep(page);
    const dropzone = page.getByTestId('deposit-dropzone');
    await expect(dropzone).toBeVisible();

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await dataTransfer.evaluate((transfer) => {
      transfer.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'dropped.png', { type: 'image/png' }));
    });
    await dropzone.dispatchEvent('dragover', { dataTransfer });
    await dropzone.dispatchEvent('drop', { dataTransfer });
    await expect(page.getByTestId('receipt-name')).toHaveText('dropped.png');
  });

  test('UPLOAD runs the mock progress, then the success dialog — with no request', async ({
    page,
  }) => {
    await openReceiptStep(page);
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    const keysBefore = await page.evaluate(() => Object.keys(localStorage).sort().join(','));
    const name = 'receipt-9f2c.png';

    await receiptField(page).setInputFiles({
      name,
      mimeType: 'image/png',
      buffer: Buffer.alloc(2048),
    });
    await uploadButton(page).click();

    const progress = page.getByTestId('receipt-progress');
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute('aria-valuenow', /\d+/);
    await expect(page.getByText('Deposit request submitted')).toBeVisible();
    await expect(page.getByText('Bankslip upload successfully! Thank you!')).toBeVisible();

    // The upload is local: nothing was posted, and neither the name nor an id
    // from it reached storage.
    expect(writes).toEqual([]);
    const storage = await page.evaluate(() =>
      JSON.stringify(Object.entries(localStorage)),
    );
    expect(storage).not.toContain(name);
    expect(storage).not.toContain('RCPT-');
    expect(await page.evaluate(() => Object.keys(localStorage).sort().join(','))).toBe(keysBefore);
  });

  test('?receiptFail=1 fails the first attempt; Retry finishes the upload', async ({ page }) => {
    await openReceiptStep(page, '?method=bank&receiptFail=1');
    await receiptField(page).setInputFiles({
      name: 'slip.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(1024),
    });

    await uploadButton(page).click();
    await expect(page.getByText('Upload failed. Please try again.')).toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Deposit request submitted')).toBeVisible();
  });

  test('mobile 375: the receipt step fits and overflows neither axis', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openReceiptStep(page);
    await receiptField(page).setInputFiles({
      name: 'slip.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(1024),
    });
    await expect(page.getByTestId('receipt-name')).toHaveText('slip.png');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
