import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { LongFormPage } from '@/components/content/LongFormPage';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('about', { region, path: '/about' });
}

/**
 * About Us — a long-form page in the shared T23 layout (contents rail + body).
 * The copy itself is placeholder content from `mocks/pages.json`.
 */
export default async function AboutPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('about')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage region={region} title={t('pages.about')} page={page} />
    </IntlScope>
  );
}
