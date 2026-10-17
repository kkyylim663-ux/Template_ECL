import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createVoucherStore, type VoucherStoreSnapshot } from '@/lib/mock-vouchers/store';
import {
  voucherAvailability,
  voucherCodeIssue,
  voucherStatus,
  voucherWindowState,
  vouchersLeft,
  type VoucherOffer,
} from '@/lib/voucher-rules';

/**
 * T66's contract: the voucher store's server rules — a code must be in the
 * catalogue, may only be redeemed once, must be inside its own window and must
 * still have vouchers left; one idempotency key writes one row. The e2e covers
 * the dialog.
 */
const at = new Date('2026-10-17T14:00:00+08:00');
const catalogue: VoucherOffer[] = [
  {
    code: 'WELCOME188',
    amountMinor: 18800,
    startsAt: '2026-01-01T00:00:00+08:00',
    expiresAt: '2026-12-31T23:59:00+08:00',
    left: 500,
  },
  {
    code: 'SOONCODE',
    amountMinor: 10000,
    startsAt: '2027-01-01T00:00:00+08:00',
    expiresAt: '2027-06-30T23:59:00+08:00',
    left: 10,
  },
  {
    code: 'EXPIREDVOUCHER',
    amountMinor: 8800,
    startsAt: '2026-01-01T00:00:00+08:00',
    expiresAt: '2026-09-30T23:59:00+08:00',
    left: 100,
  },
  {
    code: 'SOLDOUTCODE',
    amountMinor: 3000,
    startsAt: '2026-01-01T00:00:00+08:00',
    expiresAt: '2026-12-31T23:59:00+08:00',
    left: 0,
  },
];
const ctx = { catalogue, now: at };

const empty: VoucherStoreSnapshot = { redemptions: [] };
const memory = () => createVoucherStore({ file: null, storeSeed: empty });

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'voucher-store-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('redeem', () => {
  it('records the code with its own amount and expiry, and counts the stock down', async () => {
    const store = memory();
    const result = await store.redeem({ code: 'WELCOME188', idempotencyKey: 'key-1' }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(false);
    expect(result.left).toBe(499);
    expect(result.entry).toMatchObject({
      code: 'WELCOME188',
      amountMinor: 18800,
      expiresAt: '2026-12-31T23:59:00+08:00',
      redeemedAt: '2026-10-17T06:00:00.000Z',
      idempotencyKey: 'key-1',
    });
    expect(result.entry.id).toMatch(/^vr_/);
    expect((await store.read()).redemptions).toHaveLength(1);
  });

  it('matches the code case-insensitively and stores the upper case', async () => {
    const store = memory();
    const result = await store.redeem({ code: '  welcome188 ', idempotencyKey: 'key-1' }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.code).toBe('WELCOME188');
  });

  it('rejects a code the catalogue does not know', async () => {
    const store = memory();
    expect(await store.redeem({ code: 'NOPE', idempotencyKey: 'key-1' }, ctx)).toEqual({
      ok: false,
      code: '404',
    });
  });

  it('rejects a second redemption of the same code', async () => {
    const store = memory();
    await store.redeem({ code: 'WELCOME188', idempotencyKey: 'key-1' }, ctx);
    expect(await store.redeem({ code: 'welcome188', idempotencyKey: 'key-2' }, ctx)).toEqual({
      ok: false,
      code: '409',
    });
  });

  it('rejects a code that has not started yet and one that is past its expiry', async () => {
    const store = memory();
    expect(await store.redeem({ code: 'SOONCODE', idempotencyKey: 'key-1' }, ctx)).toEqual({
      ok: false,
      code: '410',
    });
    expect(await store.redeem({ code: 'EXPIREDVOUCHER', idempotencyKey: 'key-2' }, ctx)).toEqual({
      ok: false,
      code: '410',
    });
  });

  it('rejects a code whose stock ran out', async () => {
    const store = memory();
    expect(await store.redeem({ code: 'SOLDOUTCODE', idempotencyKey: 'key-1' }, ctx)).toEqual({
      ok: false,
      code: '411',
    });
  });

  it('replays one idempotency key as the same redemption', async () => {
    const store = memory();
    const first = await store.redeem({ code: 'WELCOME188', idempotencyKey: 'key-1' }, ctx);
    const again = await store.redeem({ code: 'WELCOME188', idempotencyKey: 'key-1' }, ctx);

    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.replayed).toBe(true);
    expect(again.entry.id).toBe(first.entry.id);
    expect(again.left).toBe(499);
    expect((await store.read()).redemptions).toHaveLength(1);
  });

  it('replays a retried submit even after the code was spent', async () => {
    const store = memory();
    const first = await store.redeem({ code: 'WELCOME188', idempotencyKey: 'key-1' }, ctx);
    const again = await store.redeem({ code: 'WELCOME188', idempotencyKey: 'key-1' }, ctx);

    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.replayed).toBe(true);
  });
});

