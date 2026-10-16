import { describe, expect, it } from 'vitest';
import fixture from '@/mocks/deposit-methods.json';
import {
  DEPOSIT_METHOD_IDS,
  depositCatalogSchema,
  depositMethodSchema,
  isDepositMethodId,
} from '@/lib/api/schemas';
import { resolveMethodId } from '@/lib/api/deposit';

/**
 * T51's catalog contract: the three methods the tab row switches between, the
 * limits the panel prints, and the `?method=` fallback. The e2e covers the
 * panel's loading/error/empty/ready states; here the fixture and the pure
 * helpers are pinned.
 */
describe('deposit catalog', () => {
  it('ships exactly the three reference methods, in tab order', () => {
    const methods = fixture.d.methods;
    expect(methods.map((method) => method.id)).toEqual([...DEPOSIT_METHOD_IDS]);
    for (const method of methods) {
      expect(() => depositMethodSchema.parse(method)).not.toThrow();
    }
  });

  it('keeps the bank transfer rail inside the reference evidence', () => {
    // The reference hardcodes Min 50.00 / Max 50,000.00 (bank-info-tpl) and
    // repeats "Min 50, Max 50,000" (sdk.js crypto_min_max); the mock must not
    // print a wider band than the reference itself does.
    const bank = fixture.d.methods.find((method) => method.id === 'bank')!;
    expect(bank.minAmountMinor).toBe(5_000);
    expect(bank.maxAmountMinor).toBe(5_000_000);
    expect(bank.feePct).toBe(0);
  });

  it('rejects malformed methods', () => {
    const base = { id: 'bank', minAmountMinor: 5_000, maxAmountMinor: 5_000_000, feePct: 0 };
    expect(() => depositMethodSchema.parse({ ...base, minAmountMinor: 0 })).toThrow();
    expect(() => depositMethodSchema.parse({ ...base, maxAmountMinor: -1 })).toThrow();
    expect(() => depositMethodSchema.parse({ ...base, feePct: -1 })).toThrow();
    expect(() => depositMethodSchema.parse({ ...base, id: 'crypto' })).toThrow();
  });

  it('validates the whole catalog shape the route answers', () => {
    expect(() => depositCatalogSchema.parse({ ...fixture.d, banks: [], channels: [] })).not.toThrow();
    expect(() => depositCatalogSchema.parse({ ...fixture.d, methods: {} })).toThrow();
    expect(() => depositCatalogSchema.parse({ methods: fixture.d.methods })).toThrow();
  });

  it('resolves ?method= with bank as the fallback', () => {
    expect(resolveMethodId('bank')).toBe('bank');
    expect(resolveMethodId('gateway')).toBe('gateway');
    expect(resolveMethodId('qr')).toBe('qr');
    expect(resolveMethodId(['qr', 'bank'])).toBe('qr');
    expect(resolveMethodId('crypto')).toBe('bank');
    expect(resolveMethodId('')).toBe('bank');
    expect(resolveMethodId(undefined)).toBe('bank');
  });

  it('guards method ids for the URL listeners', () => {
    expect(isDepositMethodId('qr')).toBe(true);
    expect(isDepositMethodId('QR')).toBe(false);
    expect(isDepositMethodId('nope')).toBe(false);
    expect(isDepositMethodId(null)).toBe(false);
    expect(isDepositMethodId(7)).toBe(false);
  });
});
