import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPredictionStore } from '@/lib/mock-prediction/store';
import { MAX_PICKS, MAX_STAKE_MINOR, MIN_STAKE_MINOR } from '@/lib/prediction-rules';
import type { PredictionFixture } from '@/lib/api/schemas';

const FIXTURES: PredictionFixture[] = [
  {
    id: 'fx-nba-1',
    league: 'NBA',
    status: 'active',
    home: 'Northern Lions',
    away: 'Straits Ravens',
    startsAt: '2026-10-15T09:00:00+08:00',
    prizePoolMinor: 250000,
    options: [
      { id: 'home', label: 'Home', odds: 1.85 },
      { id: 'away', label: 'Away', odds: 1.95 },
    ],
  },
  {
    id: 'fx-uefa-1',
    league: 'UEFA',
    status: 'ended',
    home: 'Alpine Rangers',
    away: 'Coastal Sporting',
    startsAt: '2026-10-15T03:00:00+08:00',
    prizePoolMinor: 300000,
    options: [
      { id: 'home', label: 'Home', odds: 1.5 },
      { id: 'away', label: 'Away', odds: 5.5 },
    ],
  },
];

const store = () => createPredictionStore({ file: null });
const context = { now: new Date('2026-10-17T09:00:00Z'), fixtures: FIXTURES };
const draft = (over: Partial<Parameters<ReturnType<typeof store>['place']>[0]> = {}) => ({
  picks: [{ fixtureId: 'fx-nba-1', optionId: 'home' }],
  amountMinor: 500,
  idempotencyKey: randomUUID(),
  ...over,
});

describe('prediction store', () => {
  it('starts from the empty seed', async () => {
    expect(await store().read()).toEqual({ bets: [] });
  });

  it('stores the ticket with the fixture terms snapshotted at entry', async () => {
    const table = store();
    const result = await table.place(draft(), context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(false);
    expect(result.entry.picks).toEqual([
      {
        fixtureId: 'fx-nba-1',
        optionId: 'home',
        label: 'Home',
        odds: 1.85,
        league: 'NBA',
        home: 'Northern Lions',
        away: 'Straits Ravens',
      },
    ]);
    expect(result.entry.totalMinor).toBe(500);
    expect(result.entry.placedAt).toBe('2026-10-17T09:00:00.000Z');
    expect((await table.read()).bets).toHaveLength(1);
  });

  it('replays a repeated idempotency key instead of booking twice', async () => {
    const table = store();
    const first = await table.place(draft({ idempotencyKey: 'same-key' }), context);
    const again = await table.place(draft({ idempotencyKey: 'same-key' }), context);
    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.replayed).toBe(true);
    expect(again.entry.id).toBe(first.entry.id);
    expect((await table.read()).bets).toHaveLength(1);
  });

  it('refuses an empty slip with 212', async () => {
    const result = await store().place(draft({ picks: [] }), context);
    expect(result).toEqual({ ok: false, code: '212' });
  });

  it('refuses too many picks with 213', async () => {
    const picks = Array.from({ length: MAX_PICKS + 1 }, (_, index) => ({
      fixtureId: `fx-${index}`,
      optionId: 'home',
    }));
    const result = await store().place(draft({ picks }), context);
    expect(result).toEqual({ ok: false, code: '213' });
  });

  it('refuses a stake outside the window with 210 / 211', async () => {
    expect(await store().place(draft({ amountMinor: MIN_STAKE_MINOR - 1 }), context)).toEqual({
      ok: false,
      code: '210',
    });
    expect(await store().place(draft({ amountMinor: MAX_STAKE_MINOR + 1 }), context)).toEqual({
      ok: false,
      code: '211',
    });
  });

  it('refuses an unknown fixture, a closed fixture and an unknown outcome', async () => {
    const table = store();
    expect(
      await table.place(draft({ picks: [{ fixtureId: 'fx-gone', optionId: 'home' }] }), context),
    ).toEqual({ ok: false, code: '214' });
    expect(
      await table.place(draft({ picks: [{ fixtureId: 'fx-uefa-1', optionId: 'home' }] }), context),
    ).toEqual({ ok: false, code: '215' });
    expect(
      await table.place(draft({ picks: [{ fixtureId: 'fx-nba-1', optionId: 'draw' }] }), context),
    ).toEqual({ ok: false, code: '216' });
    expect((await table.read()).bets).toHaveLength(0);
  });

  it('answers the fixture’s code before the stake window (rule order)', async () => {
    const result = await store().place(
      draft({ picks: [{ fixtureId: 'fx-uefa-1', optionId: 'home' }], amountMinor: 1 }),
      context,
    );
    expect(result).toEqual({ ok: false, code: '215' });
  });

  it('falls back to the seed when the library file is missing', async () => {
    const table = createPredictionStore({ file: join(tmpdir(), `pd-missing-${randomUUID()}.json`) });
    expect(await table.read()).toEqual({ bets: [] });
  });
});
