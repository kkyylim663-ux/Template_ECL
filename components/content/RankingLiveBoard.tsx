'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { leaderboardSchema, type Leaderboard, type LeaderboardKind } from '@/lib/api/schemas';
import { formatMinor, formatTimestamp } from '@/lib/format';
import {
  LIVE_BOARD_KIND,
  RANKING_REFRESH_MS,
  changedKeys,
  createRankingPoller,
  localStamp,
} from '@/lib/ranking-live';

/** The reference prints a Top 10 and the board carries ten rows. */
const PAGE_SIZE = 10;

/**
 * The Current LIVE board's table and its update stamp (T69). The page hands
 * down the board it always server-rendered; from there this panel re-reads the
 * live feed on its own.
 *
 * Rows are keyed by member, not by rank, so a swap moves the two rows instead of
 * rebuilding the table, and the move is animated with a transform (`.rb-table
 * tbody tr` transitions it; `.rb-row--moved` marks who just traded places, until
 * the next refresh). Only the live board polls — the other five are the fixture
 * and never change — and the poll stops while the tab is hidden and on unmount.
 */
export function RankingLiveBoard({
  kind,
  board: serverBoard,
  refreshMinutes,
}: {
  kind: LeaderboardKind;
  board?: Leaderboard;
  refreshMinutes: number;
}) {
  const t = useTranslations('games');
  const [board, setBoard] = useState(serverBoard);
  const [moved, setMoved] = useState<string[]>([]);
  const boardRef = useRef(serverBoard);
  const bodyRef = useRef<HTMLTableSectionElement | null>(null);
  /** Row positions taken just before a refresh, for the move animation. */
  const offsets = useRef(new Map<string, number>());

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // A `?board=` navigation (or a reload) hands down another board: adopt it and
  // drop the live state built on the previous one.
  useEffect(() => {
    setBoard(serverBoard);
    setMoved([]);
  }, [serverBoard, kind]);

  const captureOffsets = useCallback(() => {
    const next = new Map<string, number>();
    bodyRef.current?.querySelectorAll('tr[data-member]').forEach((row) => {
      const member = row.getAttribute('data-member');
      if (member) next.set(member, row.getBoundingClientRect().top);
    });
    offsets.current = next;
  }, []);

  useEffect(() => {
    if (kind !== LIVE_BOARD_KIND || !serverBoard) return;

    let live = true;
    let step = 0;

    async function refresh() {
      step += 1;
      try {
        const response = await fetch(`/api/ranking/live?step=${step}`, { cache: 'no-store' });
        const payload = (await response.json()) as { status?: string; d?: unknown };
        if (!live || payload?.status !== '0') return;
        const next: Leaderboard = {
          ...leaderboardSchema.parse(payload.d),
          // The stamp is the visitor's own clock: when they saw these rows.
          refreshedAt: localStamp(new Date()),
        };
        captureOffsets();
        setMoved(changedKeys(boardRef.current, next));
        setBoard(next);
      } catch {
        // A dropped poll must not blank the board: the rows stay as they are and
        // the next tick tries again.
      }
    }

    const poller = createRankingPoller({ intervalMs: RANKING_REFRESH_MS, onTick: () => void refresh() });
    poller.start();

    // A hidden tab does not need new rows; coming back re-reads once right away.
    const onVisibility = () => poller.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      live = false;
      poller.stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [captureOffsets, kind, serverBoard]);

  useLayoutEffect(() => {
    const before = offsets.current;
    if (before.size === 0) return;
    offsets.current = new Map();

    bodyRef.current?.querySelectorAll('tr[data-member]').forEach((row) => {
      const member = row.getAttribute('data-member');
      const from = member ? before.get(member) : undefined;
      if (from === undefined) return;
      const delta = from - row.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      const node = row as HTMLElement;
      // Park the row where it was, commit that position, then let the CSS
      // transition carry it to where it now belongs.
      node.style.transition = 'none';
      node.style.transform = `translateY(${delta}px)`;
      node.getBoundingClientRect();
      node.style.transition = '';
      node.style.transform = '';
    });
  }, [board]);

  const rows = board?.rows.slice(0, PAGE_SIZE) ?? [];
  const movedMembers = new Set(moved);

  return (
    <>
      <div className="rb-table-scroll">
        <table className="rb-table">
          <thead>
            <tr>
              <th scope="col">{t('ranking.col.no')}</th>
              <th scope="col">{t('ranking.col.nickname')}</th>
              <th scope="col">{t('ranking.col.region')}</th>
              <th scope="col">{t('ranking.col.turnoverUsd')}</th>
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="rb-empty">
                  <div className="no-info-box">{t('ranking.empty')}</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.displayName}
                  data-member={row.displayName}
                  data-rank={row.rank}
                  className={movedMembers.has(row.displayName) ? 'rb-row--moved' : undefined}
                >
                  <td>{row.rank}</td>
                  <td>
                    <span className="rb-nickname-text">{row.displayName}</span>
                  </td>
                  <td>{row.region}</td>
                  <td>{formatMinor(row.turnoverMinor, board?.currency ?? 'USD', 'en-MY')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rb-table-footer">
        <div className="rb-update">
          <p>{t('ranking.latestUpdated', { time: board ? formatTimestamp(board.refreshedAt) : '—' })}</p>
          <p>{t('ranking.updateEvery', { minutes: refreshMinutes })}</p>
        </div>
      </div>
    </>
  );
}
