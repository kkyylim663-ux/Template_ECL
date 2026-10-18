'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { formatDate } from '@/lib/format';
import { TICKET_EVENTS, type TicketEventId } from '@/config/tickets';
import { regionPath } from '@/config/nav';
import {
  TICKET_TABS,
  availableTickets,
  countdownUnit,
  resolveTicketStatus,
  ticketCountdown,
  ticketsInTab,
  type TicketRow,
  type TicketTab,
} from '@/lib/ticket-rules';
import { ticketsInfoSchema, type TicketsInfo } from '@/lib/api/schemas';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';
type TicketEvent = { id: string; name: string; date: string; tickets: string; status: string };

/** The history table's tabs — the reference's own set (`All / Received / Used`). */
const HISTORY_TABS = ['all', 'received', 'used'] as const;

/** The redemption-code field: required, and codes are letters/digits/dashes. */
const codeSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .regex(/^[A-Za-z0-9-]{3,32}$/, 'format');
type CodeIssue = 'required' | 'format';

function codeIssue(raw: string): CodeIssue | null {
  const parsed = codeSchema.safeParse(raw);
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message === 'required' ? 'required' : 'format';
}

/**
 * The ticket centre body: the reference's own card, three-button row and Ticket
 * History section, plus this build's data side (T65) — the per-ticket list with
 * its available / used / expired tabs, the redemption dialog, the ticket detail
 * dialog, the ticking validity countdown and the event picker behind "Use
 * Tickets Now" (the reference's `#ticketModal`: pick an event, Go Now, and the
 * page navigates to it).
 *
 * The reference renders this page from a client chunk that was never captured,
 * so the list, the tabs and the countdown are registered in MOCK_INVENTORY.md.
 * Two-sided by design, like rebates and achievements: the server owns which
 * tickets exist and which are spent, the browser owns the countdown clock.
 */
