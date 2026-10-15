import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { DepositForm } from '@/components/account/forms';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.deposit'), robots: { index: false, follow: false } };
}

/**
 * No snapshot exists for this page (the crawl's `my_mydeposit.html` is 0
 * bytes), so the content is the build's own deposit demo — only the account
 * card and heading follow the reference's family.
 */
export default async function DepositPage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-5 large">
        <Icon name="wallet" size={28} className="page-icon" />
        {t('deposit.title')}
      </h1>
      <DepositForm payload={payload} />
    </div>
  );
}
