import { expect, test, type Page } from '@playwright/test';
import { signIn } from './session';

/**
 * T62 (launch adapter layer): a studio the provider registry marks answers its
 * own click first. The maintenance notice is owed to a guest and to a member
 * alike, so no session is consulted and nothing navigates; a studio without a
 * Demo action does not render one. Studios the registry does not mark keep the
 * T61 flow, which is where these tests look for the difference.
 */
const MAINTENANCE = '/my/slots?provider=nextspin&tab=all';
const NO_DEMO = '/my/slots?provider=aviatrix&tab=all';
const PLAIN = '/my/slots?provider=pragmatic&tab=all';

/** The first game tile in the grid. */
function firstCard(page: Page) {
  return page.locator('article[data-game-id]').first();
}

test('a studio under maintenance wears the tag and answers its own click', async ({ page }) => {
  await page.goto(MAINTENANCE);

  const card = firstCard(page);
  await expect(card.locator('.game-card__label')).toHaveText('Under Maintenance');

  await card.locator('a[data-mode="real"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Product is under maintenance.');
  // The studio answers before the session does: a guest is not asked to sign in.
  await expect(dialog).not.toContainText('Please login first');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/my/slots');
});

test('the maintenance answer survives being signed in', async ({ page, context }) => {
  await signIn(context);
  await page.goto(MAINTENANCE);
  await firstCard(page).locator('a[data-mode="real"]').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Product is under maintenance.');
  // The member's balance and session never get a say.
  await expect(dialog).not.toContainText('This game will be available soon');
});

test('a studio without a Demo action renders none, and its neighbours keep theirs', async ({
  page,
}) => {
  await page.goto(NO_DEMO);

  await expect(page.locator('article[data-game-id]')).toHaveCount(5);
  const card = firstCard(page);
  await expect(card.locator('a[data-mode="real"]')).toHaveCount(1);
  await expect(card.locator('a[data-mode="demo"]')).toHaveCount(0);
  await expect(page.locator('.game-card__label')).toHaveCount(0);

  // The registration is provider-scoped: an unmarked studio is untouched.
  await page.goto(PLAIN);
  await expect(firstCard(page).locator('a[data-mode="demo"]')).toHaveCount(1);
  await expect(page.locator('.game-card__label')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the maintenance tag and its dialog fit the screen', async ({ page }) => {
    await page.goto(MAINTENANCE);

    const card = firstCard(page);
    await expect(card.locator('.game-card__label')).toBeVisible();

    // Touch has no hover: the first tap reveals the cover (mobile.spec locks it).
    await card.click();
    await card.locator('a[data-mode="real"]').click();
    await expect(page.getByRole('dialog')).toContainText('Product is under maintenance.');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