export function TicketCenter({
  symbol,
  cap,
  perDeposit,
  progressMinor,
  perTicketMinor,
  region,
  depositHref,
  events,
  initial,
}: {
  symbol: string;
  cap: number;
  perDeposit: string;
  progressMinor: number;
  perTicketMinor: number;
  region: string;
  depositHref: string;
  events: TicketEvent[];
  initial: TicketsInfo;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();
  const router = useRouter();

  const [state, setState] = useState<LoadState>(initial.tickets.length === 0 ? 'empty' : 'ready');
  const [info, setInfo] = useState<TicketsInfo>(initial);
  const [tab, setTab] = useState<TicketTab>('available');
  const [historyTab, setHistoryTab] = useState<(typeof HISTORY_TABS)[number]>('all');
  const [dialog, setDialog] = useState<'' | 'redeem' | 'pick'>('');
  const [detailId, setDetailId] = useState('');
  const [code, setCode] = useState('');
  const [issue, setIssue] = useState<CodeIssue | null>(null);
  const [picked, setPicked] = useState<TicketEventId | ''>('');
  const [busy, setBusy] = useState(false);

  /** Null until mount: the server and the first client render agree, then the clock runs. */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/tickets', { cache: 'no-store' });
      const payload = (await response.json()) as { status?: string; d?: unknown };
      if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);
      const data = ticketsInfoSchema.parse(payload.d);
      setInfo(data);
      setState(data.tickets.length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    // The server rendered the rows (so the first paint carries them); this
    // re-reads them on mount and after a redemption or a spend.
    void load();
  }, [load]);

  const rows = useMemo<TicketRow[]>(() => {
    if (now === null) return info.tickets;
    return info.tickets.map((row) => ({
      ...row,
      status: resolveTicketStatus({
        expiresAt: row.expiresAt,
        spent: row.status === 'used',
        now: new Date(now),
      }),
    }));
  }, [info.tickets, now]);

  const visible = ticketsInTab(rows, tab);
  const held = availableTickets(rows).length;
  const detail = rows.find((row) => row.id === detailId) ?? null;
  const detailEvent = detail?.usedEvent
    ? (TICKET_EVENTS.find((event) => event.id === detail.usedEvent) ?? null)
    : null;

  const progressPct = Math.min(100, Math.round((progressMinor / perTicketMinor) * 100));
  const remainingMinor = Math.max(0, perTicketMinor - progressMinor);
  const remaining = (remainingMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 });
  const historyRows =
    historyTab === 'all'
      ? events
      : events.filter((event) =>
          historyTab === 'received' ? event.status !== 'closed' : event.status === 'closed',
        );

  const money = (text: string) => `${symbol} ${text}`;
  const countdown = (row: { expiresAt: string; status: string }) => {
    if (now === null || row.status !== 'available') return '';
    const parts = ticketCountdown(row.expiresAt, new Date(now));
    const unit = countdownUnit(parts);
    if (unit === 'days')
      return t('tickets.countdownDays', { d: parts.days, h: parts.hours, m: parts.minutes });
    if (unit === 'hours') return t('tickets.countdownHours', { h: parts.hours, m: parts.minutes });
    return t('tickets.countdownMinutes', { m: parts.minutes, s: parts.seconds });
  };
  const fullCountdown = (row: { expiresAt: string; status: string }) => {
    if (now === null || row.status !== 'available') return '—';
    const parts = ticketCountdown(row.expiresAt, new Date(now));
    return t('tickets.countdownFull', {
      d: parts.days,
      h: parts.hours,
      m: parts.minutes,
      s: parts.seconds,
    });
  };

  async function redeem() {
    const found = codeIssue(code);
    setIssue(found);
    if (found) return;
    setBusy(true);
    try {
      const response = await fetch('/api/tickets/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as {
        status?: string;
        d?: { code?: string; tickets?: number };
      };
      if (payload?.status !== '0') {
        const status = payload?.status ?? String(response.status);
        if (status === '410')
          modal.error(t('tickets.redeemExpiredTitle'), t('tickets.redeemExpiredBody'));
        else if (status === '409')
          modal.error(t('tickets.redeemUsedTitle'), t('tickets.redeemUsedBody'));
        else modal.error(t('tickets.redeemInvalidTitle'), t('tickets.redeemInvalidBody'));
        return;
      }
      modal.success(
        t('tickets.redeemSuccessTitle', { code: payload.d?.code ?? code.trim().toUpperCase() }),
        t('tickets.redeemSuccessBody', { count: payload.d?.tickets ?? 1 }),
      );
      setDialog('');
      setCode('');
      await load();
    } catch {
      modal.error(t('tickets.redeemErrorTitle'), t('tickets.redeemErrorBody'));
    } finally {
      setBusy(false);
    }
  }

  async function enterEvent() {
    const event = picked ? TICKET_EVENTS.find((entry) => entry.id === picked) : null;
    if (!event) {
      // The reference closes the dialog when nothing is selected.
      setDialog('');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/tickets/use', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as { status?: string };
      if (payload?.status !== '0') {
        if (payload?.status === '409')
          modal.error(t('tickets.useNoneTitle'), t('tickets.useNoneBody'));
        else modal.error(t('tickets.useErrorTitle'), t('tickets.useErrorBody'));
        return;
      }
      setDialog('');
      router.push(regionPath(region, event.path));
    } catch {
      modal.error(t('tickets.useErrorTitle'), t('tickets.useErrorBody'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page ticket-center">
        <div className="content-container">
          <div className="card-wrapper">
            <div className="card-icon" aria-hidden>
              <img
                src="/tickets/ticket-main.webp"
                alt=""
                className="size-[56px] max-desktop:size-[100px]"
              />
            </div>
            <div className="ticket-card">
              <div className="card-header">
                <div className="ticket-count" data-testid="tickets-held">
                  <span className="count-current">{held}</span>
                  <span className="count-muted"> / {cap}</span>
                </div>
                <p className="subtitle">{t('tickets.available')}</p>
                <p className="deposit-info">
                  {t.rich('tickets.perDeposit', {
                    amount: money(perDeposit),
                    tickets: '1',
                    hl: (chunks) => <span className="highlight italic">{chunks}</span>,
                  })}
                </p>
              </div>
              <hr className="divider" />
              <div className="card-body">
                <div className="progress-row">
                  <span className="progress-label">{t('tickets.progressToNext')}</span>
                  <span className="progress-value">
                    <span className="progress-current">
                      {money(progressMinor / 100 === 0 ? '0' : String(progressMinor / 100))}
                    </span>
                    <span className="progress-total">/{perTicketMinor / 100}</span>
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
                  <span className="progress-percent">{progressPct}%</span>
                </div>
                <p className="unlock-text">
                  {t.rich('tickets.unlockDeposit', {
                    amount: money(remaining),
                    ticket: t('tickets.freeTicket'),
                    hl: (chunks) => <span className="unlock-highlight">{chunks}</span>,
                  })}
                </p>
                <p className="notice">{t('tickets.notice', { cap })}</p>
              </div>
            </div>
          </div>

          <div className="btn-group">
            <Link href={depositHref} className="btn-yellow">
              <span className="btn-icon" aria-hidden>
                <Icon name="wallet" size={45} className="text-[#000]" />
              </span>
              <span className="btn-text">
                <span className="btn-text-top">{t('tickets.depositBtnTop')}</span>
                <span className="btn-text-bottom">{t('tickets.depositBtnBottom')}</span>
              </span>
              <span className="btn-arrow" aria-hidden>
                <img src="/tickets/ticket-arrow.webp" alt="" width={29} height={29} />
              </span>
            </Link>
            <button
              type="button"
              className="btn-dark-gray"
              onClick={() => modal.success(t('tickets.rulesTitle'), t('tickets.rulesBody'))}
            >
              {t('tickets.rules')}
            </button>
            <button type="button" className="btn-green" onClick={() => setDialog('pick')}>
              <span className="btn-text">
                <span className="btn-green-top">{t('tickets.useTop')}</span>
                <span className="btn-green-bottom">{t('tickets.useBottom')}</span>
              </span>
              <span className="btn-arrow" aria-hidden>
                <img src="/tickets/ticket-arrow.webp" alt="" width={29} height={29} />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="has-space ticket-list" data-state={state} data-testid="tickets-state">
        <h2 className="section-title display-flex-justify-center">{t('tickets.listTitle')}</h2>
        <div className="ticket-list__head">
          <div className="betting-transaction__tab">
            <div className="nav-pill__wrapper flex-1">
              {TICKET_TABS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={tab === option}
                  className={`nav-pill2${tab === option ? ' selected' : ''}`}
                  data-testid="tickets-tab"
                  data-tab={option}
                  onClick={() => setTab(option)}
                >
                  {t(`tickets.tab.${option}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="ticket-list__redeem"
            data-testid="tickets-redeem"
            onClick={() => {
              setIssue(null);
              setDialog('redeem');
            }}
          >
            {t('tickets.redeem')}
          </button>
        </div>

        {state === 'loading' ? (
          <p className="withdraw-state__text" aria-busy="true">
            {tc('state.loading')}
          </p>
        ) : null}

        {state === 'error' ? (
          <>
            <div className="no-info-box">{t('tickets.errorBody')}</div>
            <div className="withdraw-state__action">
              <PrimaryButton type="button" onClick={() => void load()}>
                {tc('action.retry')}
              </PrimaryButton>
            </div>
          </>
        ) : null}

        {state === 'empty' ? <div className="no-info-box">{t('tickets.listEmpty')}</div> : null}

        {state === 'ready' && visible.length > 0 ? (
          <div className="ticket-list__table-wrapper">
            <table className="bank-table ticket-list__table">
              <thead>
                <tr>
                  <th scope="col">{t('tickets.code')}</th>
                  <th scope="col">{t('tickets.event')}</th>
                  <th scope="col">{t('tickets.expires')}</th>
                  <th scope="col">{t('tickets.countdown')}</th>
                  <th scope="col">{t('tickets.statusLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="ticket-row"
                    data-id={row.id}
                    data-status={row.status}
                  >
                    <td>
                      <button
                        type="button"
                        className="ticket-row__open"
                        data-testid="ticket-open"
                        onClick={() => setDetailId(row.id)}
                      >
                        {row.code}
                      </button>
                    </td>
                    <td>{row.source === 'code' ? t('tickets.sourceCode') : row.name}</td>
                    <td>{formatDate(row.expiresAt)}</td>
                    <td>
                      <span className="ticket-countdown" data-testid="ticket-countdown">
                        {countdown(row)}
                      </span>
                    </td>
                    <td>
                      <span className={`ticket-status ticket-status--${row.status}`}>
                        {t(`tickets.status.${row.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {state === 'ready' && visible.length === 0 ? (
          <div className="no-info-box ticket-list__empty" data-testid="tickets-empty">
            {t('tickets.noData')}
          </div>
        ) : null}
      </div>

      <div className="has-space ticket-history">
        <h2 className="section-title display-flex-justify-center">{t('tickets.history')}</h2>
        <div className="betting-transaction__tab">
          <div className="nav-pill__wrapper flex-1">
            {HISTORY_TABS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={historyTab === option}
                className={`nav-pill2${historyTab === option ? ' selected' : ''}`}
                onClick={() => setHistoryTab(option)}
              >
                {t(`tickets.tab.${option}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="ticket-history__table-wrapper">
          {historyRows.length > 0 ? (
            <table className="table-theme ticket-history__table">
              <thead>
                <tr>
                  <th style={{ width: '80%' }}>{t('inbox.dateTime')}</th>
                  <th style={{ width: '20%' }}>{t('tickets.columnTickets')}</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((event) => (
                  <tr key={event.id}>
                    <td>{event.date}</td>
                    <td className="ticket-history__qty--received">{event.tickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="ticket-history__empty">{t('tickets.noData')}</div>
          )}
        </div>
      </div>

      <Modal
        open={dialog === 'redeem'}
        onClose={() => setDialog('')}
        variant="status"
        title={t('tickets.redeemTitle')}
        actions={
          <>
            <PrimaryButton type="button" onClick={() => void redeem()} disabled={busy}>
              {tc('action.submit')}
            </PrimaryButton>
            <button type="button" className="btn" onClick={() => setDialog('')}>
              {tc('action.cancel')}
            </button>
          </>
        }
      >
        <label className="ticket-redeem__field" htmlFor="ticket-redeem-code">
          <span className="ticket-redeem__label">{t('tickets.redeemLabel')}</span>
          <input
            id="ticket-redeem-code"
            className="form-control"
            value={code}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('tickets.redeemPlaceholder')}
            aria-invalid={issue !== null}
            aria-describedby={issue ? 'ticket-redeem-error' : undefined}
            onChange={(event) => {
              setCode(event.target.value);
              if (issue) setIssue(null);
            }}
          />
        </label>
        {issue ? (
          <p
            className="ticket-redeem__error"
            id="ticket-redeem-error"
            data-testid="ticket-redeem-error"
          >
            {t(issue === 'required' ? 'tickets.redeemRequired' : 'tickets.redeemFormat')}
          </p>
        ) : null}
        <p className="ticket-redeem__hint">
          {t('tickets.redeemHint', { codes: 'TICKET2026 · EXPIREDCODE' })}
        </p>
      </Modal>

      <Modal
        open={dialog === 'pick'}
        onClose={() => setDialog('')}
        variant="status"
        title={t('tickets.pickTitle')}
        actions={
          <PrimaryButton type="button" onClick={() => void enterEvent()} disabled={busy}>
            {t('tickets.pickGo')}
          </PrimaryButton>
        }
      >
        <p className="ticket-pick__hint">{t('tickets.pickHint')}</p>
        <div className="modal-event-grid" data-testid="ticket-pick-grid">
          {TICKET_EVENTS.map((event) => {
            const selected = picked === event.id;
            return (
              <button
                key={event.id}
                type="button"
                className={`modal-event-item${selected ? ' selected' : ''}`}
                data-event={event.id}
                aria-pressed={selected}
                onClick={() => setPicked(event.id)}
              >
                <img
                  className="modal-event-card"
                  src={
                    event.id === 'prediction'
                      ? '/tickets/ticket-prediction.png'
                      : '/tickets/ticket-number-event.png'
                  }
                  alt=""
                />
                <span className="selected-badge">{t('tickets.selected')}</span>
                <span className="modal-event-item__label">
                  {t(`tickets.pickEvent.${event.id}`)}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetailId('')}
        variant="status"
        title={t('tickets.detailTitle')}
        actions={
          <PrimaryButton type="button" onClick={() => setDetailId('')}>
            {tc('action.close')}
          </PrimaryButton>
        }
      >
        {detail ? (
          <dl className="ticket-detail" data-testid="ticket-detail" data-id={detail.id}>
            <div>
              <dt>{t('tickets.code')}</dt>
              <dd>{detail.code}</dd>
            </div>
            <div>
              <dt>{t('tickets.statusLabel')}</dt>
              <dd>
                <span className={`ticket-status ticket-status--${detail.status}`}>
                  {t(`tickets.status.${detail.status}`)}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('tickets.event')}</dt>
              <dd>{detail.source === 'code' ? t('tickets.sourceCode') : detail.name}</dd>
            </div>
            {detail.ticketsRequired !== null ? (
              <div>
                <dt>{t('tickets.required')}</dt>
                <dd>{detail.ticketsRequired}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t('tickets.issued')}</dt>
              <dd>{formatDate(detail.issuedAt)}</dd>
            </div>
            <div>
              <dt>{t('tickets.expires')}</dt>
              <dd>{formatDate(detail.expiresAt)}</dd>
            </div>
            <div>
              <dt>{t('tickets.countdown')}</dt>
              <dd>{fullCountdown(detail)}</dd>
            </div>
            {detail.usedAt ? (
              <div>
                <dt>{t('tickets.usedOn')}</dt>
                <dd>
                  {formatDate(detail.usedAt)}
                  {detailEvent ? ` · ${t(`tickets.pickEvent.${detailEvent.id}`)}` : ''}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Modal>
    </>
  );
}
