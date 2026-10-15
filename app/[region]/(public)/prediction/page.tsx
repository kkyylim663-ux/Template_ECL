import type { Metadata } from 'next';
import Link from 'next/link';
import { getDisplayPayload } from '@/lib/api';
import { InertLink } from '@/components/ui/InertLink';
import { RulesButton } from '@/components/ui/RulesButton';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { regionPath } from '@/config/nav';
import { formatMinor } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

/** The five tabs the reference shows above `.pd-card-list`. */
const TABS = [
  { id: 'all', key: 'prediction.tab.all', search: '', statuses: ['active', 'upcoming', 'ended'] },
  {
    id: 'activeUpcoming',
    key: 'prediction.tab.activeUpcoming',
    search: '?status=active-upcoming',
    statuses: ['active', 'upcoming'],
  },
  { id: 'active', key: 'prediction.tab.active', search: '?status=active', statuses: ['active'] },
  {
    id: 'upcoming',
    key: 'prediction.tab.upcoming',
    search: '?status=upcoming',
    statuses: ['upcoming'],
  },
  { id: 'ended', key: 'prediction.tab.ended', search: '?status=ended', statuses: ['ended'] },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('prediction', { region, path: '/prediction' });
}

/**
 * Prediction, in the reference build's order (`crawl/pages/my_prediction.html`):
 * banner, five `.nav-pill` tabs in a `.banner-top.section-bottom` row, then the
 * `.pd-card-list` three-column grid. The reference hydrates the cards, so their
 * skin follows `.pd-card` from the stylesheet; `?status=` keeps the tab state in
 * the URL and the page server-rendered.
 */
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

  const requested = typeof query.status === 'string' ? query.status : '';
  const tab = TABS.find((option) => option.id === requested)?.id ?? TABS[0].id;
  const statuses: readonly string[] = TABS.find((option) => option.id === tab)?.statuses ?? [];
  const fixtures = prediction.filter((fixture) => statuses.includes(fixture.status));
  const base = regionPath(region, '/prediction');

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <section
          data-part="banner-section"
          aria-hidden
          className="page-hero game-placeholder h-40 max-desktop:h-28"
        />

        <h1 className="sr-only">{t('category.prediction')}</h1>

        <div className="banner-top section-bottom">
          <div className="nav-pill__wrapper" role="group" aria-label={t('prediction.tabs')}>
            {TABS.map((option) => (
              <Link
                key={option.id}
                href={`${base}${option.search}`}
                aria-current={option.id === tab ? 'true' : undefined}
                className="nav-pill nav-pill__fix-width"
              >
                <span>{t(option.key)}</span>
              </Link>
            ))}
          </div>
        </div>

        <ul className="pd-card-list">
          {fixtures.map((fixture) => (
            <li key={fixture.id}>
              <article data-fixture={fixture.id} className="pd-card">
                <div className="pd-card__head">
                  <span aria-hidden className="pd-card__avatar">
                    {fixture.league.slice(0, 2)}
                  </span>
                  <div className="pd-card__meta">
                    <p className="pd-card__title">
                      {fixture.home}{' '}
                      <span className="text-muted font-normal">{t('prediction.vs')}</span>{' '}
                      {fixture.away}
                    </p>
                    <p className="pd-card__sub">
                      {fixture.startsAt.slice(0, 16).replace('T', ' ')} (+08:00)
                    </p>
                  </div>
                  <span className="pd-card__pill">
                    {fixture.status === 'ended'
                      ? t('prediction.ended')
                      : t(`prediction.tab.${fixture.status}`)}
                  </span>
                </div>

                <div className="pd-card__stats">
                  <div className="pd-card__stat">
                    {t('prediction.prizePool')}
                    <strong className="pd-card__stat-value">
                      {formatMinor(fixture.prizePoolMinor, 'USD', 'en-MY', { compact: true })}
                    </strong>
                  </div>
                  <div className="pd-card__stat pd-card__stat--divided">
                    {t('prediction.entry')}
                    <strong className="pd-card__stat-value">{t('prediction.free')}</strong>
                  </div>
                </div>

                <div className="pd-card__odds">
                  {fixture.options.map((option) => (
                    <InertLink
                      key={option.id}
                      ariaLabel={t('prediction.optionAria', {
                        home: fixture.home,
                        away: fixture.away,
                        option: option.label,
                      })}
                      className="pd-card__odd"
                    >
                      <span>{option.label}</span>
                      <span className="pd-card__odd-value">{option.odds.toFixed(2)}</span>
                    </InertLink>
                  ))}
                </div>

                <div className="pd-card__actions">
                  <InertLink className="pd-card__btn">{t('prediction.enter')}</InertLink>
                  <RulesButton
                    className="pd-card__btn pd-card__btn--rules"
                    title={t('prediction.rulesTitle')}
                    body={t('prediction.rules')}
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </IntlScope>
  );
}
