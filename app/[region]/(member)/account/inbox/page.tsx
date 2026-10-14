import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { InboxActionButton } from '@/components/account/actions';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.inbox'), robots: { index: false, follow: false } };
}

export default async function InboxPage() {
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const groups = [
    {
      id: 'important',
      label: t('inbox.important'),
      rows: payload.inbox.filter((m) => m.kind === 'important'),
    },
    {
      id: 'others',
      label: t('inbox.others'),
      rows: payload.inbox.filter((m) => m.kind !== 'important'),
    },
  ];
  const unread = payload.inbox.filter((message) => !message.read).length;

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-ink text-sm font-semibold">{t('inbox.title')}</h2>
          <p className="text-muted mt-1 text-xs">
            {t('inbox.summary', { unread, total: payload.inbox.length })}
          </p>
        </div>
        <InboxActionButton label={t('inbox.markAllRead')} messageId="all" />
      </div>

      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className="text-muted text-[11px] tracking-widest uppercase">{group.label}</h3>
            <ul className="mt-2 space-y-2">
              {group.rows.map((message) => (
                <li
                  key={message.id}
                  className={`border-line bg-panel-soft rounded-[var(--radius-panel)] border p-4 ${
                    message.read ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-ink text-sm font-medium">
                      {message.subject}
                      {message.read ? null : (
                        <span className="bg-accent ml-2 inline-block size-1.5 rounded-full align-middle" />
                      )}
                    </p>
                    <span className="text-muted text-[11px]">
                      {message.receivedAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <p className="text-muted mt-1 text-xs">{message.body}</p>
                  <div className="mt-3 flex gap-2">
                    <InboxActionButton
                      label={message.read ? t('inbox.markUnread') : t('inbox.markRead')}
                      messageId={message.id}
                    />
                    <InboxActionButton label={t('inbox.delete')} messageId={message.id} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
