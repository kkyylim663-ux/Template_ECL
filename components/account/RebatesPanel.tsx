'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { formatDate, formatDay, formatMinorPlain } from '@/lib/format';
import { sumClaimableMinor } from '@/lib/rebate-rules';
import { creditRebate, type ClaimedRebate } from '@/lib/rebate-claim';
import { walletService } from '@/lib/api/wallet';
import { rebatesInfoSchema, type RebatesInfo } from '@/lib/api/schemas';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

/**
 * The rebates page body. The reference's page (`/my/mypromotion`, "Rebates")
 * renders the accordion cards below — `.account-promotion__*` with a Claim
 * button per block and the green tips — and its payout rules come from its own
 * Daily Cash Rebate copy (crawl/pages/my_promotions.html: the 12:00am–11:59pm
 * GMT+8 day, credited after 3:00pm the next day, "a minimum payout of
 * RM/SGD 5"). Its claim request lives in a client chunk that was never
 * captured, so the period selector, the claimable line, the state chrome and
 * the records table are ours; the state text and Retry reuse the withdrawal
 * page's chrome (T56) and the records table wears the banking skin (T57).
 *
 * Claiming is two-sided by design, like deposits and withdrawals: the server
 * owns "this rebate is claimed" (so a refresh cannot claim twice), the browser
 * owns the mock wallet and mirrors the payout into history.
 */
