import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { PendingCancelButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };
const CURRENCY = 'MYR';
const money = (amountMinor: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(
    amountMinor / 100,
  );

export default async function PendingPage() {
  const payload = await getAccountPayload();
  const pending = payload.transactions.filter((transaction) =>
    ['pending', 'processing'].includes(transaction.status),
  );

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <h2 className="text-ink text-sm font-semibold">Pending transactions</h2>
      <p className="text-muted mt-1 text-xs">
        {pending.length} request{pending.length === 1 ? '' : 's'} waiting for a reviewer.
      </p>

      {pending.length === 0 ? (
        <p className="text-muted mt-4 text-xs">Nothing is waiting for review.</p>
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
                  {transaction.kind} · {transaction.methodLabel} ·{' '}
                  {transaction.createdAt.slice(0, 16).replace('T', ' ')}
                </p>
                {transaction.note ? (
                  <p className="text-danger mt-0.5 text-[11px]">{transaction.note}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-ink font-mono text-sm">{money(transaction.amountMinor)}</span>
                <PendingCancelButton transaction={transaction} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
