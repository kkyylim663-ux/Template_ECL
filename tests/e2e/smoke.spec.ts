import { expect, test, type Page } from '@playwright/test';
import { accountRoutes, publicRoutes } from './routes';
import { signIn } from './session';

/**
 * Route sweep: every public route answers 200 with no console error, the guarded
 * member routes redirect when signed out and render when signed in, and the
 * boundary cases behave (unknown region 404, "/" redirects, dev page exists).
 */

/**
 * T70: no route may link off this origin. Every Play Now / Demo action resolves
 * through `getLaunchHref()` to `#`, so no real game address — the reference
 * asked its own `launchinggame` seam for one — may appear in any `a[href]`; the
 * `mailto:`/`tel:` links are the reference's own contact channels, and
 * `localhost` / `127.0.0.1` are this build's two spellings of its own host
 * (`lib/seo.ts`). A href with no scheme is relative by definition: same origin.
 */
const OWN_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const GAME_LAUNCH_HREF = /launchinggame|launch-game|\/launch\?/i;

function foreignLinks(route: string, hrefs: string[]): string[] {
  return hrefs.flatMap((href) => {
    if (!href || href.startsWith('#') || href.startsWith('?') || href.startsWith('/')) return [];
    if (/^(mailto|tel):/i.test(href)) return [];
    if (GAME_LAUNCH_HREF.test(href)) return [`${route}: ${href} (a game-launch address)`];
    try {
      return OWN_HOSTS.has(new URL(href).hostname) ? [] : [`${route}: ${href}`];
    } catch {
      return [];
    }
  });
}

async function collectHrefs(page: Page): Promise<string[]> {
  return page.$$eval('a[href]', (links) => links.map((link) => link.getAttribute('href') ?? ''));
}

const collectErrors = (page: Page) => {
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
      expect(foreignLinks(route, await collectHrefs(page)), 'links leaving the origin').toEqual([]);
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

  test('the demo-data marker is on (mock mode is the default)', async ({ page }) => {
    await page.goto('/my');
    await expect(page.locator('[data-demo-badge="true"]')).toHaveText('Demo data');
  });

  test('/dev/wallet drives the mock balances (T45 supplement)', async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto('/dev/wallet', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('.dev-wallet-total')).toHaveText('MYR 1,622.50');
    await expect(page.locator('.dev-wallet-check')).toHaveAttribute('data-holds', 'true');
    expect(errors, 'console errors on /dev/wallet').toEqual([]);
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
    await signIn(context);

    for (const route of accountRoutes()) {
      const errors = collectErrors(page);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      expect(errors, `console errors on ${route}`).toEqual([]);
      expect(foreignLinks(route, await collectHrefs(page)), 'links leaving the origin').toEqual([]);
    }
  });
});
