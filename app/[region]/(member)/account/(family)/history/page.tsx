import { getAccountPayload } from '@/lib/api';
import { regionConfig, type RegionCode } from '@/config/brand';
import { getT } from '@/lib/i18n/server';
import { HistoryPanel } from '@/components/account/HistoryPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.history'), robots: { index: false, follow: false } };
}

export default async function HistoryPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const payload = await getAccountPayload();
  const currency = regionConfig(region as RegionCode).currency;

  const rollover = payload.promotionRollover.map((item) => ({
    id: item.id,
    title: item.title,
    requirementMinor: item.requirementMinor,
    progressMinor: item.progressMinor,
  }));

  return (
    <div className="account-content__container">
      <HistoryPanel history={payload.history} currency={currency} rollover={rollover} />
    </div>
  );
}
