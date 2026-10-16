import { getT } from '@/lib/i18n/server';
import { WithdrawalPanel } from '@/components/account/WithdrawalPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.withdrawal'), robots: { index: false, follow: false } };
}

/**
 * No snapshot exists for this page (the crawl's `my_mywithdrawal.html` is a
 * 0-byte 302), so the body follows the captured stylesheet's withdrawal classes
 * and the four-language Fluent strings embedded in the original's shared bundle
 * (evidence: `site/_scratch/t56-research.md`). The panel owns the reference's
 * header (`.withdraw-header`, inside the phone-only `__wrapper`), so the page
 * only supplies the content container.
 */
export default async function WithdrawalPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;

  return (
    <div className="account-content__container">
      <WithdrawalPanel region={region} />
    </div>
  );
}
