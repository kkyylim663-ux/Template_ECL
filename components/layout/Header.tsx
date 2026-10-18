import Link from 'next/link';
import { brand } from '@/config/brand';
import { AccountSlotGate, HeaderMenuGate } from './BreakpointChrome';
import { VoucherEntry } from '@/components/content/VoucherEntry';
import { LanguageSwitcher } from './LanguageSwitcher';
import { QuestBadge } from './QuestBadge';
import { ChatWindow } from '@/components/chat/ChatWindow';

/**
 * Desktop header, measured from the original (crawl/pages/my.html + main.css):
 * a fixed 78px bar in `--color-panel-soft` holding a centred 1300px container.
 * Inside: a 145px logo slot (+59px), the three menu cards, then the right
 * cluster — chat icon with its red dot, the Quest pill, Login / Register.
 *
 * The 145x19 logo slot is a text stand-in: the original ships a logo image and
 * P2 does not load images, but the slot keeps the menu's x position identical.
 */
export async function Header({ region }: { region: string }) {
  return (
    <header className="hidden desktop:block">
      <div className="bg-panel-soft fixed inset-x-0 top-0 z-[var(--z-header)] h-[var(--header-height-desktop)]">
        <div className="container-page flex h-full items-center">
          <Link
            href={`/${region}`}
            className="text-ink me-[59px] flex h-[19px] w-[145px] shrink-0 items-center text-xl leading-[19px] font-bold tracking-wide"
          >
            {brand.logo.text}
          </Link>

          <HeaderMenuGate region={region} />

          {/*
            Cluster height is the original's 41px (`.btn` / `.quest-badge`);
            the voucher and language entries are P0 additions the original does
            not have in the header, so they ride along inside it.
          */}
          <div className="ms-auto flex h-[41px] items-center [&>*]:h-[41px] [&>*]:shrink-0 [&>*]:items-center [&>*]:whitespace-nowrap">
            {/* The reference's header chat icon opens its chat window (T81
                follow-up); the drawer / contact / footer entries keep the
                support-room page. */}
            <ChatWindow />

            {/* Quest pill: opens the reference's quest panel (5 cards). */}
            <QuestBadge region={region} />

            <div className="me-4 flex h-[41px] items-center gap-4">
              <VoucherEntry region={region} variant="header" />
              <LanguageSwitcher compact />
            </div>
            <AccountSlotGate region={region} />
          </div>
        </div>
      </div>
    </header>
  );
}
