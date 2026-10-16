import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { DepositGatewayPanel } from '@/components/account/DepositGatewayPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('account');
  return { title: t('deposit.gatewayTitle'), robots: { index: false, follow: false } };
}

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The mock stand-in for the reference's payment-gateway window — the target of
 * `_Deposit.showPg(pgUrl)`'s `window.open`. The real gateway is a third-party
 * page, so the layout here is this build's own; the ruling texts are the
 * reference dictionary's own (`pg_deposit_success / fail / pending`). The three
 * buttons resolve the order (first ruling wins) and hand the browser back to the
 * in-site result page (T54).
 */
export default async function DepositGatewayPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ t }, { region }, query] = await Promise.all([getT('account'), params, searchParams]);
  const currency = regionConfig(region as RegionCode).currency;
  const orderId = first(query.order) ?? null;

  return (
    <div className="account-content__container">
      <h1 className="form-title mb-5 large">
        <Icon name="globe" size={28} className="page-icon" />
        {t('deposit.gatewayTitle')}
      </h1>
      <DepositGatewayPanel orderId={orderId} currency={currency} region={region} />
    </div>
  );
}
