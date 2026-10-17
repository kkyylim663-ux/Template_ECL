'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { readCancelledTransactions } from '@/lib/api/pending';
import { readDepositRecords } from '@/lib/deposit-credit';
import { readRebateRecords } from '@/lib/rebate-claim';
import { readWithdrawalRecords } from '@/lib/withdrawal-settle';
import { RECORDS_EVENT } from '@/lib/mock-records';
import type { HistoryRow } from '@/lib/api/schemas';

type Kind = HistoryRow['kind'];
const KINDS: Kind[] = ['deposit', 'withdrawal', 'transfer', 'promo', 'bet'];

/** The reference's four quick ranges ("Today / In 3 Days / In a Week / In a Month"). */
const RANGES = ['today', 'in3days', 'inAWeek', 'inAMonth'] as const;
type Range = (typeof RANGES)[number];
const RANGE_DAYS: Record<Range, number> = { today: 1, in3days: 3, inAWeek: 7, inAMonth: 30 };

/** DataTables' own page lengths; the reference initialises with 10. */
const PAGE_SIZES = [10, 25, 50, 100] as const;

const EVENTS = ['numberGame', 'nba2024', 'uefaMini', 'uefaMain'] as const;
type Event = (typeof EVENTS)[number];

type Column = {
  key: string;
  label: string;
  value: (row: HistoryRow) => string | number;
  render: (row: HistoryRow) => ReactNode;
  numeric?: boolean;
};

const timeOf = (at: string) => at.slice(11, 16);
/** "2026-10-16T21:33:00+08:00" -> "16/10/2026" (the reference's moment format). */
const dateShort = (at: string) => `${at.slice(8, 10)}/${at.slice(5, 7)}/${at.slice(0, 4)}`;

function RolloverRow({ label, amount, currency }: { label: string; amount: string; currency: string }) {
  return (
    <tr>
      <td className="turnover-table-td-1">{label}</td>
      <td className="turnover-table-td-2">
        <span className="currency">{currency}</span>
        <span>{amount}</span>
      </td>
    </tr>
  );
}

/**
 * The history page body. The reference's own layout: type select, read-only
 * date-range field with the calendar chip, four quick pills, then a DataTables
 * table (`iDisplayLength: 10`, simple_numbers paging, search) whose column set
 * changes with the type — see the page's depositHistory / walletHistory /
 * promoHistory / betHistory templates. Its own rows come from the server (the
 * snapshot's bodies are empty), so our data is the mock `history` array and the
 * date windows are anchored on its newest row.
 */
