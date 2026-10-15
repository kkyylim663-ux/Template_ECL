'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MOBILE_BAR_ITEMS, regionPath } from '@/config/nav';
import { Icon } from '@/components/ui/Icon';

/**
 * Mobile bottom bar, measured from the original (`.footer-container__mobile`):
 * a floating glass pill — 90% wide, centred, 10px off the bottom, 999px radius,
 * 10px vertical padding — holding five 37px items (21px icon over an 11.2px
 * label). The current route's item is mustard and its icon pops once
 * (`.selected` + `animateBall` on the original).
 *
 * Client-side only because the selected item follows the route; the labels are
 * still translated from the `nav` namespace.
 */
export function MobileFooterBar({ region }: { region: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname() ?? '';
  const home = `/${region}`;

  return (
    <nav
      aria-label={t('ui.quickNav')}
      className="mobile-bar fixed bottom-[10px] left-1/2 z-[var(--z-mobile-footer)] flex w-[90%] -translate-x-1/2 items-stretch px-0 py-[10px] desktop:hidden"
    >
      {MOBILE_BAR_ITEMS.map((item) => {
        const href = regionPath(region, item.href);
        const here = item.href === '' ? pathname === home || pathname === `${home}/` : pathname === href;
        return (
          <Link
            key={item.labelKey}
            href={href}
            aria-current={here ? 'page' : undefined}
            className="flex flex-1 flex-col items-center text-11 leading-[13px]"
          >
            <Icon
              name={item.icon ?? 'home'}
              size={21}
              className={`mobile-bar__icon mb-[0.2rem] ${here ? 'text-accent' : 'text-white'}`}
            />
            <span className={here ? 'text-accent' : 'text-white'}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
