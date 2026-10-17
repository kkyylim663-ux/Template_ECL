/**
 * Every `Cache-Control` this build sends, in one place.
 *
 * Nothing here makes a page cacheable. The root layout reads the `brand_lang`
 * cookie through `getShell()` (`lib/i18n/server.ts`), so every route renders per
 * request and Next answers HTML with its own dynamic default. What is left to
 * decide is the content-hashed build output, the JSON API, and the surfaces whose
 * response belongs to one visitor.
 *
 * `next.config.ts` hands `CACHE_RULES` to `headers()`; `cacheHeadersFor()` is the
 * same policy resolved for a concrete path, so the unit test can pin every class
 * without booting a server.
 */

/** `/_next/static` URLs carry a content hash, so a new build never reuses one. */
export const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Member HTML, auth pages, the JSON API: no cache — shared or private — keeps a copy. */
export const PRIVATE_NO_STORE = 'private, no-store';

export type CacheRule = {
  source: string;
  headers: { key: string; value: string }[];
};

function rule(source: string, value: string): CacheRule {
  return { source, headers: [{ key: 'Cache-Control', value }] };
}

/**
 * Ordered least specific first; no two patterns claim the same path. `/api` and
 * `/dev` sit outside the region tree (the middleware leaves them alone), so they
 * get their own rules instead of sharing the `:region` one.
 */
export const CACHE_RULES: CacheRule[] = [
  rule('/_next/static/:path*', IMMUTABLE),
  rule('/api/:path*', PRIVATE_NO_STORE),
  rule('/dev/:path*', PRIVATE_NO_STORE),
  rule('/:region/account/:path*', PRIVATE_NO_STORE),
  ...['login', 'register', 'forgot-password'].map((page) =>
    rule(`/:region/${page}`, PRIVATE_NO_STORE),
  ),
];

/**
 * Next's own source syntax, as far as this file uses it: a literal segment stays
 * literal, `:name` holds one segment, `:name*` holds zero or more.
 */
export function matchesSource(source: string, pathname: string): boolean {
  const pattern = source
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (!segment.startsWith(':')) return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
      return segment.endsWith('*') ? '(?:/[^/]*)*' : '/[^/]+';
    })
    .join('');
  return new RegExp(`^${pattern || '/'}/?$`).test(pathname);
}

/**
 * The `Cache-Control` a request path gets from `CACHE_RULES`, or `null` when no
 * rule claims it and the framework default applies. The query string is dropped
 * first: rules match on the path, as they do in `next.config.ts`.
 */
export function cacheHeadersFor(path: string): string | null {
  const pathname = path.split(/[?#]/)[0];
  const match = CACHE_RULES.find((entry) => matchesSource(entry.source, pathname));
  return match?.headers.find((header) => header.key === 'Cache-Control')?.value ?? null;
}