export function RebatesPanel({ symbol }: { symbol: string }) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();

  const [state, setState] = useState<LoadState>('loading');
  const [info, setInfo] = useState<RebatesInfo | null>(null);
  const [period, setPeriod] = useState('');
  const [open, setOpen] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/rebates', { cache: 'no-store' });
      const payload = (await response.json()) as { status?: string; d?: unknown };
      if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);
      const data = rebatesInfoSchema.parse(payload.d);
      setInfo(data);
      setState(data.rows.length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Default to the newest period that can still pay out, else the newest one —
   * and pin it to state once resolved, so a claim inside the selected period
   * does not slide the selection to the next one.
   */
  const resolved = useMemo(() => {
    if (!info) return '';
    if (period && info.periods.includes(period)) return period;
    return (
      info.periods.find((entry) =>
        info.rows.some((row) => row.period === entry && row.status === 'claimable'),
      ) ??
      info.periods[0] ??
      ''
    );
  }, [info, period]);
  const selected = period || resolved;

  useEffect(() => {
    if (resolved && resolved !== period) setPeriod(resolved);
  }, [resolved, period]);

  const rows = useMemo(
    () => info?.rows.filter((row) => row.period === selected) ?? [],
    [info, selected],
  );
  const openId = rows.some((row) => row.id === open) ? open : (rows[0]?.id ?? '');
  const money = (minor: number) => `${symbol} ${formatMinorPlain(minor)}`;

  async function claim(row: RebatesInfo['rows'][number]) {
    setBusy(row.id);
    try {
      const response = await fetch('/api/rebates/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rebateId: row.id, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as { status?: string; d?: ClaimedRebate };
      if (payload?.status !== '0' || !payload.d) {
        throw new Error(payload?.status ?? String(response.status));
      }
      await creditRebate(payload.d, {
        labels: { promoType: t('rebates.promoType', { product: row.product, period: row.period }) },
        credit: (amountMinor, key) => walletService.deposit(amountMinor, key),
      });
      modal.success(
        t('rebates.what', { product: row.product }),
        t('rebates.claimSuccessBody', { amount: money(row.amountMinor) }),
      );
      await load();
    } catch {
      modal.error(t('rebates.claimErrorTitle'), t('rebates.claimErrorBody'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="rebates-panel" data-state={state} data-testid="rebates-state">
      {state === 'loading' ? (
        <p className="withdraw-state__text" aria-busy="true">
          {tc('state.loading')}
        </p>
      ) : null}

      {state === 'error' ? (
        <>
          <div className="no-info-box">{t('rebates.errorBody')}</div>
          <div className="withdraw-state__action">
            <PrimaryButton type="button" onClick={() => void load()}>
              {tc('action.retry')}
            </PrimaryButton>
          </div>
        </>
      ) : null}

      {state === 'empty' ? <div className="no-info-box">{t('rebates.emptyBody')}</div> : null}

      {info && state === 'ready' ? (
        <>
          <div className="rebates-period" role="group" aria-label={t('rebates.period')}>
            {info.periods.map((entry) => (
              <button
                key={entry}
                type="button"
                className={`rebates-period__chip${entry === selected ? ' active' : ''}`}
                aria-pressed={entry === selected}
                data-testid="rebate-period"
                data-period={entry}
                onClick={() => setPeriod(entry)}
              >
                {formatDay(entry)}
              </button>
            ))}
          </div>

          <p className="rebates-claimable" data-testid="rebates-claimable">
            {t('rebates.claimableTotal', { amount: money(sumClaimableMinor(rows)) })}
          </p>
          <p className="rebates-min-note">{t('rebates.minNote', { amount: money(info.minPayoutMinor) })}</p>

          <div className="account-promotion__wrapper">
            {rows.map((row) => {
              const isOpen = row.id === openId;
              const claimable = row.status === 'claimable';
              return (
                <div
                  key={row.id}
                  className="account-promotion__container-desktop"
                  data-testid="rebate-row"
                  data-status={row.status}
                  data-product={row.product}
                >
                  <div className="account-promotion__header">
                    <button
                      type="button"
                      className="pointer"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? row.id : row.id)}
                    >
                      <Icon
                        name="chevronDown"
                        size={11}
                        className={`account-promotion__triangle${isOpen ? ' open' : ''}`}
                      />
                      <span>{row.product}</span>
                    </button>
                    <div className="account-promotion__btn-wrapper">
                      <button
                        type="button"
                        className={`btn btn-primary${claimable ? '' : ' disable'}`}
                        disabled={!claimable || busy === row.id}
                        data-testid="rebate-claim"
                        onClick={() => void claim(row)}
                      >
                        {claimable ? t('rebates.claim') : t(`rebates.${row.status}`)}
                      </button>
                    </div>
                  </div>
                  <div className={`account-promotion__body${isOpen ? ' open' : ''}`}>
                    {[
                      t('rebates.turnoverLine', { amount: money(row.turnoverMinor) }),
                      t('rebates.rateLine', { rate: row.ratePct }),
                      t('rebates.claimFrom', { date: formatDate(row.claimableAt) }),
                    ].map((line) => (
                      <span key={line}>
                        <p className="account-promotion__paragraph disable">
                          <span className="account-promotion__tick-wrapper">
                            <Icon name="check" size={16} className="account-promotion__tick-icon" />
                          </span>
                          {line}
                        </p>
                      </span>
                    ))}
                    <p className="account-promotion__tips">
                      {t('rebates.tip', { amount: money(row.amountMinor) })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="rebates-records">
            <h2 className="rebates-records__title">{t('rebates.recordsTitle')}</h2>
            {info.claims.length === 0 ? (
              <p className="rebates-records__empty">{t('rebates.recordsEmpty')}</p>
            ) : (
              <table className="bank-table">
                <thead>
                  <tr>
                    <th scope="col">{t('rebates.period')}</th>
                    <th scope="col">{t('rebates.product')}</th>
                    <th scope="col">{t('rebates.amount')}</th>
                    <th scope="col">{t('rebates.claimedAt')}</th>
                    <th scope="col">{t('rebates.reference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {info.claims.map((entry) => (
                    <tr key={entry.id} data-testid="rebate-record" data-rebate={entry.rebateId}>
                      <td>{formatDay(entry.period)}</td>
                      <td>{entry.product}</td>
                      <td>{money(entry.amountMinor)}</td>
                      <td>{formatDate(entry.claimedAt)}</td>
                      <td>{entry.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
