import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE, readSession, type Session } from './token';

/**
 * Server-only cookie access for route handlers and server components. Never
 * import this from a client component: `next/headers` is not available there.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
