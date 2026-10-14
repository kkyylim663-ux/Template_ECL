import type { JsonLdData } from '@/lib/seo';

/**
 * One `application/ld+json` block. The payload is serialized here and `<` is
 * escaped to `\u003c`, so no value — however it was authored — can close the
 * script tag; the result stays valid JSON for crawlers.
 */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script type="application/ld+json">{JSON.stringify(data).replaceAll('<', '\\u003c')}</script>
  );
}
