import { expect, test } from '@playwright/test';
import { signIn } from './session';

/**
 * T48 inbox. The fixture serves 27 messages across the reference's three tabs
 * (important 14, others 8, promotions 5) with three unread: the two newest
 * important ones and the newest others one. Read/delete state lives in
 * localStorage, so the header badge follows the panel.
 */
test.describe('inbox', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  /** The badge sits inside the header dropdown (opens on hover); the drawer's
   *  copy of the same list is hidden, hence the `:visible` filter. */
  async function headerUnread(page: import('@playwright/test').Page) {
    await page.locator('header').getByRole('button', { name: 'Account summary' }).hover();
    return page.locator('header li:visible').filter({ hasText: 'Inbox' }).locator('span.bg-danger');
  }

  test('tabs switch the table and unread subjects are bold', async ({ page }) => {
    await page.goto('/my/account/inbox');
    const rows = page.locator('.inbox-table tbody tr[data-message]');
    await expect(rows).toHaveCount(10);
    await expect(page.locator('.history-info')).toContainText('Showing 1 to 10 of 14 entries');
    await expect(page.locator('.inbox-table tbody tr[data-unread="true"]')).toHaveCount(2);

    const first = page.locator('[data-message="msg-important-1"] .inbox-subject');
    await expect(first).toHaveClass(/is-unread/);
    expect(await first.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700');

    await page.getByRole('button', { name: 'Others' }).click();
    await expect(page.locator('.inbox-table tbody tr[data-message]')).toHaveCount(8);
    await expect(page.locator('.inbox-table tbody tr[data-unread="true"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Promotions' }).click();
    await expect(page.locator('.inbox-table tbody tr[data-message]')).toHaveCount(5);
    await expect(page.locator('.inbox-table tbody tr[data-unread="true"]')).toHaveCount(0);
  });

  test('paginates ten at a time', async ({ page }) => {
    await page.goto('/my/account/inbox');
    await expect(page.locator('.history-info')).toContainText('of 14 entries');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('.history-info')).toContainText('Showing 11 to 14 of 14 entries');
    await expect(page.locator('.inbox-table tbody tr[data-message]')).toHaveCount(4);
  });

  test('opening a message reads it and the header badge drops by one', async ({ page }) => {
    await page.goto('/my/account/inbox');
    await expect(await headerUnread(page)).toHaveText('3');

    await page.locator('[data-message="msg-important-1"] .inbox-subject').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Your withdrawal is being reviewed');
    await expect(dialog).toContainText('is with our payments team');
    await page.getByRole('button', { name: 'OK', exact: true }).click();

    await expect(page.locator('[data-message="msg-important-1"]')).toHaveAttribute('data-unread', 'false');
    await expect(await headerUnread(page)).toHaveText('2');
  });

  test('mark all read takes the confirm and clears the badge', async ({ page }) => {
    await page.goto('/my/account/inbox');
    await page.getByLabel('Select all messages').check();
    await page.getByRole('button', { name: 'Mark As Read' }).click();
    await expect(page.getByText('Confirm mark as read?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.locator('.inbox-table tbody tr[data-unread="true"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Others' }).click();
    await page.getByLabel('Select all messages').check();
    await page.getByRole('button', { name: 'Mark As Read' }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.locator('.inbox-table tbody tr[data-unread="true"]')).toHaveCount(0);

    await expect(await headerUnread(page)).toHaveCount(0);
  });

  test('delete asks first and survives a reload', async ({ page }) => {
    await page.goto('/my/account/inbox');
    // Scoped to the row: the fixture repeats this subject across two messages.
    await page.locator('[data-message="msg-important-1"] input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Delete selected messages' }).click();
    await expect(page.getByText('Are you confirm to delete?')).toBeVisible();
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await expect(page.locator('[data-message="msg-important-1"]')).toBeVisible();

    await page.locator('[data-message="msg-important-1"] input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Delete selected messages' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('[data-message="msg-important-1"]')).toHaveCount(0);
    await expect(page.locator('.history-info')).toContainText('of 13 entries');

    await page.reload();
    await expect(page.locator('[data-message="msg-important-1"]')).toHaveCount(0);
    await expect(page.locator('.history-info')).toContainText('of 13 entries');
  });

  test('mobile keeps the page free of horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/account/inbox');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('.inbox-table tbody tr[data-message]')).toHaveCount(10);
  });
});
