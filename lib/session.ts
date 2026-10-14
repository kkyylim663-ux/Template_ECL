/**
 * Demo session cookie. P0 has no auth service, so the cookie is a plain
 * non-httpOnly marker set by the login page in the browser; middleware guards
 * `/{region}/account/*` on its presence.
 *
 * The real build replaces this with a server-issued httpOnly session cookie and
 * a server-side read — which is why the header reads this one on the client only
 * and the public pages stay statically renderable.
 */
export const DEMO_SESSION_COOKIE = 'brand_session';

export const DEMO_SESSION_VALUE = 'demo';

export function readDemoSessionFromDocument(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .some((entry) => entry.trim() === `${DEMO_SESSION_COOKIE}=${DEMO_SESSION_VALUE}`);
}
