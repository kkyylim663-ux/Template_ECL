'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { brand, REGION_CODES } from '@/config/brand';
import { CONTACT_CHANNELS, PRIMARY_MENU, SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import { LanguageSwitcher } from './LanguageSwitcher';
import { VoucherEntry } from '@/components/content/VoucherEntry';
import { signOutRequest, useSession } from '@/lib/session/useSession';

const BANNER_KEY = 'brand.appBannerDismissed';

/** First two letters of the brand name — the avatar placeholder. */
const brandInitials = brand.name.slice(0, 2).toUpperCase();

/**
 * Mobile shell (<=768px), measured from crawl/mobile/my_mobileUA.html:
 * - a fixed top stack (z12): the dismissible download strip and, under it, the
 *   56px header — a 64x56 hamburger hit area with a 32x16 four-bar icon that
 *   folds into an X, a 128x128 logo block that hangs below the bar at z-1, and
 *   a 50x56 account slot;
 * - a 270px drawer below the header (right corners 15px, z14) that slides in
 *   with `all .3s`: 56px parent rows (10px/20px, 46x40 icon) over 12px child
 *   rows (15px/35px, 20x20 icon 30px to the right), split by hairline dividers.
 *
 * One responsive template: desktop renders none of this (`.desktop:hidden`).
 */
export function MobileChrome({ region }: { region: string }) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  // Visible in the server HTML (a first-time visitor sees it at once); only a
  // visitor who dismissed it hides it, right after hydration. Starting hidden
  // would make the banner pop in and shift the page on every first load.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // All sections start collapsed, as on the original (`.sidemenu-child{display:none}`).
  const [openSection, setOpenSection] = useState<string | null>(null);
  const router = useRouter();
  const { member: isMember } = useSession();

  // Nothing else is read during render, so the server and the first client pass agree.
  // The top offset is written in the same pass as the read: writing it from a
  // second effect would flash the banner height in and out again for a visitor
  // who dismissed the strip (56px → 112px → 56px) and shift the page.
  useEffect(() => {
    const dismissed = window.localStorage.getItem(BANNER_KEY) === '1';
    if (dismissed) setBannerDismissed(true);
    document.documentElement.style.setProperty(
      '--mobile-content-top',
      dismissed ? '56px' : '112px',
    );
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // T76: the drawer is keyboard-closable like every other overlay — Esc closes
  // it, focus moves into the panel on open and lands back on the burger after.
  useEffect(() => {
    if (!drawerOpen) return;
    drawerRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setDrawerOpen(false);
      burgerRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // The top stack is fixed, so the page needs to clear it: 56px of header, plus
  // the 56px banner while it is up (the original's `has-header` / `has-app`). The
  // first paint already has the value — the pre-paint script in app/layout.tsx
  // reads the same dismiss flag — so this only has to follow a dismiss click.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--mobile-content-top',
      bannerDismissed ? '56px' : '112px',
    );
  }, [bannerDismissed]);

  function dismissBanner() {
    window.localStorage.setItem(BANNER_KEY, '1');
    setBannerDismissed(true);
  }

  async function onSignOut() {
    setDrawerOpen(false);
    await signOutRequest();
    router.push(regionPath(region, ''));
    router.refresh();
  }

  return (
    <div className="app-top-bar fixed inset-x-0 top-0 z-[var(--z-header)] desktop:hidden">
      {/* Download banner: page-coloured strip, 25x56 close area, 50px logo slot. */}
      {bannerDismissed ? null : (
        <div className="bg-surface flex items-center">
          <Link
            href={regionPath(region, '/faq/downloadapp')}
            className="flex h-14 min-w-0 flex-1 items-center gap-2.5 pr-2.5"
          >
            <span className="bg-panel-soft grid size-[50px] shrink-0 place-items-center rounded-[10px]">
              <Icon name="download" size={22} className="text-accent" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-ink block truncate text-xs">
                {t('banner.install', { brand: brand.name })}
              </span>
              <span className="text-muted block truncate text-xs">{t('banner.tagline')}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label={t('ui.dismissBanner')}
            className="text-muted grid h-14 w-[25px] shrink-0 place-items-center"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      )}

      {/* Header: hamburger, hanging logo block, account. */}
      <header className="bg-panel relative flex h-14 items-center">
        {/* 128x128 brand mark at z-1, centred on the bar and hidden behind it: the dark circle is gone. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[-1] flex -translate-y-1/2 justify-center">
          <Link
            href={regionPath(region, '')}
            aria-label={brand.logo.alt}
            className="text-ink pointer-events-auto grid size-32 place-items-center text-xl font-bold tracking-wide"
          >
            {brand.logo.text}
          </Link>
        </div>

        <div className="flex h-14 w-16 shrink-0 items-center justify-center">
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setDrawerOpen((current) => !current)}
            aria-label={drawerOpen ? t('ui.closeMenu') : t('ui.openMenu')}
            aria-expanded={drawerOpen}
            className="grid h-14 w-16 place-items-center"
          >
            <span className={`burger ${drawerOpen ? 'open' : ''}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        <Link
          href={isMember ? regionPath(region, '/account/profile') : regionPath(region, '/login')}
          aria-label={isMember ? `${t('primary.function')} ${brandInitials}` : t('ui.signIn')}
          className="border-line bg-panel-soft text-accent ms-auto grid h-14 w-[50px] shrink-0 place-items-center text-10 font-semibold"
        >
          {isMember ? (
            // T76: the label carries the initials the link shows.
            <span aria-hidden="true">{brandInitials}</span>
          ) : (
            <Icon name="user" size={22} className="text-muted" />
          )}
        </Link>
      </header>

      {/* Drawer + overlay */}
      <div
        aria-hidden={!drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className={`app-drawer-layer fixed inset-x-0 bottom-0 top-[var(--mobile-content-top,56px)] z-[13] bg-black/60 transition-opacity ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        ref={drawerRef}
        tabIndex={-1}
        aria-label={t('ui.mobileNav')}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        className={`bg-panel fixed top-[var(--mobile-content-top,56px)] left-0 z-[var(--z-sidebar-panel)] flex h-[calc(100vh-var(--mobile-content-top,56px))] w-[270px] flex-col rounded-r-[15px] pb-32 transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* T76: the closed drawer renders no content — `aria-hidden` with a
            focusable subtree inside is an axe failure, and `inert` alone did not
            clear it. The panel is off-screen when closed, so nothing changes. */}
        {drawerOpen ? (
          <nav className="flex-1 overflow-y-auto overflow-x-hidden">
            {PRIMARY_MENU.map((section) => {
              const open = openSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(open ? null : section.id)}
                    aria-expanded={open}
                    className="text-muted flex h-14 w-full items-center justify-between px-5"
                  >
                    <span className="flex items-center">
                      <Icon
                        name={section.items[0]?.icon ?? 'home'}
                        size={30}
                        className="me-5 h-[46px] w-10 shrink-0"
                      />
                      <span>{t(section.labelKey)}</span>
                    </span>
                    <Icon
                      name="chevronDown"
                      size={16}
                      className={`text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open ? (
                    <ul className="pb-2">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={regionPath(region, item.href)}
                            onClick={() => setDrawerOpen(false)}
                            className="drawer-row active:bg-panel-soft"
                          >
                            <Icon
                              name={item.icon ?? 'home'}
                              size={20}
                              className="text-accent me-[30px] shrink-0"
                            />
                            {t(item.labelKey)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}

            <div className="drawer-divider" />

            {/* Voucher (Promo Code) — the same dialog the header opens. */}
            <div className="px-[35px]">
              <VoucherEntry region={region} variant="drawer" />
            </div>

            <div className="drawer-divider" />

            {/* Region switch */}
            <div className="px-[35px]">
              <p className="text-muted mb-4 text-xs">{t('sidebar.region')}</p>
              <ul className="flex flex-wrap gap-2">
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

            <div className="drawer-divider" />

            {/* Language switch — writes the brand_lang cookie and refreshes. */}
            <div className="px-[35px]">
              <p className="text-muted mb-4 text-xs">{t('ui.language')}</p>
              <LanguageSwitcher variant="inline" />
            </div>

            <div className="drawer-divider" />

            {/* Support channels */}
            <div className="px-[35px]">
              <ul className="space-y-3">
                {CONTACT_CHANNELS.map((channel) => (
                  <li key={channel.id}>
                    <a href={channel.href} className="text-muted flex items-center">
                      <Icon
                        name={channel.icon}
                        size={20}
                        className="text-accent me-[30px] shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block">{t(channel.labelKey)}</span>
                        <span className="text-muted block truncate text-10">
                          {channel.valueKey ? t(channel.valueKey) : channel.value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {isMember ? (
              <div className="px-[35px]">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-muted flex h-14 w-full items-center"
                >
                  {tCommon('action.logout')}
                </button>
              </div>
            ) : null}

            {/* Social: 30x30 icons, the row indented 31px. */}
            <div className="mt-6 pl-[31px]">
              <ul className="flex items-center gap-5">
                {SOCIAL_LINKS.map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.href}
                      aria-label={social.label}
                      className="grid size-[30px] place-items-center"
                    >
                      <Icon name={social.id} size={30} className="text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
      </aside>
    </div>
  );
}
