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

/** Mock jackpot figures: the reference streams these, the build shows fixed values. */
const JACKPOT = { usd: 'USD 250,000', myr: 'MYR 1,010,000' };
const COUNTDOWN_MOCK = '05:00';

/** The three prize-pool cards under the jackpot, in the reference's order. */
const POOLS = [
  { id: 'ETH', prize: 'USD 2,000', date: '16/10/2026' },
  { id: 'TRC20', prize: 'USD 2,000', date: '16/10/2026' },
  { id: 'BEP20', prize: 'USD 2,000', date: '16/10/2026' },
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
 * Number game, in the reference build's order (`crawl/pages/my_numbergame.html`
 * and the live page at 375 and 1280): banner, the `.nav-pill__outsider` slab,
 * then `.ng-body`. Desktop is two columns, the 685px `.ng-contest-wrapper` beside
 * the 398px `.latest-prediction-wrapper` (33px apart); phones stack them.
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

  const history = (
    <table className="table-theme number-game__latest-prediction__table">
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
  );

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <section data-part="banner-section" aria-hidden className="page-hero game-placeholder game-banner" />

        <h1 className="sr-only">{t('category.numberGame')}</h1>

        <div className="nav-pill__outsider banner-top section-bottom ng-tabs">
          <div className="nav-pill__wrapper" role="group" aria-label={t('numberGame.tabs')}>
            {TABS.map((option) => (
              <Link
                key={option.id}
                href={`${base}${option.search}`}
                aria-current={option.id === tab ? 'true' : undefined}
                className="nav-pill desktop:w-[192px]"
              >
                <span>{t(option.key)}</span>
                {option.live ? (
                  <span className="badge-primary ng-badge-live">{t('numberGame.live')}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="ng-body">
          {tab === 'current' ? (
            <>
              <div className="section-card ng-contest-wrapper">
                <div className="ng-contest__countdown">
                  <div className="ng-contest__countdown-wrapper">
                    <p className="ng-contest__countdown-text">{t('numberGame.countdown.remaining')}</p>
                    <p className="ng-contest__countdown-timer">{COUNTDOWN_MOCK}</p>
                  </div>
                  <div className="ng-contest__countdown-wrapper">
                    <p className="ng-contest__countdown-text">{t('numberGame.countdown.drawing')}</p>
                    <p className="ng-contest__countdown-timer">{numberGame.drawnAt.slice(11, 16)}</p>
                  </div>
                  <div className="ng-contest__countdown-wrapper">
                    <p className="ng-contest__countdown-text">{t('numberGame.countdown.round')}</p>
                    <p className="ng-contest__countdown-timer">{numberGame.round}</p>
                  </div>
                </div>

                <div className="ng-contest__card">
                  <div className="ng-contest__card-inner">
                    <div className="ng-contest__label">{t('numberGame.jackpot')}</div>
                    <div className="ng-contest__usd">{JACKPOT.usd}</div>
                    <div className="ng-contest__myr-1">{JACKPOT.myr}</div>
                  </div>
                </div>

                <div className="ng-contest__section-prize-pool">
                  {POOLS.map((pool) => (
                    <div key={pool.id} className={`ng-contest__card-1 ${pool.id}_JACKPOT`}>
                      <div className="ng-contest__card-inner ng-contest__prize-pool-inner">
                        <div className="ng-contest__prize-pool-separator">----</div>
                        <div className={`ng-contest__prize-pool-prize ${pool.id}_JACKPOT`}>
                          {pool.prize}
                        </div>
                        <div className="ng-contest__desc-type">{pool.id}</div>
                        <div className="ng-contest__prize-pool-date">{pool.date}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="ng-contest__actions">
                  <LaunchButton provider="numbergame" label={t('numberGame.playNext')} />
                  <InertLink className="btn btn-secondary">{t('numberGame.rulesButton')}</InertLink>
                </div>

                <div className="ng-spin__wrapper">
                  <div className="ng-spin__header">
                    <span className="nav-pill selected">{t('numberGame.manual')}</span>
                    <span className="nav-pill">{t('numberGame.auto')}</span>
                  </div>
                  <div className="ng-spin__body">
                    <div className="ng-spin__manual-grid">
                      {Array.from({ length: 6 }, (_, index) => (
                        <div key={index} className="ng-spin__manual-add" />
                      ))}
                    </div>
                    <div className="ng-spin__actions">
                      <InertLink className="btn btn-primary mr-7">{t('numberGame.random')}</InertLink>
                      <InertLink className="btn btn-normal">{t('numberGame.reset')}</InertLink>
                    </div>
                    <InertLink className="btn btn-primary ng-spin__submit">
                      {t('numberGame.submit')}
                    </InertLink>
                  </div>
                </div>
              </div>

              <div className="section-card latest-prediction-wrapper">
                <div className="latest-prediction-title-box">
                  <h2 className="latest-prediction-title">{t('numberGame.latestPrediction')}</h2>
                  <InertLink className="btn btn-primary">{t('numberGame.viewMore')}</InertLink>
                </div>
                {history}
              </div>
            </>
          ) : null}

          {/* "Past" is the round history; the two member tabs have no data in a
              build with no session, so they show the reference's empty state. */}
          {tab === 'past' ? <div className="section-card latest-prediction-wrapper">{history}</div> : null}
          {tab === 'record' || tab === 'all' ? (
            <div className="no-info-box">{t('ranking.empty')}</div>
          ) : null}
        </div>
      </div>
    </IntlScope>
  );
}
