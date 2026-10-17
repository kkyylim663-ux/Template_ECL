'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';
import {
  deleteMessages,
  markMessagesRead,
  recordUnreadSnapshot,
  useInboxState,
  type InboxState,
} from '@/lib/api/inbox';
import { readDepositRecords } from '@/lib/deposit-credit';
import { readWithdrawalRecords } from '@/lib/withdrawal-settle';
import { RECORDS_EVENT } from '@/lib/mock-records';

export interface InboxMessage {
  id: string;
  kind: 'important' | 'others' | 'promotions';
  subject: string;
  body: string;
  read: boolean;
  receivedAt: string;
}

const TABS = ['important', 'others', 'promotions'] as const;
type Tab = (typeof TABS)[number];

/** DataTables' own page lengths, as on the reference. */
const PAGE_SIZES = [10, 25, 50, 100] as const;

const dayTime = (at: string) => at.slice(0, 16).replace('T', ' ');

/**
 * The inbox body. The reference's own layout: three tab pills (Important /
 * Others / Promotions), a Mark As Read + delete action row that works on the
 * checked messages (its `markSelectedMessage` / `deleteSelectedMessage`), the
 * `.inbox-table` with a checkbox column, Date/Time and Subject, and a modal for
 * the message itself. Unread rows are bold — opening one reads it, and the
 * header badge follows through the local inbox store.
 */
