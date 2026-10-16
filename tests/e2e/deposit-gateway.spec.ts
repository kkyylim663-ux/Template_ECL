import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T54: the payment-gateway leg. The reference's `#pg-tpl` step (`_Deposit.showPg`)
 * opens the gateway window with its own features and waits for a `reloadable`
 * message; this build's mock of that window rules the order exactly once, and
 * the in-site result page renders the three ruled layouts — the unknown fallback
 * for a hand-typed `?status=`, and a record a refresh never replays.
 */

async function openGatewayForm(page: Page): Promise<void> {
  await page.goto('/my/account/deposit?method=gateway');
  await expect(page.getByTestId('deposit-gateway-form')).toBeVisible();
}

async function fillGatewayForm(page: Page): Promise<void> {
  const form = page.getByTestId('deposit-gateway-form');
  await form.getByLabel('Amount', { exact: true }).fill('100');
  await form.getByRole('checkbox').check();
}

async function submitGatewayForm(page: Page): Promise<void> {
  await fillGatewayForm(page);
  await page
    .getByTestId('deposit-gateway-form')
    .getByRole('button', { name: 'Submit deposit request' })
    .click();
  await expect(page.getByTestId('gateway-pg-step')).toBeVisible();
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function createOrder(page: Page, ttlSeconds?: number): Promise<string> {
  const created = await page.request.post('/api/deposit/gateway', {
    data: { amountMinor: 10000, ...(ttlSeconds ? { ttlSeconds } : {}) },
  });
  const payload = (await created.json()) as { d: { orderId: string } };
  return payload.d.orderId;
}

/** Runs the form → pg step → gateway window path and clicks one ruling. */
async function ruleViaWindow(
  page: Page,
  outcome: 'success' | 'failed' | 'processing',
): Promise<void> {
  await openGatewayForm(page);
  await submitGatewayForm(page);
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#btnShowPg').click();
  const popup = await popupPromise;
  await expect(popup.getByTestId('gateway-state')).toHaveAttribute('data-state', 'ready');
  await popup.getByTestId(`gateway-sim-${outcome}`).click();
  await page.waitForURL(new RegExp(`/my/account/deposit/result\\?status=${outcome}&order=PG-`));
}

test.describe('deposit gateway', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('submitting the gateway form swaps in the reference #pg-tpl step', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await openGatewayForm(page);
    await expect(page.getByText('Minimum Deposit Amount : RM 50.00')).toBeVisible();

    await submitGatewayForm(page);
    const step = page.getByTestId('gateway-pg-step');
    await expect(step).toContainText('Please proceed to payment gateway to transfer the fund.');
    await expect(step.locator('#btnShowPg')).toHaveText('SUBMIT');
    expect(posts.some((url) => url.endsWith('/api/deposit/gateway'))).toBe(true);
  });

  test('the form refuses amounts outside the gateway limits before sending', async ({ page }) => {
    await openGatewayForm(page);
    const form = page.getByTestId('deposit-gateway-form');
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/deposit/gateway')) {
        posts.push(request.url());
      }
    });

    await form.getByLabel('Amount', { exact: true }).fill('49.99');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Submit deposit request' }).click();
    await expect(page.getByText('Below the minimum deposit amount')).toBeVisible();

    await form.getByLabel('Amount', { exact: true }).fill('20,000.01');
    await form.getByRole('button', { name: 'Submit deposit request' }).click();
    await expect(page.getByText('Above the maximum deposit amount')).toBeVisible();

    expect(posts).toEqual([]);
  });

  test('SUBMIT opens the mock gateway window; a simulated success lands on the result page', async ({
    page,
  }) => {
    await openGatewayForm(page);
    await submitGatewayForm(page);

    const popupPromise = page.waitForEvent('popup');
    await page.locator('#btnShowPg').click();
    // The reference's own `sprocessing` state lands before the window does.
    await expect(page.locator('#btnShowPg')).toHaveText('Processing...');
    await expect(page.locator('#btnShowPg')).toBeDisabled();

    const popup = await popupPromise;
    const gateway = popup.getByTestId('gateway-state');
    await expect(gateway).toHaveAttribute('data-state', 'ready');
    await expect(gateway.getByText(/Transaction ID : PG-/)).toBeVisible();
    await expect(gateway.getByText('RM 100.00')).toBeVisible();
    await expect(popup.getByTestId('gateway-countdown')).toHaveText(/^\d{2}:\d{2}$/);

    await popup.getByTestId('gateway-sim-success').click();
    await page.waitForURL(/\/my\/account\/deposit\/result\?status=success&order=PG-/);

    const result = page.getByTestId('deposit-result');
    await expect(result).toHaveAttribute('data-status', 'success');
    await expect(result).toContainText('Deposit successful');
    await expect(result).toContainText('Your funds are being verified');
    const details = page.getByTestId('result-details');
    await expect(details).toHaveAttribute('data-state', 'ready');
    await expect(details).toContainText(/Transaction ID : PG-/);
    await expect(details).toContainText('RM 100.00');
  });

  test('failed and processing rulings land on their own result layouts', async ({ page }) => {
    await ruleViaWindow(page, 'failed');
    const failed = page.getByTestId('deposit-result');
    await expect(failed).toHaveAttribute('data-status', 'failed');
    await expect(failed).toContainText('Deposit failed');
    await expect(failed).toContainText('The payment is failed. Kindly try to deposit again.');

    await ruleViaWindow(page, 'processing');
    const processing = page.getByTestId('deposit-result');
    await expect(processing).toHaveAttribute('data-status', 'processing');
    await expect(processing).toContainText('Deposit request submitted');
    await expect(processing).toContainText('Your payment in currently in processing.');
  });

  test('an unrecognised ?status= falls back to the unknown layout', async ({ page }) => {
    await page.goto('/my/account/deposit/result?status=bogus');

    const result = page.getByTestId('deposit-result');
    await expect(result).toHaveAttribute('data-status', 'unknown');
    await expect(result).toContainText('Unknown deposit status');
    await expect(result).toContainText('This result link is not recognised');
    await expect(result.getByRole('link', { name: 'Back to deposit' })).toBeVisible();
    await expect(page.getByTestId('result-details')).toHaveCount(0);

    // No `?status=` at all takes the same fallback.
    await page.goto('/my/account/deposit/result');
    await expect(page.getByTestId('deposit-result')).toHaveAttribute('data-status', 'unknown');
  });

  test('a refresh — and a second ruling — never replays the credit', async ({ page }) => {
    const orderId = await createOrder(page);
    const first = await page.request.post('/api/deposit/gateway/resolve', {
      data: { orderId, outcome: 'success' },
    });
    expect(((await first.json()) as { d: { firstRuling: boolean } }).d.firstRuling).toBe(true);

    // A second ruling attempt changes nothing: the first one already stands.
    const replay = await page.request.post('/api/deposit/gateway/resolve', {
      data: { orderId, outcome: 'failed' },
    });
    expect(((await replay.json()) as { d: { firstRuling: boolean } }).d.firstRuling).toBe(false);

    await page.goto(`/my/account/deposit/result?status=success&order=${orderId}`);
    await expect(page.getByTestId('result-details')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByText('Deposit successful')).toBeVisible();
    await page.reload();
    await page.reload();
    await expect(page.getByText('Deposit successful')).toBeVisible();

    // The record: one ruling, one credit stamp — untouched by the refreshes.
    const state = await page.request.get(`/api/deposit/gateway?order=${orderId}`);
    const record = (
      (await state.json()) as {
        d: { rulings: number; outcome: string; creditedAt: string };
      }
    ).d;
    expect(record.rulings).toBe(1);
    expect(record.outcome).toBe('success');
    expect(Date.parse(record.creditedAt)).toBeLessThanOrEqual(Date.now());
  });

  test('a popup-less window is simulated in the same tab', async ({ page }) => {
    await page.addInitScript(() => {
      window.open = (() => null) as unknown as typeof window.open;
    });
    await openGatewayForm(page);
    await submitGatewayForm(page);

    await page.locator('#btnShowPg').click();
    await page.waitForURL(/\/my\/account\/deposit\/gateway\?order=PG-/);
    await expect(page.getByTestId('gateway-state')).toHaveAttribute('data-state', 'ready');

    await page.getByTestId('gateway-sim-failed').click();
    await expect(page.getByText('Redirecting back to website..')).toBeVisible();
    await page.waitForURL(/\/my\/account\/deposit\/result\?status=failed&order=PG-/);
    await expect(page.getByTestId('deposit-result')).toHaveAttribute('data-status', 'failed');
  });

  test('closing the gateway window without a ruling re-arms SUBMIT', async ({ page }) => {
    await openGatewayForm(page);
    await submitGatewayForm(page);

    const popupPromise = page.waitForEvent('popup');
    await page.locator('#btnShowPg').click();
    const popup = await popupPromise;
    await expect(popup.getByTestId('gateway-state')).toHaveAttribute('data-state', 'ready');

    await popup.close();
    await expect(page.locator('#btnShowPg')).toBeEnabled();
    await expect(page.locator('#btnShowPg')).toHaveText('SUBMIT');
  });

  test('the session clock expires and disables (and the server refuses) the rulings', async ({
    page,
  }) => {
    const orderId = await createOrder(page, 2);
    await page.goto(`/my/account/deposit/gateway?order=${orderId}`);
    await expect(page.getByTestId('gateway-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId('gateway-countdown')).toHaveText(/00:0[0-2]/);

    await expect(page.getByText('This payment session has expired.')).toBeVisible({
      timeout: 6000,
    });
    await expect(page.getByTestId('gateway-sim-success')).toBeDisabled();

    const late = await page.request.post('/api/deposit/gateway/resolve', {
      data: { orderId, outcome: 'success' },
    });
    expect(late.status()).toBe(410);
    const record = (
      (await (await page.request.get(`/api/deposit/gateway?order=${orderId}`)).json()) as {
        d: { outcome?: string; creditedAt?: string };
      }
    ).d;
    expect(record.outcome).toBeUndefined();
    expect(record.creditedAt).toBeUndefined();
  });

  test('an unknown order shows the empty state with a way back', async ({ page }) => {
    await page.goto('/my/account/deposit/gateway?order=PG-MISSING');

    const gateway = page.getByTestId('gateway-state');
    await expect(gateway).toHaveAttribute('data-state', 'empty');
    await expect(gateway).toContainText('This payment order was not found.');
    await expect(gateway.getByRole('link', { name: 'Back to deposit' })).toBeVisible();
  });

  test('a failed order read offers a retry', async ({ page }) => {
    let calls = 0;
    await page.route(/\/api\/deposit\/gateway\?order=/, async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({ status: 500, json: { status: '1', msg: 'boom', d: null } });
        return;
      }
      await route.continue();
    });

    await page.goto('/my/account/deposit/gateway?order=PG-RETRY');
    const gateway = page.getByTestId('gateway-state');
    await expect(gateway).toHaveAttribute('data-state', 'error');
    await expect(gateway).toContainText('Could not load the payment order.');

    await gateway.getByRole('button', { name: 'Retry' }).click();
    await expect(gateway).toHaveAttribute('data-state', 'empty');
  });

  test('mobile 375: the form, the gateway window and the result page overflow neither axis', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await openGatewayForm(page);
    expect(await overflow(page)).toBe(0);

    const orderId = await createOrder(page);
    await page.goto(`/my/account/deposit/gateway?order=${orderId}`);
    await expect(page.getByTestId('gateway-state')).toHaveAttribute('data-state', 'ready');
    expect(await overflow(page)).toBe(0);

    await page.goto(`/my/account/deposit/result?status=processing&order=${orderId}`);
    await expect(page.getByTestId('deposit-result')).toHaveAttribute('data-status', 'processing');
    await expect(page.getByTestId('result-details')).toHaveAttribute('data-state', 'ready');
    expect(await overflow(page)).toBe(0);
  });
});
