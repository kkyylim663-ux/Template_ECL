import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { LongFormPage } from '@/components/content/LongFormPage';

/** Betting Rules and Regulations — same long-form layout, placeholder rules. */
export default async function BettingRulesPage() {
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('betting-rules')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage title={t('pages.bettingRules')} page={page} />
    </IntlScope>
  );
}
