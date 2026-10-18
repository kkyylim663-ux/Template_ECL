import type { Metadata } from 'next';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { ChatPanel } from '@/components/chat/ChatPanel';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT('content');
  return { title: t('chat.roomTitle') };
}

/**
 * The player room the mobile dock's Chat entry opens (T81). The reference opens
 * its own client-side chat panel in place; this build gives it a page.
 */
export default async function ChatPage() {
  const { t } = await getT('content');

  return (
    <IntlScope namespaces={['content']}>
      <div data-page="chat" className="container-page">
        <h1 className="form-title large title-special-top">
          <Icon name="chat" size={28} className="page-icon" />
          {t('chat.roomTitle')}
        </h1>
        <ChatPanel mode="room" />
      </div>
    </IntlScope>
  );
}
