import type { Metadata } from 'next';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { ChatPanel } from '@/components/chat/ChatPanel';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('content');
  return { title: t('chat.supportTitle') };
}

/**
 * Live Chat (T81) — the mock support room. Every Live Chat entry (mobile dock
 * and drawer, desktop header, sidebar, footer, contact cards) lands here; the
 * reference sends those entries to its contact page and opens a third-party
 * chat widget this build does not ship.
 */
export default async function LiveChatPage() {
  const { t } = await getT('content');

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="livechat" className="container-page">
        <h1 className="form-title large title-special-top">
          <Icon name="chat" size={28} className="page-icon" />
          {t('chat.supportTitle')}
        </h1>
        <ChatPanel mode="support" />
      </div>
    </IntlScope>
  );
}
