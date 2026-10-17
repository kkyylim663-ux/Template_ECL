import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withdrawalRequestSchema, validate } from '@/lib/forms';
import {
  MAX_WITHDRAWALS_PER_DAY,
  createWithdrawalRequestStore,
  malaysiaDay,
  type RequestContext,
} from '@/lib/mock-withdrawal/requests';

/**
 * T58's contract: the payout request's server rules (verified account, limits,
 * one pending request, turnover gate, daily cap), the idempotency key that makes
 * a double submit write one row, and the amount schema the form runs before it
 * posts. The e2e covers the form's prompts and the wallet debit.
 */
const limits = { minAmountMinor: 20_000, maxAmountMinor: 5_000_000 };
const at = new Date('2026-10-17T10:00:00+08:00');
const context = (over: Partial<RequestContext> = {}): RequestContext => ({
  limits,
  verifiedAccountIds: ['ba-1'],
  turnoverRemainingMinor: 0,
  maxPerDay: MAX_WITHDRAWALS_PER_DAY,
  now: at,
  ...over,
});
const draft = (over: Partial<{ idempotencyKey: string; amountMinor: number; bankAccountId: string }> = {}) => ({
  idempotencyKey: 'key-1',
  bankAccountId: 'ba-1',
  methodLabel: 'Maybank **** 4471',
  amountMinor: 50_000,
  ...over,
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'wd-req-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('withdrawal request store', () => {
  it('creates one pending row for a verified account inside the limits', async () => {
    const store = createWithdrawalRequestStore({ file: join(dir, 'r.json') });
    const result = await store.create(draft(), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.status).toBe('pending');
    expect((await store.list()).map((row) => row.amountMinor)).toEqual([50_000]);
  });

  it('answers the same idempotency key with the first row and writes nothing new', async () => {
    const store = createWithdrawalRequestStore({ file: null });
    const first = await store.create(draft(), context());
    const again = await store.create(draft(), context({ turnoverRemainingMinor: 9 }));
    expect(again.ok && again.replayed).toBe(true);
    expect(again.ok && first.ok && again.request.id).toBe(first.ok && first.request.id);
    expect(await store.list()).toHaveLength(1);
  });

  it('rejects an unverified account (201), a below-minimum (210) and an above-maximum (211) amount', async () => {
    const store = createWithdrawalRequestStore({ file: null });
    expect(await store.create(draft({ bankAccountId: 'ba-2' }), context())).toEqual({ ok: false, code: '201' });
    expect(await store.create(draft({ amountMinor: 19_999 }), context())).toEqual({ ok: false, code: '210' });
    expect(await store.create(draft({ amountMinor: 5_000_001 }), context())).toEqual({ ok: false, code: '211' });
  });

  it('allows the exact limits', async () => {
    const low = createWithdrawalRequestStore({ file: null });
    expect((await low.create(draft({ amountMinor: 20_000 }), context())).ok).toBe(true);
    const high = createWithdrawalRequestStore({ file: null });
    expect((await high.create(draft({ amountMinor: 5_000_000 }), context())).ok).toBe(true);
  });

  it('holds a second request while one is pending (212)', async () => {
    const store = createWithdrawalRequestStore({ file: null });
    await store.create(draft(), context());
    expect(await store.create(draft({ idempotencyKey: 'k2' }), context())).toEqual({ ok: false, code: '212' });
  });

  it('blocks while turnover is still owed (213)', async () => {
    const store = createWithdrawalRequestStore({ file: null });
    expect(await store.create(draft(), context({ turnoverRemainingMinor: 54_000 }))).toEqual({
      ok: false,
      code: '213',
    });
  });

  it('stops at the daily cap (501) and counts only today in Malaysia time', async () => {
    const earlier = new Date('2026-10-16T10:00:00+08:00');
    const row = (index: number, createdAt: Date) => ({
      id: `wd_${index}`,
      reference: `WD-${index}`,
      idempotencyKey: `seed-${index}`,
      bankAccountId: 'ba-1',
      methodLabel: 'Maybank **** 4471',
      amountMinor: 50_000,
      status: 'success' as const,
      createdAt: createdAt.toISOString(),
    });
    const file = join(dir, 'r.json');
    const store = createWithdrawalRequestStore({ file });

    await writeFile(file, JSON.stringify(Array.from({ length: MAX_WITHDRAWALS_PER_DAY }, (_, i) => row(i, earlier))), 'utf8');
    expect((await store.create(draft({ idempotencyKey: 'today' }), context({ now: at }))).ok).toBe(true);

    await writeFile(file, JSON.stringify(Array.from({ length: MAX_WITHDRAWALS_PER_DAY }, (_, i) => row(i, at))), 'utf8');
    expect(await store.create(draft({ idempotencyKey: 'over' }), context({ now: at }))).toEqual({ ok: false, code: '501' });
  });

  it('keys the calendar day to Malaysia time', () => {
    expect(malaysiaDay(new Date('2026-10-17T16:30:00Z'))).toBe('2026-10-18');
    expect(malaysiaDay(new Date('2026-10-17T15:30:00Z'))).toBe('2026-10-17');
  });
});

/** T59B: only the back office moves a pending request, and only to a final state. */
describe('withdrawal request settlement', () => {
  async function pending() {
    const store = createWithdrawalRequestStore({ file: null });
    const created = await store.create(draft(), context());
    if (!created.ok) throw new Error('seed request failed');
    return { store, id: created.request.id };
  }

  it('moves a pending request to a final state once', async () => {
    const { store, id } = await pending();
    const settled = await store.settle(id, 'failed');
    expect(settled).toMatchObject({ ok: true, changed: true });
    expect((await store.list())[0].status).toBe('failed');
  });

  it('answers the same final state without changing anything', async () => {
    const { store, id } = await pending();
    await store.settle(id, 'success');
    expect(await store.settle(id, 'success')).toMatchObject({ ok: true, changed: false });
    expect((await store.list())[0].status).toBe('success');
  });

  it('never lets a settled request change its mind', async () => {
    const { store, id } = await pending();
    await store.settle(id, 'success');
    expect(await store.settle(id, 'failed')).toEqual({ ok: false, code: 'already_final' });
    expect((await store.list())[0].status).toBe('success');
  });

  it('reports an unknown request', async () => {
    const { store } = await pending();
    expect(await store.settle('wd_missing', 'success')).toEqual({ ok: false, code: 'not_found' });
  });
});

describe('withdrawalRequestSchema', () => {
  const schema = withdrawalRequestSchema({ minMinor: 20_000, maxMinor: 5_000_000 });
  const errorOf = (amount: string) => {
    const result = validate(schema, { bankAccountId: 'ba-1', amount });
    return result.ok ? undefined : result.errors.amount;
  };

  it('asks for an amount, a number, and the limits', () => {
    expect(errorOf('')).toBe('validation.amountWithdraw');
    expect(errorOf('abc')).toBe('validation.amountFormat');
    expect(errorOf('199.99')).toBe('validation.amountBelowWithdraw');
    expect(errorOf('50,000.01')).toBe('validation.amountAboveWithdraw');
  });

  it('accepts the exact bounds with grouping', () => {
    expect(errorOf('200')).toBeUndefined();
    expect(errorOf('50,000')).toBeUndefined();
  });
});
