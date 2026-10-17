'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PRIMARY_MENU, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

/**
 * Primary desktop menu, measured from the original:
 * - items are `height: inherit` in a 78px bar, separated by 58px right margins;
 * - the label is 16px in `--color-muted` with a 20px chevron that rotates 180deg
 *   while open, and a 1px bottom border that turns mustard;
 * - the panel is always in the DOM at `scale(0)` and opens to `scale(1)`
 *   (origin 1.5rem 0, `all .3s`), 10px below a 79px top offset;
 * - inside is a flat `--color-modal-inset` block (20px 30px 30px) with a 20px
 *   title and a 5-column grid of 140x104 tiles in `--color-tile`.
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
    <nav ref={navRef} className="flex h-full" aria-label={t('ui.primaryNav')}>
      {PRIMARY_MENU.map((group) => {
        const open = openId === group.id;
        return (
          <div
            key={group.id}
            className="border-b-panel-soft hover:border-b-accent group relative flex h-full items-center border-b me-[58px]"
            onMouseEnter={() => setOpenId(group.id)}
            onMouseLeave={() => setOpenId((current) => (current === group.id ? null : current))}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpenId(open ? null : group.id)}
              className={`text-muted flex items-center text-base leading-[19px] font-normal transition-colors ${
                open ? 'text-accent' : 'group-hover:text-accent'
              }`}
            >
              {t(group.labelKey)}
              <Icon
                name="chevronUp"
                size={20}
                className={`ms-2.5 transition-transform duration-300 ${open ? 'rotate-0' : 'rotate-180'}`}
              />
            </button>

            <div
              data-open={open ? 'true' : 'false'}
              className="menu-panel absolute top-[79px] left-0 z-[var(--z-dropdown)] mt-2.5"
            >
              <div className="bg-modal-inset relative px-[30px] pt-5 pb-[30px]">
                <h2 className="mb-5 text-xl leading-6 font-medium text-white">{t(group.labelKey)}</h2>
                <ul className="grid w-[700px] grid-cols-[repeat(5,140px)] gap-y-2.5 overflow-hidden rounded-[15px]">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={regionPath(region, item.href)}
                        onClick={() => setOpenId(null)}
                        className="border-line-alt bg-tile hover:drop-shadow-[2px_2px_5px_rgba(0,0,0,0.5)] group/tile flex h-[104px] w-[140px] flex-col items-center justify-center overflow-hidden border-r-2"
                      >
                        {item.icon ? (
                          <Icon
                            name={item.icon}
                            size={30}
                            className="mb-[5px] text-white transition-transform duration-300 group-hover/tile:scale-115"
                          />
                        ) : null}
                        <span className="text-muted text-center text-sm font-normal transition-transform duration-300 group-hover/tile:scale-115">
                          {t(item.labelKey)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
