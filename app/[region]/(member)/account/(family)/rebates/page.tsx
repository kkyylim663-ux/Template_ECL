import { getAccountPayload } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { regionConfig, type RegionCode } from '@/config/brand';
import { Icon } from '@/components/ui/Icon';
import { getT } from '@/lib/i18n/server';
import { RebateList } from '@/components/account/RebateList';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.rebates'), robots: { index: false, follow: false } };
}

export default async function RebatesPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const currency = regionConfig(region as RegionCode).currency;

  const items = payload.rebates.map((rebate) => ({
    id: rebate.id,
    title: `${rebate.product} · ${rebate.period}`,
    turnover: `${currency} ${(rebate.turnoverMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    rate: String(rebate.ratePct),
    claimFrom: formatDate(rebate.claimableAt),
    amount: `${currency} ${(rebate.amountMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
    claimable: rebate.status === 'claimable',
  }));

  return (
    <div className="account-content__container">
      <h1 className="form-title mt-5 mb-5">
        <Icon name="rebate" size={28} className="page-icon" />
        {t('rebates.title')}
      </h1>
      <RebateList items={items} currency={currency} />
    </div>
  );
}
