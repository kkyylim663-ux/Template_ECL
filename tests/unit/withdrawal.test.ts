import { describe, expect, it } from 'vitest';
import fixture from '@/mocks/withdrawal.json';
import { withdrawalInfoSchema, withdrawalLimitsSchema, type WithdrawalInfo } from '@/lib/api/schemas';
import { buildVerifyRows, verifiedBankAccounts, verifyRowsComplete } from '@/lib/withdrawal-flow';

/**
 * T56's contract: the limits the reference prints (withdraw-placeholder-my/sg =
 * "Min 200.00 / Max 50,000.00"), the info payload shape, and the pure helpers
 * behind the "What to verify" table and the payout-account filter. The e2e
 * covers the panel's loading/error/empty/ready states.
 */
describe('withdrawal info', () => {
  it('pins the reference limits', () => {
    expect(fixture.d.limits).toEqual({ minAmountMinor: 20_000, maxAmountMinor: 5_000_000 });
    expect(() => withdrawalLimitsSchema.parse(fixture.d.limits)).not.toThrow();
  });

  it('rejects malformed limits', () => {
    expect(() =>
      withdrawalLimitsSchema.parse({ minAmountMinor: 0, maxAmountMinor: 5_000_000 }),
    ).toThrow();
    expect(() =>
      withdrawalLimitsSchema.parse({ minAmountMinor: 20_000, maxAmountMinor: -1 }),
    ).toThrow();
  });

  it('requires the document-check state on the info payload', () => {
    const base = { bankAccounts: [], banks: [], limits: fixture.d.limits };
    expect(() => withdrawalInfoSchema.parse({ ...base, kycStatus: 'verified' })).not.toThrow();
    expect(() => withdrawalInfoSchema.parse(base)).toThrow();
    expect(() => withdrawalInfoSchema.parse({ ...base, kycStatus: 'nonsense' })).toThrow();
  });
});

describe('withdrawal flow helpers', () => {
  const accountOf = (id: string, verified: boolean) => ({
    id,
    bankId: 'maybank',
    accountName: 'Demo Player',
    accountNumberMasked: '**** 4471',
    verified,
    addedAt: '2026-04-02T11:00:00+08:00',
  });

  const info = (
    kycStatus: WithdrawalInfo['kycStatus'],
    accounts: ReturnType<typeof accountOf>[],
  ): WithdrawalInfo => ({ bankAccounts: accounts, banks: [], limits: fixture.d.limits, kycStatus });

  it('offers payouts only from verified accounts', () => {
    const data = info('verified', [accountOf('a', true), accountOf('b', false)]);
    expect(verifiedBankAccounts(data).map((account) => account.id)).toEqual(['a']);
  });

  it('builds the MY rows without a bank-account row', () => {
    const rows = buildVerifyRows({ region: 'my', kycStatus: 'pending', hasVerifiedBank: true });
    expect(rows.map((row) => row.id)).toEqual(['mobile', 'email']);
    expect(rows.every((row) => !row.verified)).toBe(true);
    expect(verifyRowsComplete(rows)).toBe(false);
  });

  it('builds the SG rows with the bank account in the middle', () => {
    const rows = buildVerifyRows({ region: 'sg', kycStatus: 'verified', hasVerifiedBank: false });
    expect(rows.map((row) => row.id)).toEqual(['mobile', 'bank', 'email']);
    expect(rows.map((row) => row.verified)).toEqual([true, false, true]);
    expect(verifyRowsComplete(rows)).toBe(false);

    const done = buildVerifyRows({ region: 'sg', kycStatus: 'verified', hasVerifiedBank: true });
    expect(verifyRowsComplete(done)).toBe(true);
  });
});
