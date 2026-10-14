'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PRIMARY_MENU, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

/**
 * Primary desktop menu: three dropdown cards (Games / Events / Account).
 * Opens on hover and on keyboard focus, closes on Escape or a click outside.
 */
export function HeaderMenu({ region }: { region: string }) {
  const t = useTranslations('nav');
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenId(null);
    }
    function onPointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenId(null);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  return (
    <nav ref={navRef} className="flex items-stretch gap-[58px]" aria-label={t('ui.primaryNav')}>
      {PRIMARY_MENU.map((group) => {
        const open = openId === group.id;
        return (
          <div
            key={group.id}
            className="relative flex items-center"
            onMouseEnter={() => setOpenId(group.id)}
            onMouseLeave={() => setOpenId((current) => (current === group.id ? null : current))}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpenId(open ? null : group.id)}
              className={`border-b-2 px-0.5 py-2 text-sm font-medium transition-colors ${
                open
                  ? 'border-accent text-accent'
                  : 'text-ink/90 hover:border-accent hover:text-accent border-transparent'
              }`}
            >
              {t(group.labelKey)}
            </button>

            {open ? (
              <div
                className="border-line bg-panel-alt absolute top-full left-1/2 z-40 w-[22rem] -translate-x-1/2 rounded-[var(--radius-panel)] border p-2 shadow-2xl shadow-black/50"
                role="menu"
              >
                <ul className="grid gap-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={regionPath(region, item.href)}
                        onClick={() => setOpenId(null)}
                        className="hover:bg-panel-soft flex items-center gap-3 rounded-[10px] px-3 py-2"
                      >
                        {item.icon ? (
                          <Icon name={item.icon} size={20} className="text-accent shrink-0" />
                        ) : null}
                        <span className="min-w-0">
                          <span className="text-ink block truncate text-sm font-medium">
                            {t(item.labelKey)}
                          </span>
                          {item.descKey ? (
                            <span className="text-muted block truncate text-xs">
                              {t(item.descKey)}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
