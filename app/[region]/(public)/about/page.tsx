import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { LongFormPage } from '@/components/content/LongFormPage';

/**
 * About Us — a long-form page in the shared T23 layout (contents rail + body).
 * The copy itself is placeholder content from `mocks/pages.json`.
 */
export default async function AboutPage() {
  const [{ t }, page] = await Promise.all([getT('content'), getPageContent('about')]);
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <LongFormPage title={t('pages.about')} page={page} />
    </IntlScope>
  );
}
