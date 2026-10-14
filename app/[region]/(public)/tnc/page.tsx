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
  return pageMetadata('tnc', { region, path: '/tnc' });
}

/**
 * Terms & Conditions — the reference build folds this into an accordion; T23
 * keeps the shared long-form layout (contents rail + anchored sections) so all
 * four text pages read the same way. Placeholder clauses from `mocks/pages.json`.
 */
export default async function TncPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('tnc')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage region={region} title={t('pages.tnc')} page={page} />
    </IntlScope>
  );
}
