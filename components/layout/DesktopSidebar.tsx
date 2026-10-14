'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SIDEBAR_ITEMS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

/**
 * Desktop navigation, per docs/UI_REFERENCE.md:
 * - a 62px icon rail (`sidebar-mini`) fixed on the left, always visible;
 * - a 16rem panel (`sidebar2`) that slides in over it with translateX, 0.3s.
 */
export function DesktopSidebar({ region }: { region: string }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Icon rail */}
      <div
        className="border-line bg-panel fixed top-0 bottom-0 left-0 z-[13] hidden w-[var(--sidebar-mini-width)] flex-col items-center gap-1 border-r py-3 desktop:flex"
        aria-label={t('ui.iconRail')}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('ui.expandNav')}
          aria-expanded={open}
          className="text-muted hover:text-accent grid size-10 place-items-center rounded-[10px]"
        >
          <Icon name="menu" size={22} />
        </button>

        <ul className="mt-2 flex flex-1 flex-col items-center gap-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => (
            <li key={item.href || 'lobby'}>
              <Link
                href={regionPath(region, item.href)}
                title={t(item.labelKey)}
                className="text-muted hover:bg-panel-soft hover:text-accent grid size-10 place-items-center rounded-[10px]"
              >
                <Icon name={item.icon ?? 'home'} size={22} />
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
        className={`border-line bg-panel fixed top-0 bottom-0 left-0 z-[14] hidden w-[var(--sidebar-width)] flex-col border-r transition-transform duration-300 ease-out desktop:flex ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-line flex h-[68px] items-center justify-between border-b px-5">
          <span className="text-ink text-sm font-semibold tracking-[0.2em] uppercase">{t('ui.menu')}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('ui.collapseNav')}
            className="text-muted hover:text-accent grid size-9 place-items-center rounded-[10px]"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.href || 'lobby'}>
                <Link
                  href={regionPath(region, item.href)}
                  onClick={() => setOpen(false)}
                  className="text-ink/90 hover:bg-panel-soft hover:text-accent flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium"
                >
                  <Icon name={item.icon ?? 'home'} size={20} className="text-accent shrink-0" />
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="border-line text-muted border-t px-5 py-3 text-[11px]">
          {t('ui.demoNote')}
        </p>
      </aside>
    </>
  );
}
