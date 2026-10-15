import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageContent } from '@/lib/api';
import { IntlScope } from '@/lib/i18n/scope';
import { ClauseAccordion } from '@/components/content/ClauseAccordion';
import { JsonLd } from '@/components/content/JsonLd';
import { breadcrumbLd, pageMetadata } from '@/lib/seo';
import { brand } from '@/config/brand';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('tnc', { region, path: '/tnc' });
}

/**
 * Terms & Conditions — the reference's shape: a `.generalPage` heading over a
 * closed-by-default accordion of clauses. Placeholder clauses from
 * `mocks/pages.json`.
 */
export default async function TncPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const page = await getPageContent('tnc');
  if (!page) notFound();

  return (
    <IntlScope namespaces={['content']}>
      <JsonLd
        data={breadcrumbLd(
          [
            { name: brand.name, path: '' },
            { name: page.title, path: '/tnc' },
          ],
          region,
        )}
      />
      <ClauseAccordion page={page} pageKey="tnc" />
    </IntlScope>
  );
}
