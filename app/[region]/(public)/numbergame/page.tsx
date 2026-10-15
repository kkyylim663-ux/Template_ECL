import type { Metadata } from 'next';
import Link from 'next/link';
import { getDisplayPayload } from '@/lib/api';
import { LaunchButton } from '@/components/game/LaunchButton';
import { InertLink } from '@/components/ui/InertLink';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { regionPath } from '@/config/nav';
import { pageMetadata } from '@/lib/seo';

/** The four tabs the reference puts in its `.nav-pill__outsider` slab. */
const TABS = [
  { id: 'current', key: 'numberGame.tab.current', live: true, search: '' },
  { id: 'past', key: 'numberGame.tab.past', live: false, search: '?tab=past' },
  { id: 'record', key: 'numberGame.tab.myRecord', live: false, search: '?tab=record' },
  { id: 'all', key: 'numberGame.tab.allPrediction', live: true, search: '?tab=all' },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('numberGame', { region, path: '/numbergame' });
}

/**
 * Number game, in the reference build's order (`crawl/pages/my_numbergame.html`):
 * banner, the `.nav-pill__outsider` slab holding four 192px tabs, then
 * `.ng-body` (flex, 33px apart, 60px clear of the footer). The reference
 * hydrates the body, so the round card inside follows `.ng-contest__card` from
 * the stylesheet and the table reuses the shared `.table-theme` skin.
 */
export default async function NumberGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const [{ t }, { numberGame }] = await Promise.all([getT('games'), getDisplayPayload()]);

  const requested = typeof query.tab === 'string' ? query.tab : '';
  const tab = TABS.find((option) => option.id === requested)?.id ?? 'current';
  const base = regionPath(region, '/numbergame');

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <section data-part="banner-section" aria-hidden className="page-hero game-placeholder h-40 max-desktop:h-28" />

        <h1 className="sr-only">{t('category.numberGame')}</h1>

        <div className="nav-pill__outsider banner-top section-bottom">
          <div className="nav-pill__wrapper" role="group" aria-label={t('numberGame.tabs')}>
            {TABS.map((option) => (
              <Link
                key={option.id}
                href={`${base}${option.search}`}
                aria-current={option.id === tab ? 'true' : undefined}
                className="nav-pill nav-pill__fix-width"
              >
                <span>{t(option.key)}</span>
                {option.live ? (
                  <span className="badge-primary ng-badge-live">{t('numberGame.live')}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="ng-body has-space">
          {tab === 'current' ? (
            <div className="ng-contest__card">
              <div className="ng-contest__card-inner">
                <div className="ng-contest__label">
                  {t('numberGame.round', { round: numberGame.round })}
                </div>
                <p className="ng-contest__label-2">{numberGame.drawnAt.slice(11, 16)} (+08:00)</p>

                <p className="ng-contest__section-title">{t('numberGame.latest')}</p>
                <ul className="ng-contest__numbers">
                  {numberGame.numbers.map((number) => (
                    <li key={number} className="ng-contest__number">
                      {number}
                    </li>
                  ))}
                </ul>

                <div className="ng-contest__actions">
                  <LaunchButton provider="numbergame" label={t('numberGame.playNext')} />
                  <InertLink className="text-accent text-sm hover:underline">
                    {t('numberGame.verify')}
                  </InertLink>
                </div>
              </div>
            </div>
          ) : null}

          {/* "Past" is the round history; the two member tabs have no data in a
              build with no session, so they show the reference's empty state. */}
          {tab === 'current' || tab === 'past' ? (
            <div>
              <h2 className="section-title">{t('numberGame.recent')}</h2>
              <table className="table-theme">
                <thead>
                  <tr>
                    <th>{t('numberGame.col.round')}</th>
                    <th>{t('numberGame.col.numbers')}</th>
                    <th>{t('numberGame.col.drawnAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {numberGame.history.map((round) => (
                    <tr key={round.round}>
                      <td>{round.round}</td>
                      <td>{round.numbers.join(' · ')}</td>
                      <td>{round.drawnAt.slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-info-box">{t('ranking.empty')}</div>
          )}
        </div>
      </div>
    </IntlScope>
  );
}
