'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useModal } from '@/components/ui/ModalProvider';

type Milestone = {
  id: string;
  category: string;
  title: string;
  requirement: string;
  progress: string;
  progressMinor: number;
  requirementMinor: number;
  reward: string;
  status: string;
};

const CATEGORIES: { id: string; icon: IconName }[] = [
  { id: 'livecasino', icon: 'livecasino' },
  { id: 'sports', icon: 'sports' },
  { id: 'slots', icon: 'slots' },
];

/**
 * The achievement page body: the reference's two tab rows (period, then
 * category), the "Current Status" boxes and the turnover-bonus ladder — a
 * rail with a diamond per milestone and one target card per milestone, whose
 * Claim button turns mustard when the milestone is claimable. Milestones are
 * the mock achievements; the reference draws a fixed five-tier ladder.
 */
export function AchievementPanel({
  milestones,
  currency,
}: {
  milestones: Milestone[];
  currency: string;
}) {
  const t = useTranslations('account');
  const tn = useTranslations('nav');
  const modal = useModal();
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [period, setPeriod] = useState('weekly');

  const visible = milestones.filter((milestone) => milestone.category === category);
  const turnover = visible.reduce((sum, item) => sum + item.progressMinor, 0);
  const required = visible.reduce((sum, item) => sum + item.requirementMinor, 0);
  const next = Math.max(0, required - turnover);
  const progressPct = required > 0 ? Math.min(100, Math.round((turnover / required) * 100)) : 0;

  return (
    <div className="personal-achievement">
      <div className="achievement-date-tabs">
        <div className="nav-pill__wrapper">
          {(['weekly', 'lastWeek'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              className={`nav-pill${period === option ? ' selected' : ''}`}
              onClick={() => setPeriod(option)}
            >
              {period === option ? (
                <span className="nav-pill__tag">{tn('ui.live')}</span>
              ) : null}
              {t(`achievement.period.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="achievement-panel">
        <div className="achievement-category-tabs">
          <div className="nav-pill__wrapper betting-overflow-unset">
            {CATEGORIES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={category === option.id}
                className={`achievement-category${category === option.id ? ' is-selected' : ''}`}
                onClick={() => setCategory(option.id)}
              >
                <Icon name={option.icon} size={28} className="text-muted" />
                {t(`achievement.category.${option.id}`)}
              </button>
            ))}
          </div>
        </div>

        <h2 className="achievement-heading">{t('achievement.currentStatus')}</h2>
        <div className="achievement-details">
          <div className="ranking-container">
            <div className="ranking-container__box">
              <div className="ranking-container__box--title">
                {t('achievement.myTurnover', { game: t(`achievement.category.${category}`) })}
              </div>
              <div className="ranking-container__box--value">
                <div className="small-current">{currency}</div>
                {turnover.toLocaleString('en-MY')}
              </div>
            </div>
            <div className="ranking-container__box">
              <div className="ranking-container__box--title">{t('achievement.nextBonus')}</div>
              <div className="ranking-container__box--value">
                <div className="small-current">{currency}</div>
                {next.toLocaleString('en-MY')}
              </div>
            </div>
          </div>

          <h2 className="achievement-heading achievement-bonus-heading">
            {t('achievement.turnoverBonus')}
          </h2>
          <div className="mobile-scroll">
            <div
              className="achievement-track"
              style={
                {
                  '--tier-count': Math.max(visible.length, 1),
                  '--mobile-progress': `${progressPct}%`,
                  '--progress': `max(0px, calc((100% + 18px) * ${progressPct / 100} - 9px))`,
                } as React.CSSProperties
              }
            >
              <div
                className="achievement-track__rail"
                role="progressbar"
                aria-label={t('achievement.turnoverBonus')}
                aria-valuemin={0}
                aria-valuemax={required}
                aria-valuenow={turnover}
              >
                <div className="achievement-track__fill" />
              </div>
              <div className="achievement-track__tiers">
                {visible.map((milestone) => (
                  <div key={milestone.id} className="achievement-track__tier">
                    <span
                      className={`achievement-track__marker${
                        milestone.status === 'claimed' || milestone.status === 'claimable' ? ' is-passed' : ''
                      }`}
                      aria-hidden
                    />
                    <span>
                      {currency} {milestone.requirement}
                    </span>
                  </div>
                ))}
              </div>
              <div className="target-list">
                {visible.map((milestone) => (
                  <div key={milestone.id} className="target-item">
                    <div className="target-title">
                      <span className="coin-box" aria-hidden>
                        <Icon name="trophy" size={40} className="text-accent" />
                      </span>
                      <span className="achievement-reward">
                        {t('achievement.reward', { amount: milestone.reward })}
                      </span>
                      <span className="achievement-requirement">
                        {t('achievement.requirement', { currency, amount: milestone.requirement })}
                      </span>
                      <button
                        type="button"
                        className={`btn-claim${
                          milestone.status === 'claimable' ? ' btn-claim-selected' : ''
                        }`}
                        disabled={milestone.status !== 'claimable'}
                        onClick={() =>
                          modal.success(
                            t('actions.demoClaimTitle'),
                            t('actions.demoClaimBody', { what: milestone.title, amount: milestone.reward }),
                          )
                        }
                      >
                        {milestone.status === 'claimed' ? t('rebates.claimed') : t('rebates.claim')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
