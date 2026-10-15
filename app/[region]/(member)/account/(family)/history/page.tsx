import { getAccountPayload } from '@/lib/api';
import { formatTimestamp } from '@/lib/format';
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
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const currency = regionConfig(region as RegionCode).currency;

  const rows = payload.transactions.map((transaction) => ({
    id: transaction.id,
    kind: transaction.kind,
    date: formatTimestamp(transaction.createdAt),
    amount: (transaction.amountMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 }),
    type: transaction.methodLabel,
    status: t(`status.${transaction.status}`),
    reason: transaction.note ?? '–',
  }));

  const rollover = payload.promotionRollover.map((item) => ({
    id: item.id,
    title: item.title,
    requirement: (item.requirementMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 }),
    progress: (item.progressMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 }),
  }));

  return (
    <div className="account-content__container">
      <HistoryPanel rows={rows} currency={currency} rollover={rollover} />
    </div>
  );
}
