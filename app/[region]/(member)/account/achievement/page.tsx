import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { regionConfig, type RegionCode } from '@/config/brand';
import { ClaimButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };
const money = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    amountMinor / 100,
  );

export default async function AchievementPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const [{ t }, payload] = await Promise.all([getT('account'), getAccountPayload()]);
  const currency = regionConfig(region as RegionCode).currency;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-ink text-sm font-semibold">{t('achievement.title')}</h2>
        <p className="text-muted mt-1 text-xs">{t('achievement.intro')}</p>
      </header>

      <ul className="grid gap-3 desktop:grid-cols-3">
        {payload.achievements.map((achievement) => {
          const progress = Math.min(
            100,
            Math.round((achievement.progressMinor / achievement.requirementMinor) * 100),
          );
          return (
            <li key={achievement.id} className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
              <p className="text-muted text-[11px] tracking-widest uppercase">
                {t(`achievement.${achievement.gameType}`)}
              </p>
              <p className="text-ink mt-1 text-sm font-semibold">{achievement.title}</p>
              <p className="text-muted mt-2 font-mono text-xs">
                {t('achievement.progress', {
                  progress: money(achievement.progressMinor, currency),
                  target: money(achievement.requirementMinor, currency),
                })}
              </p>
              <div className="bg-panel-soft mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <span className="bg-accent block h-full" style={{ width: `${progress}%` }} aria-hidden />
              </div>
              <div className="mt-3">
                {achievement.status === 'claimable' ? (
                  <ClaimButton
                    label={t('achievement.claim')}
                    amount={money(achievement.rewardMinor, currency)}
                    what={achievement.title}
                  />
                ) : (
                  <span className="text-muted text-[11px]">
                    {achievement.status === 'claimed'
                      ? t('achievement.claimed')
                      : t('achievement.inProgress')}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
