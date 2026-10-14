import type { Metadata } from 'next';
import { DEFAULT_REGION, REGION_CODES, brand, type RegionCode } from '@/config/brand';
import type { Locale } from '@/lib/i18n/config';
import { getT } from '@/lib/i18n/server';

/**
 * Page metadata (T24): canonical, hreflang alternates across the two markets,
 * OpenGraph and Twitter cards, and a titles-and-descriptions table that lives in
 * the `meta` message namespace (one source for the four languages).
 *
 * The URL carries the market but not the language, so every language of a page
 * shares one canonical; `/my` and `/sg` are alternates of each other.
 */

/** Set `NEXT_PUBLIC_SITE_URL` in production; the fallback matches `pnpm dev`. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (raw && raw.length > 0 ? raw : 'http://localhost:3000').replace(/\/+$/, '');
}

/** Both markets serve English to crawlers; the language itself is a cookie. */
const HREFLANG: Record<RegionCode, string> = { my: 'en-MY', sg: 'en-SG' };

const OG_LOCALE: Record<Locale, string> = {
  en: 'en_MY',
  'zh-Hans': 'zh_CN',
  'zh-Hant': 'zh_TW',
  vi: 'vi_VN',
};

export function publicUrl(region: string, path: string): string {
  return `${siteUrl()}/${region}${path}`;
}

/** `en-MY` / `en-SG` plus `x-default` pointing at the default market. */
export function regionAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const code of REGION_CODES) languages[HREFLANG[code]] = publicUrl(code, path);
  languages['x-default'] = publicUrl(DEFAULT_REGION, path);
  return languages;
}

export function buildMetadata({
  title,
  description,
  region,
  path,
  locale,
  type = 'website',
  index = true,
}: {
  title: string;
  description: string;
  region: string;
  /** Route below the region, e.g. `/promotion/pr-welcome-188` ('' for home). */
  path: string;
  locale: Locale;
  type?: 'website' | 'article';
  index?: boolean;
}): Metadata {
  const url = publicUrl(region, path);

  return {
    title,
    description,
    alternates: { canonical: url, languages: regionAlternates(path) },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: brand.name,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: 'summary', title, description },
    ...(index ? {} : { robots: { index: false, follow: false } }),
  };
}

/**
 * Metadata straight out of the `meta` namespace. `title`/`description` overrides
 * are for the detail pages, whose heading is content (a promotion or an update),
 * not a table row.
 */
export async function pageMetadata(
  key: string,
  {
    region,
    path,
    title,
    description,
    type,
    index,
  }: {
    region: string;
    path: string;
    title?: string;
    description?: string;
    type?: 'website' | 'article';
    index?: boolean;
  },
): Promise<Metadata> {
  const { t, locale } = await getT('meta');
  return buildMetadata({
    title: title ?? t(`${key}.title`),
    description: description ?? t(`${key}.description`),
    region,
    path,
    locale,
    type,
    index,
  });
}

/* ------------------------------------------------------------- structured data */

/** A `@type`-tagged object, ready to be serialized into a ld+json script. */
export type JsonLdData = Record<string, unknown> & { '@type': string };

/** Home: who runs the site. */
export function organizationLd(): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    legalName: brand.legalName,
    url: siteUrl(),
    logo: `${siteUrl()}${brand.logo.src}`,
  };
}

/** Home: the site itself, tied to the market it was rendered for. */
export function websiteLd(region: string): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.name,
    url: publicUrl(region, ''),
    inLanguage: ['en', 'zh-Hans', 'zh-Hant', 'vi'],
  };
}

/** Every content page: where it sits in the tree. */
export function breadcrumbLd(items: { name: string; path: string }[], region: string): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: publicUrl(region, item.path),
    })),
  };
}

/** FAQ topics: the questions and answers actually rendered on the page. */
export function faqPageLd(items: { q: string; a: string }[]): JsonLdData {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
