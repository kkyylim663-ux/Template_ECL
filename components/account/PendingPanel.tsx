'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useModal } from '@/components/ui/ModalProvider';
import {
  CANCEL_WINDOW_MS,
  cancelWindowOpen,
  countdownText,
  readCancelledTransactions,
  recordCancelledTransaction,
  visiblePendingRows,
} from '@/lib/api/pending';

export interface PendingRow {
  id: string;
  reference: string;
  kind: 'deposit' | 'withdrawal' | 'transfer';
  status: 'pending' | 'processing';
  amountMinor: number;
  method: string;
  createdAt: string;
}

/** "Main to Joker" -> the two wallets the transfer row shows in history. */
function splitTransfer(label: string): { from: string; to: string } {
  const match = /^(.+?) to (.+)$/.exec(label);
  return match ? { from: match[1], to: match[2] } : { from: label, to: '–' };
}

/**
 * The pending table: the requests still waiting with the reference's
 * "CANCEL TRANSACTION" action. Confirming the reference's question cancels the
 * request — the row leaves the list and lands in the member's history — and a
 * request older than the cancel window can no longer be cancelled (its own
 * error modal). The mock's clock is the newest request's timestamp advanced by
 * real elapsed time, so the countdown ticks without pinning the fixture to the
 * wall clock.
 */
export function PendingPanel({ rows, currency }: { rows: PendingRow[]; currency: string }) {
  const t = useTranslations('account');
  const modal = useModal();
  const [cancelled, setCancelled] = useState<string[]>([]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setCancelled(readCancelledTransactions().map((entry) => entry.id));
  }, []);

  const anchor = useMemo(
    () => rows.reduce((latest, row) => (row.createdAt > latest ? row.createdAt : latest), rows[0]?.createdAt ?? ''),
    [rows],
  );

  useEffect(() => {
    if (!anchor) return;
    const base = new Date(anchor).getTime();
    const startedAt = Date.now();
    const tick = () => setNow(base + (Date.now() - startedAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [anchor]);

  const visible = visiblePendingRows(rows, cancelled);

  const money = (minor: number) => `${currency} ${(minor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  function handleCancel(row: PendingRow) {
    if (now !== null && !cancelWindowOpen(row.createdAt, now)) {
      modal.error(t('history.status'), t('pending.expiredError'));
      return;
    }
    modal.confirm(
      t('history.status'),
      t('pending.cancelQuestion'),
      () => {
        recordCancelledTransaction({
          id: row.id,
          kind: row.kind,
          reference: row.reference,
          at: row.createdAt,
          amountMinor: row.amountMinor,
          method: row.method,
          ...(row.kind === 'transfer' ? splitTransfer(row.method) : {}),
        });
        setCancelled((previous) => [...previous, row.id]);
        modal.success(
          t('pending.cancelSuccessTitle'),
          row.kind === 'deposit'
            ? t('pending.cancelDepositSuccess')
            : row.kind === 'withdrawal'
              ? t('pending.cancelWithdrawalSuccess')
              : t('pending.cancelTransferSuccess'),
        );
      },
      t('transfer.allConfirmYes'),
      t('transfer.allConfirmNo'),
    );
  }

  return (
    <div className="pending-table__wrapper selected">
      <table className="table-theme table-theme-light pending-table">
        <thead>
          <tr>
            <th>{t('history.col.time')}</th>
            <th>{t('history.col.reference')}</th>
            <th>{t('history.col.type')}</th>
            <th>{t('history.col.amount')}</th>
            <th>{t('history.col.status')}</th>
            <th>{t('pending.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {visible.length > 0 ? (
            visible.map((row) => {
              const deadline = new Date(row.createdAt).getTime() + CANCEL_WINDOW_MS;
              const remaining = deadline - (now ?? deadline);
              const open = now !== null && cancelWindowOpen(row.createdAt, now);
              return (
                <tr key={row.id} data-pending={row.id}>
                  <td>{row.createdAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{row.reference}</td>
                  <td>{row.method}</td>
                  <td>{money(row.amountMinor)}</td>
                  <td>
                    <span className={`pending-status pending-status--${row.status}`}>
                      {t(`status.${row.status}`)}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="pending-cancel" onClick={() => handleCancel(row)}>
                      {t('pending.cancelAction')}
                    </button>
                    <span className="pending-countdown" data-open={open ? 'true' : 'false'}>
                      {open
                        ? t('pending.countdown', { time: countdownText(remaining) })
                        : t('pending.expired')}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6}>{t('pending.empty')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
