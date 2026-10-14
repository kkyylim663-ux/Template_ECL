'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { regionPath } from '@/config/nav';
import { Icon, type IconName } from '@/components/ui/Icon';

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/account/deposit', label: 'Deposit', icon: 'wallet' },
  { href: '/account/withdrawal', label: 'Withdrawal', icon: 'withdraw' },
  { href: '/account/transfer', label: 'Transfer', icon: 'transfer' },
  { href: '/account/history', label: 'History', icon: 'history' },
  { href: '/account/pending', label: 'Pending', icon: 'pending' },
  { href: '/account/inbox', label: 'Inbox', icon: 'mail' },
  { href: '/account/rebates', label: 'Rebates', icon: 'rebate' },
  { href: '/account/achievement', label: 'Achievements', icon: 'achievement' },
  { href: '/account/tickets', label: 'Tickets', icon: 'ticket' },
  { href: '/account/profile', label: 'Profile', icon: 'user' },
];

/**
 * Shared sub-navigation for the ten member pages. Client-side only to know which
 * item is current — the links themselves are ordinary anchors.
 */
export function AccountNav({ region }: { region: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account sections"
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
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
