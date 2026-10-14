import { expect, test } from '@playwright/test';

/**
 * SEO surface (T24 onwards): the head every page ships, the gated pages that stay
 * out of the index, and — from T25 — the sitemap, robots and JSON-LD.
 */

test.describe('page metadata (T24)', () => {
  test('a public page ships canonical, alternates, OpenGraph and Twitter tags', async ({
    page,
  }) => {
    await page.goto('/my/slots');

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/my\/slots$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en-MY"]')).toHaveAttribute(
      'href',
      /\/my\/slots$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en-SG"]')).toHaveAttribute(
      'href',
      /\/sg\/slots$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      /\/my\/slots$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /.+/);

    // The other market is its own canonical, same page.
    await page.goto('/sg/slots');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/sg\/slots$/);
  });

  test('detail pages take their own titles', async ({ page }) => {
    await page.goto('/my/promotion/pr-welcome-188');
    await expect(page).toHaveTitle(/Welcome bonus 188% · BRAND/);

    await page.goto('/my/update/up-061');
    await expect(page).toHaveTitle(/· BRAND$/);
    await expect(page).not.toHaveTitle(/^Update · BRAND$/);
  });

  test('an FAQ topic answers under its own title', async ({ page }) => {
    await page.goto('/my/faq/finance');
    await expect(page).toHaveTitle(/Deposits and withdrawals · BRAND/);
  });

  test('titles follow the language cookie', async ({ page, context }) => {
    await context.addCookies([
      { name: 'brand_lang', value: 'zh-Hans', url: 'http://127.0.0.1:3000' },
    ]);
    await page.goto('/my/slots');
    await expect(page).toHaveTitle(/电子游戏 · BRAND/);
  });

  test('auth, member and dev pages stay out of the index', async ({ page, context }) => {
    for (const path of ['/my/login', '/my/register', '/my/forgot-password']) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    }

    await page.goto('/dev/components');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    await context.addCookies([{ name: 'brand_session', value: 'demo', url: 'http://127.0.0.1:3000' }]);
    await page.goto('/my/account/deposit');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    // Each member page carries its own title; the layout one is the fallback.
    await expect(page).toHaveTitle(/Deposit · BRAND/);
  });
});
