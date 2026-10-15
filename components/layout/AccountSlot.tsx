'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { brand } from '@/config/brand';
import { useSession } from '@/lib/session/useSession';

/** First two letters of the brand name — the avatar placeholder. */
const brandInitials = brand.name.slice(0, 2).toUpperCase();

/**
 * Header account area. Renders the guest state on the server so public pages stay
 * static; once mounted it swaps to the member state once the session check answers.
 * Amounts are demo data, not copy, so they stay literals.
 */
export function AccountSlot({ region }: { region: string }) {
  const t = useTranslations('common');
  const { member: isMember, username } = useSession();

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

  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-2.5" aria-label={t('header.summary')}>
        <span className="bg-panel-soft text-accent border-line grid size-9 place-items-center rounded-full border text-xs font-semibold">
          {brandInitials}
        </span>
        <span className="text-left">
          <span className="text-ink block text-xs leading-tight font-medium">{username}</span>
          <span className="text-muted block text-11 leading-tight">
            {t('header.balance', { amount: 'RM 1,234.50' })}
          </span>
        </span>
      </button>

      <div className="border-line bg-panel-alt invisible absolute top-full right-0 z-40 mt-2 w-56 rounded-[var(--radius-panel)] border p-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
        <p className="text-muted text-11 tracking-wide uppercase">{t('header.summary')}</p>
        <dl className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted">{t('balance.main')}</dt>
            <dd className="text-ink">RM 1,234.50</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t('header.unread')}</dt>
            <dd className="text-ink">2</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t('header.tierLabel')}</dt>
            <dd className="text-accent">Silver</dd>
          </div>
        </dl>
        <p className="border-line text-muted mt-3 border-t pt-2 text-11">{t('header.demoNote')}</p>
      </div>
    </div>
  );
}