describe('the rules', () => {
  it('validates the code before anything is sent', () => {
    expect(voucherCodeIssue('')).toBe('required');
    expect(voucherCodeIssue('   ')).toBe('required');
    expect(voucherCodeIssue('AB')).toBe('format');
    expect(voucherCodeIssue('has space')).toBe('format');
    expect(voucherCodeIssue('welcome-188')).toBeNull();
  });

  it('places a code in its window, treating an unreadable or just-ended one as expired', () => {
    expect(voucherWindowState(catalogue[0], at)).toBe('open');
    expect(voucherWindowState(catalogue[1], at)).toBe('scheduled');
    expect(voucherWindowState(catalogue[2], at)).toBe('expired');
    expect(
      voucherWindowState({ ...catalogue[0], expiresAt: '2026-10-17T14:00:00+08:00' }, at),
    ).toBe('expired');
    expect(voucherWindowState({ ...catalogue[0], expiresAt: 'not a date' }, at)).toBe('expired');
  });

  it('counts the stock down and never below zero', () => {
    expect(vouchersLeft(catalogue[0], 0)).toBe(500);
    expect(vouchersLeft(catalogue[0], 500)).toBe(0);
    expect(vouchersLeft(catalogue[0], 900)).toBe(0);
    expect(vouchersLeft(catalogue[3], 0)).toBe(0);
  });

  it('answers the window first, then the stock', () => {
    expect(voucherAvailability(catalogue[0], 0, at)).toBe('open');
    expect(voucherAvailability(catalogue[1], 0, at)).toBe('not-redeemable');
    expect(voucherAvailability(catalogue[3], 0, at)).toBe('finished');
  });

  it('keeps a redeemed voucher active until its code expires', () => {
    expect(voucherStatus('2026-12-31T23:59:00+08:00', at)).toBe('active');
    expect(voucherStatus('2026-09-30T23:59:00+08:00', at)).toBe('expired');
    expect(voucherStatus('nonsense', at)).toBe('expired');
  });
});

describe('the file behind the store', () => {
  it('seeds from the given seed when the file does not exist yet', async () => {
    const store = createVoucherStore({ file: join(dir, 'voucher-store.json'), storeSeed: empty });
    expect(await store.read()).toEqual(empty);
  });

  it('keeps a redemption across store instances', async () => {
    const file = join(dir, 'voucher-store.json');
    await createVoucherStore({ file, storeSeed: empty }).redeem(
      { code: 'WELCOME188', idempotencyKey: 'key-1' },
      ctx,
    );

    const reopened = createVoucherStore({ file, storeSeed: empty });
    const snapshot = await reopened.read();
    expect(snapshot.redemptions).toHaveLength(1);
    expect(snapshot.redemptions[0].code).toBe('WELCOME188');

    // A second instance must not hand the same code out again.
    expect(await reopened.redeem({ code: 'WELCOME188', idempotencyKey: 'key-2' }, ctx)).toEqual({
      ok: false,
      code: '409',
    });
    const raw = JSON.parse(await readFile(file, 'utf8')) as { redemptions: unknown[] };
    expect(raw.redemptions).toHaveLength(1);
  });

  it('reports a corrupt file instead of silently reseeding', async () => {
    const file = join(dir, 'voucher-store.json');
    await writeFile(file, 'not json', 'utf8');
    await expect(createVoucherStore({ file, storeSeed: empty }).read()).rejects.toThrow();
  });
});
