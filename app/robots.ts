import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/**
 * Everything public is allowed; the gated areas are kept out. Both markets carry
 * the same prefixes, so each rule is listed twice: once as a plain prefix and once
 * with a wildcard for the region segment.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/login',
          '/register',
          '/dev',
          '/*/account',
          '/*/login',
          '/*/register',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