export function InboxPanel({ messages: served }: { messages: InboxMessage[] }) {
  const t = useTranslations('account');
  const modal = useModal();
  const store = useInboxState();
  const [deposits, setDeposits] = useState<InboxMessage[]>([]);
  useEffect(() => {
    const load = () =>
      setDeposits([
        ...readDepositRecords().map((record) => record.notice),
        ...readWithdrawalRecords().map((record) => record.notice),
      ]);
    load();
    // A notice that arrives while this page is open must show without a refresh.
    window.addEventListener(RECORDS_EVENT, load);
    return () => window.removeEventListener(RECORDS_EVENT, load);
  }, []);
  const messages = useMemo(() => [...deposits, ...served], [deposits, served]);
  const [tab, setTab] = useState<Tab>('important');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: 'receivedAt' | 'subject'; dir: 'asc' | 'desc' }>({
    key: 'receivedAt',
    dir: 'desc',
  });

  /** The badge recomputes from the ids the fixture served as unread. */
  useEffect(() => {
    recordUnreadSnapshot(messages.filter((message) => !message.read).map((message) => message.id));
  }, [messages]);

  const isUnread = (state: InboxState, message: InboxMessage) =>
    !message.read && !state.readIds.includes(message.id);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = messages
      .filter((message) => !store.deletedIds.includes(message.id))
      .filter((message) => message.kind === tab)
      .filter(
        (message) =>
          !needle ||
          message.subject.toLowerCase().includes(needle) ||
          message.body.toLowerCase().includes(needle) ||
          message.receivedAt.toLowerCase().includes(needle),
      );
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * direction);
  }, [messages, store.deletedIds, tab, query, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const start = rows.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, rows.length);

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function switchTab(next: Tab) {
    setTab(next);
    setSelected([]);
    setPage(1);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : rows.map((message) => message.id));
  }

  function toggleOne(id: string) {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    );
  }

  function openMessage(message: InboxMessage) {
    if (isUnread(store, message)) markMessagesRead([message.id]);
    modal.alert(message.subject, `${dayTime(message.receivedAt)}\n\n${message.body}`);
  }

  function confirmMarkRead() {
    if (selected.length === 0) return;
    modal.confirm(
      t('history.status'),
      t('inbox.markReadConfirm'),
      () => {
        markMessagesRead(selected);
        setSelected([]);
      },
      t('transfer.allConfirmYes'),
      t('transfer.allConfirmNo'),
    );
  }

  function confirmDelete() {
    if (selected.length === 0) return;
    modal.confirm(
      t('history.status'),
      t('inbox.deleteConfirm'),
      () => {
        deleteMessages(selected);
        setSelected([]);
      },
      t('inbox.delete'),
      t('transfer.allConfirmNo'),
    );
  }

  return (
    <>
      <h1 className="form-title mb-20 has-space inbox-title">
        <Icon name="mail" size={28} className="page-icon" />
        {t('inbox.title')}
      </h1>

      <div className="nav-pill__wrapper-out inbox-tabs mb-20">
        <div className="inboxTabWrapper nav-pill__wrapper has-3-tabs">
          {TABS.map((option) => (
            <p
              key={option}
              role="button"
              tabIndex={0}
              aria-pressed={tab === option}
              className={`inboxTab nav-pill${tab === option ? ' selected' : ''}`}
              onClick={() => switchTab(option)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  switchTab(option);
                }
              }}
            >
              {t(`inbox.tab.${option}`)}
            </p>
          ))}
        </div>
      </div>

      <div className="inboxContent">
        <div className="btnWrapper active inbox-option__wrapper has-space">
          <button
            type="button"
            className="markAsRead inbox-mark-read"
            disabled={selected.length === 0}
            onClick={confirmMarkRead}
          >
            {t('inbox.markRead')}
          </button>
          <div className="divider-small" />
          <button
            type="button"
            className="inbox-delete"
            aria-label={t('inbox.deleteSelected')}
            disabled={selected.length === 0}
            onClick={confirmDelete}
          >
            <Icon name="trash" size={12} />
          </button>
        </div>

        <div className="tableWrapper message-body">
          <div className="inbox-table__wrapper">
            {/* The `.history-*` chrome is the shared DataTables look (see globals). */}
            <div className="history-toolbar">
              <label className="history-length">
                <select
                  aria-label={t('history.lengthLabel')}
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
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
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>

            <table className="inbox-table no-border table-theme table-theme-light">
              <thead>
                <tr>
                  <th className="inbox-table__checkbox-th">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-accent)]"
                      aria-label={t('inbox.selectAll')}
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="inbox-table-datetime">
                    <button
                      type="button"
                      className="history-sort"
                      onClick={() =>
                        setSort((previous) =>
                          previous.key === 'receivedAt'
                            ? { key: 'receivedAt', dir: previous.dir === 'asc' ? 'desc' : 'asc' }
                            : { key: 'receivedAt', dir: 'asc' },
                        )
                      }
                    >
                      {t('inbox.dateTime')}
                      {sort.key === 'receivedAt' ? <span aria-hidden>{sort.dir === 'asc' ? '▲' : '▼'}</span> : null}
                    </button>
                  </th>
                  <th className="w-3/4">
                    <button
                      type="button"
                      className="history-sort"
                      onClick={() =>
                        setSort((previous) =>
                          previous.key === 'subject'
                            ? { key: 'subject', dir: previous.dir === 'asc' ? 'desc' : 'asc' }
                            : { key: 'subject', dir: 'asc' },
                        )
                      }
                    >
                      {t('inbox.subject')}
                      {sort.key === 'subject' ? <span aria-hidden>{sort.dir === 'asc' ? '▲' : '▼'}</span> : null}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((message) => {
                    const unread = isUnread(store, message);
                    return (
                      <tr key={message.id} data-message={message.id} data-unread={unread ? 'true' : 'false'}>
                        <td className="inbox-table__checkbox-th">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--color-accent)]"
                            aria-label={message.subject}
                            checked={selected.includes(message.id)}
                            onChange={() => toggleOne(message.id)}
                          />
                        </td>
                        <td className="inbox-table-datetime">{dayTime(message.receivedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className={`inbox-subject${unread ? ' is-unread' : ''}`}
                            onClick={() => openMessage(message)}
                          >
                            {message.subject}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="dataTables_empty">
                      {t('inbox.noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="history-footer">
              <div className="history-info">
                {t('history.info', { start, end, total: rows.length })}
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
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                  <button
                    key={number}
                    type="button"
                    className={`history-page${number === current ? ' is-current' : ''}`}
                    aria-current={number === current ? 'page' : undefined}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ))}
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
      </div>
    </>
  );
}
