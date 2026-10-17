import { expect, test } from '@playwright/test';
import { sessionCookieHeader } from './session';

/**
 * T73: the headers `next.config.ts` promises, read off a real production server.
 * The unit test pins the policy module; only here do the `:path*` syntax and
 * Next's own precedence rules get exercised.
 */

const IMMUTABLE = 'public, max-age=31536000, immutable';
const PRIVATE = 'private, no-store';

test.describe('cache headers (T73)', () => {
  test('a build asset is immutable for a year', async ({ request }) => {
    const html = await (await request.get('/my')).text();
    const src = /\/_next\/static\/[^"'\s]+?\.js/.exec(html)?.[0];
    expect(src, 'the shell HTML references a build asset').toBeTruthy();

    const asset = await request.get(src as string);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['cache-control']).toBe(IMMUTABLE);
  });

  test('the JSON API is never stored', async ({ request }) => {
    const response = await request.get('/api/deposit/methods');
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe(PRIVATE);
  });

  test('a member page is private', async ({ request }) => {
    const cookie = await sessionCookieHeader(request);
    for (const path of ['/my/account/deposit', '/sg/account/withdrawal', '/my/account/profile']) {
      const response = await request.get(path, { headers: { cookie } });
      expect(response.status(), path).toBe(200);
      expect(response.headers()['cache-control'], path).toBe(PRIVATE);
    }
  });

  test('auth pages are private, in both markets', async ({ request }) => {
    for (const path of ['/my/login', '/sg/register', '/my/forgot-password']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['cache-control'], path).toBe(PRIVATE);
    }
  });

  test('public HTML stays uncacheable, whatever the framework default is', async ({ request }) => {
    for (const path of ['/my/slots', '/my/promotion', '/my/faq/finance']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      // No public rule of ours applies here, so this is Next's own value for a
      // dynamically rendered page — asserted only to be a no-store one.
      expect(response.headers()['cache-control'] ?? '', path).toContain('no-store');
    }
  });
});
