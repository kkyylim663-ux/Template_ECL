import type { APIRequestContext, BrowserContext } from '@playwright/test';

/** Test-only account from `mocks/users.json`. */
const LOGIN = { identifier: 'demo_player', password: 'Test1234!' };

/**
 * Signs the browser context in through the real mock login route, so the cookie
 * is the server-issued, signed httpOnly one.
 */
export async function signIn(context: BrowserContext): Promise<void> {
  const response = await context.request.post(`/api/mock-auth/login`, { data: LOGIN });
  if (!response.ok()) throw new Error(`mock sign-in failed: ${response.status()}`);
}

/** The `cookie` header value for a signed-in request outside a browser context. */
export async function sessionCookieHeader(request: APIRequestContext): Promise<string> {
  const response = await request.post(`/api/mock-auth/login`, { data: LOGIN });
  const match = /brand_session=[^;]+/.exec(response.headers()['set-cookie'] ?? '');
  if (!match) throw new Error('mock sign-in did not set brand_session');
  return match[0];
}
