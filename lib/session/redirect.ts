const PROBE_ORIGIN = 'http://session.invalid';

/**
 * Accepts only a same-origin path for a post-login redirect. Anything that
 * resolves to another origin (`//evil.com`, `https://evil.com`, `/\evil.com`)
 * falls back to `fallback`.
 */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/')) return fallback;
  try {
    const url = new URL(next, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
