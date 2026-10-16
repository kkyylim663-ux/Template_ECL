import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { DepositPanel } from '@/components/account/DepositPanel';
import { resolveMethodId } from '@/lib/api/deposit';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.deposit'), robots: { index: false, follow: false } };
}

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The reference's deposit view is a client-rendered Vue page whose chunk was
 * never captured (the crawl's `my_mydeposit.html` is a 0-byte 302), so the
 * surface follows the stylesheet's own deposit classes (`.deposit-tab__wrapper`,
 * `.deposit-banklist__*`, `.deposit-rule`) and the Fluent strings embedded in
 * the original's JS. The open tab lives in `?method=` so a refresh keeps it.
 */
export default async function DepositPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ t }, { region }, query] = await Promise.all([getT('account'), params, searchParams]);
  const currency = regionConfig(region as RegionCode).currency;

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-5 large">
        <Icon name="wallet" size={28} className="page-icon" />
        {t('deposit.title')}
      </h1>
      <DepositPanel
        initialMethod={resolveMethodId(query.method)}
        currency={currency}
        region={region}
      />
    </div>
  );
}
