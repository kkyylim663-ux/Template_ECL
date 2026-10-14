import { expect, test } from '@playwright/test';

/**
 * Content pages (T18 onwards). Each block grows with the task that ships the
 * page; the assertions here are the acceptance points written down as tests.
 */

test.describe('promotion list (T18)', () => {
  test('lists every offer with the category row', async ({ page }) => {
    await page.goto('/my/promotion');

    await expect(page.locator('[data-page="promotion-list"]')).toBeVisible();
    await expect(page.locator('article[data-promotion]')).toHaveCount(8);
    // eight category tabs plus "All"
    await expect(page.locator('[data-cat]')).toHaveCount(9);
    await expect(page.locator('a[data-cat][aria-current]')).toHaveText('All');
  });

  test('a category tab filters the grid, keeps the URL and survives a reload', async ({ page }) => {
    await page.goto('/my/promotion');
    await page.locator('a[data-cat="deposit"]').click();

    await expect(page).toHaveURL(/cat=deposit/);
    await expect(page.locator('article[data-promotion]')).toHaveCount(2);
    await expect(page.getByText('2 offers')).toBeVisible();

    await page.reload();
    await expect(page.locator('article[data-promotion]')).toHaveCount(2);
    await expect(page.locator('a[data-cat="deposit"]')).toHaveAttribute('aria-current', 'true');
  });

  test('an empty category explains itself', async ({ page }) => {
    await page.goto('/my/promotion?cat=events');

    await expect(page.locator('article[data-promotion]')).toHaveCount(0);
    await expect(page.getByText('No offers in this category yet')).toBeVisible();
  });

  test('cards link to their detail page', async ({ page }) => {
    await page.goto('/my/promotion');
    await expect(
      page.locator('article[data-promotion="pr-welcome-188"] a', { hasText: 'View details' }),
    ).toHaveAttribute('href', '/my/promotion/pr-welcome-188');
  });

  test('375px lays the grid out in one column', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/promotion');

    const columns = await page
      .locator('ul.grid')
      .first()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);

    const box = await page.locator('article[data-promotion]').first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(300);
  });
});

test.describe('promotion detail and the voucher dialog (T19)', () => {
  test('renders the banner, the rules and the paging', async ({ page }) => {
    await page.goto('/my/promotion/pr-welcome-188');

    await expect(page.locator('[data-part="promotion-detail__banner"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome bonus 188%');

    // Markdown subset: heading, list item and a table cell all render as elements.
    await expect(page.getByRole('heading', { name: 'How this bonus works' })).toBeVisible();
    await expect(page.getByText('Minimum deposit: RM 50')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Live casino' })).toBeVisible();

    await expect(page.locator('[data-part="promotion-detail__back"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /Next offer/ })).toHaveAttribute(
      'href',
      '/my/promotion/pr-daily-reload-18',
    );
    // The first offer has nothing before it.
    await expect(page.getByRole('link', { name: /Previous offer/ })).toHaveCount(0);
  });

  test('an unknown id is a 404', async ({ request }) => {
    expect((await request.get('/my/promotion/pr-nope')).status()).toBe(404);
  });

  test('the dialog opens from the header, Escape closes it, a guest is asked to sign in', async ({
    page,
  }) => {
    await page.goto('/my/promotion');

    await page.locator('[data-voucher="header"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // Empty submit explains itself, then a guest is pointed at sign-in.
    await page.locator('[data-voucher="header"]').click();
    await page.locator('[data-voucher-form] button[type="submit"]').click();
    await expect(page.getByText('Enter a code first')).toBeVisible();

    await page.locator('[data-voucher-form] input').fill('WELCOME188');
    await page.locator('[data-voucher-form] button[type="submit"]').click();
    await expect(page.getByText('Sign in to redeem a voucher.')).toBeVisible();
  });

  test('the drawer carries the same dialog on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/my/promotion');

    await page.getByLabel('Open menu').click();
    await page.locator('[data-voucher="drawer"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('a signed-in visitor gets the demo result instead', async ({ page, context }) => {
    await context.addCookies([
      { name: 'brand_session', value: 'demo', url: 'http://127.0.0.1:3000' },
    ]);
    await page.goto('/my/promotion');

    await page.locator('[data-voucher="header"]').click();
    await page.locator('[data-voucher-form] input').fill('WELCOME188');
    await page.locator('[data-voucher-form] button[type="submit"]').click();

    await expect(page.getByText(/looks well-formed/)).toBeVisible();
    await expect(page.getByText('Sign in to redeem a voucher.')).toHaveCount(0);
  });
});
