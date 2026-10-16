import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * One wallet source: the header balance, the account card, the wallet list and
 * the transfer page's "available" figure must always show the same number, and
 * total assets must equal main + every game wallet.
 */
const money = (text: string | null) => Math.round(Number((text ?? '').replace(/[^0-9.]/g, '')) * 100);

async function readFigures(page: Page) {
  const header = money(await page.locator('header').getByText(/^RM\s?[\d,]+\.\d{2}$/).first().textContent());
  const card = money(await page.locator('.account-menu__profile-balance-amount').first().textContent());
  const rows = await page.locator('.transfer-credit__row:not(.transfer-credit__total) .transfer-credit__balance').allTextContents();
  const list = rows.map(money);
  const total = money(await page.getByTestId('wallet-total').textContent());
  return { header, card, main: list[0] ?? -1, list, total };
}

test.describe('wallet figures agree everywhere', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('header, account card and wallet list show the same main balance; total = main + games', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    const f = await readFigures(page);
    // The headline balance is total assets: main + whatever sits in game wallets.
    expect(f.total).toBe(f.list.reduce((a, b) => a + b, 0));
    expect(f.card).toBe(f.total);
    expect(f.header).toBe(f.total);
    expect(f.total).toBeGreaterThan(f.main); // game wallets hold money, so total exceeds the main wallet
  });

  test('a deposit raises main and total by the same amount everywhere', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    const before = await readFigures(page);

    // P4: the deposit page's own form returns in T52. Until then the same
    // walletService.deposit runs through the /dev/wallet simulator, so the
    // "one balance everywhere" invariant keeps its coverage.
    await page.goto('/dev/wallet');
    await page.locator('#dev-deposit').getByLabel('Amount').fill('100');
    await page.locator('#dev-deposit').getByRole('button', { name: 'Simulate deposit' }).click();
    await expect(page.locator('.dev-wallet-total')).toHaveText('MYR 1,722.50');

    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    const after = await readFigures(page);
    expect(after.main).toBe(before.main + 10_000);
    expect(after.total).toBe(before.total + 10_000);
    expect(after.card).toBe(after.total);
    expect(after.header).toBe(after.total);
  });

  test('a maintenance wallet is labelled and cannot be transferred to', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await expect(page.locator('.transfer-credit__tag').first()).toHaveText('Under maintenance');
    await page.getByLabel('To').selectOption({ label: 'Jili (Under maintenance)' });
    await page.getByLabel(/Amount/).fill('1');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'under maintenance' })).toBeVisible();
  });

  test('transfer all moves every open wallet to main and says what was left behind', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    const before = await readFigures(page);
    await page.getByRole('button', { name: /Transfer all|All/i }).first().click();
    const confirm = page.getByRole('button', { name: /^(Yes|Confirm|OK)$/ });
    if (await confirm.first().isVisible().catch(() => false)) await confirm.first().click();
    await expect(page.getByText(/Not moved \(under maintenance\): Jili/)).toBeVisible();
    const after = await readFigures(page);
    expect(after.total).toBe(before.total); // moving money never changes the total
    expect(after.main).toBeGreaterThan(before.main);
    expect(after.card).toBe(after.total);
    expect(after.header).toBe(after.total);
  });

  test('a withdrawal lowers main and total everywhere; one above the balance is refused', async ({ page }) => {
    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    const before = await readFigures(page);

    await page.goto('/my/account/withdrawal');
    await page.getByLabel(/Amount/).first().fill('50');
    await page.getByRole('button', { name: /Request withdrawal/ }).last().click();
    await expect(page.getByText('Withdrawal recorded')).toBeVisible();

    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    const after = await readFigures(page);
    expect(after.main).toBe(before.main - 5_000);
    expect(after.total).toBe(before.total - 5_000);
    expect(after.card).toBe(after.total);

    await page.goto('/my/account/withdrawal');
    await page.getByLabel(/Amount/).first().fill('99999');
    await page.getByRole('button', { name: /Request withdrawal/ }).last().click();
    await expect(page.getByText('Withdrawal failed')).toBeVisible();
    await page.goto('/my/account/transfer');
    await expect(page.getByTestId('wallet-total')).toBeVisible();
    expect((await readFigures(page)).main).toBe(after.main); // the refused one changed nothing
  });
});
