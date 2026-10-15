import { expect, test } from '@playwright/test';

/**
 * T42 interactions on the sign-in, sign-up and forgot-password cards. The mock
 * account `demo_player` is the sign-in fixture; `demoplayer` is the taken name
 * for the duplicate check (sign-up usernames are letters and digits only).
 */
test.describe('auth interactions', () => {
  test('wrong password shows one generic message', async ({ page }) => {
    await page.goto('/my/login');
    await page.fill('input[autocomplete="username"]', 'demo_player');
    await page.fill('input[autocomplete="current-password"]', 'wrong-pass');
    await page.click('button.login-btn');
    await expect(page.locator('.login-form [role="alert"]')).toHaveText('Incorrect account or password.');
  });

  test('correct mock account signs in to the home page', async ({ page }) => {
    await page.goto('/my/login');
    await page.fill('input[autocomplete="username"]', 'demo_player');
    await page.fill('input[autocomplete="current-password"]', 'Test1234!');
    await page.click('button.login-btn');
    await expect(page).toHaveURL(/\/my\/?$/);
  });

  test('OTP send disables the button for 60 seconds', async ({ page }) => {
    await page.goto('/my/login');
    await page.getByRole('tab', { name: /SMS/ }).click();
    await page.fill('input[inputmode="tel"]', '+60123456789');
    const send = page.getByRole('button', { name: /Send code/ });
    await send.click();
    const countdown = page.getByRole('button', { name: /Resend in \d+s/ });
    await expect(countdown).toBeDisabled();
    await expect(countdown).toHaveText(/Resend in (59|60)s/);
  });

  test('sign-up flags a taken username after the debounce', async ({ page }) => {
    await page.goto('/my/register');
    await page.fill('input[autocomplete="email"]', 'new@example.test');
    await page.fill('input[autocomplete="one-time-code"]', '123456');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.fill('input[autocomplete="username"]', 'demoplayer');
    await expect(page.getByText('This username is already taken')).toBeVisible();
  });

  test('password strength meter reflects the new password', async ({ page }) => {
    await page.goto('/my/register');
    await page.fill('input[autocomplete="email"]', 'new@example.test');
    await page.fill('input[autocomplete="one-time-code"]', '123456');
    await page.getByRole('button', { name: 'Next' }).click();
    const password = page.locator('input[autocomplete="new-password"]').first();
    await password.fill('abc');
    await expect(page.locator('[data-strength]')).toHaveAttribute('data-strength', '1');
    await password.fill('Abcdef12!');
    await expect(page.locator('[data-strength]')).toHaveAttribute('data-strength', '3');
  });

  test('forgot password walks through all three steps', async ({ page }) => {
    await page.goto('/my/forgot-password');
    await page.fill('input[type="email"]', 'demo@example.test');
    await page.fill('input[inputmode="numeric"]', '123456');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.locator('input[autocomplete="new-password"]').first().fill('Newpass1!');
    await page.locator('input[autocomplete="new-password"]').nth(1).fill('Newpass1!');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Password updated')).toBeVisible();
  });
});
