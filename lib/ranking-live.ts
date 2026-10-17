import type { Leaderboard, LeaderboardRow } from '@/lib/api/schemas';

/**
 * The Current LIVE board is the one board the page re-reads while it is open.
 * The reference has no polling of its own — it server-renders the board and
 * prints "Result Updates every 5 minutes" — so this cadence is this build's own
 * (TASKS_P5 T69 asks for 10 s). It is the single place to change it; the copy on
 * the page stays the reference's.
 */
export const RANKING_REFRESH_MS = 10_000;

/** The board the live feed refreshes: the date group's `Current` / LIVE one. */
export const LIVE_BOARD_KIND = 'live';

/**
 * The feed is a mock with no backend behind it, so the movement is derived from
 * the step number instead of from real turnover: the client sends how many
 * refreshes it has seen, and each step adds a per-member share of that member's
 * own fixture turnover. The shares sit in a ±4 point band around 6 % per refresh
 * — wide enough that the fixture's evenly spaced rows trade places within the
 * first half-minute, narrow enough that the board does not scramble.
 */
const RATE_BASE_PERCENT = 600;
const RATE_STEP_PERCENT = 100;
const RATE_SPREAD = 9;

/**
 * Growth is a rational curve, not a straight line: linear at first, bending
 * towards a ceiling each member carries with them (15x–45x their fixture
 * turnover). Nothing runs away, nothing freezes either — the totals keep
 * creeping even after an hour-old tab.
 */
const CAP_BASE_PERCENT = 1500;
const CAP_STEP_PERCENT = 100;
const CAP_SPREAD = 31;

/** The ceiling on `?step=` for the feed route: ~2.3 days of refreshes. */
export const MAX_LIVE_STEP = 20_000;

/** FNV-1a — the same hash on both sides of the wire, with no dependency. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A member's turnover after `step` refreshes: their fixture amount plus growth. */
function turnoverAt(row: LeaderboardRow, step: number): number {
  const seed = hash(row.displayName);
  const ratePercent = RATE_BASE_PERCENT + ((seed % RATE_SPREAD) - (RATE_SPREAD - 1) / 2) * RATE_STEP_PERCENT;
  const capPercent = CAP_BASE_PERCENT + (hash(`${row.displayName}#cap`) % CAP_SPREAD) * CAP_STEP_PERCENT;
  const linear = (ratePercent * step) / 100;
  const growthPercent = (linear * capPercent) / (capPercent + linear);
  return row.turnoverMinor + Math.floor((row.turnoverMinor * growthPercent) / 100);
}

/**
 * One refresh of the live board: every member's turnover grows, the board is
 * re-sorted on the new totals and the ranks are renumbered. Row identity —
 * member, region, prize — never changes, so the table can move rows instead of
 * rebuilding them. A step of 0 (or anything unusable) is the fixture board.
 */
export function advanceLiveBoard(board: Leaderboard, step: number): Leaderboard {
  const usable = Number.isFinite(step) && step > 0 ? Math.min(Math.floor(step), MAX_LIVE_STEP) : 0;
  const rows = board.rows
    .map((row) => ({ ...row, turnoverMinor: turnoverAt(row, usable) }))
    .sort((a, b) => b.turnoverMinor - a.turnoverMinor || a.rank - b.rank)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  return { ...board, rows };
}

/** The members whose rank changed between two boards — the rows that just moved. */
export function changedKeys(previous: Leaderboard | undefined, next: Leaderboard): string[] {
  if (!previous) return [];
  const ranks = new Map(previous.rows.map((row) => [row.displayName, row.rank]));
  return next.rows
    .filter((row) => ranks.has(row.displayName) && ranks.get(row.displayName) !== row.rank)
    .map((row) => row.displayName);
}

/** "2026-10-17T17:04" in the visitor's own clock — the `Latest Updated` stamp. */
export function localStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The platform's timer pair, kept behind a type so the loop can be unit-tested. */
export type PollTimers = {
  every: (callback: () => void, ms: number) => number;
  cancel: (id: number) => void;
};

export const browserTimers: PollTimers = {
  every: (callback, ms) => window.setInterval(callback, ms),
  cancel: (id) => window.clearInterval(id),
};

/**
 * The polling loop, with the platform kept at arm's length. `setHidden` stops
 * the clock (a tab nobody is looking at does not need new rows), `setHidden(false)`
 * reads the board once straight away — the visitor came back and should not wait
 * out another interval — and then restarts it. `start` is idempotent, `stop` is
 * the unmount path, and `timerCount` is what the leak assertion counts.
 */
export function createRankingPoller({
  intervalMs,
  onTick,
  timers = browserTimers,
}: {
  intervalMs: number;
  onTick: () => void;
  timers?: PollTimers;
}) {
  let id: number | null = null;
  let started = false;
  let paused = false;

  const start = () => {
    started = true;
    if (id !== null || paused) return;
    id = timers.every(() => onTick(), intervalMs);
  };

  const stop = () => {
    if (id === null) return;
    timers.cancel(id);
    id = null;
  };

  const setHidden = (hidden: boolean) => {
    if (hidden === paused) return;
    paused = hidden;
    if (hidden) {
      stop();
      return;
    }
    if (!started) return;
    onTick();
    start();
  };

  return {
    start,
    stop,
    setHidden,
    get timerCount() {
      return id === null ? 0 : 1;
    },
  };
}

export type RankingPoller = ReturnType<typeof createRankingPoller>;
