import { getRequestConfig } from 'next-intl/server';
import { getLocale } from '@/lib/i18n/server';

/**
 * next-intl's per-request configuration. The locale comes from the `brand_lang`
 * cookie rather than the URL — `/my` and `/sg` are markets, and a shared link
 * should keep the language the visitor picked (the reference site does the same).
 *
 * Messages are deliberately absent here: every page loads its own namespaces
 * through `lib/i18n/server.ts` + `IntlScope`, so nothing is pulled in wholesale.
 */
export default getRequestConfig(async () => {
  const locale = await getLocale();
  return { locale };
});
