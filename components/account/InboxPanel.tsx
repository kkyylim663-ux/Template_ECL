'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';

type Message = { id: string; kind: string; subject: string; date: string; read: boolean };

const TABS = ['important', 'others', 'promotions'] as const;

/**
 * The inbox body: three tab pills (Important / Others / Promotions), a
 * right-aligned Mark As Read row and the message table — the reference's
 * `.inbox-table` with a checkbox column, Date/Time and Subject. Rows come from
 * the mock inbox; the promotions tab has none, which is the reference's own
 * `dataTables_empty` row.
 */
export function InboxPanel({ messages }: { messages: Message[] }) {
  const t = useTranslations('account');
  const modal = useModal();
  const [tab, setTab] = useState<(typeof TABS)[number]>('important');

  const kind = tab === 'promotions' ? 'promotions' : tab;
  const rows = messages.filter((message) => message.kind === kind);

  return (
    <>
      <h1 className="form-title mb-5">
        <Icon name="mail" size={28} className="page-icon" />
        {t('inbox.title')}
      </h1>

      <div className="nav-pill__wrapper-out inbox-tabs mb-5">
        <div className="inboxTabWrapper nav-pill__wrapper has-3-tabs">
          {TABS.map((option) => (
            <p
              key={option}
              role="button"
              tabIndex={0}
              aria-pressed={tab === option}
              className={`inboxTab nav-pill${tab === option ? ' selected' : ''}`}
              onClick={() => setTab(option)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setTab(option);
                }
              }}
            >
              {t(`inbox.tab.${option}`)}
            </p>
          ))}
        </div>
      </div>

      <div className="inboxContent">
        <div className="btnWrapper active inbox-option__wrapper">
          <button
            type="button"
            className="markAsRead inbox-mark-read"
            onClick={() =>
              modal.success(
                t('actions.demoInboxTitle'),
                t('actions.demoInboxBody', { label: t('inbox.markRead'), message: rows.length }),
              )
            }
          >
            {t('inbox.markRead')}
          </button>
          <div className="divider-small" />
          <Icon name="close" size={16} className="text-muted" />
        </div>
        <div className="tableWrapper">
          <div className="inbox-table__wrapper">
            <table className="inbox-table no-border table-theme table-theme-light">
              <thead>
                <tr>
                  <th className="inbox-table__checkbox-th">
                    <input type="checkbox" aria-label={t('inbox.selectAll')} className="size-4 accent-[var(--color-accent)]" />
                  </th>
                  <th className="inbox-table-datetime">{t('inbox.dateTime')}</th>
                  <th className="w-3/4">{t('inbox.subject')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((message) => (
                    <tr key={message.id}>
                      <td className="inbox-table__checkbox-th">
                        <input
                          type="checkbox"
                          aria-label={message.subject}
                          className="size-4 accent-[var(--color-accent)]"
                        />
                      </td>
                      <td className="inbox-table-datetime">{message.date}</td>
                      <td>
                        {message.read ? message.subject : <strong>{message.subject}</strong>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="dataTables_empty">
                      {t('inbox.noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
