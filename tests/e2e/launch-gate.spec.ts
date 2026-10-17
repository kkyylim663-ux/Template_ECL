import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T61: Play Now and Demo never enter a game. Each click resolves to one of the
 * reference's pre-launch notices (`login_first`, `credit_msg`, `coming_soon_game`)
 * and the page stays where it was.
 */
const SLOTS = '/my/slots?provider=pragmatic&tab=all';

/** The first game tile in the grid. */
function firstCard(page: Page) {
  return page.locator('article[data-game-id]').first();
}

/**
 * Registers a fresh account and signs it in. A new registration opens its
 * wallets at zero (`walletOpening: 'zero'`), which is how a member without
 * balance is reached — the two preset demo accounts are both seeded.
 */
async function signInWithoutBalance(context: BrowserContext, tag: string) {
  const stamp = `${tag}${Date.now().toString(36)}`;
  const response = await context.request.post('/api/mock-auth/register', {
    data: {
      email: `${stamp}@example.test`,
      emailOtp: '123456',
      username: stamp,
      password: 'Secret123',
      fullName: 'Ada Lim',
      nickname: 'ada',
      phone: `+601${String(Date.now()).slice(-8)}`,
    },
  });
  expect(response.status(), 'registration').toBe(200);
  expect((await response.json()).d.walletOpening).toBe('zero');
}

test('a guest tapping Play Now is asked to sign in and comes back to the same view', async ({
  page,
}) => {
  await page.goto(SLOTS);
  await firstCard(page).locator('a[data-mode="real"]').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Please login first to play game');
  await expect(dialog.getByRole('link', { name: 'Register', exact: true })).toBeVisible();

  // Escape dismisses it; the `#` launch URL never navigated.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/my/slots');

  // Sign in from the notice and come back to the filters that were on screen.
  await firstCard(page).locator('a[data-mode="real"]').click();
  await dialog.getByRole('link', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/my\/login\?next=%2Fmy%2Fslots%3Fprovider%3Dpragmatic%26tab%3Dall/);

  await page.fill('input[autocomplete="username"]', 'demo_player');
  await page.fill('input[autocomplete="current-password"]', 'Test1234!');
  await page.click('button.login-btn');

  await expect(page).toHaveURL(/\/my\/slots\?provider=pragmatic&tab=all/);
  await expect(page.locator('article[data-game-id]')).toHaveCount(24);
});

test('a member with no balance is offered the deposit page', async ({ page, context }) => {
  await signInWithoutBalance(context, 'gt');
  await page.goto(SLOTS);
  await firstCard(page).locator('a[data-mode="real"]').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Currently your account have zero credit');

  const deposit = dialog.getByRole('link', { name: 'Deposit now' });
  await expect(deposit).toHaveAttribute('href', /\/my\/account\/deposit$/);
  await deposit.click();
  await expect(page).toHaveURL(/\/my\/account\/deposit/);
});

test('a member with a balance learns the build does not launch games', async ({ page, context }) => {
  await signIn(context);
  await page.goto(SLOTS);
  await firstCard(page).locator('a[data-mode="real"]').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('This game will be available soon');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('Demo asks a guest to sign in but never about the balance', async ({ page, context }) => {
  await page.goto(SLOTS);
  await firstCard(page).locator('a[data-mode="demo"]').click();
  await expect(page.getByRole('dialog')).toContainText('Please login first');
  await page.keyboard.press('Escape');

  // With zero credit the same Demo click is the coming-soon notice, not credit_msg.
  await signInWithoutBalance(context, 'gd');
  await page.goto(SLOTS);
  await firstCard(page).locator('a[data-mode="demo"]').click();
  await expect(page.getByRole('dialog')).toContainText('This game will be available soon');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('a tap reveals the cover and the notice fits the screen', async ({ page }) => {
    await page.goto(SLOTS);
    const card = firstCard(page);
    await card.click();

    await card.locator('a[data-mode="real"]').click();
    await expect(page.getByRole('dialog')).toContainText('Please login first');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
