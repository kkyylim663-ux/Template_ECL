'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { brand, type RegionCode } from '@/config/brand';
import { MOBILE_MENU_GROUPS, MOBILE_SOCIAL_LINKS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';
import { InertLink } from '@/components/ui/InertLink';
import { VoucherEntry } from '@/components/content/VoucherEntry';
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  resolveLocale,
  type Locale,
} from '@/lib/i18n/config';
import { signOutRequest, useSession } from '@/lib/session/useSession';

const BANNER_KEY = 'brand.appBannerDismissed';

/** First two letters of the brand name — the avatar placeholder. */
const brandInitials = brand.name.slice(0, 2).toUpperCase();

/**
 * The reference's Region block (`.sidemenu-region` + `.sidebar-child__list-*`):
 * three flag rows. MY and SG switch region *and* language; VN carries Tiếng Việt
 * only — this build has no /vn region, so that row switches the language in
 * place. Language names are endonyms and stay untranslated.
 */
const REGION_ROWS: {
  flag: string;
  region: RegionCode | null;
  langs: { code: Locale; label: string }[];
}[] = [
  {
    flag: '/brand/flags/my.svg',
    region: 'my',
    langs: [
      { code: 'en', label: 'English' },
      { code: 'zh-Hans', label: '中文' },
    ],
  },
  {
    flag: '/brand/flags/sg.svg',
    region: 'sg',
    langs: [
      { code: 'en', label: 'English' },
      { code: 'zh-Hans', label: '中文' },
    ],
  },
  { flag: '/brand/flags/vn.svg', region: null, langs: [{ code: 'vi', label: 'Tiếng Việt' }] },
];

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
 * The drawer body was rebuilt against the live reference (`.app-header__menu-wrapper`):
 * member profile row + tasks card, the three `sidemenu` groups (the drawer's own
 * item sets — see MOBILE_MENU_GROUPS), then Region (flag rows), Social Media,
 * Download (two badge cards) and Others (Contact / FAQ / Log out for members).
 * Every section is collapsed-until-tapped like the original's `.sidemenu-child`.
 *
 * One responsive template: desktop renders none of this (`.desktop:hidden`).
 */
