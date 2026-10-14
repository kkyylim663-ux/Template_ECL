import type { Metadata } from 'next';
import Link from 'next/link';
import { PREDICTION_LEAGUES, getDisplayPayload } from '@/lib/api';
import { InertLink } from '@/components/ui/InertLink';
import { LaunchButton } from '@/components/game/LaunchButton';
import { RulesButton } from '@/components/ui/RulesButton';
import { regionPath } from '@/config/nav';

export const metadata: Metadata = {
  title: 'Prediction',
  description: 'Free-to-enter predictions across three leagues.',
};

const PREDICTION_RULES =
  'Predictions are free to enter. Each correct pick earns points that place you on the monthly board; the top entries share the prize pool. Picks lock at the scheduled kick-off time and cannot be changed afterwards. Entries are disabled in this build.';

export default async function PredictionPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const { prediction } = await getDisplayPayload();

  const requested = typeof query.league === 'string' ? query.league : '';
  const league = (PREDICTION_LEAGUES as readonly string[]).includes(requested)
    ? (requested as (typeof PREDICTION_LEAGUES)[number])
    : PREDICTION_LEAGUES[0];

  const fixtures = prediction.filter((fixture) => fixture.league === league);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">Prediction</h1>
          <p className="text-muted mt-1 text-xs">
            Free entry · {fixtures.length} fixtures this week
          </p>
        </div>
        <RulesButton title="Prediction rules" body={PREDICTION_RULES} />
      </header>

      <nav aria-label="Leagues" className="border-line mt-5 flex gap-1 border-b">
        {PREDICTION_LEAGUES.map((option) => {
          const active = option === league;
          return (
            <Link
              key={option}
              href={`${regionPath(region, '/prediction')}?league=${option}`}
              aria-current={active ? 'true' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-xs font-semibold tracking-wide uppercase ${
                active ? 'border-accent text-accent' : 'text-muted hover:text-ink border-transparent'
              }`}
            >
              {option}
            </Link>
          );
        })}
      </nav>

      <ul className="mt-5 grid gap-3 desktop:grid-cols-2">
        {fixtures.map((fixture) => (
          <li key={fixture.id} className="border-line bg-panel rounded-[var(--radius-panel)] border p-4">
            <p className="text-muted text-[11px] tracking-widest uppercase">{fixture.league}</p>
            <p className="text-ink mt-1 text-sm font-semibold">
              {fixture.home} <span className="text-muted font-normal">vs</span> {fixture.away}
            </p>
            <p className="text-muted mt-0.5 text-xs">
              {fixture.startsAt.slice(0, 16).replace('T', ' ')} (+08:00)
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {fixture.options.map((option) => (
                <InertLink
                  key={option.id}
                  ariaLabel={`${fixture.home} vs ${fixture.away}: ${option.label}`}
                  className="border-line text-ink hover:border-accent flex items-center gap-2 rounded-[8px] border px-3 py-1.5 text-xs"
                >
                  <span>{option.label}</span>
                  <span className="text-accent font-mono">{option.odds.toFixed(2)}</span>
                </InertLink>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <LaunchButton provider="prediction" label="Enter this week's free prediction" />
      </div>
    </div>
  );
}
