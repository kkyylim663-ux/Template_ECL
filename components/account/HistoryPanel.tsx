'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import type { AccountTransaction } from '@/lib/api/schemas';

type Kind = 'deposit' | 'withdrawal' | 'transfer' | 'promo' | 'bet';

/** The reference's own option set; `promo`/`bet` fold onto our rebate/bonus rows. */
const KINDS: Kind[] = ['deposit', 'withdrawal', 'transfer', 'promo', 'bet'];
const KIND_ROW: Record<Kind, AccountTransaction['kind']> = {
  deposit: 'deposit',
  withdrawal: 'withdrawal',
  transfer: 'transfer',
  promo: 'rebate',
  bet: 'bonus',
};

const RANGES = ['today', 'in3days', 'inAWeek', 'inAMonth'] as const;

/**
 * The history page body: the reference's search form (type select + read-only
 * date field + four quick ranges) above the transaction table and the
 * "Promotion Rollover Status" turnover table. The table body is mock data —
 * the original renders its rows with JS, so its own snapshot table is empty —
 * but the columns are the snapshot's `depositTable` template verbatim
 * (Deposit / Amount / Type / Status / Reason).
 */
export function HistoryPanel({
  rows,
  currency,
  rollover,
}: {
  rows: { id: string; kind: AccountTransaction['kind']; date: string; amount: string; type: string; status: string; reason: string }[];
  currency: string;
  rollover: { id: string; title: string; requirement: string; progress: string }[];
}) {
  const t = useTranslations('account');
  const [kind, setKind] = useState<Kind>('deposit');
  const [range, setRange] = useState<(typeof RANGES)[number]>('today');

  const visible = rows.filter((row) => row.kind === KIND_ROW[kind]);
  const totalRequirement = rollover.reduce((sum, item) => sum + Number(item.requirement.replace(/[^\d.]/g, '')), 0);

  return (
    <>
      <h1 className="form-title mb-5 large">
        <Icon name="history" size={28} className="page-icon" />
        {t('history.title')}
      </h1>

      <form className="has-space" onSubmit={(event) => event.preventDefault()}>
        <div className="width-medium">
          <div className="form-group">
            <label htmlFor="historyType">{t('history.searching')}</label>
            <div className="relative">
              <select
                id="historyType"
                className="form-control form-control-select"
                value={kind}
                onChange={(event) => setKind(event.target.value as Kind)}
              >
                {KINDS.map((option) => (
                  <option key={option} value={option}>
                    {t(`history.option.${option}`)}
                  </option>
                ))}
              </select>
              <span className="form-control-dropdown icon-dropdown">
                <Icon name="chevronDown" size={16} className="text-muted" />
              </span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="historyDate">{t('history.dateRange')}</label>
            <div className="relative">
              <input
                id="historyDate"
                className="form-control form-control-select"
                readOnly
                value={range ? t(`history.range.${range}`) : ''}
                placeholder={t('history.dateRange')}
              />
              <span className="form-control__icon-wrapper pe-none">
                <Icon name="history" size={16} />
              </span>
            </div>
          </div>
        </div>

        <div className="selectDateRangeWrapper nav-pill__wrapper">
          {RANGES.map((option) => (
            <p
              key={option}
              role="button"
              tabIndex={0}
              aria-pressed={range === option}
              className={`dateRangeBtn nav-pill${range === option ? ' active' : ''}`}
              onClick={() => setRange(option)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setRange(option);
                }
              }}
            >
              <span aria-hidden>{t(`history.range.${option}`)}</span>
            </p>
          ))}
        </div>
      </form>

      <div className="tableWrapper history-table__wrapper">
        <div className="history-table">
          <table className="table-theme">
            <thead>
              <tr>
                <th>{t('history.col.deposit')}</th>
                <th>{t('history.col.amount')}</th>
                <th>{t('history.col.type')}</th>
                <th>{t('history.col.status')}</th>
                <th>{t('history.col.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length > 0 ? (
                visible.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      {currency} {row.amount}
                    </td>
                    <td>{row.type}</td>
                    <td>{row.status}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>{t('history.noRows')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="has-space">
        <div className="turnover-wrapper active">
          <h1 className="turnover-title">{t('history.rolloverTitle')}</h1>
          <table className="table-theme table-theme-light turnover-table">
            <thead>
              <tr className="turnover-header-footer">
                <th className="turnover-table-td-1">{t('history.turnoverRequirement')}</th>
                <th className="turnover-table-td-2">
                  <span className="currency">{currency}</span>
                  <span>{totalRequirement.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rollover.map((item) => (
                <tr key={item.id}>
                  <td className="turnover-table-td-1">{item.title}</td>
                  <td className="turnover-table-td-2">
                    <span className="currency">{currency}</span>
                    <span>
                      {item.progress} / {item.requirement}
                    </span>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="turnover-table-td-1">{t('history.totalTurnover')}</td>
                <td className="turnover-table-td-2">
                  <span className="currency">{currency}</span>
                  <span>{totalRequirement.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
                </td>
              </tr>
              <tr>
                <td className="turnover-table-td-1">{t('history.currentTurnover')}</td>
                <td className="turnover-table-td-2">
                  <span className="currency">{currency}</span>
                  <span>
                    {rollover
                      .reduce((sum, item) => sum + Number(item.progress.replace(/[^\d.]/g, '')), 0)
                      .toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
