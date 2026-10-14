'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { regionPath } from '@/config/nav';
import { Icon, type IconName } from '@/components/ui/Icon';

/** Labels are `account.*` keys; the sub-nav follows the language cookie. */
const ITEMS: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/account/deposit', labelKey: 'deposit.title', icon: 'wallet' },
  { href: '/account/withdrawal', labelKey: 'withdrawal.title', icon: 'withdraw' },
  { href: '/account/transfer', labelKey: 'transfer.title', icon: 'transfer' },
  { href: '/account/history', labelKey: 'history.title', icon: 'history' },
  { href: '/account/pending', labelKey: 'pending.title', icon: 'pending' },
  { href: '/account/inbox', labelKey: 'inbox.title', icon: 'mail' },
  { href: '/account/rebates', labelKey: 'rebates.title', icon: 'rebate' },
  { href: '/account/achievement', labelKey: 'achievement.title', icon: 'achievement' },
  { href: '/account/tickets', labelKey: 'tickets.title', icon: 'ticket' },
  { href: '/account/profile', labelKey: 'profile.title', icon: 'user' },
];

/**
 * Shared sub-navigation for the ten member pages. Client-side only to know which
 * item is current — the links themselves are ordinary anchors.
 */
export function AccountNav({ region }: { region: string }) {
  const t = useTranslations('account');
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('sections')}
      className="border-line -mx-4 overflow-x-auto border-b desktop:mx-0"
    >
      <ul className="flex w-max gap-1 px-4 pb-px desktop:px-0">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={regionPath(region, item.href)}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap ${
                  isActive ? 'border-accent text-accent' : 'text-muted hover:text-ink border-transparent'
                }`}
              >
                <Icon name={item.icon} size={16} />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
