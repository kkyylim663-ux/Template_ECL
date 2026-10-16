import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({
  set: [] as Array<{ name: string; value: string; options: Record<string, unknown> }>,
  forwardedProto: null as string | null,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string, options: Record<string, unknown>) =>
      void jar.set.push({ name, value, options }),
    delete: () => {},
  }),
  headers: async () =>
    new Headers(jar.forwardedProto ? { 'x-forwarded-proto': jar.forwardedProto } : {}),
}));

import { setSessionCookie } from '@/lib/session/server';

async function issuedOptions(): Promise<Record<string, unknown>> {
  jar.set.length = 0;
  await setSessionCookie('token.sig');
  expect(jar.set).toHaveLength(1);
  return jar.set[0].options;
}

describe('session cookie Secure flag', () => {
  beforeEach(() => {
    jar.forwardedProto = null;
    delete process.env.COOKIE_SECURE;
  });
  afterEach(() => {
    delete process.env.COOKIE_SECURE;
  });

  it('is not Secure for a plain http request (LAN or phone on http)', async () => {
    const options = await issuedOptions();
    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
  });

  it('is Secure when the request came in over https', async () => {
    jar.forwardedProto = 'https';
    expect((await issuedOptions()).secure).toBe(true);
  });

  it('judges only the first hop of a proxy chain', async () => {
    jar.forwardedProto = 'https, http';
    expect((await issuedOptions()).secure).toBe(true);
    jar.forwardedProto = 'http, https';
    expect((await issuedOptions()).secure).toBe(false);
  });

  it('is Secure when COOKIE_SECURE=1 forces it', async () => {
    process.env.COOKIE_SECURE = '1';
    expect((await issuedOptions()).secure).toBe(true);
  });
});
