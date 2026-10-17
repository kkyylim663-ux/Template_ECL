import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BOARD_KINDS,
  getLeaderboards,
  getRankingContent,
  isBoardKind,
  type LeaderboardKind,
  type RankingContent,
} from '@/lib/api';
import { RankingLiveBoard } from '@/components/content/RankingLiveBoard';
import { regionPath } from '@/config/nav';
import { IntlScope } from '@/lib/i18n/scope';
import { getT } from '@/lib/i18n/server';
import { pageMetadata } from '@/lib/seo';

/**
 * The six buttons fall into the reference's three groups — period (weekly /
 * monthly), membership tier (Super VIP / VIP) and date (Current / Last week) —
 * and each one selects a board. A group shows its own selection when the active
 * board belongs to it, otherwise it falls back to that group's default, so all
 * six stay reachable from the one `?board=` value.
 */
const GROUPS = [
  {
    id: 'periods',
    className: 'rb-periods',
    labelKey: 'ranking.periods',
    itemClass: 'rb-period',
    options: [
      { kind: 'weekly', labelKey: 'ranking.period.weekly' },
      { kind: 'monthly', labelKey: 'ranking.period.monthly' },
    ],
    fallback: 'weekly',
  },
  {
    id: 'tiers',
    className: 'rb-filter-group',
    labelKey: 'ranking.tiers',
    itemClass: 'rb-filter',
    options: [
      { kind: 'supervip', labelKey: 'ranking.tier.supervip' },
      { kind: 'vip', labelKey: 'ranking.tier.vip' },
    ],
    fallback: 'supervip',
  },
  {
    id: 'dates',
    className: 'rb-filter-group rb-dates',
    labelKey: 'ranking.dates',
    itemClass: 'rb-filter',
    options: [
      { kind: 'live', labelKey: 'ranking.date.current', live: true },
      { kind: 'lastweek', labelKey: 'ranking.date.lastweek' },
    ],
    fallback: 'live',
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  return pageMetadata('rankingBoard', { region, path: '/ranking-board' });
}

/**
 * Ranking board. The reference server-renders this page, so every block here is
 * the one it ships (`crawl/pages/my_ranking-board.html`): the `.rb-board` panel
 * with its six buttons and Top 10 table, the two reward panels beside it and the
 * `.rb-event-rules` accordions underneath. `?board=` keeps the selection in the
 * URL and the page server-rendered; the table itself is a client panel because
 * the Current LIVE board re-reads itself (T69).
 */
export default async function RankingBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { region } = await params;
  const query = await searchParams;
  const [{ t }, boards, content] = await Promise.all([
    getT('games'),
    getLeaderboards(),
    getRankingContent(),
  ]);

  const requested = typeof query.board === 'string' ? query.board : '';
  const kind: LeaderboardKind = isBoardKind(requested) ? requested : BOARD_KINDS[0];
  const board = boards[kind];
  const base = regionPath(region, '/ranking-board');

  const selectedIn = (group: (typeof GROUPS)[number]) =>
    group.options.some((option) => option.kind === kind) ? kind : group.fallback;

  return (
    <IntlScope namespaces={['games']}>
      <div>
        <section
          data-part="banner-section"
          aria-hidden
          className="page-hero game-placeholder h-40 max-desktop:h-28"
        />

        <h1 className="sr-only">{t('ranking.title')}</h1>

        <section className="rb-board">
          <div className={GROUPS[0].className} role="group" aria-label={t(GROUPS[0].labelKey)}>
            {GROUPS[0].options.map((option) => (
              <Link
                key={option.kind}
                href={`${base}?board=${option.kind}`}
                aria-pressed={option.kind === selectedIn(GROUPS[0])}
                className={`${GROUPS[0].itemClass}${option.kind === selectedIn(GROUPS[0]) ? ' is-selected' : ''}`}
              >
                {t(option.labelKey)}
              </Link>
            ))}
          </div>

          <div className="rb-panel">
            <div className="rb-filters">
              {GROUPS.slice(1).map((group) => {
                const selected = selectedIn(group);
                return (
                  <div key={group.id} className={group.className} role="group" aria-label={t(group.labelKey)}>
                    {group.options.map((option) => (
                      <Link
                        key={option.kind}
                        href={`${base}?board=${option.kind}`}
                        aria-pressed={option.kind === selected}
                        className={`${group.itemClass}${option.kind === selected ? ' is-selected' : ''}`}
                      >
                        {t(option.labelKey)}
                        {'live' in option && option.live ? (
                          <span className="rb-live rb-live--tab">{t('ranking.live')}</span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="rb-columns">
              <div className="rb-results">
                <div className="rb-summary">
                  <div className="rb-stat rb-stat--rank">
                    <span aria-hidden className="rb-trophy game-placeholder" />
                    <div>
                      <p>{t('ranking.myRanking')}</p>
                      <strong className="rb-stat-value">—</strong>
                    </div>
                  </div>
                  <div className="rb-stat">
                    <p>{t('ranking.turnoverWeekly', { period: t(periodKey(kind)) })}</p>
                    <strong className="rb-stat-value">
                      <span className="rb-currency">{board?.currency ?? 'USD'}</span> —</strong>
                    <small>≈ MYR —</small>
                  </div>
                </div>

                <h2 className="rb-heading rb-leaderboard-heading">
                  {t('ranking.top10')}
                  <span className="rb-live">{t('ranking.live')}</span>
                </h2>

                <RankingLiveBoard kind={kind} board={board} refreshMinutes={content.refreshMinutes} />
              </div>

              <aside className="rb-rewards">
                <PrizePanel content={content} title={t('ranking.prizeStructure')} rankLabel={t('ranking.col.rankLabel')} prizeLabel={t('ranking.col.prizeUsd')} />
                <PersonalPanel title={t('ranking.personalTitle')} />
              </aside>
            </div>
          </div>
        </section>

        <section className="rb-event-rules">
          <EventRule title={t('ranking.rule.introduction')} items={content.rules.intro} />
          <EventRule title={t('ranking.rule.tnc')} items={content.rules.tnc} />
        </section>
      </div>
    </IntlScope>
  );
}

/** A board's title only says Weekly / Monthly; the summary line needs its scope. */
function periodKey(kind: LeaderboardKind): string {
  if (kind === 'monthly') return 'ranking.period.monthly';
  return 'ranking.period.weekly';
}

function PrizePanel({
  content,
  title,
  rankLabel,
  prizeLabel,
}: {
  content: RankingContent;
  title: string;
  rankLabel: string;
  prizeLabel: string;
}) {
  return (
    <div className="rb-prize-panel">
      <div className="rb-fx rb-prize-fx" aria-hidden>
        {Array.from({ length: 7 }, (_, index) => (
          <i key={`spark-${index}`} className="rb-spark" />
        ))}
        {Array.from({ length: 6 }, (_, index) => (
          <i key={`ember-${index}`} className="rb-ember" />
        ))}
      </div>

      <div className="rb-prize-content">
        <h2 className="rb-heading">
          <svg
            className="rb-gift-icon"
            viewBox="0 0 32 36"
            fill="none"
            aria-hidden
            focusable="false"
          >
            <path d="M4 15h24v18H4zM2 10h28v6H2z" fill="currentColor" />
            <path d="M16 10v23M10 22l6-12 6 12" stroke="#704709" strokeWidth="2" />
            <path
              d="M16 10C2 10 5-1 11 3c3 2 5 7 5 7Zm0 0C30 10 27-1 21 3c-3 2-5 7-5 7Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          {title}
        </h2>

        <table className="rb-prize-table">
          <thead>
            <tr>
              <th scope="col">{rankLabel}</th>
              <th scope="col">{prizeLabel}</th>
            </tr>
          </thead>
          <tbody>
            {content.prizeStructure.map((row) => (
              <tr key={row.rank}>
                <td>{row.rank}</td>
                <td>{row.prize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersonalPanel({ title }: { title: string }) {
  return (
    <div className="rb-personal">
      <p className="rb-personal-title">{title}</p>
      <div className="rb-personal-panel">
        <div className="rb-fx rb-personal-fx" aria-hidden>
          {Array.from({ length: 5 }, (_, index) => (
            <i key={`spark-${index}`} className="rb-spark" />
          ))}
          {Array.from({ length: 4 }, (_, index) => (
            <i key={`ember-${index}`} className="rb-ember" />
          ))}
        </div>
        <div className="rb-personal-score">
          <strong>—</strong>
          <strong>USD —</strong>
        </div>
      </div>
    </div>
  );
}

/**
 * One `.rb-rule` accordion. The rule prose is stored with its inline markup, so
 * it renders through `dangerouslySetInnerHTML`; the string is a local mock
 * import (`mocks/ranking-board.json`) and never takes user input.
 */
function EventRule({
  title,
  items,
}: {
  title: string;
  items: RankingContent['rules']['intro'];
}) {
  return (
    <details className="rb-rule">
      <summary>
        {title}
        <span className="rb-rule-arrow" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="rb-rule-content">
        <ol>
          {items.map((item, index) => (
            <li key={item.title ?? index}>
              {item.title ? <div className="rb-rule-title">{item.title}</div> : null}
              <p dangerouslySetInnerHTML={{ __html: item.html }} />
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
