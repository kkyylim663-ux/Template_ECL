import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { InboxActionButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function InboxPage() {
  const payload = await getAccountPayload();
  const groups = [
    { id: 'important', label: 'Important', rows: payload.inbox.filter((m) => m.kind === 'important') },
    { id: 'others', label: 'Others', rows: payload.inbox.filter((m) => m.kind !== 'important') },
  ];
  const unread = payload.inbox.filter((message) => !message.read).length;

  return (
    <section className="border-line bg-panel rounded-[var(--radius-panel)] border p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-ink text-sm font-semibold">Inbox</h2>
          <p className="text-muted mt-1 text-xs">
            {unread} unread of {payload.inbox.length}
          </p>
        </div>
        <InboxActionButton label="Mark all as read" messageId="all" />
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
                      label={message.read ? 'Mark unread' : 'Mark as read'}
                      messageId={message.id}
                    />
                    <InboxActionButton label="Delete" messageId={message.id} />
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