export function MobileChrome({ region }: { region: string }) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const locale = resolveLocale(useLocale());
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  // Visible in the server HTML (a first-time visitor sees it at once); only a
  // visitor who dismissed it hides it, right after hydration. Starting hidden
  // would make the banner pop in and shift the page on every first load.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // All sections start collapsed, as on the original (`.sidemenu-child{display:none}`).
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { member: isMember, username } = useSession();

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

  // The language buttons in the Region rows: the cookie the server reads, then a
  // refresh for a language swap in place and a navigation for a region switch.
  function pickLanguage(code: Locale, nextRegion: RegionCode | null) {
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => {
      if (nextRegion && nextRegion !== region) router.push(regionPath(nextRegion, ''));
      else router.refresh();
    });
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
        className={`app-drawer bg-panel fixed top-[var(--mobile-content-top,56px)] z-[var(--z-sidebar-panel)] flex h-[calc(100vh-var(--mobile-content-top,56px))] w-[270px] flex-col rounded-r-[15px] pb-32 transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* T76: the closed drawer renders no content — `aria-hidden` with a
            focusable subtree inside is an axe failure, and `inert` alone did not
            clear it. The panel is off-screen when closed, so nothing changes. */}
        {drawerOpen ? (
          <nav className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Member block (`.sidemenu-username` + `.quest-menu__wrapper`): the
                profile row and the tasks card; both absent for guests, as on the
                original. The card's green is approximated from the member
                screenshot — the live reference only serves the guest drawer. */}
            {isMember ? (
              <>
                <Link
                  href={regionPath(region, '/account/profile')}
                  className="flex items-center px-4 pt-2 pb-1"
                >
                  <span
                    className="bg-panel-soft me-3 grid size-10 shrink-0 place-items-center rounded-full"
                    aria-hidden
                  >
                    <Icon name="user" size={22} className="text-muted" />
                  </span>
                  <p className="text-ink truncate text-base">
                    {t('sidebar.hello')}
                    {username ? `, ${username}` : ''}
                  </p>
                  <Icon name="chevronRight" size={18} className="text-muted ms-auto shrink-0" />
                </Link>

                <div className="px-4 py-2">
                  <Link
                    href={regionPath(region, '/account/achievement')}
                    className="bg-[#1e9e55] text-ink relative flex items-center rounded-[11px] px-5 py-[10px]"
                  >
                    <Icon name="achievement" size={20} className="me-5 shrink-0" />
                    <span className="text-sm font-medium">{t('sidebar.tasks')}</span>
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-[15px] bg-[#38d878] px-[10px] py-[2px] text-10 font-semibold text-[#0d2418]">
                      {t('sidebar.taskNew')}
                    </span>
                  </Link>
                </div>
              </>
            ) : null}

            {/* The reference's drawer groups (its own sets, not the desktop menu). */}
            {MOBILE_MENU_GROUPS.map((section) => {
              const open = openSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(open ? null : section.id)}
                    aria-expanded={open}
                    className="text-muted flex w-full items-center justify-between px-5 py-2.5"
                  >
                    <span className="flex items-center">
                      <Icon
                        name={section.icon}
                        size={30}
                        className={`me-5 shrink-0 ${section.iconClass}`}
                      />
                      <span className="text-base">{t(section.labelKey)}</span>
                    </span>
                    <Icon
                      name="chevronDown"
                      size={16}
                      className={`text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {open ? (
                    <ul className="pb-2">
                      {section.id === 'function' ? (
                        <li>
                          {/* Voucher is the Function group's first row on the
                              reference (`/my/voucher`); here it opens the same
                              dialog as the header entry. */}
                          <VoucherEntry region={region} variant="drawer" />
                        </li>
                      ) : null}
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

            {/* Region — flag rows, each carrying its languages (`.sidebar-child__list-*`). */}
            <div className="mt-5">
              <p className="text-muted mb-4 ps-[13px] text-xs">{t('sidebar.region')}</p>
              {REGION_ROWS.map((row) => (
                <div
                  key={row.flag}
                  className="ms-[15px] flex h-[42px] items-center rounded-[15px] px-[18px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a 20px svg flag, not content */}
                  <img src={row.flag} alt="" aria-hidden className="me-5 size-5 shrink-0" />
                  <span className="flex items-center text-xs">
                    {row.langs.map((lang, index) => (
                      <Fragment key={lang.code}>
                        {index > 0 ? <span className="text-muted mx-[15px]">/</span> : null}
                        <button
                          type="button"
                          onClick={() => pickLanguage(lang.code, row.region)}
                          aria-pressed={locale === lang.code}
                          className={`transition-colors ${
                            locale === lang.code ? 'text-accent' : 'text-muted'
                          }`}
                        >
                          {lang.label}
                        </button>
                      </Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>

            <div className="drawer-divider" />

            {/* Social Media — the reference's six, in its order, in brand colours. */}
            <div className="mt-5">
              <p className="text-muted mb-4 ps-[13px] text-xs">{t('sidebar.socialMedia')}</p>
              <ul className="flex items-center pl-[31px]">
                {MOBILE_SOCIAL_LINKS.map((social) => (
                  <li key={social.id} className="me-[15px]">
                    <a
                      href={social.href}
                      aria-label={social.label}
                      className="block"
                      style={{ color: social.color }}
                    >
                      <Icon name={social.id} size={25} className="h-[30px] w-[25px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="drawer-divider" />

            {/* Download — the same two badge cards as the home rail, sideways-scrolling. */}
            <div className="mt-5">
              <p className="text-muted mb-4 ps-[13px] text-xs">{t('sidebar.download')}</p>
              <div className="flex flex-nowrap overflow-x-auto pl-4">
                {(['sidebar.dlCard1', 'sidebar.dlCard2'] as const).map((key, index) => (
                  <div
                    key={key}
                    className="bg-download-card me-[10px] w-[183px] shrink-0 rounded-[var(--radius-panel)] p-[15px] pb-[25px]"
                  >
                    <InertLink className="bg-inset-dark mb-[10px] block rounded-[var(--radius-panel)] p-[10px]">
                      <span className="game-placeholder block h-[44px] w-full rounded-[10px] text-center text-11 leading-[44px] text-white/70">
                        {t(index === 0 ? 'sidebar.dlPlay' : 'sidebar.dlStore')}
                      </span>
                    </InertLink>
                    <p className="text-ink mb-1 text-sm font-medium">{t(key)}</p>
                    <p className="text-ink text-xs">{t('sidebar.dlSub')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="drawer-divider" />

            {/* Others — Contact / FAQ / Log out (members). */}
            <div className="mt-5">
              <p className="text-muted mb-4 ps-[13px] text-xs">{t('sidebar.others')}</p>
              <Link href={regionPath(region, '/contact')} className="drawer-row">
                <Icon name="chat" size={20} className="text-accent me-[30px] shrink-0" />
                {t('sidebar.contact')}
              </Link>
              <Link href={regionPath(region, '/faq/gettingstart')} className="drawer-row">
                <Icon name="question" size={20} className="text-accent me-[30px] shrink-0" />
                {t('footer.links.faq')}
              </Link>
              {isMember ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="drawer-row w-full text-left"
                >
                  <Icon name="logout" size={20} className="text-accent me-[30px] shrink-0" />
                  {tCommon('action.logout')}
                </button>
              ) : null}
            </div>
          </nav>
        ) : null}
      </aside>
    </div>
  );
}
