import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { HistoryTable } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };
const CURRENCY = 'MYR';

export default async function HistoryPage() {
  const payload = await getAccountPayload();

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">Transaction history</h2>
      <p className="text-muted mt-1 text-xs">
        Filter the demo rows by type and status; the rollover block tracks active promotions.
      </p>
      <div className="mt-5">
        <HistoryTable
          transactions={payload.transactions}
          rollover={payload.promotionRollover}
          currency={CURRENCY}
        />
      </div>
    </section>
  );
}
