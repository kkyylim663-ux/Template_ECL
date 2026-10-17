import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { CACHE_RULES } from './lib/cache-policy';

/**
 * next-intl resolves its request config through this plugin at build time.
 * Locale selection lives in `i18n/request.ts` (cookie-based, no URL prefix).
 */
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * The project lives in a folder that has other lockfiles above it, so Next's
   * automatic workspace-root guess is ambiguous. Point the trace root at this
   * app (Next runs builds from here).
   */
  outputFileTracingRoot: process.cwd(),
  images: {
    // Artwork host comes from NEXT_PUBLIC_IMG_BASE. P0 loads no external images.
    remotePatterns: [],
  },
  /**
   * Cache policy, defined once in `lib/cache-policy.ts` and unit-tested there.
   * Every route renders per request (the shell reads the `brand_lang` cookie), so
   * these rules only cover the build output, the JSON API and the per-visitor
   * surfaces — see `docs/CACHING.md`.
   */
  async headers() {
    return CACHE_RULES;
  },
  /**
   * The reference build kept each help topic at its own top-level path
   * (`/my/finance`); the P1 build groups them under `/faq`. The eight legacy
   * paths answer 301 with the new destination, for both markets, so old links and
   * search results keep resolving.
   */
  async redirects() {
    const topics = [
      'gettingstart',
      'finance',
      'statement',
      'games',
      'events',
      'promotions',
      'contactus',
      'downloadapp',
    ];
    return ['my', 'sg'].flatMap((region) =>
      topics.map((topic) => ({
        source: `/${region}/${topic}`,
        destination: `/${region}/faq/${topic}`,
        // statusCode, not `permanent`: `permanent: true` answers 308.
        statusCode: 301,
      })),
    );
  },
};

export default withNextIntl(nextConfig);
