import type { MetadataRoute } from 'next';
import { REGION_CODES } from '@/config/brand';
import { getFaqTopics, getPromotions, getUpdates } from '@/lib/api';
import { publicUrl } from '@/lib/seo';

/**
 * The public surface only: the pages the shell links to, plus every promotion,
 * update and FAQ topic — once per market. Gated pages (auth, member), the dev
 * gallery and the `/faq` redirect are deliberately absent.
 */

/** Hubs and long-form pages. `/` (home) carries the empty path. */
const STATIC_PATHS = [
  '',
  '/slots',
  '/fast-game',
  '/livecasino',
  '/sports',
  '/esports',
  '/4d',
  '/numbergame',
  '/prediction',
  '/ranking-board',
  '/promotion',
  '/update',
  '/vip',
  '/sponsor',
  '/about',
  '/contact',
  '/tnc',
  '/betting-rules',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [promotions, updates, topics] = await Promise.all([
    getPromotions(),
    getUpdates(),
    getFaqTopics(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  const push = (path: string, lastModified?: string | Date) => {
    for (const region of REGION_CODES) {
      entries.push({
        url: publicUrl(region, path),
        ...(lastModified ? { lastModified } : {}),
        alternates: {
          languages: {
            'en-MY': publicUrl('my', path),
            'en-SG': publicUrl('sg', path),
          },
        },
      });
    }
  };

  for (const path of STATIC_PATHS) push(path);
  for (const promotion of promotions) push(`/promotion/${promotion.id}`, promotion.startsAt);
  for (const update of updates) push(`/update/${update.id}`, update.publishedAt);
  for (const topic of topics) push(`/faq/${topic.id}`);

  return entries;
}
