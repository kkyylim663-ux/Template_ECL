'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/Field';
import { useModal } from '@/components/ui/ModalProvider';
import { formatDate, formatMinorPlain } from '@/lib/format';
import { achievementProgress, achievementTiers, type AchievementTier } from '@/lib/achievement-rules';
import { creditAchievement, type ClaimedAchievement } from '@/lib/achievement-claim';
import { walletService } from '@/lib/api/wallet';
import { achievementsInfoSchema, type AchievementsInfo } from '@/lib/api/schemas';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

const CATEGORIES: { id: string; icon: IconName }[] = [
  { id: 'livecasino', icon: 'livecasino' },
  { id: 'sports', icon: 'sports' },
  { id: 'slots', icon: 'slots' },
];

/**
 * The achievement page body. The reference (`/my/personal-achievement`) is
 * JS-rendered and its client chunk was never captured, so the layout follows the
 * captured CSS (`.personal-achievement`, the period/category tab rows, the
 * "Current Status" boxes and the turnover-bonus ladder with one target card per
 * rung) and the data side is ours: the fixture's rows carry the rung state, a
 * claim record wins over the fixture's own column, and claiming credits the mock
 * wallet and mirrors the payout into history.
 *
 * Claiming is two-sided by design, like rebates: the server owns "this rung is
 * claimed" (so a refresh cannot claim twice), the browser owns the mock wallet
 * and the history row.
 */
