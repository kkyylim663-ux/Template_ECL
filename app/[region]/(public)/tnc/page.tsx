import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { LongFormPage } from '@/components/content/LongFormPage';

/**
 * Terms & Conditions — the reference build folds this into an accordion; T23
 * keeps the shared long-form layout (contents rail + anchored sections) so all
 * four text pages read the same way. Placeholder clauses from `mocks/pages.json`.
 */
export default async function TncPage() {
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('tnc')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage title={t('pages.tnc')} page={page} />
    </IntlScope>
  );
}
