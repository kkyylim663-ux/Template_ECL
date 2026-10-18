'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { brand } from '@/config/brand';
import { SIDEBAR_ITEMS, CONTACT_CHANNELS, SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Desktop navigation, measured from the original (`.sidebar2` + friends):
 * - the rail is 62px wide in `--color-panel-soft`, its top block a 78px
 *   `--color-line` square holding the menu toggle, then 62x52 rows
 *   (padding 16px 0) whose icon grows 1.2x and whose 1px left border turns
 *   mustard on hover;
 * - the panel is 256px (16rem) of `--color-panel-soft` text in `--color-muted`,
 *   parked at translateX(-256px) and sliding out with `all .3s`;
 * - its own top block is 187px tall in `--color-line` (padding 19px);
 * - rows inside are 37px (12px, padding 23px 10px 0) and 71px
 *   (padding 11px 15px 19px 0) with a 15px-radius hover surface and a 40px
 *   mustard divider.
 */
export function DesktopSidebar({ region }: { region: string }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Icon rail */}
      <div
        className="bg-panel-soft fixed top-0 bottom-0 left-0 z-[var(--z-sidebar)] hidden w-[var(--sidebar-mini-width)] flex-col items-stretch desktop:flex"
        aria-label={t('ui.iconRail')}
      >
        <div className="bg-line flex h-[var(--header-height-desktop)] shrink-0 items-center justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('ui.expandNav')}
            aria-expanded={open}
            className="text-muted hover:text-accent grid size-8 place-items-center"
          >
            <Icon name="menu" size={20} />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => (
            <li key={item.href || 'lobby'}>
              <Link
                href={regionPath(region, item.href)}
                title={t(item.labelKey)}
                className="border-l-accent hover:bg-line group/rail flex h-[52px] items-center justify-center border-l border-l-transparent transition-all duration-300"
              >
                <Icon
                  name={item.icon ?? 'home'}
                  size={20}
                  className="text-muted group-hover/rail:scale-120 transition-transform duration-300"
                />
                <span className="sr-only">{t(item.labelKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Sliding panel */}
      <aside
        aria-label={t('ui.sideNav')}
        aria-hidden={!open}
        inert={!open}
        className={`bg-panel-soft text-muted fixed top-0 bottom-0 left-0 z-[var(--z-sidebar-panel)] hidden w-[var(--sidebar-width)] flex-col transition-transform duration-300 ease-out desktop:flex ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="bg-line flex h-[187px] shrink-0 items-center justify-center p-[19px]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('ui.collapseNav')}
            className="flex size-[145px] flex-col items-center justify-center gap-2"
          >
            <span className="text-ink text-xl leading-[19px] font-bold tracking-wide">
              {brand.logo.text}
            </span>
            <span className="text-muted text-xs">{t('ui.menu')}</span>
          </button>
        </div>

        {/*
          Panel sections, per the original: support channels, contact details and
          the region/language picker. The game menu lives in the rail only — on
          the original the panel does not duplicate it.
        */}
        <nav className="flex-1 overflow-y-auto">
          <SideSection title={t('sidebar.needHelp')}>
            {SOCIAL_LINKS.map((social) => (
              <PanelRow
                key={social.id}
                href={social.href}
                label={social.label}
                icon={social.id as IconName}
                onNavigate={() => setOpen(false)}
              />
            ))}
            {CONTACT_CHANNELS.filter((channel) => channel.id === 'livechat').map((channel) => (
              <PanelRow
                key={channel.id}
                href={regionPath(region, '/livechat')}
                label={t(channel.labelKey)}
                icon={channel.icon}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </SideSection>

          <SideSection title={t('sidebar.contact')}>
            {CONTACT_CHANNELS.filter((channel) => ['phone', 'email'].includes(channel.id)).map(
              (channel) => (
                <PanelRow
                  key={channel.id}
                  href={channel.href}
                  label={channel.value ?? t(channel.labelKey)}
                  icon={channel.icon}
                  onNavigate={() => setOpen(false)}
                />
              ),
            )}
          </SideSection>

          <SideSection title={t('sidebar.region')}>
            {Object.values(brand.regions).map((entry) => (
              <PanelRow
                key={entry.code}
                href={`/${entry.code}`}
                label={entry.label}
                icon="globe"
                onNavigate={() => setOpen(false)}
              />
            ))}
            <li className="py-[11px] pr-[15px] pb-[19px] pl-0">
              <div className="ml-[15px] px-[18px] py-[11px]">
                <LanguageSwitcher variant="inline" />
              </div>
            </li>
          </SideSection>
        </nav>

        <p className="border-line text-muted border-t px-5 py-3 text-11">{t('ui.demoNote')}</p>
      </aside>
    </>
  );
}

/** One panel section: a 37px title row (12px, padding 23px 10px 0) plus rows. */
function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ul>
      <li>
        <p className="px-2.5 pt-[23px] pb-0 text-xs leading-[14px]">{title}</p>
      </li>
      {children}
    </ul>
  );
}

/** One panel row: 71px tall, 15px indented, 15px-radius hover surface. */
function PanelRow({
  href,
  label,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: IconName;
  onNavigate: () => void;
}) {
  return (
    <li className="group/item flex items-center py-[11px] pr-[15px] pb-[19px] pl-0">
      <span className="bg-accent h-10 w-px shrink-0 opacity-0 transition-all duration-300 group-hover/item:opacity-100" />
      <a
        href={href}
        onClick={onNavigate}
        className="hover:bg-[#202023] ml-[15px] flex w-full items-center rounded-[15px] px-[18px] py-[11px] text-sm leading-[19px] transition-all duration-300"
      >
        <Icon name={icon} size={20} className="me-[19.53px] shrink-0" />
        {label}
      </a>
    </li>
  );
}
