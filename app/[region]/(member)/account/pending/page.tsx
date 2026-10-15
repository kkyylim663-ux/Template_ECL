import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { PendingCancelButton } from '@/components/account/actions';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.pending'), robots: { index: false, follow: false } };
}

const money = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    amountMinor / 100,
  );

export default async function PendingPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const currency = regionConfig(region as RegionCode).currency;
  const pending = payload.transactions.filter((transaction) =>
    ['pending', 'processing'].includes(transaction.status),
  );

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">{t('pending.title')}</h2>
      <p className="text-muted mt-1 text-xs">{t('pending.summary', { count: pending.length })}</p>

      {pending.length === 0 ? (
        <p className="text-muted mt-4 text-xs">{t('pending.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((transaction) => (
            <li
              key={transaction.id}
              className="border-line bg-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border p-4"
            >
              <div className="min-w-0">
                <p className="text-ink font-mono text-xs">{transaction.reference}</p>
                <p className="text-muted mt-0.5 text-xs">
                  {t(`history.kind.${transaction.kind}`)} · {transaction.methodLabel} ·{' '}
                  {transaction.createdAt.slice(0, 16).replace('T', ' ')}
                </p>
                {transaction.note ? (
                  <p className="text-danger mt-0.5 text-11">{transaction.note}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-ink font-mono text-sm">{money(transaction.amountMinor, currency)}</span>
                <PendingCancelButton transaction={transaction} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
