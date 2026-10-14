import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { HistoryTable } from '@/components/account/actions';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.history'), robots: { index: false, follow: false } };
}

export default async function HistoryPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">{t('history.title')}</h2>
      <p className="text-muted mt-1 text-xs">{t('history.intro')}</p>
      <div className="mt-5">
        <HistoryTable
          transactions={payload.transactions}
          rollover={payload.promotionRollover}
          currency={regionConfig(region as RegionCode).currency}
        />
      </div>
    </section>
  );
}
