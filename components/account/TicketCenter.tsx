'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';

type TicketEvent = { id: string; name: string; date: string; tickets: string; status: string };

const TABS = ['all', 'received', 'used'] as const;

/**
 * The ticket centre body: the round badge and mustard ticket card (count,
 * "every MYR500 deposit = 1 free ticket", the progress bar to the next
 * ticket), the three-button row and the Ticket History section — all the
 * reference's own boxes. Numbers come from the mock payload; the history tabs
 * filter the mock events, and an empty tab keeps the reference's "No Data".
 */
export function TicketCenter({
  held,
  cap,
  perDeposit,
  progressMinor,
  perTicketMinor,
  currency,
  events,
  depositHref,
}: {
  held: number;
  cap: number;
  perDeposit: string;
  progressMinor: number;
  perTicketMinor: number;
  currency: string;
  events: TicketEvent[];
  depositHref: string;
}) {
  const t = useTranslations('account');
  const modal = useModal();
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');

  const progressPct = Math.min(100, Math.round((progressMinor / perTicketMinor) * 100));
  const remainingMinor = Math.max(0, perTicketMinor - progressMinor);
  const remaining = (remainingMinor / 100).toLocaleString('en-MY', { minimumFractionDigits: 2 });
  const rows =
    tab === 'all' ? events : events.filter((event) => (tab === 'received' ? event.status !== 'closed' : event.status === 'closed'));

  const money = (text: string) => `${currency} ${text}`;

  return (
    <>
      <div className="page ticket-center">
      <div className="content-container">
        <div className="card-wrapper">
          <div className="card-icon" aria-hidden>
            <Icon name="ticket" size={56} className="text-accent" />
          </div>
          <div className="ticket-card">
            <div className="card-header">
              <div className="ticket-count">
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
                  <span className="progress-current">{money(progressMinor / 100 === 0 ? '0' : String(progressMinor / 100))}</span>
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
              <Icon name="chevronRight" size={29} />
            </span>
          </Link>
          <button
            type="button"
            className="btn-dark-gray"
            onClick={() => modal.success(t('tickets.rulesTitle'), t('tickets.rulesBody'))}
          >
            {t('tickets.rules')}
          </button>
          <button
            type="button"
            className="btn-green"
            onClick={() => modal.success(t('tickets.useTitle'), t('tickets.useBody'))}
          >
            <span className="btn-text">
              <span className="btn-green-top">{t('tickets.useTop')}</span>
              <span className="btn-green-bottom">{t('tickets.useBottom')}</span>
            </span>
            <span className="btn-arrow" aria-hidden>
              <Icon name="chevronRight" size={29} />
            </span>
          </button>
        </div>
      </div>
    </div>

      <div className="has-space ticket-history">
          <h2 className="section-title display-flex-justify-center">{t('tickets.history')}</h2>
          <div className="betting-transaction__tab">
            <div className="nav-pill__wrapper flex-1">
              {TABS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={tab === option}
                  className={`nav-pill2${tab === option ? ' selected' : ''}`}
                  onClick={() => setTab(option)}
                >
                  {t(`tickets.tab.${option}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="ticket-history__table-wrapper">
            {rows.length > 0 ? (
              <table className="table-theme ticket-history__table">
                <thead>
                  <tr>
                    <th style={{ width: '80%' }}>{t('inbox.dateTime')}</th>
                    <th style={{ width: '20%' }}>{t('tickets.columnTickets')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((event) => (
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
    </>
  );
}