export function AchievementPanel({
  symbol,
  initial,
}: {
  symbol: string;
  initial: AchievementsInfo;
}) {
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const modal = useModal();

  const [state, setState] = useState<LoadState>(
    initial.achievements.length === 0 ? 'empty' : 'ready',
  );
  const [info, setInfo] = useState<AchievementsInfo | null>(initial);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [period, setPeriod] = useState('weekly');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const response = await fetch('/api/achievements', { cache: 'no-store' });
      const payload = (await response.json()) as { status?: string; d?: unknown };
      if (payload?.status !== '0') throw new Error(payload?.status ?? `HTTP ${response.status}`);
      const data = achievementsInfoSchema.parse(payload.d);
      setInfo(data);
      setState(data.achievements.length === 0 ? 'empty' : 'ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    // The server rendered the rung state (so the first paint carries it); this
    // re-reads the page's data — on mount and after a claim moves a rung.
    void load();
  }, [load]);

  const rows = useMemo(
    () => info?.achievements.filter((row) => row.gameType === category) ?? [],
    [info, category],
  );
  const progress = useMemo(() => achievementProgress(rows), [rows]);
  const tiers = useMemo(() => achievementTiers(rows), [rows]);
  const progressPct =
    progress.spanMinor > 0
      ? Math.max(0, Math.min(100, Math.round(((progress.progressMinor - progress.floorMinor) / progress.spanMinor) * 100)))
      : 100;

  const money = (minor: number) => `${symbol} ${formatMinorPlain(minor)}`;
  const plain = (minor: number) =>
    (minor / 100).toLocaleString('en-MY', { maximumFractionDigits: 0 });

  async function claim(tier: AchievementTier) {
    const row = info?.achievements.find((entry) => entry.id === tier.id);
    if (!row || row.status !== 'claimable') return;
    setBusy(row.id);
    try {
      const response = await fetch('/api/achievements/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ achievementId: row.id, idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as { status?: string; d?: ClaimedAchievement };
      if (payload?.status !== '0' || !payload.d) {
        throw new Error(payload?.status ?? String(response.status));
      }
      await creditAchievement(payload.d, {
        labels: { promoType: t('achievement.promoType', { title: row.title, tier: plain(row.requirementMinor) }) },
        credit: (amountMinor, key) => walletService.deposit(amountMinor, key),
      });
      modal.success(
        t('achievement.claimSuccessTitle', { title: row.title }),
        t('achievement.claimSuccessBody', { amount: money(row.rewardMinor) }),
      );
      await load();
    } catch {
      modal.error(t('achievement.claimErrorTitle'), t('achievement.claimErrorBody'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="personal-achievement" data-state={state} data-testid="achievement-state">
      {state === 'loading' ? (
        <p className="withdraw-state__text" aria-busy="true">
          {tc('state.loading')}
        </p>
      ) : null}

      {state === 'error' ? (
        <>
          <div className="no-info-box">{t('achievement.errorBody')}</div>
          <div className="withdraw-state__action">
            <PrimaryButton type="button" onClick={() => void load()}>
              {tc('action.retry')}
            </PrimaryButton>
          </div>
        </>
      ) : null}

      {state === 'empty' ? <div className="no-info-box">{t('achievement.emptyBody')}</div> : null}

      {info && state === 'ready' ? (
        <>
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
                  {period === option ? <span className="nav-pill__tag">{t('achievement.live')}</span> : null}
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
                  <div className="ranking-container__box--value" data-testid="achievement-turnover">
                    <div className="small-current">{symbol}</div>
                    {plain(progress.turnoverMinor)}
                  </div>
                </div>
                <div className="ranking-container__box">
                  <div className="ranking-container__box--title">{t('achievement.nextBonus')}</div>
                  <div className="ranking-container__box--value" data-testid="achievement-next">
                    <div className="small-current">{symbol}</div>
                    {plain(progress.remainingMinor)}
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
                      '--tier-count': Math.max(tiers.length, 1),
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
                    aria-valuemax={progress.targetMinor ?? progress.turnoverMinor}
                    aria-valuenow={progress.progressMinor}
                  >
                    <div className="achievement-track__fill" />
                  </div>
                  <div className="achievement-track__tiers">
                    {tiers.map((tier) => (
                      <div key={tier.id} className="achievement-track__tier">
                        <span
                          className={`achievement-track__marker${
                            tier.status === 'claimed' || tier.status === 'claimable' ? ' is-passed' : ''
                          }`}
                          aria-hidden
                        />
                        <span>{`${symbol} ${plain(tier.requirementMinor)}`}</span>
                      </div>
                    ))}
                  </div>
                  <div className="target-list">
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="target-item"
                        data-testid="achievement-card"
                        data-id={tier.id}
                        data-status={tier.status}
                      >
                        <div className="target-title">
                          <span className="coin-box" aria-hidden>
                            <Icon name="trophy" size={40} className="text-accent" />
                          </span>
                          <span className="achievement-reward">
                            {t('achievement.reward', { amount: money(tier.rewardMinor) })}
                          </span>
                          <span className="achievement-requirement">
                            {t('achievement.requirement', { currency: symbol, amount: plain(tier.requirementMinor) })}
                          </span>
                          <button
                            type="button"
                            className={`btn-claim${tier.status === 'claimable' ? ' btn-claim-selected' : ''}`}
                            disabled={tier.status !== 'claimable' || busy === tier.id}
                            data-testid="achievement-claim"
                            onClick={() => void claim(tier)}
                          >
                            {tier.status === 'claimed'
                              ? t('achievement.claimed')
                              : tier.status === 'claimable'
                                ? t('achievement.claim')
                                : t('achievement.inProgress')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <section className="rebates-records">
                <h2 className="rebates-records__title">{t('achievement.recordsTitle')}</h2>
                {info.claims.length === 0 ? (
                  <p className="rebates-records__empty">{t('achievement.recordsEmpty')}</p>
                ) : (
                  <table className="bank-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('achievement.achievement')}</th>
                        <th scope="col">{t('achievement.rewardColumn')}</th>
                        <th scope="col">{t('achievement.claimedAt')}</th>
                        <th scope="col">{t('achievement.reference')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info.claims.map((entry) => (
                        <tr key={entry.id} data-testid="achievement-record" data-achievement={entry.achievementId}>
                          <td>{entry.title}</td>
                          <td>{money(entry.rewardMinor)}</td>
                          <td>{formatDate(entry.claimedAt)}</td>
                          <td>{entry.reference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
