import { readFile, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRebateClaimStore, seedClaims } from '@/lib/mock-rebates/claims';
import { MIN_REBATE_PAYOUT_MINOR, resolveRebateStatus, sumClaimableMinor } from '@/lib/rebate-rules';

/**
 * T63's contract: the rebate payout's server rules (one claim per rebate, the
 * reference's minimum payout, the idempotency key that makes a double submit
 * write one row) and the status a row ends up showing. The e2e covers the page,
 * the wallet credit and the history row.
 */
const at = new Date('2026-10-14T15:10:00+08:00');
const context = { minPayoutMinor: MIN_REBATE_PAYOUT_MINOR, now: at };
const base = () => ({
  rebateId: 'rb-1',
  idempotencyKey: 'key-1',
  period: '2026-10-13',
  product: 'Slots',
  turnoverMinor: 418_000,
  ratePct: 0.8,
  amountMinor: 3344,
});
const draft = (over: Partial<ReturnType<typeof base>> = {}) => ({ ...base(), ...over });

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'reb-claim-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('rebate claim store', () => {
  it('starts from the seed that mirrors the fixture', async () => {
    const store = createRebateClaimStore({ file: null });
    expect((await store.list()).map((claim) => claim.rebateId)).toEqual(['rb-3']);
    expect(seedClaims[0].idempotencyKey).toBe('rbt:rb-3');
  });

  it('claims a rebate and persists it to the file', async () => {
    const file = join(dir, 'claims.json');
    const store = createRebateClaimStore({ file });
    const result = await store.claim(draft(), context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(false);
    expect(result.claim.amountMinor).toBe(3344);
    expect(result.claim.claimedAt).toBe(at.toISOString());
    expect(result.claim.reference).toMatch(/^RB-/);

    // A fresh store (another module graph, like the route handlers) reads it back.
    const onDisk = JSON.parse(await readFile(file, 'utf8')) as unknown[];
    expect(onDisk).toHaveLength(2);
    const reopened = createRebateClaimStore({ file });
    expect((await reopened.list()).map((claim) => claim.rebateId).sort()).toEqual(['rb-1', 'rb-3']);
  });

  it('replays one claim for a repeated idempotency key', async () => {
    const store = createRebateClaimStore({ file: join(dir, 'claims.json') });
    const first = await store.claim(draft(), context);
    const second = await store.claim(draft(), { ...context, now: new Date('2026-10-14T16:00:00+08:00') });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.claim.id).toBe(first.claim.id);
    expect(second.claim.claimedAt).toBe(first.claim.claimedAt);
    expect(await store.list()).toHaveLength(2);
  });

  it('refuses a second claim of a rebate already paid out (409)', async () => {
    const store = createRebateClaimStore({ file: join(dir, 'claims.json') });
    await store.claim(draft(), context);
    // The seeded rb-3 and a fresh key: same rebate, different request.
    const again = await store.claim(draft({ rebateId: 'rb-3', idempotencyKey: 'key-3' }), context);
    expect(again).toEqual({ ok: false, code: '409' });
  });

  it('refuses a rebate below the minimum payout (210)', async () => {
    const store = createRebateClaimStore({ file: null });
    const small = await store.claim(
      draft({ rebateId: 'rb-4', idempotencyKey: 'key-4', product: 'Sports', amountMinor: 88 }),
      context,
    );
    expect(small).toEqual({ ok: false, code: '210' });
    // The boundary itself pays out.
    const edge = await store.claim(
      draft({ rebateId: 'rb-4', idempotencyKey: 'key-4', amountMinor: MIN_REBATE_PAYOUT_MINOR }),
      context,
    );
    expect(edge.ok).toBe(true);
  });

  it('reads a missing file as the seed', async () => {
    const store = createRebateClaimStore({ file: join(dir, 'never-written.json') });
    expect((await store.list()).map((claim) => claim.rebateId)).toEqual(['rb-3']);
  });

  it('needs a readable document on disk', async () => {
    const file = join(dir, 'claims.json');
    await writeFile(file, '{not json', 'utf8');
    const store = createRebateClaimStore({ file });
    await expect(store.list()).rejects.toThrow();
  });
});

describe('rebate status rules', () => {
  it('marks a row claimed when a claim record (or the fixture) says so', () => {
    const common = { seedStatus: 'claimable', amountMinor: 3344 } as const;
    expect(resolveRebateStatus({ ...common, claimed: true })).toBe('claimed');
    expect(resolveRebateStatus({ seedStatus: 'claimed', amountMinor: 2416, claimed: false })).toBe('claimed');
  });

  it('keeps a row claimable only above the minimum payout', () => {
    expect(resolveRebateStatus({ seedStatus: 'claimable', amountMinor: 1920, claimed: false })).toBe('claimable');
    expect(resolveRebateStatus({ seedStatus: 'claimable', amountMinor: 499, claimed: false })).toBe('pending');
    expect(resolveRebateStatus({ seedStatus: 'claimable', amountMinor: 500, claimed: false })).toBe('claimable');
    expect(resolveRebateStatus({ seedStatus: 'pending', amountMinor: 3344, claimed: false })).toBe('pending');
  });

  it('sums only what can be paid out now', () => {
    expect(
      sumClaimableMinor([
        { status: 'claimable', amountMinor: 3344 },
        { status: 'pending', amountMinor: 88 },
        { status: 'claimed', amountMinor: 2416 },
        { status: 'claimable', amountMinor: 1920 },
      ]),
    ).toBe(5264);
    expect(sumClaimableMinor([])).toBe(0);
  });
});
