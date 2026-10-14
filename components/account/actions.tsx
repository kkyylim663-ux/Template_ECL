'use client';

import { useState } from 'react';
import { useModal } from '@/components/ui/ModalProvider';
import type { AccountTransaction } from '@/lib/api/schemas';

/**
 * The action buttons on the member pages. All of them are placeholders: they
 * explain what the live build would do and change nothing.
 */

function useExplain() {
  const modal = useModal();
  return (title: string, body: string) => modal.success(title, body);
}

export function ClaimButton({
  label = 'Claim',
  amount,
  what,
}: {
  label?: string;
  amount: string;
  what: string;
}) {
  const explain = useExplain();
  return (
    <button
      type="button"
      onClick={() =>
        explain(
          'Demo claim',
          `${what} of ${amount} would be credited to the main wallet in the live build. Nothing is credited here.`,
        )
      }
      className="border-accent text-accent hover:bg-panel-soft rounded-[8px] border px-3 py-1.5 text-xs font-semibold"
    >
      {label}
    </button>
  );
}

export function UseTicketButton({ ticketsHeld, needed }: { ticketsHeld: number; needed: number }) {
  const explain = useExplain();
  const enough = ticketsHeld >= needed;

  return (
    <button
      type="button"
      onClick={() =>
        explain(
          'Demo entry',
          enough
            ? `${needed} of your ${ticketsHeld} tickets would be spent to enter. No entry is recorded here.`
            : `You hold ${ticketsHeld} tickets and ${needed} are needed. The live build would send you to deposit or earn more.`,
        )
      }
      className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
        enough
          ? 'bg-accent text-[#1b1b1b]'
          : 'border-line text-muted border'
      }`}
    >
      {enough ? 'Use tickets now' : 'Not enough tickets'}
    </button>
  );
}

export function PendingCancelButton({ transaction }: { transaction: AccountTransaction }) {
  const explain = useExplain();
  return (
    <button
      type="button"
      onClick={() =>
        explain(
          'Demo cancel',
          `${transaction.reference} would be cancelled and any held amount released. Nothing changes here.`,
        )
      }
      className="border-line text-ink hover:border-accent rounded-[8px] border px-3 py-1.5 text-xs"
    >
      Cancel request
    </button>
  );
}

export function InboxActionButton({
  label,
  messageId,
}: {
  label: string;
  messageId: string;
}) {
  const explain = useExplain();
  return (
    <button
      type="button"
      onClick={() =>
        explain('Demo inbox', `“${label}” would be applied to message ${messageId}. Nothing is saved here.`)
      }
      className="border-line text-muted hover:text-ink hover:border-accent rounded-[8px] border px-2.5 py-1 text-[11px]"
    >
      {label}
    </button>
  );
}

/** History filter + table. Filtering runs on the rows already on the page. */
export function HistoryTable({
  transactions,
  rollover,
  currency,
}: {
  transactions: AccountTransaction[];
  rollover: { id: string; title: string; requirementMinor: number; progressMinor: number }[];
  currency: string;
}) {
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const format = (amountMinor: number) =>
    new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);

  const rows = transactions.filter(
    (transaction) =>
      (kind === 'all' || transaction.kind === kind) &&
      (status === 'all' || transaction.status === status),
  );
  const totalMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by type"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className="border-line bg-panel text-ink rounded-[var(--radius-tag)] border px-3 py-2 text-xs"
        >
          {['all', 'deposit', 'withdrawal', 'transfer', 'rebate', 'bonus'].map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All types' : value}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="border-line bg-panel text-ink rounded-[var(--radius-tag)] border px-3 py-2 text-xs"
        >
          {['all', 'pending', 'processing', 'approved', 'rejected', 'cancelled'].map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All statuses' : value}
            </option>
          ))}
        </select>
        <p className="text-muted self-center text-xs">
          {rows.length} of {transactions.length} rows · total {format(totalMinor)}
        </p>
      </div>

      <div className="border-line bg-panel overflow-x-auto rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <tr key={transaction.id} className="border-line border-t">
                <td className="text-ink px-4 py-3 font-mono text-xs">{transaction.reference}</td>
                <td className="text-muted px-4 py-3 text-xs capitalize">{transaction.kind}</td>
                <td className="text-muted px-4 py-3 text-xs">
                  {transaction.methodLabel}
                  {transaction.note ? (
                    <span className="text-danger block text-[10px]">{transaction.note}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs capitalize">{transaction.status}</td>
                <td className="text-muted px-4 py-3 text-xs">
                  {transaction.createdAt.slice(0, 16).replace('T', ' ')}
                </td>
                <td className="text-ink px-4 py-3 text-right font-mono text-xs">
                  {format(transaction.amountMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="text-muted px-4 py-6 text-center text-xs">
            No transactions match this filter.
          </p>
        ) : null}
      </div>

      <section>
        <h2 className="text-ink text-sm font-semibold">Promotion rollover status</h2>
        <ul className="mt-3 space-y-3">
          {rollover.map((entry) => {
            const progress = Math.min(100, Math.round((entry.progressMinor / entry.requirementMinor) * 100));
            return (
              <li key={entry.id} className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-ink font-medium">{entry.title}</span>
                  <span className="text-muted font-mono">
                    {format(entry.progressMinor)} / {format(entry.requirementMinor)}
                  </span>
                </div>
                <div className="bg-panel-soft mt-2 h-1.5 w-full overflow-hidden rounded-full">
                  <span
                    className="bg-accent block h-full"
                    style={{ width: `${progress}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
