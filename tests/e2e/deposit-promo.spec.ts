import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T55: the bonus picker on the bank tab. Choosing an offer shows the bonus and
 * turnover the mock route quotes for the amount typed; a deposit under the
 * minimum gets the notice instead of figures.
 */
test.describe('deposit bonus picker', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  test('shows the quoted bonus and turnover for the chosen offer and amount', async ({ page }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form.getByLabel('Amount', { exact: true }).fill('100');
    await form.getByRole('radio', { name: 'Welcome bonus 188%' }).check();

    const quote = form.getByTestId('deposit-promo-quote');
    await expect(quote).toBeVisible();
    await expect(quote).toContainText('188.00');
    await expect(quote).toContainText('2,304.00');

    // RM 200 × 188% = RM 376, capped at the RM 188 maximum; turnover = (200 + 188) × 8.
    await form.getByLabel('Amount', { exact: true }).fill('200');
    await expect(quote).toContainText('188.00');
    await expect(quote).toContainText('3,104.00');
  });

  test('returns to no bonus and hides the figures', async ({ page }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form.getByLabel('Amount', { exact: true }).fill('100');
    await form.getByRole('radio', { name: 'Welcome bonus 188%' }).check();
    await expect(form.getByTestId('deposit-promo-quote')).toBeVisible();

    await form.getByRole('radio', { name: 'No bonus' }).check();
    await expect(form.getByTestId('deposit-promo-quote')).toHaveCount(0);
  });

  test('tells the member when the amount is under the minimum', async ({ page }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form.getByLabel('Amount', { exact: true }).fill('40');
    await form.getByRole('radio', { name: 'Welcome bonus 188%' }).check();

    await expect(form.getByText('below the minimum', { exact: false })).toBeVisible();
    await expect(form.getByTestId('deposit-promo-quote')).toHaveCount(0);
  });

  test('opens the offer terms from the T&C link', async ({ page }) => {
    await page.goto('/my/account/deposit');
    const form = page.getByTestId('deposit-bank-form');
    await form
      .getByRole('radio', { name: 'Welcome bonus 188%' })
      .locator('xpath=ancestor::div[contains(@class,"deposit-promo__item")]')
      .getByRole('button', { name: 'Terms and Conditions' })
      .click();

    await expect(page.getByRole('dialog')).toContainText('How this bonus works');
  });
});
