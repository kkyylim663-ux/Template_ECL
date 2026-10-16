import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { InboxPanel } from '@/components/account/InboxPanel';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('nav');
  return { title: t('items.inbox'), robots: { index: false, follow: false } };
}

export default async function InboxPage() {
  const payload = await getAccountPayload();

  const messages = payload.inbox.map((message) => ({
    id: message.id,
    kind: message.kind,
    subject: message.subject,
    body: message.body,
    read: message.read,
    receivedAt: message.receivedAt,
  }));

  return (
    <div className="account-content__container">
      <InboxPanel messages={messages} />
    </div>
  );
}
