import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { normalizeDepositResultStatus } from '@/lib/deposit-flow';
import { DepositResult } from '@/components/account/DepositResult';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('account');
  return { title: t('deposit.resultTitle'), robots: { index: false, follow: false } };
}

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Where the mock gateway hands the browser back (T54): `?status=` picks one of
 * the three ruled layouts, anything else falls back to the unknown one, and
 * `?order=` only feeds a read-only details block — the ruling itself was
 * recorded once by the gateway window, so a refresh never replays it.
 */
export default async function DepositResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ t }, { region }, query] = await Promise.all([getT('account'), params, searchParams]);
  const currency = regionConfig(region as RegionCode).currency;
  const status = normalizeDepositResultStatus(query.status);
  const orderId = first(query.order) ?? null;

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-5 large">
        <Icon name="wallet" size={28} className="page-icon" />
        {t('deposit.resultTitle')}
      </h1>
      <DepositResult status={status} orderId={orderId} currency={currency} region={region} />
    </div>
  );
}
