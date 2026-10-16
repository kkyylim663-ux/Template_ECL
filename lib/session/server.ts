import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE, readSession, type Session } from './token';

/**
 * Server-only cookie access for route handlers and server components. Never
 * import this from a client component: `next/headers` is not available there.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * `Secure` only when the request really came in over https (or COOKIE_SECURE=1
 * forces it). A production build served over plain http — localhost previews,
 * a phone on the LAN — must not set it: browsers drop a Secure cookie on
 * http://192.168.x.x, which looked like "logged in, then bounced to login".
 */
async function isSecureRequest(): Promise<boolean> {
  if (process.env.COOKIE_SECURE === '1') return true;
  const proto = (await headers()).get('x-forwarded-proto') ?? '';
  return proto.split(',')[0]?.trim() === 'https';
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await isSecureRequest(),
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
