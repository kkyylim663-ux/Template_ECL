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
