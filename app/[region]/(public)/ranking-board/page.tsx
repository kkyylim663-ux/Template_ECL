import type { Metadata } from 'next';
import Link from 'next/link';
import { BOARD_KINDS, boardLabelKey, getLeaderboards, isBoardKind } from '@/lib/api';
import { regionPath } from '@/config/nav';
import { formatMinor, formatTimestamp } from '@/lib/format';
import { getT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Ranking board',
  description: 'Weekly and monthly turnover races, VIP boards and the live board.',
};

/**
 * Six boards behind a button row, exactly as in the reference build. Each button
 * is a link carrying `?board=`, so the table is server-rendered and a refresh or
 * a share keeps the selected board.
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
  const [{ t }, boards] = await Promise.all([getT('games'), getLeaderboards()]);

  const requested = typeof query.board === 'string' ? query.board : '';
  const kind = isBoardKind(requested) ? requested : BOARD_KINDS[0];
  const board = boards[kind];

  if (!board) {
    return <p className="text-muted text-sm">{t('ranking.unavailable')}</p>;
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-ink text-xl font-semibold">{t('ranking.title')}</h1>
          <p className="text-muted mt-1 text-xs">
            {t('ranking.summary', {
              board: t(boardLabelKey(kind)),
              time: formatTimestamp(board.refreshedAt),
            })}
          </p>
        </div>
        <p className="text-muted text-xs">{t('ranking.note')}</p>
      </header>

      <nav aria-label={t('ranking.boards')} className="mt-5 flex flex-wrap gap-2">
        {BOARD_KINDS.map((option) => {
          const active = option === kind;
          return (
            <Link
              key={option}
              href={`${regionPath(region, '/ranking-board')}?board=${option}`}
              aria-current={active ? 'true' : undefined}
              className={`rounded-[var(--radius-tag)] border px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'border-accent bg-panel-soft text-accent'
                  : 'border-line text-muted hover:border-accent hover:text-ink'
              }`}
            >
              {t(boardLabelKey(option))}
              {option === 'live' ? (
                <span className="bg-danger ml-2 inline-block size-1.5 animate-pulse rounded-full align-middle" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-line bg-panel mt-5 overflow-hidden rounded-[var(--radius-panel)] border">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-alt text-muted text-[11px] tracking-wide uppercase">
            <tr>
              <th className="w-16 px-4 py-3">{t('ranking.col.rank')}</th>
              <th className="px-4 py-3">{t('ranking.col.player')}</th>
              <th className="px-4 py-3 text-right">{t('ranking.col.turnover')}</th>
              <th className="px-4 py-3 text-right">{t('ranking.col.prize')}</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.map((row) => (
              <tr key={row.rank} className="border-line border-t">
                <td className="px-4 py-3">
                  <span
                    className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                      row.rank <= 3 ? 'bg-accent text-[#1b1b1b]' : 'bg-panel-soft text-muted'
                    }`}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="text-ink px-4 py-3 font-mono text-xs">{row.displayName}</td>
                <td className="text-muted px-4 py-3 text-right font-mono text-xs">
                  {formatMinor(row.turnoverMinor, board.currency, 'en-MY', { compact: true })}
                </td>
                <td className="text-accent px-4 py-3 text-right font-mono text-xs">
                  {formatMinor(row.prizeMinor, board.currency, 'en-MY', { compact: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted mt-4 text-xs">{t('ranking.footnote')}</p>
    </div>
  );
}
