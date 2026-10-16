'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { regionPath } from '@/config/nav';
import { Icon, type IconName } from '@/components/ui/Icon';

type MenuItem = { href: string; labelKey: string; icon: IconName };

/**
 * The account menu, measured from the reference (`.account-menu__*`): two
 * groups, 61px rows (60px content + a 1px hairline), 14px/500 labels in
 * `--color-muted`, and a #373737 15px-radius surface on the current row. The
 * first group's title element is present but empty — that is where the
 * reference's 6px top offset comes from.
 *
 * The item set is the reference's, mapped to our routes: "My Wallet" points at
 * /my/mytransfer in the reference too. "Banking Details" (/my/mybanks) is the
 * one item with no crawled page, so it is left out rather than pointed at an
 * invented route; the standalone achievement and ticket pages are likewise not
 * menu entries in the reference, so they are not added here.
 */
const GROUPS: { titleKey?: string; items: MenuItem[] }[] = [
  {
    items: [
      { href: '/account/deposit', labelKey: 'deposit.title', icon: 'wallet' },
      { href: '/account/withdrawal', labelKey: 'withdrawal.title', icon: 'withdraw' },
      { href: '/account/transfer', labelKey: 'transfer.title', icon: 'transfer' },
      { href: '/account/history', labelKey: 'history.title', icon: 'history' },
      { href: '/account/pending', labelKey: 'pending.title', icon: 'pending' },
    ],
  },
  {
    titleKey: 'menu.sectionAccount',
    items: [
      { href: '/account/inbox', labelKey: 'inbox.title', icon: 'mail' },
      { href: '/account/profile', labelKey: 'profile.title', icon: 'user' },
      { href: '/account/rebates', labelKey: 'rebates.title', icon: 'rebate' },
    ],
  },
];

export function AccountMenu({ region }: { region: string }) {
  const t = useTranslations('account');
  const pathname = usePathname();

  return (
    <div className="account-menu__sidebar">
      {GROUPS.map((group, index) => (
        <div key={group.titleKey ?? index} className="account-menu__container">
          <div className="account-menu__parent-title">
            {group.titleKey ? t(group.titleKey) : ''}
          </div>
          <div className="account-menu__child">
            {group.items.map((item) => {
              const isSelected = pathname === item.href;
              return (
                <Link key={item.href} href={regionPath(region, item.href)} className="account-menu__child-wrapper">
                  <span
                    className={`account-menu__child-container${isSelected ? ' selected' : ''}`}
                    {...(isSelected ? { 'aria-current': 'page' as const } : {})}
                  >
                    <Icon name={item.icon} size={20} className="account-menu__child-icon" />
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
