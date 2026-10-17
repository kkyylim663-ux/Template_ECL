import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createAchievementClaimStore,
  seedAchievementClaims,
} from '@/lib/mock-achievements/claims';
import {
  achievementProgress,
  achievementTiers,
  resolveAchievementStatus,
  type AchievementRow,
  type ResolvedAchievementRow,
} from '@/lib/achievement-rules';

/**
 * T64's contract: the achievement payout's server rules (only a fixture-claimable
 * rung pays, one claim per rung, the idempotency key that makes a double submit
 * write one row) and the rail numbers the page derives from the fixture. The e2e
 * covers the page, the wallet credit and the history row.
 */
const at = new Date('2026-10-17T14:00:00+08:00');

const base = () => ({
  achievementId: 'ac-2',
  idempotencyKey: 'key-1',
  gameType: 'livecasino',
  title: 'Table regular',
  requirementMinor: 10_000,
  rewardMinor: 1_000,
});
const draft = (over: Partial<ReturnType<typeof base>> = {}) => ({ ...base(), ...over });
const context = { seedStatus: 'claimable', now: at };

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ach-claim-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('achievement claim store', () => {
  it('starts empty — the fixture marks its own claimed row, which writes no record', async () => {
    const store = createAchievementClaimStore({ file: null });
    expect(seedAchievementClaims).toEqual([]);
    expect(await store.list()).toEqual([]);
  });

  it('claims a rung and persists it to the file', async () => {
    const file = join(dir, 'claims.json');
    const store = createAchievementClaimStore({ file });
    const result = await store.claim(draft(), context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(false);
    expect(result.claim.rewardMinor).toBe(1000);
    expect(result.claim.claimedAt).toBe(at.toISOString());
    expect(result.claim.reference).toMatch(/^AC-/);

    // A fresh store (another module graph, like the route handlers) reads it back.
    const onDisk = JSON.parse(await readFile(file, 'utf8')) as unknown[];
    expect(onDisk).toHaveLength(1);
    const reopened = createAchievementClaimStore({ file });
    expect((await reopened.list()).map((claim) => claim.achievementId)).toEqual(['ac-2']);
  });

  it('replays one claim for a repeated idempotency key', async () => {
    const store = createAchievementClaimStore({ file: join(dir, 'claims.json') });
    const first = await store.claim(draft(), context);
    const second = await store.claim(draft(), { ...context, now: new Date('2026-10-17T15:00:00+08:00') });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.claim.id).toBe(first.claim.id);
    expect(second.claim.claimedAt).toBe(first.claim.claimedAt);
    expect(await store.list()).toHaveLength(1);
  });

  it('refuses a second claim for the same rung with a new key', async () => {
    const store = createAchievementClaimStore({ file: null });
    expect((await store.claim(draft(), context)).ok).toBe(true);
    const again = await store.claim(draft({ idempotencyKey: 'key-2' }), context);
    expect(again).toEqual({ ok: false, code: '409' });
    expect(await store.list()).toHaveLength(1);
  });

  it('refuses a rung the fixture never marked claimable', async () => {
    const store = createAchievementClaimStore({ file: null });
    expect(await store.claim(draft(), { ...context, seedStatus: 'in-progress' })).toEqual({
      ok: false,
      code: '211',
    });
    expect(await store.claim(draft(), { ...context, seedStatus: 'claimed' })).toEqual({
      ok: false,
      code: '211',
    });
    expect(await store.list()).toHaveLength(0);
  });
});

describe('achievement status', () => {
  it('treats a claim record as final and a locked seed as in progress', () => {
    expect(resolveAchievementStatus({ seedStatus: 'claimed', claimed: false })).toBe('claimed');
    expect(resolveAchievementStatus({ seedStatus: 'claimable', claimed: false })).toBe('claimable');
    expect(resolveAchievementStatus({ seedStatus: 'in-progress', claimed: false })).toBe('in-progress');
    expect(resolveAchievementStatus({ seedStatus: 'locked', claimed: false })).toBe('in-progress');
    // A claim record wins over the fixture's own column.
    expect(resolveAchievementStatus({ seedStatus: 'in-progress', claimed: true })).toBe('claimed');
  });
});

