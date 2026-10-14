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
  return pageMetadata('bettingRules', { region, path: '/betting-rules' });
}

/** Betting Rules and Regulations — same long-form layout, placeholder rules. */
export default async function BettingRulesPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('betting-rules')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage region={region} title={t('pages.bettingRules')} page={page} />
    </IntlScope>
  );
}
