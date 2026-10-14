'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { brand, REGION_CODES } from '@/config/brand';
import { CONTACT_CHANNELS, PRIMARY_MENU, SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import { LanguageSwitcher } from './LanguageSwitcher';
import { VoucherEntry } from '@/components/content/VoucherEntry';
import { readDemoSessionFromDocument } from '@/lib/session';

const BANNER_KEY = 'brand.appBannerDismissed';

/** First two letters of the brand name — the avatar placeholder. */
const brandInitials = brand.name.slice(0, 2).toUpperCase();

/**
 * The mobile shell (<=768px), per docs/UI_REFERENCE.md: download banner, header
 * with hamburger, sliding drawer with collapsible sections, and the overlay that
 * closes it. Desktop renders none of this — it is one responsive template, not a
 * second set of pages.
 */
export function MobileChrome({ region }: { region: string }) {
  const t = useTranslations('nav');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Visible in the server HTML (a first-time visitor sees it at once); only a
  // visitor who dismissed it hides it, right after hydration. Starting hidden
  // would make the banner pop in and shift the page on every first load.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('games');
  const [isMember, setIsMember] = useState(false);

  // Nothing else is read during render, so the server and the first client pass agree.
  useEffect(() => {
    if (window.localStorage.getItem(BANNER_KEY) === '1') setBannerDismissed(true);
    setIsMember(readDemoSessionFromDocument());
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  function dismissBanner() {
    window.localStorage.setItem(BANNER_KEY, '1');
    setBannerDismissed(true);
  }

  return (
    <div className="desktop:hidden">
      {/* Download banner — background is the page colour, close area 25x56. */}
      {bannerDismissed ? null : (
        <div className="bg-surface relative flex h-14 items-center">
          <Link
            href={regionPath(region, '/faq/downloadapp')}
            className="flex h-full min-w-0 flex-1 items-center gap-2 px-3"
          >
            <Icon name="download" size={18} className="text-accent shrink-0" />
            <span className="min-w-0">
              <span className="text-ink block truncate text-xs font-medium">
                {t('banner.install', { brand: brand.name })}
              </span>
              <span className="text-accent block text-[10px]">{t('banner.tagline')}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label={t('ui.dismissBanner')}
            className="border-line text-muted grid h-14 w-[25px] shrink-0 place-items-center border-l"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Header: hamburger + logo + account */}
      <header className="border-line bg-panel sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('ui.openMenu')}
          aria-expanded={drawerOpen}
          className="text-ink grid size-11 place-items-center"
        >
          <Icon name="menu" size={24} />
        </button>

        <Link href={regionPath(region, '')} className="mx-auto flex min-h-11 items-center gap-2">
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={24}
            height={24}
            unoptimized
            priority
          />
          <span className="text-ink text-sm font-semibold tracking-wide">{brand.logo.text}</span>
        </Link>

        {isMember ? (
          <Link
            href={regionPath(region, '/account/profile')}
            aria-label={t('primary.account')}
            className="border-line bg-panel-soft text-accent grid size-11 shrink-0 place-items-center rounded-full border text-[10px] font-semibold"
          >
            {brandInitials}
          </Link>
        ) : (
          <Link
            href={regionPath(region, '/login')}
            aria-label={t('ui.signIn')}
            className="text-ink grid size-11 shrink-0 place-items-center"
          >
            <Icon name="user" size={22} />
          </Link>
        )}
      </header>

      {/* Drawer + overlay */}
      <div
        aria-hidden={!drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-label={t('ui.mobileNav')}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        className={`bg-panel fixed top-0 bottom-0 left-0 z-40 flex w-[85%] max-w-[330px] flex-col transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-line flex h-14 items-center justify-between border-b px-[35px]">
          <span className="text-ink text-xs font-semibold tracking-[0.2em] uppercase">
            {t('ui.menu')}
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label={t('ui.closeMenu')}
            className="text-muted grid size-8 place-items-center"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {PRIMARY_MENU.map((section) => {
            const open = openSection === section.id;
            return (
              <div key={section.id} className="border-line border-b">
                <button
                  type="button"
                  onClick={() => setOpenSection(open ? null : section.id)}
                  aria-expanded={open}
                  className="text-ink flex w-full items-center gap-4 py-[15px] text-xs font-semibold tracking-wide uppercase"
                  style={{ paddingLeft: 35, paddingRight: 35 }}
                >
                  <span>{t(section.labelKey)}</span>
                  <Icon
                    name={open ? 'chevronDown' : 'chevronRight'}
                    size={16}
                    className="text-muted ml-auto"
                  />
                </button>

                {open ? (
                  <ul className="pb-2">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={regionPath(region, item.href)}
                          onClick={() => setDrawerOpen(false)}
                          className="text-ink/90 active:bg-panel-soft flex items-center py-[15px] text-xs"
                          style={{ paddingLeft: 35, paddingRight: 35 }}
                        >
                          {item.icon ? (
                            <Icon
                              name={item.icon}
                              size={20}
                              className="text-accent"
                              style={{ marginRight: 30 }}
                            />
                          ) : null}
                          {t(item.labelKey)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}

          {/* Voucher (Promo Code) — the same dialog the header opens. */}
          <div className="border-line border-b py-[15px]" style={{ paddingLeft: 35, paddingRight: 35 }}>
            <VoucherEntry region={region} variant="drawer" />
          </div>

          {/* Region switch */}
          <div className="border-line border-b py-[15px]" style={{ paddingLeft: 35, paddingRight: 35 }}>
            <p className="text-muted text-[11px] tracking-widest uppercase">{t('ui.region')}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {REGION_CODES.map((code) => {
                const active = code === region;
                return (
                  <li key={code}>
                    <Link
                      href={`/${code}`}
                      className={`block rounded-[var(--radius-tag)] border px-3 py-1.5 text-xs ${
                        active ? 'border-accent text-accent' : 'border-line text-muted'
                      }`}
                    >
                      {t(`region.${code}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Language switch — writes the brand_lang cookie and refreshes. */}
          <div className="border-line border-b py-[15px]" style={{ paddingLeft: 35, paddingRight: 35 }}>
            <p className="text-muted text-[11px] tracking-widest uppercase">{t('ui.language')}</p>
            <LanguageSwitcher variant="inline" />
          </div>

          {/* Support channels + social */}
          <div className="py-[15px]" style={{ paddingLeft: 35, paddingRight: 35 }}>
            <ul className="space-y-3">
              {CONTACT_CHANNELS.map((channel) => (
                <li key={channel.id}>
                  <a
                    href={channel.href}
                    className="text-ink/90 flex items-center gap-4 text-xs"
                  >
                    <Icon name={channel.icon} size={20} className="text-accent" style={{ marginRight: 30 }} />
                    <span className="min-w-0">
                      <span className="block">{t(channel.labelKey)}</span>
                      <span className="text-muted block truncate text-[10px]">
                        {channel.valueKey ? t(channel.valueKey) : channel.value}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <ul className="mt-4 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    className="border-line text-muted grid size-8 place-items-center rounded-full border"
                  >
                    <Icon name={social.id} size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>
    </div>
  );
}
