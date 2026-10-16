'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { brand } from '@/config/brand';
import { regionPath } from '@/config/nav';
import { formatMinor } from '@/lib/format';
import { useUnreadCount } from '@/lib/api/inbox';
import { signOutRequest, useSession } from '@/lib/session/useSession';

/** First two letters of the brand name — the avatar placeholder. */
const brandInitials = brand.name.slice(0, 2).toUpperCase();

const ACCOUNT_LINKS = [
  { href: '/account/deposit', key: 'deposit' },
  { href: '/account/withdrawal', key: 'withdrawal' },
  { href: '/account/transfer', key: 'transfer' },
  { href: '/account/history', key: 'history' },
  { href: '/account/inbox', key: 'inbox' },
  { href: '/account/profile', key: 'profile' },
] as const;

/**
 * Header account area. Renders the guest state on the server so public pages stay
 * static; once mounted it swaps to the member state once the session check answers.
 */
export function AccountSlot({ region }: { region: string }) {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const { member: isMember, username, balanceMinor, currency, unread } = useSession();
  // The inbox page's local read/delete state adjusts the server's count.
  const unreadCount = useUnreadCount(unread);

  if (!isMember) {
    return (
      <div className="flex items-center">
        <Link
          href={`/${region}/login`}
          className="me-[54px] text-sm font-bold text-white hover:text-[var(--color-accent)]"
        >
          {t('action.login')}
        </Link>
        <Link
          href={`/${region}/register`}
          className="bg-accent hover:bg-accent-bright flex h-[41px] items-center rounded-[15px] px-[33px] text-sm font-bold text-black"
        >
          {t('action.register')}
        </Link>
      </div>
    );
  }

  async function onSignOut() {
    await signOutRequest();
    router.push(regionPath(region, ''));
    router.refresh();
  }

  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-2.5" aria-label={t('header.summary')}>
        <span className="bg-panel-soft text-accent border-line grid size-9 place-items-center rounded-full border text-xs font-semibold">
          {brandInitials}
        </span>
        <span className="text-left">
          <span className="text-ink block text-xs leading-tight font-medium">{username}</span>
          <span className="text-muted block text-11 leading-tight">
            {t('header.balance', { amount: formatMinor(balanceMinor, currency) })}
          </span>
        </span>
      </button>

      <div className="border-line bg-panel-alt invisible absolute top-full right-0 z-40 mt-2 w-56 rounded-[var(--radius-panel)] border p-3 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <p className="text-muted text-11 tracking-wide uppercase">{t('header.summary')}</p>
        <dl className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted">{t('balance.main')}</dt>
            <dd className="text-ink">{formatMinor(balanceMinor, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t('header.unread')}</dt>
            <dd className="text-ink">{unreadCount}</dd>
          </div>
        </dl>
        <ul className="border-line mt-3 space-y-1 border-t pt-2 text-xs">
          {ACCOUNT_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={regionPath(region, item.href)}
                className="text-ink hover:text-accent flex justify-between py-1"
              >
                {tNav(`items.${item.key}`)}
                {item.key === 'inbox' && unreadCount > 0 ? (
                  <span className="bg-danger rounded-full px-1.5 text-10 leading-4 text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onSignOut}
              className="text-muted hover:text-accent w-full py-1 text-start"
            >
              {t('action.logout')}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
