import { describe, expect, it } from 'vitest';
import { createOrderStore, GATEWAY_ORDER_TTL_SECONDS } from '@/lib/mock-deposit/orders';
import {
  depositGatewayUrl,
  depositResultUrl,
  normalizeDepositResultStatus,
} from '@/lib/deposit-flow';
import { gatewayDepositSchema, validate } from '@/lib/forms';
import { formatCountdown } from '@/lib/format';

/**
 * T54: the gateway order's rules. The store runs in memory here (`file: null`)
 * with an injectable clock, so the session windows are exact; the idempotency
 * line — the first ruling wins and `creditedAt` is stamped exactly once — is
 * what the result page's "refresh never replays" acceptance rests on.
 */
const start = Date.parse('2026-10-17T00:00:00Z');

function makeStore(clock: { t: number }) {
  return createOrderStore({ file: null, now: () => clock.t });
}

describe('gateway order store', () => {
  it('creates an order with a PG- id and the 15-minute session', async () => {
    const clock = { t: start };
    const store = makeStore(clock);
    const order = await store.create({ amountMinor: 10000 });

    expect(order.orderId).toMatch(/^PG-[0-9A-Z]+$/);
    expect(order.amountMinor).toBe(10000);
    expect(Date.parse(order.expiresAt) - start).toBe(GATEWAY_ORDER_TTL_SECONDS * 1000);
    expect(order.rulings).toBe(0);
    expect(order.outcome).toBeUndefined();
    expect(await store.get(order.orderId)).toEqual(order);
  });

  it('honours a ttl override and misses cleanly on unknown ids', async () => {
    const clock = { t: start };
    const store = makeStore(clock);
    const order = await store.create({ amountMinor: 5000, ttlSeconds: 2 });

    expect(Date.parse(order.expiresAt) - start).toBe(2000);
    expect(await store.get('PG-NOPE')).toBeUndefined();
    expect(await store.resolve('PG-NOPE', 'success')).toEqual({ ok: false, reason: 'missing' });
  });

  it('the first ruling wins; later resolutions never overwrite it', async () => {
    const clock = { t: start };
    const store = makeStore(clock);
    const order = await store.create({ amountMinor: 10000 });

    const first = await store.resolve(order.orderId, 'success');
    expect(first.ok && first.firstRuling).toBe(true);

    clock.t = start + 30_000;
    const second = await store.resolve(order.orderId, 'failed');
    expect(second.ok && second.firstRuling).toBe(false);

    const stored = await store.get(order.orderId);
    expect(stored?.outcome).toBe('success');
    expect(stored?.rulings).toBe(1);
  });

  it('stamps creditedAt once on a success ruling and never on the others', async () => {
    const clock = { t: start };
    const store = makeStore(clock);
    const ok = await store.create({ amountMinor: 10000 });
    await store.resolve(ok.orderId, 'success');
    const credited = (await store.get(ok.orderId))?.creditedAt;
    expect(credited).toBe(new Date(start).toISOString());

    // A replay (a second click, a result-page refresh) keeps the same stamp.
    clock.t = start + 60_000;
    await store.resolve(ok.orderId, 'success');
    expect((await store.get(ok.orderId))?.creditedAt).toBe(credited);

    const pending = await store.create({ amountMinor: 10000 });
    await store.resolve(pending.orderId, 'processing');
    expect((await store.get(pending.orderId))?.creditedAt).toBeUndefined();
  });

  it('refuses a ruling after the session has expired', async () => {
    const clock = { t: start };
    const store = makeStore(clock);
    const order = await store.create({ amountMinor: 10000, ttlSeconds: 10 });

    clock.t = start + 10_001;
    expect(await store.resolve(order.orderId, 'success')).toEqual({ ok: false, reason: 'expired' });
    expect((await store.get(order.orderId))?.outcome).toBeUndefined();
  });
});

describe('normalizeDepositResultStatus', () => {
  it('accepts the three ruled words and falls back to unknown for anything else', () => {
    expect(normalizeDepositResultStatus('success')).toBe('success');
    expect(normalizeDepositResultStatus('failed')).toBe('failed');
    expect(normalizeDepositResultStatus('processing')).toBe('processing');
    expect(normalizeDepositResultStatus(['failed', 'success'])).toBe('failed');
    expect(normalizeDepositResultStatus('bogus')).toBe('unknown');
    expect(normalizeDepositResultStatus('')).toBe('unknown');
    expect(normalizeDepositResultStatus(undefined)).toBe('unknown');
  });
});

describe('gateway URLs', () => {
  it('builds the window and result links off the region', () => {
    expect(depositGatewayUrl('my', 'PG-1')).toBe('/my/account/deposit/gateway?order=PG-1');
    expect(depositResultUrl('my', 'PG-1', 'success')).toBe(
      '/my/account/deposit/result?status=success&order=PG-1',
    );
  });
});

describe('gatewayDepositSchema', () => {
  const schema = gatewayDepositSchema({ minMinor: 5000, maxMinor: 2_000_000 });

  it('enforces the gateway limits and the terms, like the bank rail', () => {
    expect(validate(schema, { amount: '49.99', terms: true }).ok).toBe(false);
    expect(validate(schema, { amount: '20,000.01', terms: true }).ok).toBe(false);
    expect(validate(schema, { amount: 'abc', terms: true }).ok).toBe(false);
    expect(validate(schema, { amount: '100', terms: false }).ok).toBe(false);
    expect(validate(schema, { amount: '100', terms: true }).ok).toBe(true);
  });
});

describe('formatCountdown', () => {
  it('renders mm:ss, floored and never negative', () => {
    expect(formatCountdown(900_000)).toBe('15:00');
    expect(formatCountdown(59_999)).toBe('00:59');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});
