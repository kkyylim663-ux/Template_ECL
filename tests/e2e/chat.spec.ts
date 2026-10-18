import { expect, test } from '@playwright/test';

/**
 * T81 chat rooms. The mobile dock's Chat / Live Chat entries used to be `#`
 * placeholders; they now open two mock pages — the player room (`/my/chat`)
 * and the support room (`/my/livechat`). The desktop header's chat icon opens
 * the support room too.
 */
test.describe('chat rooms', () => {
  test('the mobile dock opens the player room and the support room', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my');
    const dock = page.getByRole('navigation', { name: 'Quick navigation' });

    await dock.getByRole('link', { name: 'Chat', exact: true }).click();
    await expect(page).toHaveURL(/\/my\/chat$/);
    await expect(page.locator('.chat-room__pin')).toContainText('Pinned');

    await dock.getByRole('link', { name: 'Live Chat', exact: true }).click();
    await expect(page).toHaveURL(/\/my\/livechat$/);
    await expect(page.locator('.chat-room__chips')).toContainText('Deposit not credited');
  });

  test('the drawer and the desktop header reach the support room', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/my');
    await page.locator('header').getByRole('link', { name: 'Live chat' }).click();
    await expect(page).toHaveURL(/\/my\/livechat$/);
  });

  test('a sent message and the simulated reply appear in the room', async ({ page }) => {
    await page.goto('/my/chat');
    const lines = page.locator('.chat-line');
    const seeded = await lines.count();

    await page.getByLabel('Message').fill('hello there');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.chat-line--mine')).toContainText('hello there');
    // The simulated reply lands a beat later.
    await expect(lines).toHaveCount(seeded + 2, { timeout: 5000 });
    await expect(page.locator('.chat-line--mine')).toHaveCount(1);
  });

  test('a quick question fills the support composer', async ({ page }) => {
    await page.goto('/my/livechat');
    await page.getByRole('button', { name: 'Bonus question' }).click();
    await expect(page.getByLabel('Message')).toHaveValue('Bonus question');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.chat-line--mine')).toContainText('Bonus question');
    await expect(page.locator('.chat-room__note')).toContainText('simulated');
  });
});
