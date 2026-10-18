import Link from 'next/link';
import { brand } from '@/config/brand';
import { regionPath } from '@/config/nav';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/ui/Icon';
import { AccountSlotGate, HeaderMenuGate } from './BreakpointChrome';
import { VoucherEntry } from '@/components/content/VoucherEntry';
import { LanguageSwitcher } from './LanguageSwitcher';

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
  const { t } = await getT('nav');

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
            {/* The reference's header chat icon opens its live chat; ours now
                opens the mock live-chat page. */}
            <Link
              href={regionPath(region, '/livechat')}
              aria-label={t('ui.chat')}
              className="relative me-8 block shrink-0"
            >
              <Icon name="chat" size={25} className="text-ink" />
              <span className="bg-danger absolute -top-2 -right-2 size-2 rounded-full" />
            </Link>

            {/* Quest pill: original geometry, no quest panel in this build. */}
            <a
              href="#"
              className="quest-pill relative me-[54px] flex min-h-[41px] min-w-[156px] shrink-0 items-center justify-center rounded-[15px]"
            >
              <span className="me-[15px] text-sm font-bold text-white">{t('ui.quest')}</span>
              <Icon name="trophy" size={20} className="absolute right-4 text-white" />
              {/* T76: 10px white on the brand green reads 3.37:1; the dark ink is the AA pairing. */}
              <span className="bg-success text-ink-on-accent absolute -top-[9px] -right-4 z-[1] rounded-lg px-3 py-1 text-10 leading-none">
                {t('ui.live')}
              </span>
            </a>

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
