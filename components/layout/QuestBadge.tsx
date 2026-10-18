'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/Icon';
import { regionPath } from '@/config/nav';

/**
 * The header's Quest pill and the panel it opens (T81 follow-up). The reference
 * keeps the panel mounted and scales it in (`.quest-content` → `.active`); the
 * five cards — and their status figures — are its own, probed live on
 * 2026-10-18. Guest-visible: it makes no request, and the scores are mock data.
 */
type QuestCard = {
  id: string;
  titleKey: string;
  badgeKey: string;
  statusKey: string;
  score: string;
  href: string;
  icon: IconName;
};

const QUESTS: QuestCard[] = [
  {
    id: 'numbergame',
    titleKey: 'quest.c1',
    badgeKey: 'quest.daily',
    statusKey: 'quest.ticket',
    score: '0',
    href: '/numbergame',
    icon: 'numbers',
  },
  {
    id: 'fifa',
    titleKey: 'quest.c2',
    badgeKey: 'quest.special',
    statusKey: 'quest.ticket',
    score: 'MYR0 / MYR-',
    href: '/prediction',
    icon: 'prediction',
  },
  {
    id: 'sports',
    titleKey: 'quest.c3',
    badgeKey: 'quest.weekly',
    statusKey: 'quest.complete',
    score: 'MYR0 / MYR7400',
    href: '/account/achievement',
    icon: 'sports',
  },
  {
    id: 'livecasino',
    titleKey: 'quest.c4',
    badgeKey: 'quest.weekly',
    statusKey: 'quest.complete',
    score: 'MYR0 / MYR9900',
    href: '/account/achievement',
    icon: 'livecasino',
  },
  {
    id: 'slots',
    titleKey: 'quest.c5',
    badgeKey: 'quest.weekly',
    statusKey: 'quest.complete',
    score: 'MYR0 / MYR7600',
    href: '/account/achievement',
    icon: 'slots',
  },
];

export function QuestBadge({ region }: { region: string }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="quest-badge__wrapper">
      <button
        type="button"
        className="quest-badge"
        aria-expanded={open}
        aria-controls="quest-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="quest-text">{t('ui.quest')}</span>
        <Icon name="trophy" size={28} className="quest-icon text-white" />
        {/* T76: 10px white on the brand green reads 3.37:1; the dark ink is the
            AA pairing. aria-hidden keeps the label-content-name check happy —
            the accessible name ("Quest") then matches the visible text. */}
        <span className="quest-live" aria-hidden>
          {t('ui.live')}
        </span>
      </button>

      <div
        id="quest-panel"
        className={`quest-content${open ? ' active' : ''}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="quest-header">
          <p className="quest-header__text">{t('ui.quest')}</p>
          <button
            type="button"
            className="quest-header__close"
            aria-label={t('quest.close')}
            onClick={() => setOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="quest-body">
          {QUESTS.map((quest) => (
            <div className="quest-card" key={quest.id}>
              <div className="quest-card__header">
                <p className="quest-card__header-title">{t(quest.titleKey)}</p>
                <span className="quest-card__header-badge">{t(quest.badgeKey)}</span>
              </div>
              <div className="quest-card__body">
                <div className="quest-card__body-left">
                  <Icon name={quest.icon} size={44} className="quest-card__img" />
                  <div className="quest-card__status">
                    <div>{t(quest.statusKey)}</div>
                    <div className="quest-card__status-score">{quest.score}</div>
                  </div>
                </div>
                <Link
                  href={regionPath(region, quest.href)}
                  className="quest-card__button"
                  onClick={() => setOpen(false)}
                >
                  {t('quest.go')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
