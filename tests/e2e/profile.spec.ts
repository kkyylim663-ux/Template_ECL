import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T49 profile, rebuilt in T81 to the reference's live member view: the hero
 * (greeting / balance / verify row) plus three collapsible sections. The
 * fixture is read-only, so the nickname and date of birth live per browser
 * (reload keeps them) and the password change goes through the mock auth route,
 * whose override makes the new password the one a later sign-in accepts. The
 * password test uses the second fixture account (`demoplayer`) so the shared
 * `demo_player` sign-in helper keeps working.
 */
test.describe('profile', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  /** React has to be attached before typing, or the form keeps its initial state. */
  async function open(page: import('@playwright/test').Page) {
    await page.goto('/my/account/profile');
    await page.waitForSelector('[data-profile-hydrated="true"]');
  }

  test('shows the account facts and saves an edit', async ({ page }) => {
    await open(page);
    const hero = page.locator('.profile-hero');
    await expect(hero).toContainText('Hello, demo_player');
    await expect(hero).toContainText('Verified');

    await page.locator('#profile-nickname').fill('Ace Player');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Profile updated')).toBeVisible();
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    await page.reload();
    await expect(page.locator('#profile-nickname')).toHaveValue('Ace Player');
  });

  test('validates the nickname and saves a date of birth', async ({ page }) => {
    await open(page);
    await page.locator('#profile-nickname').fill('A');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Enter a nickname')).toBeVisible();

    await page.locator('#profile-nickname').fill('Ace Player');
    await page.getByLabel('Day').selectOption('12');
    await page.getByLabel('Month').selectOption('04');
    await page.getByLabel('Year').selectOption('1995');
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    await page.reload();
    await expect(page.getByLabel('Day')).toHaveValue('12');
    await expect(page.getByLabel('Month')).toHaveValue('04');
    await expect(page.getByLabel('Year')).toHaveValue('1995');
  });

  test('warns before leaving with unsaved edits', async ({ page }) => {
    await open(page);
    await page.locator('#profile-nickname').fill('Unsaved Nick');
    // The listener registers with the render that shows the new value.
    await expect(page.locator('#profile-nickname')).toHaveValue('Unsaved Nick');

    let beforeUnload = false;
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'beforeunload') beforeUnload = true;
      await dialog.accept();
    });
    await page.reload().catch(() => {});
    expect(beforeUnload).toBe(true);
    // Nothing was saved, so the fixture value is back.
    await expect(page.locator('#profile-nickname')).not.toHaveValue('Unsaved Nick');
  });

  test('changes the password and the new one signs in', async ({ context, page }) => {
    const login = (password: string) =>
      context.request.post(`/api/mock-auth/login`, {
        data: { identifier: 'demoplayer', password },
      });
    expect((await login('Test1234!')).ok()).toBe(true);

    await open(page);
    await page.getByRole('button', { name: 'Security' }).click();
    await page.locator('#profile-current').fill('Test1234!');
    await page.locator('#profile-new').fill('BrandNew123!');
    await page.locator('#profile-confirm').fill('BrandNew123!');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password updated')).toBeVisible();

    expect((await login('BrandNew123!')).ok()).toBe(true);
    expect((await login('Test1234!')).ok()).toBe(false);

    // Restore, so the second fixture account keeps its documented password
    // even when several runs share one mock server process.
    const restore = await context.request.post(`/api/mock-auth/change-password`, {
      data: { currentPassword: 'BrandNew123!', newPassword: 'Test1234!' },
    });
    expect(restore.ok()).toBe(true);
  });

  test('a wrong current password is refused', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Security' }).click();
    await page.locator('#profile-current').fill('NotMyPassword1');
    await page.locator('#profile-new').fill('BrandNew123!');
    await page.locator('#profile-confirm').fill('BrandNew123!');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Current password is incorrect')).toBeVisible();
  });

  test('the language row switches the site language', async ({ context, page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Security' }).click();
    await page.locator('.profile-language').getByRole('button', { name: '简体中文' }).click();
    await expect(page.getByRole('heading', { name: '个人资料' })).toBeVisible();

    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === 'brand_lang')?.value).toBe('zh-Hans');
  });
});
