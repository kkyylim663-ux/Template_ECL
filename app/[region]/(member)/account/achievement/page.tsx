import type { Metadata } from 'next';
import { getAccountPayload } from '@/lib/api';
import { ClaimButton } from '@/components/account/actions';

export const metadata: Metadata = { robots: { index: false, follow: false } };
const CURRENCY = 'MYR';
const money = (amountMinor: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 2 }).format(
    amountMinor / 100,
  );

export default async function AchievementPage() {
  const payload = await getAccountPayload();

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-ink text-sm font-semibold">Achievements</h2>
        <p className="text-muted mt-1 text-xs">
          Progress is calculated from settled bets in each product.
        </p>
      </header>

      <ul className="grid gap-3 desktop:grid-cols-3">
        {payload.achievements.map((achievement) => {
          const progress = Math.min(
            100,
            Math.round((achievement.progressMinor / achievement.requirementMinor) * 100),
          );
          return (
            <li key={achievement.id} className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
              <p className="text-muted text-[11px] tracking-widest uppercase">{achievement.gameType}</p>
              <p className="text-ink mt-1 text-sm font-semibold">{achievement.title}</p>
              <p className="text-muted mt-2 font-mono text-xs">
                {money(achievement.progressMinor)} / {money(achievement.requirementMinor)}
              </p>
              <div className="bg-panel-soft mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <span className="bg-accent block h-full" style={{ width: `${progress}%` }} aria-hidden />
              </div>
              <div className="mt-3">
                {achievement.status === 'claimable' ? (
                  <ClaimButton
                    label="Claim reward"
                    amount={money(achievement.rewardMinor)}
                    what={achievement.title}
                  />
                ) : (
                  <span className="text-muted text-[11px]">
                    {achievement.status === 'claimed' ? 'Claimed' : 'In progress'}
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
