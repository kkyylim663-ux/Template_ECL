import { expect, test } from '@playwright/test';

/**
 * T50: the member journey end to end at both sizes — sign in through the login
 * form, transfer, read history and pending, open the inbox, edit the profile,
 * sign out. One screenshot per step lands in `_scratch/shots/` as evidence, and
 * any console error or page error fails the run.
 */
const VIEWPORTS = [
  { label: 'desktop', viewport: { width: 1440, height: 900 } },
  { label: 'mobile', viewport: { width: 375, height: 812 } },
] as const;

for (const { label, viewport } of VIEWPORTS) {
  test(`the member journey works at ${label}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    await page.setViewportSize(viewport);
    const shot = (step: string) =>
      page.screenshot({ path: `_scratch/shots/t50-flow-${label}-${step}.png` });

    // 1 — sign in through the form
    await page.goto('/my/login');
    await page.fill('input[autocomplete="username"]', 'demo_player');
    await page.fill('input[autocomplete="current-password"]', 'Test1234!');
    await page.click('button.login-btn');
    await expect(page).toHaveURL(/\/my\/?$/);
    await shot('1-login');

    // 2 — transfer 10 from main to the default provider wallet
    await page.goto('/my/account/transfer');
    await page.getByLabel(/Amount/).fill('10');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Transfer complete')).toBeVisible();
    if (label === 'desktop') {
      // The header follows the main wallet through the session event.
      await expect(page.locator('header').getByText('RM 1,224.50').first()).toBeVisible();
    }
    await shot('2-transfer');
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    // 3 — history reads the transfer table, pending lists the open requests
    await page.goto('/my/account/history');
    await page.getByLabel('Searching History').selectOption('transfer');
    // The sort indicator rides inside the sorted header cell.
    const headers = (
      await page.locator('.history-table thead th').allTextContents()
    ).map((cell) => cell.replace(/[▲▼]/g, ''));
    expect(headers).toEqual(['Date', 'From', 'To', 'Amount', 'Status']);
    await expect(page.locator('.history-table tbody tr')).toHaveCount(10);
    await expect(page.locator('.history-info')).toContainText('of 36 entries');
    await shot('3-history');

    await page.goto('/my/account/pending');
    await expect(page.locator('.pending-table tbody tr[data-pending]')).toHaveCount(6);
    await shot('4-pending');

    // 4 — inbox: opening the newest message shows it
    await page.goto('/my/account/inbox');
    const firstUnread = page.locator('.inbox-table tbody tr[data-unread="true"] .inbox-subject').first();
    await firstUnread.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await shot('5-inbox');
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    // 5 — profile: an edit saves
    await page.goto('/my/account/profile');
    await page.waitForSelector('[data-profile-hydrated="true"]');
    await page.locator('#profile-nickname').fill('Journey Player');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile updated')).toBeVisible();
    await shot('6-profile');
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    // 6 — sign out, and the member area is closed again
    if (label === 'desktop') {
      await page.locator('header').getByRole('button', { name: 'Account summary' }).hover();
      await page.locator('header').getByRole('button', { name: 'Log out' }).click();
    } else {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('button', { name: 'Log out' }).click();
    }
    await expect(page).toHaveURL(/\/my\/?$/);
    const guarded = await page.request.get('/my/account/inbox', { maxRedirects: 0 });
    expect(guarded.status()).toBe(302);
    await shot('7-signed-out');

    expect(errors, 'console errors during the journey').toEqual([]);
  });
}
