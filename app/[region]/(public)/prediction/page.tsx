import type { Metadata } from 'next';
import Link from 'next/link';
import { PREDICTION_LEAGUES, getDisplayPayload } from '@/lib/api';
import { InertLink } from '@/components/ui/InertLink';
import { LaunchButton } from '@/components/game/LaunchButton';
import { RulesButton } from '@/components/ui/RulesButton';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { regionPath } from '@/config/nav';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('prediction', { region, path: '/prediction' });
}

export default async function PredictionPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const [{ t }, { prediction }] = await Promise.all([getT('games'), getDisplayPayload()]);

  const requested = typeof query.league === 'string' ? query.league : '';
  const league = (PREDICTION_LEAGUES as readonly string[]).includes(requested)
    ? (requested as (typeof PREDICTION_LEAGUES)[number])
    : PREDICTION_LEAGUES[0];

  const fixtures = prediction.filter((fixture) => fixture.league === league);

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-ink text-xl font-semibold">{t('category.prediction')}</h1>
            <p className="text-muted mt-1 text-xs">
              {t('prediction.summary', { count: fixtures.length })}
            </p>
          </div>
          <RulesButton title={t('prediction.rulesTitle')} body={t('prediction.rules')} />
        </header>

        <nav aria-label={t('prediction.leagues')} className="border-line mt-5 flex gap-1 border-b">
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
            <li
              key={fixture.id}
              className="border-line bg-panel rounded-[var(--radius-panel)] border p-4"
            >
              <p className="text-muted text-[11px] tracking-widest uppercase">{fixture.league}</p>
              <p className="text-ink mt-1 text-sm font-semibold">
                {fixture.home}{' '}
                <span className="text-muted font-normal">{t('prediction.vs')}</span>{' '}
                {fixture.away}
              </p>
              <p className="text-muted mt-0.5 text-xs">
                {fixture.startsAt.slice(0, 16).replace('T', ' ')} (+08:00)
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {fixture.options.map((option) => (
                  <InertLink
                    key={option.id}
                    ariaLabel={t('prediction.optionAria', {
                      home: fixture.home,
                      away: fixture.away,
                      option: option.label,
                    })}
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
          <LaunchButton provider="prediction" label={t('prediction.enter')} />
        </div>
      </div>
    </IntlScope>
  );
}
