import { describe, expect, it } from 'vitest';
import leaderboards from '@/mocks/leaderboards.json';
import type { Leaderboard } from '@/lib/api/schemas';
import {
  LIVE_BOARD_KIND,
  MAX_LIVE_STEP,
  RANKING_REFRESH_MS,
  advanceLiveBoard,
  changedKeys,
  createRankingPoller,
  localStamp,
  type PollTimers,
} from '@/lib/ranking-live';

/** The shipped fixture board — every expectation below starts from it. */
const fixture = leaderboards.d[LIVE_BOARD_KIND] as unknown as Leaderboard;

const totalsOf = (board: Leaderboard) =>
  new Map(board.rows.map((row) => [row.displayName, row.turnoverMinor]));
const orderOf = (board: Leaderboard) => board.rows.map((row) => `${row.rank}:${row.displayName}`);

/** A timer pair that reports what is scheduled and fires it on demand. */
function fakeTimers() {
  const scheduled = new Map<number, { callback: () => void; ms: number }>();
  let nextId = 1;
  const timers: PollTimers = {
    every: (callback, ms) => {
      const id = nextId++;
      scheduled.set(id, { callback, ms });
      return id;
    },
    cancel: (id) => {
      scheduled.delete(id);
    },
  };
  return {
    timers,
    get size() {
      return scheduled.size;
    },
    get intervals() {
      return [...scheduled.values()].map((entry) => entry.ms);
    },
    fire() {
      [...scheduled.values()].forEach((entry) => entry.callback());
    },
  };
}

describe('advanceLiveBoard', () => {
  it('keeps every member, their region and the 1..n ranks', () => {
    const next = advanceLiveBoard(fixture, 3);
    expect(next.rows.map((row) => row.displayName).sort()).toEqual(
      fixture.rows.map((row) => row.displayName).sort(),
    );
    expect(next.rows.map((row) => row.rank)).toEqual(fixture.rows.map((_, index) => index + 1));

    const regions = new Map(next.rows.map((row) => [row.displayName, row.region]));
    fixture.rows.forEach((row) => expect(regions.get(row.displayName)).toBe(row.region));
  });

  it('sorts on the new totals and answers the same board twice', () => {
    const once = advanceLiveBoard(fixture, 4);
    expect(advanceLiveBoard(fixture, 4)).toEqual(once);

    const totals = once.rows.map((row) => row.turnoverMinor);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    // The stamp belongs to the caller: the fixture's stays put here.
    expect(once.refreshedAt).toBe(fixture.refreshedAt);
  });

  it('starts at the fixture and only ever grows a member’s turnover', () => {
    const base = totalsOf(fixture);
    expect(advanceLiveBoard(fixture, 0).rows).toEqual(fixture.rows);

    let previous = base;
    for (const step of [1, 2, 5, 30]) {
      const at = totalsOf(advanceLiveBoard(fixture, step));
      fixture.rows.forEach((row) => {
        expect(at.get(row.displayName)).toBeGreaterThan(previous.get(row.displayName) ?? Infinity);
      });
      previous = at;
    }
  });

  it('trades places inside the first half-minute of refreshes', () => {
    const before = orderOf(advanceLiveBoard(fixture, 0));
    const moved = [1, 2, 3].some((step) => orderOf(advanceLiveBoard(fixture, step)) !== before);
    expect(moved).toBe(true);
  });

  it('caps growth instead of letting a long-running tab run away', () => {
    const base = totalsOf(fixture);
    for (const step of [MAX_LIVE_STEP, MAX_LIVE_STEP * 5]) {
      advanceLiveBoard(fixture, step).rows.forEach((row) => {
        const start = base.get(row.displayName) ?? 0;
        expect(row.turnoverMinor).toBeGreaterThan(start);
        // The widest ceiling is 45x the fixture turnover, plus the fixture itself.
        expect(row.turnoverMinor).toBeLessThanOrEqual(start * 46);
        expect(Number.isSafeInteger(row.turnoverMinor)).toBe(true);
      });
    }
  });

  it('treats an unusable step as no refresh at all', () => {
    [0, -5, Number.NaN, Number.POSITIVE_INFINITY].forEach((step) => {
      expect(advanceLiveBoard(fixture, step).rows).toEqual(fixture.rows);
    });
  });
});

describe('changedKeys', () => {
  const row = (rank: number, displayName: string, turnoverMinor: number) =>
    ({ rank, displayName, turnoverMinor, prizeMinor: 0, region: 'MY' }) as const;
  const boardOf = (rows: Leaderboard['rows']): Leaderboard => ({ ...fixture, rows: [...rows] });

  it('names the members whose rank moved, and nobody else', () => {
    const before = boardOf([row(1, 'a', 100), row(2, 'b', 90), row(3, 'c', 80)]);
    const after = boardOf([row(1, 'b', 120), row(2, 'a', 100), row(3, 'c', 80)]);
    expect(changedKeys(before, after).sort()).toEqual(['a', 'b']);
  });

  it('marks nobody when there is no previous board', () => {
    expect(changedKeys(undefined, fixture)).toEqual([]);
  });
});

describe('createRankingPoller', () => {
  function poller() {
    const clock = fakeTimers();
    let ticks = 0;
    const instance = createRankingPoller({
      intervalMs: RANKING_REFRESH_MS,
      onTick: () => {
        ticks += 1;
      },
      timers: clock.timers,
    });
    return { clock, instance, ticks: () => ticks };
  }

  it('refreshes at the interval the page documents, one timer at a time', () => {
    // TASKS_P5 T69: the Current LIVE board moves every 10 s.
    expect(RANKING_REFRESH_MS).toBe(10_000);

    const { clock, instance, ticks } = poller();
    expect(clock.size).toBe(0);
    instance.start();
    expect(clock.intervals).toEqual([RANKING_REFRESH_MS]);

    clock.fire();
    clock.fire();
    clock.fire();
    expect(ticks()).toBe(3);
    expect(instance.timerCount).toBe(1);

    // Starting again must not add a second timer — that is the duplicate-fetch bug.
    instance.start();
    expect(clock.size).toBe(1);
    clock.fire();
    expect(ticks()).toBe(4);
  });

  it('stops the clock while the tab is hidden and re-reads once on return', () => {
    const { clock, instance, ticks } = poller();
    instance.start();
    clock.fire();
    expect(ticks()).toBe(1);

    instance.setHidden(true);
    expect(clock.size).toBe(0);
    clock.fire();
    expect(ticks()).toBe(1);
    instance.setHidden(true); // repeated notifications are cheap
    expect(clock.size).toBe(0);

    instance.setHidden(false);
    expect(ticks()).toBe(2); // caught up straight away, no waiting out an interval
    expect(clock.size).toBe(1);

    clock.fire();
    expect(ticks()).toBe(3);
  });

  it('releases its timer when the page goes away', () => {
    const { clock, instance, ticks } = poller();
    instance.start();
    instance.stop();
    expect(clock.size).toBe(0);
    expect(instance.timerCount).toBe(0);

    clock.fire(); // a cancelled timer must not tick
    expect(ticks()).toBe(0);
    instance.stop(); // and stopping twice is harmless
    expect(clock.size).toBe(0);

    instance.setHidden(false); // a tab that never started does not start ticking
    expect(clock.size).toBe(0);
    expect(ticks()).toBe(0);
  });
});

describe('localStamp', () => {
  it('prints the visitor’s own clock, cut to the minute', () => {
    expect(localStamp(new Date(2026, 9, 17, 17, 4, 33))).toBe('2026-10-17T17:04');
  });
});