const row = (over: Partial<AchievementRow>): AchievementRow => ({
  id: 'ac-x',
  gameType: 'slots',
  title: 'Rung',
  requirementMinor: 3000,
  progressMinor: 0,
  rewardMinor: 500,
  status: 'in-progress',
  ...over,
});

/** What the server sends: `locked` has already become `in-progress`. */
const resolved = (rows: AchievementRow[]): ResolvedAchievementRow[] =>
  rows.map((entry) => ({
    ...entry,
    status: resolveAchievementStatus({ seedStatus: entry.status, claimed: false }),
  }));

describe('achievement rail numbers', () => {
  const rows: AchievementRow[] = [
    row({ id: 'ac-11', requirementMinor: 3000, progressMinor: 150_000, status: 'claimed' }),
    row({ id: 'ac-12', requirementMinor: 10_000, progressMinor: 10_000, status: 'claimable' }),
    row({ id: 'ac-13', requirementMinor: 45_000, progressMinor: 18_900 }),
    row({ id: 'ac-14', requirementMinor: 90_000, progressMinor: 37_800 }),
    row({ id: 'ac-15', requirementMinor: 150_000, progressMinor: 63_000, status: 'locked' }),
  ];

  it('builds one rung per requirement, ascending, with the resolved status', () => {
    const tiers = achievementTiers(resolved(rows));
    expect(tiers.map((tier) => tier.requirementMinor)).toEqual([3000, 10_000, 45_000, 90_000, 150_000]);
    expect(tiers.map((tier) => tier.status)).toEqual([
      'claimed',
      'claimable',
      'in-progress',
      'in-progress',
      'in-progress',
    ]);
  });

  it('scales the rail between the highest claimed rung and the next one', () => {
    const progress = achievementProgress(resolved(rows));
    // The fixture's progress column is lifetime turnover: the product's figure is the largest of them.
    expect(progress.turnoverMinor).toBe(150_000);
    expect(progress.floorMinor).toBe(3000);
    expect(progress.targetMinor).toBe(10_000);
    expect(progress.spanMinor).toBe(7000);
    // The rail fills from the claimed rung (the lifetime turnover is past it), and
    // the next-rung gap is counted from that rung — 10,000 − 3,000.
    expect(progress.progressMinor).toBe(10_000);
    expect(progress.remainingMinor).toBe(7000);
  });

  it('clamps a turnover below the current rung into the rail', () => {
    const modest: AchievementRow[] = [
      row({ id: 'ac-1', requirementMinor: 3000, progressMinor: 5000, status: 'claimed' }),
      row({ id: 'ac-2', requirementMinor: 10_000, progressMinor: 5000 }),
      row({ id: 'ac-3', requirementMinor: 45_000, progressMinor: 5000 }),
    ];
    const progress = achievementProgress(resolved(modest));
    expect(progress.floorMinor).toBe(3000);
    expect(progress.targetMinor).toBe(10_000);
    // 5,000 sits inside 3,000…10,000, so the rail is neither empty nor full;
    // the gap to the next rung is counted from the claimed rung.
    expect(progress.progressMinor).toBe(5000);
    expect(progress.remainingMinor).toBe(7000);
  });

  it('reports no target once every rung is claimed', () => {
    const done: AchievementRow[] = [
      row({ id: 'ac-1', requirementMinor: 3000, progressMinor: 8000, status: 'claimed' }),
      row({ id: 'ac-2', requirementMinor: 10_000, progressMinor: 8000, status: 'claimed' }),
    ];
    const progress = achievementProgress(resolved(done));
    expect(progress.floorMinor).toBe(10_000);
    expect(progress.targetMinor).toBeNull();
    expect(progress.spanMinor).toBe(0);
    expect(progress.remainingMinor).toBe(0);
  });
});
