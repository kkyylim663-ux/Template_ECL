import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { WithdrawalForm } from '@/components/account/forms';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.withdrawal'), robots: { index: false, follow: false } };
}

/**
 * No snapshot exists for this page (the crawl's `my_mywithdrawal.html` is 0
 * bytes); the content is the build's own withdrawal demo under the reference's
 * account card.
 */
export default async function WithdrawalPage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-5 large">
        <Icon name="withdraw" size={28} className="page-icon" />
        {t('withdrawal.title')}
      </h1>
      <WithdrawalForm payload={payload} />
    </div>
  );
}