export function HistoryPanel({
  history,
  currency,
  rollover,
}: {
  history: HistoryRow[];
  currency: string;
  rollover: { id: string; title: string; requirementMinor: number; progressMinor: number }[];
}) {
  const t = useTranslations('account');
  const [kind, setKind] = useState<Kind>('deposit');
  const [range, setRange] = useState<Range>('inAMonth');
  const [event, setEvent] = useState<Event>('numberGame');
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'at', dir: 'desc' });

  /** Pending requests cancelled on /account/pending arrive here as history rows. */
  const [cancelledRows, setCancelledRows] = useState<HistoryRow[]>([]);
  useEffect(() => {
    const load = () =>
      setCancelledRows([
        ...readDepositRecords().map((record) => record.row),
        ...readWithdrawalRecords().map((record) => record.row),
        ...readRebateRecords().map((record) => record.row),
        ...readCancelledTransactions().map((entry): HistoryRow =>
          entry.kind === 'transfer'
            ? {
                id: entry.id,
                kind: 'transfer',
                at: entry.at,
                amountMinor: entry.amountMinor,
                from: entry.from ?? entry.method,
                to: entry.to ?? '–',
                status: 'cancelled',
              }
            : {
                id: entry.id,
                kind: entry.kind,
                at: entry.at,
                amountMinor: entry.amountMinor,
                method: entry.method,
                status: 'cancelled',
                reason: t('pending.cancelReason'),
              },
        ),
      ]);
    load();
    // A result that lands while this page is open (the settler runs in the shell)
    // must show without a refresh.
    window.addEventListener(RECORDS_EVENT, load);
    return () => window.removeEventListener(RECORDS_EVENT, load);
  }, [t]);

  const all = useMemo(() => [...history, ...cancelledRows], [history, cancelledRows]);

  const money = (minor: number) => (minor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 });

  /**
   * The demo "now": the newest row on show. The fixture's dates are fixed, so
   * with no fresh result this is the fixture's own newest row; a deposit or a
   * withdrawal settled just now becomes the anchor — which is what puts it
   * inside the default window. Compared as instants: `at` mixes `+08:00` and `Z`.
   */
  const anchor = useMemo(() => {
    let newest = '';
    let newestAt = -Infinity;
    for (const row of all) {
      const at = Date.parse(row.at);
      if (Number.isFinite(at) && at > newestAt) {
        newestAt = at;
        newest = row.at;
      }
    }
    return newest;
  }, [all]);

  const columns = useMemo<Column[]>(() => {
    const dateColumn: Column = {
      key: 'at',
      label: kind === 'deposit' || kind === 'withdrawal' ? t('history.col.deposit') : t('history.col.date'),
      value: (row) => row.at,
      render: (row) => dateShort(row.at),
    };
    const statusColumn: Column = {
      key: 'status',
      label: t('history.col.status'),
      value: (row) => ('status' in row ? row.status : ''),
      render: (row) => ('status' in row ? t(`status.${row.status}`) : ''),
    };
    if (kind === 'deposit' || kind === 'withdrawal') {
      return [
        dateColumn,
        {
          key: 'amount',
          label: t('history.col.amount'),
          value: (row) => ('amountMinor' in row ? row.amountMinor : 0),
          render: (row) => ('amountMinor' in row ? `${currency} ${money(row.amountMinor)}` : ''),
        },
        {
          key: 'method',
          label: t('history.col.type'),
          value: (row) => ('method' in row ? row.method : ''),
          render: (row) => ('method' in row ? row.method : ''),
        },
        statusColumn,
        {
          key: 'reason',
          label: t('history.col.reason'),
          value: (row) => ('reason' in row ? row.reason : ''),
          render: (row) => ('reason' in row ? row.reason : ''),
        },
      ];
    }
    if (kind === 'transfer') {
      return [
        dateColumn,
        {
          key: 'from',
          label: t('history.col.from'),
          value: (row) => ('from' in row ? row.from : ''),
          render: (row) => ('from' in row ? row.from : ''),
        },
        {
          key: 'to',
          label: t('history.col.to'),
          value: (row) => ('to' in row ? row.to : ''),
          render: (row) => ('to' in row ? row.to : ''),
        },
        {
          key: 'amount',
          label: t('history.col.amount'),
          value: (row) => ('amountMinor' in row ? row.amountMinor : 0),
          render: (row) => ('amountMinor' in row ? `${currency} ${money(row.amountMinor)}` : ''),
        },
        statusColumn,
      ];
    }
    if (kind === 'promo') {
      return [
        dateColumn,
        {
          key: 'clock',
          label: t('history.col.clock'),
          value: (row) => timeOf(row.at),
          render: (row) => timeOf(row.at),
        },
        {
          key: 'amount',
          label: t('history.col.amount'),
          value: (row) => ('amountMinor' in row ? row.amountMinor : 0),
          render: (row) => ('amountMinor' in row ? `${currency} ${money(row.amountMinor)}` : ''),
        },
        {
          key: 'promoType',
          label: t('history.col.type'),
          value: (row) => ('promoType' in row ? row.promoType : ''),
          render: (row) => ('promoType' in row ? row.promoType : ''),
        },
        statusColumn,
        {
          key: 'reason',
          label: t('history.col.reason'),
          value: (row) => ('reason' in row ? row.reason : ''),
          render: (row) => ('reason' in row ? row.reason : ''),
        },
      ];
    }
    return [
      dateColumn,
      {
        key: 'transactions',
        label: t('history.col.transactionCount'),
        value: (row) => ('transactions' in row ? row.transactions : 0),
        render: (row) => ('transactions' in row ? row.transactions : ''),
        numeric: true,
      },
      {
        key: 'turnover',
        label: t('history.col.turnover'),
        value: (row) => ('turnoverMinor' in row ? row.turnoverMinor : 0),
        render: (row) => ('turnoverMinor' in row ? `${currency} ${money(row.turnoverMinor)}` : ''),
      },
      {
        key: 'winLose',
        label: t('history.col.winLose'),
        value: (row) => ('winLoseMinor' in row ? row.winLoseMinor : 0),
        render: (row) => ('winLoseMinor' in row ? `${currency} ${money(row.winLoseMinor)}` : ''),
      },
      {
        key: 'realBet',
        label: t('history.col.realBet'),
        value: (row) => ('realBetMinor' in row ? row.realBetMinor : 0),
        render: (row) => ('realBetMinor' in row ? `${currency} ${money(row.realBetMinor)}` : ''),
      },
    ];
  }, [kind, currency, t]);

  const filtered = useMemo(() => {
    const windowStart = anchor ? anchor.slice(0, 10) : '';
    const from = windowStart
      ? new Date(`${windowStart}T00:00:00Z`).getTime() - (RANGE_DAYS[range] - 1) * 86_400_000
      : 0;
    const to = windowStart ? new Date(`${windowStart}T23:59:59Z`).getTime() : 0;
    const needle = query.trim().toLowerCase();
    return all.filter((row) => {
      if (row.kind !== kind) return false;
      if (row.kind === 'bet' && row.event !== event) return false;
      const at = new Date(row.at).getTime();
      if (at < from || at > to) return false;
      if (!needle) return true;
      return columns.some((column) => String(column.value(row)).toLowerCase().includes(needle));
    });
  }, [all, kind, event, range, query, anchor, columns]);

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sort.key) ?? columns[0];
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = column.value(a);
      const bv = column.value(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });
  }, [filtered, columns, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = sorted.slice((current - 1) * pageSize, current * pageSize);
  const start = sorted.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, sorted.length);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  /** simple_numbers: first, last and a window around the current page. */
  const pageNumbers = useMemo(() => {
    const numbers: (number | '…')[] = [];
    for (let index = 1; index <= totalPages; index += 1) {
      if (index === 1 || index === totalPages || Math.abs(index - current) <= 2) numbers.push(index);
      else if (numbers[numbers.length - 1] !== '…') numbers.push('…');
    }
    return numbers;
  }, [totalPages, current]);

  const newestDeposit = [...history]
    .filter((row) => row.kind === 'deposit')
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const latestDeposit =
    newestDeposit && 'amountMinor' in newestDeposit ? newestDeposit.amountMinor : 0;
  const promotionTurnover = rollover.reduce((sum, item) => sum + item.requirementMinor, 0);
  const totalTurnover = promotionTurnover + latestDeposit;
  const currentTurnover = rollover.reduce((sum, item) => sum + item.progressMinor, 0);

  return (
    <>
      <h1 className="form-title mb-20 large has-space">
        <Icon name="history" size={28} className="page-icon" />
        {t('history.title')}
      </h1>

      <form id="historyForm" className="has-space" onSubmit={(submitEvent) => submitEvent.preventDefault()}>
        <div className="width-medium">
          <div className="form-group">
            <label htmlFor="tsType" className="desktop">
              {t('history.searching')}
            </label>
            <div className="relative">
              <select
                id="tsType"
                className="form-control form-control-select"
                value={kind}
                onChange={(changeEvent) => resetPage(setKind)(changeEvent.target.value as Kind)}
              >
                {KINDS.map((option) => (
                  <option key={option} value={option}>
                    {t(`history.option.${option}`)}
                  </option>
                ))}
              </select>
              <span className="form-control-dropdown icon-dropdown" aria-hidden="true">
                <span className="icon-triangle" />
              </span>
            </div>
          </div>

          {kind === 'bet' ? (
            <div className="form-group" id="ticket-history">
              <label htmlFor="gamecode" className="gamecode">
                {t('history.eventLabel')}
              </label>
              <div className="relative">
                <select
                  id="gamecode"
                  className="form-control form-control-select"
                  value={event}
                  onChange={(changeEvent) => resetPage(setEvent)(changeEvent.target.value as Event)}
                >
                  {EVENTS.map((option) => (
                    <option key={option} value={option}>
                      {t(`history.event.${option}`)}
                    </option>
                  ))}
                </select>
                <span className="form-control-dropdown icon-dropdown" aria-hidden="true">
                  <span className="icon-triangle" />
                </span>
              </div>
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="transactionDate" className="desktop">
              {t('history.dateRange')}
            </label>
            <div className="relative" id="dateTimePickerWrapper">
              <input
                id="transactionDate"
                className="form-control form-control-select"
                readOnly
                value={
                  anchor
                    ? `${dateShort(anchor)} - ${dateShort(
                        new Date(
                          new Date(`${anchor.slice(0, 10)}T00:00:00Z`).getTime() -
                            (RANGE_DAYS[range] - 1) * 86_400_000,
                        )
                          .toISOString()
                          .slice(0, 10),
                      )}`
                    : ''
                }
              />
              <span className="form-control__icon-wrapper pe-none" aria-hidden="true">
                <Icon name="calendar" size={16} />
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
              onClick={() => resetPage(setRange)(option)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                  keyEvent.preventDefault();
                  resetPage(setRange)(option);
                }
              }}
            >
              <span>{t(`history.range.${option}`)}</span>
            </p>
          ))}
        </div>
      </form>

      <div className="tableWrapper history-table__wrapper">
        <div className="history-table">
          <div className="history-toolbar">
            <label className="history-length">
              <select
                aria-label={t('history.lengthLabel')}
                value={pageSize}
                onChange={(changeEvent) => resetPage(setPageSize)(Number(changeEvent.target.value))}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              {t('history.entries')}
            </label>
            <label className="history-search">
              {t('history.search')}
              <input
                type="search"
                value={query}
                onChange={(changeEvent) => resetPage(setQuery)(changeEvent.target.value)}
              />
            </label>
          </div>

          {/* The reference's templates say `table-theme table-theme-light w-100`
              for deposits and `no-border w-100` for the rest; its bare
              `table {}` rule gives every table the same skin, so ours carries
              `table-theme` on all of them (the local skin is class-scoped). */}
          <table
            className={
              kind === 'deposit' || kind === 'withdrawal'
                ? 'table-theme table-theme-light w-100'
                : 'table-theme no-border w-100'
            }
          >
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>
                    <button
                      type="button"
                      className="history-sort"
                      aria-label={t('history.sortBy', { column: column.label })}
                      onClick={() =>
                        setSort((previous) =>
                          previous.key === column.key
                            ? { key: column.key, dir: previous.dir === 'asc' ? 'desc' : 'asc' }
                            : { key: column.key, dir: 'asc' },
                        )
                      }
                    >
                      {column.label}
                      {sort.key === column.key ? (
                        <span aria-hidden>{sort.dir === 'asc' ? '▲' : '▼'}</span>
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length > 0 ? (
                pageRows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row)}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="history-empty" colSpan={columns.length}>
                    {t('history.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="history-footer">
            <div className="history-info">
              {t('history.info', { start, end, total: sorted.length })}
            </div>
            <nav className="history-pagination" aria-label={t('history.pagination')}>
              <button
                type="button"
                className="history-page"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                {t('history.previous')}
              </button>
              {pageNumbers.map((number, index) =>
                number === '…' ? (
                  <span key={`gap-${index}`} className="history-page is-gap">
                    …
                  </span>
                ) : (
                  <button
                    key={number}
                    type="button"
                    className={`history-page${number === current ? ' is-current' : ''}`}
                    aria-current={number === current ? 'page' : undefined}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ),
              )}
              <button
                type="button"
                className="history-page"
                disabled={current === totalPages}
                onClick={() => setPage(current + 1)}
              >
                {t('history.next')}
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="has-space">
        <div className="turnover-wrapper">
          <h1 className="turnover-title">{t('history.rolloverTitle')}</h1>
          <table className="table-theme table-theme-light turnover-table">
            <thead>
              <tr className="turnover-header-footer">
                <th className="turnover-table-td-1">{t('history.turnoverRequirement')}</th>
                <th className="turnover-table-td-2">
                  <span className="currency">{currency}</span>
                  <span>{money(totalTurnover)}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <RolloverRow label={t('history.turnoverPromotion')} amount={money(promotionTurnover)} currency={currency} />
              <RolloverRow label={t('history.turnoverLatestDeposit')} amount={money(latestDeposit)} currency={currency} />
              <RolloverRow label={t('history.totalTurnover')} amount={money(totalTurnover)} currency={currency} />
              <tr className="turnover-header-footer">
                <td className="turnover-table-td-1">{t('history.currentTurnover')}</td>
                <td className="turnover-table-td-2">
                  <span className="currency">{currency}</span>
                  <span>{money(currentTurnover)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
