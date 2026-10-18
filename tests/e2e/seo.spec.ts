import { expect, test } from '@playwright/test';
import { signIn } from './session';

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
    await expect(page).toHaveTitle(/Finance · BRAND/);
  });

  test('titles follow the language cookie', async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'brand_lang', value: 'zh-Hans', url: baseURL ?? 'http://127.0.0.1:3000' },
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

    await signIn(context);
    await page.goto('/my/account/deposit');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    // Each member page carries its own title; the layout one is the fallback.
    await expect(page).toHaveTitle(/Deposit · BRAND/);
  });
});

test.describe('sitemap, robots and structured data (T25)', () => {
  test('the sitemap lists both markets and every listed URL answers 200', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();

    for (const path of [
      '/my/vip',
      '/sg/vip',
      '/my/promotion/pr-welcome-188',
      '/sg/update/up-061',
      '/my/faq/finance',
      '/sg/betting-rules',
    ]) {
      expect(body, `${path} missing from the sitemap`).toMatch(
        new RegExp(`<loc>https?://[^<]*/${path.replace(/^\//, '')}</loc>`),
      );
    }
    // Gated areas stay out.
    expect(body).not.toMatch(/<loc>[^<]*\/(account|login|register|dev)(\/|<\/loc>)/);

    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs.length).toBeGreaterThan(60);
    // T28: every listed URL answers 200, not just a sample.
    const failed: string[] = [];
    for (const loc of locs) {
      const entry = await page.request.get(loc);
      if (entry.status() !== 200) failed.push(`${loc} -> ${entry.status()}`);
    }
    expect(failed, 'sitemap entries that are not 200').toEqual([]);
  });

  test('robots.txt keeps the gated areas out and points at the sitemap', async ({ page }) => {
    const body = await (await page.request.get('/robots.txt')).text();

    expect(body).toContain('Allow: /');
    for (const rule of ['/account', '/login', '/register', '/dev']) {
      expect(body).toContain(`Disallow: ${rule}`);
    }
    expect(body).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  });

  test('the home page carries Organization and WebSite', async ({ page }) => {
    await page.goto('/my');
    const types = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).flatMap((script) => {
        const value = JSON.parse(script.textContent ?? 'null');
        return (Array.isArray(value) ? value : [value]).map((entry) => entry['@type']);
      }),
    );
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
  });

  test('an FAQ topic ships its questions as FAQPage', async ({ page }) => {
    await page.goto('/my/faq/finance');

    const blocks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((script) =>
        JSON.parse(script.textContent ?? 'null'),
      ),
    );
    const faqPage = blocks.find((block) => block['@type'] === 'FAQPage');
    const rendered = await page.locator('[data-faq-item]').count();

    expect(faqPage.mainEntity.length).toBe(rendered);
    expect(faqPage.mainEntity[0]['@type']).toBe('Question');
    expect(faqPage.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(10);
  });

  test('content pages ship a breadcrumb with ordered positions', async ({ page }) => {
    await page.goto('/my/tnc');

    const crumbs = await page.evaluate(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      return JSON.parse(script?.textContent ?? 'null');
    });

    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement.map((item: { position: number }) => item.position)).toEqual([1, 2]);
    expect(crumbs.itemListElement[1].name).toBe('Terms & Conditions');
    expect(crumbs.itemListElement[1].item).toMatch(/\/my\/tnc$/);
  });
});
