import { expect, test } from '@playwright/test';

/**
 * Regression: right after signing in, going to a member page must work at once
 * (no second login prompt, no manual reload) and the header must show the member.
 */
const VIEWPORTS = [
  { label: 'desktop', viewport: { width: 1440, height: 900 } },
  { label: 'mobile', viewport: { width: 375, height: 812 } },
];

for (const { label, viewport } of VIEWPORTS) {
  test(`after login the first member page opens straight away (${label})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Visit the home page first as a guest so links to /account/* get prefetched as a guest.
    await page.goto('/my');
    await page.waitForTimeout(1500);
    await page.goto('/my/login');
    const code = ((await page.getByRole('button', { name: /refresh the code/i }).textContent()) ?? '').trim();
    await page.getByPlaceholder('Username').fill('demo_player');
    await page.getByPlaceholder('Password').fill('Test1234!');
    await page.getByPlaceholder(/Verification/).fill(code);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 10_000 });
    await expect(page).toHaveURL(/\/my\/?$/);

    // The member header shows up without a reload.
    await expect(page.locator('header a[href*="/login"]:visible, [class*="app-header"] a[href*="/login"]:visible')).toHaveCount(0, { timeout: 8_000 });

    // First click on a member page: must land there, not on the login form.
    await page.locator('a[href="/my/account/deposit"]:visible').first().click();
    await page.waitForTimeout(2_500);
    await expect(page).toHaveURL(/\/my\/account\/deposit/);
    await expect(page.getByPlaceholder('Username')).toHaveCount(0);
  });
}
