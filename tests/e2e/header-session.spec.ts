import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T43 header member state. The header shows login/register to guests and the
 * username, balance and account menu to members; sign-out clears the httpOnly
 * session in every open tab.
 */
test.describe('header session state', () => {
  test('guest header offers login and register', async ({ page }) => {
    await page.goto('/my');
    await expect(page.getByRole('link', { name: 'Login' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' }).first()).toBeVisible();
  });

  test('member header hides login and shows username and balance', async ({ page, context }) => {
    await signIn(context);
    await page.goto('/my');
    await expect(page.getByRole('button', { name: 'Account summary' })).toBeVisible();
    await expect(page.getByText('demo_player').first()).toBeVisible();
    await expect(page.getByText('RM 1,622.50').first()).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Login' })).toHaveCount(0);
  });

  test('sign-out returns home and blocks the member area', async ({ page, context }) => {
    await signIn(context);
    await page.goto('/my');
    await page.locator('header').getByRole('button', { name: 'Account summary' }).hover();
    await page.locator('header').getByRole('button', { name: 'Log out' }).click();
    // The guest header appears only after the logout POST has cleared the
    // cookie; waiting for it keeps the next navigation from racing that POST.
    await expect(page.locator('header').getByRole('link', { name: 'Login' }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/my\/?$/);
    await page.goto('/my/account/deposit');
    await expect(page).toHaveURL(/\/my\/login\?next=/);
  });

  test('sign-out in one tab signs out the other within a second', async ({ context }) => {
    await signIn(context);
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto('/my');
    await second.goto('/my');
    await expect(second.getByRole('button', { name: 'Account summary' })).toBeVisible();

    await first.locator('header').getByRole('button', { name: 'Account summary' }).hover();
    await first.locator('header').getByRole('button', { name: 'Log out' }).click();
    await expect(second.getByRole('link', { name: 'Login' }).first()).toBeVisible({ timeout: 1000 });
  });

  // The mobile header carries the mailbox entry for members only, as the live
  // reference's right cell does (guest: account icon; member: envelope).
  test('mobile header adds the mailbox entry once signed in', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my');
    await expect(page.getByTestId('header-mail')).toHaveCount(0);

    await signIn(context);
    await page.goto('/my');
    const mail = page.getByTestId('header-mail');
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute('aria-label', 'Inbox');
    await mail.click();
    await expect(page).toHaveURL(/\/my\/account\/inbox/);
  });
});
