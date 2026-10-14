'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { getLaunchHref, type LaunchMode } from '@/lib/game/launch';

const VARIANTS = {
  primary: 'bg-accent text-[#1b1b1b] font-semibold',
  secondary: 'border border-accent text-accent font-semibold',
  quiet: 'border border-line text-ink',
} as const;

/**
 * Every "enter a game" control in the project. The href always comes from
 * getLaunchHref() (which is `#` in P0), the click never navigates, and the
 * data-* attributes are there so the intent is inspectable and testable.
 */
export function LaunchButton({
  provider,
  gameId,
  mode = 'real',
  label,
  variant = 'primary',
  ariaLabel,
  onActivate,
  className,
}: {
  provider: string;
  gameId?: string;
  mode?: LaunchMode;
  label?: ReactNode;
  variant?: keyof typeof VARIANTS;
  ariaLabel?: string;
  /** Extra behaviour for a click that must not navigate (e.g. the VPN notice). */
  onActivate?: () => void;
  className?: string;
}) {
  const t = useTranslations('games');
  const href = getLaunchHref({ provider, gameId, mode });

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      data-provider={provider}
      data-game-id={gameId}
      data-mode={mode}
      onClick={(event) => {
        if (href === '#') event.preventDefault();
        onActivate?.();
      }}
      className={`inline-flex items-center justify-center rounded-[8px] px-3 py-1.5 text-xs ${VARIANTS[variant]} ${className ?? ''}`}
    >
      {label ?? t('card.playNow')}
    </a>
  );
}
