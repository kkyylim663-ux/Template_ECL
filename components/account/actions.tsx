'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('account');
  const explain = useExplain();
  return (
    <button
      type="button"
      onClick={() =>
        explain(
          t('actions.demoClaimTitle'),
          t('actions.demoClaimBody', { what, amount }),
        )
      }
      className="border-accent text-accent hover:bg-panel-soft rounded-[8px] border px-3 py-1.5 text-xs font-semibold"
    >
      {label}
    </button>
  );
}

export function UseTicketButton({ ticketsHeld, needed }: { ticketsHeld: number; needed: number }) {
  const t = useTranslations('account');
  const explain = useExplain();
  const enough = ticketsHeld >= needed;

  return (
    <button
      type="button"
      onClick={() =>
        explain(
          t('actions.demoEntryTitle'),
          enough
            ? t('actions.demoEntryBody', { needed, held: ticketsHeld })
            : t('actions.demoEntryShort', { needed, held: ticketsHeld }),
        )
      }
      className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
        enough
          ? 'bg-accent text-[#1b1b1b]'
          : 'border-line text-muted border'
      }`}
    >
      {enough ? t('tickets.use') : t('tickets.notEnough')}
    </button>
  );
}

export function PendingCancelButton({ transaction }: { transaction: AccountTransaction }) {
  const t = useTranslations('account');
  const explain = useExplain();
  return (
    <button
      type="button"
      onClick={() =>
        explain(
          t('actions.demoCancelTitle'),
          t('actions.demoCancelBody', { reference: transaction.reference }),
        )
      }
      className="border-line text-ink hover:border-accent rounded-[8px] border px-3 py-1.5 text-xs"
    >
      {t('pending.cancel')}
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
  const t = useTranslations('account');
  const explain = useExplain();
  return (
    <button
      type="button"
      onClick={() =>
        explain(t('actions.demoInboxTitle'), t('actions.demoInboxBody', { label, message: messageId }))
      }
      className="border-line text-muted hover:text-ink hover:border-accent rounded-[8px] border px-2.5 py-1 text-11"
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
  const t = useTranslations('account');
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
          aria-label={t('history.filterType')}
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className="border-line bg-panel text-ink rounded-[var(--radius-tag)] border px-3 py-2 text-xs"
        >
          {['all', 'deposit', 'withdrawal', 'transfer', 'rebate', 'bonus'].map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? t('history.allTypes') : t(`history.kind.${value}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('history.filterStatus')}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="border-line bg-panel text-ink rounded-[var(--radius-tag)] border px-3 py-2 text-xs"
        >
          {['all', 'pending', 'processing', 'approved', 'rejected', 'cancelled'].map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? t('history.allStatuses') : t(`status.${value}`)}
            </option>
          ))}
        </select>
        <p className="text-muted self-center text-xs">
          {t('history.rowsSummary', {
            shown: rows.length,
            total: transactions.length,
            amount: format(totalMinor),
          })}
        </p>
      </div>

      <div className="border-line bg-panel overflow-x-auto rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-11 tracking-wide uppercase">
            <tr>
              <th className="px-4 py-3">{t('history.reference')}</th>
              <th className="px-4 py-3">{t('history.type')}</th>
              <th className="px-4 py-3">{t('history.method')}</th>
              <th className="px-4 py-3">{t('history.status')}</th>
              <th className="px-4 py-3">{t('history.date')}</th>
              <th className="px-4 py-3 text-right">{t('history.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <tr key={transaction.id} className="border-line border-t">
                <td className="text-ink px-4 py-3 font-mono text-xs">{transaction.reference}</td>
                <td className="text-muted px-4 py-3 text-xs">{t(`history.kind.${transaction.kind}`)}</td>
                <td className="text-muted px-4 py-3 text-xs">
                  {transaction.methodLabel}
                  {transaction.note ? (
                    <span className="text-danger block text-10">{transaction.note}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs">{t(`status.${transaction.status}`)}</td>
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
          <p className="text-muted px-4 py-6 text-center text-xs">{t('history.empty')}</p>
        ) : null}
      </div>

      <section>
        <h2 className="text-ink text-sm font-semibold">{t('history.rolloverTitle')}</h2>
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
