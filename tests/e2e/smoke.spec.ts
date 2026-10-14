import { expect, test } from '@playwright/test';
import { DEMO_COOKIE, accountRoutes, publicRoutes } from './routes';

/**
 * Route sweep: every public route answers 200 with no console error, the guarded
 * member routes redirect when signed out and render when signed in, and the
 * boundary cases behave (unknown region 404, "/" redirects, dev page exists).
 */

const collectErrors = (page: import('@playwright/test').Page) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
};

test.describe('public routes', () => {
  for (const route of publicRoutes()) {
    test(`GET ${route}`, async ({ page }) => {
      const errors = collectErrors(page);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      expect(response?.status(), `${route} status`).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      expect(errors, `console errors on ${route}`).toEqual([]);
    });
  }
});

test.describe('boundary behaviour', () => {
  test('/ redirects to /my', async ({ page }) => {
    const response = await page.request.get('/', { maxRedirects: 0 });
    expect([302, 307]).toContain(response.status());
    expect(response.headers()['location']).toContain('/my');
  });

  for (const route of ['/xx', '/xx/slots', '/my/no-such-page']) {
    test(`${route} is 404`, async ({ page }) => {
      const response = await page.request.get(route, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    });
  }

  test('/dev/components renders every component family', async ({ page }) => {
    await page.goto('/dev/components');
    for (const marker of ['Modal variants', 'Toast', 'Tabs', 'Skeleton', 'Marquee', 'LazyImage']) {
      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
    }
  });
});

test.describe('member area', () => {
  test('redirects to sign-in when there is no session', async ({ page }) => {
    for (const route of accountRoutes()) {
      const response = await page.request.get(route, { maxRedirects: 0 });
      expect(response.status(), route).toBe(302);
      expect(response.headers()['location']).toContain('/login?next=');
    }
  });

  test('renders all ten pages with a session', async ({ page, context }) => {
    await context.addCookies([{ ...DEMO_COOKIE, url: 'http://127.0.0.1:3000' }]);

    for (const route of accountRoutes()) {
      const errors = collectErrors(page);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      expect(errors, `console errors on ${route}`).toEqual([]);
    }
  });
});
