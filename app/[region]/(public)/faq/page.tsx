import { permanentRedirect } from 'next/navigation';
import type { RegionCode } from '@/config/brand';
import { isRegionCode } from '@/config/brand';
import { notFound } from 'next/navigation';

/**
 * `/faq` on its own is not a page: it forwards to the first topic, the same way
 * the reference build does. 308, so the redirect is cached and indexable.
 */
export default async function FaqIndexPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;

  if (!isRegionCode(region)) notFound();

  permanentRedirect(`/${region as RegionCode}/faq/gettingstart`);
}
