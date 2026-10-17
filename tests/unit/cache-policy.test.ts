import { describe, expect, it } from 'vitest';
import {
  CACHE_RULES,
  IMMUTABLE,
  PRIVATE_NO_STORE,
  cacheHeadersFor,
  matchesSource,
} from '@/lib/cache-policy';

/**
 * T73: the policy module on its own. The e2e spec proves Next applies these
 * patterns; this proves the patterns say what CACHING.md claims they say.
 */
const IMMUTABLE_PATHS = [
  '/_next/static',
  '/_next/static/',
  '/_next/static/chunks/main-app-4f1c2d.js',
  '/_next/static/css/9ab.css',
  '/_next/static/media/rubik-700.woff2',
];

const PRIVATE_PATHS = [
  '/api/games',
  '/api/deposit/methods',
  '/api/mock-auth/session',
  '/api/withdrawal/requests?limit=5',
  '/dev',
  '/dev/wallet',
  '/dev/components',
  ...[
    // `/my/account` itself has no page (the account root is the family layout),
    // but the pattern still covers it — a 404 must not be cacheable either.
    '/my/account',
    '/my/account/',
    '/my/account/deposit',
    '/my/account/withdrawal',
    '/my/account/transfer',
    '/my/account/banks',
    '/my/account/inbox',
    '/my/account/achievement',
    '/my/account/rebates',
    '/my/account/settings',
    '/my/account/history',
    '/my/account/pending',
    '/my/account/tickets',
    '/my/login',
    '/my/register',
    '/my/forgot-password',
    '/sg/account/deposit',
    '/sg/account/profile',
    '/sg/login',
    '/sg/register',
    '/sg/forgot-password',
  ],
];

const DEFAULT_PATHS = [
  '/',
  '/my',
  '/my/',
  '/my/slots',
  '/sg/slots',
  '/my/livecasino',
  '/my/promotion',
  '/my/promotion/pr-welcome-188',
  '/my/update/up-061',
  '/my/ranking-board',
  '/my/numbergame',
  '/my/prediction',
  '/my/vip',
  '/my/sponsor',
  '/my/about',
  '/my/contact',
  '/my/tnc',
  '/my/betting-rules',
  '/my/faq',
  '/my/faq/finance',
  '/my/slots?category=jackpot',
  '/brand/logo.svg',
  '/brand/tile.svg',
];

describe('cache policy (T73)', () => {
  it('build output is immutable for a year', () => {
    for (const path of IMMUTABLE_PATHS) {
      expect(cacheHeadersFor(path), path).toBe(IMMUTABLE);
    }
  });

  it('the JSON API, the dev tooling, member and auth pages are private', () => {
    for (const path of PRIVATE_PATHS) {
      expect(cacheHeadersFor(path), path).toBe(PRIVATE_NO_STORE);
    }
  });

  it('public pages fall through to the framework default', () => {
    for (const path of DEFAULT_PATHS) {
      expect(cacheHeadersFor(path), path).toBeNull();
    }
  });

  it('no path is claimed by two rules', () => {
    for (const path of [...IMMUTABLE_PATHS, ...PRIVATE_PATHS, ...DEFAULT_PATHS]) {
      const hits = CACHE_RULES.filter((entry) => matchesSource(entry.source, path));
      expect(hits.length, path).toBeLessThanOrEqual(1);
    }
  });

  it('every rule names a Cache-Control value', () => {
    for (const entry of CACHE_RULES) {
      expect(entry.source.startsWith('/'), entry.source).toBe(true);
      expect(entry.headers).toEqual([{ key: 'Cache-Control', value: expect.any(String) }]);
    }
  });

  it('a path is matched on its pathname, not its query string', () => {
    expect(cacheHeadersFor('/api/games?category=slots')).toBe(PRIVATE_NO_STORE);
    expect(cacheHeadersFor('/my/account?tab=history')).toBe(PRIVATE_NO_STORE);
    expect(cacheHeadersFor('/my/slots?category=jackpot')).toBeNull();
  });
});
