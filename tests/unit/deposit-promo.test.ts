import { describe, expect, it } from 'vitest';
import { quoteDepositPromo } from '@/lib/api/deposit-promo';
import type { Promotion } from '@/lib/api/schemas';

const welcome: Promotion = {
  id: 'pr-welcome-188',
  slug: 'welcome-188',
  title: 'Welcome bonus 188%',
  summary: '',
  category: 'deposit',
  bonusPct: 188,
  maxBonusMinor: 18800,
  rolloverMultiplier: 8,
  startsAt: '2026-10-01T00:00:00+08:00',
  endsAt: '2026-12-31T23:59:00+08:00',
  tone: 42,
  rules: '',
};

const MIN = 5000;

describe('quoteDepositPromo', () => {
  it('pays the percentage of the deposit and sizes turnover on deposit plus bonus', () => {
    // RM 100.00 × 188% = RM 188.00; turnover = (100 + 188) × 8 = RM 2,304.00.
    expect(quoteDepositPromo(welcome, 10000, MIN)).toEqual({
      bonusMinor: 18800,
      rolloverMinor: 230400,
      belowMinimum: false,
      minDepositMinor: MIN,
    });
  });

  it('caps the bonus at the promotion maximum', () => {
    // RM 1,000.00 × 188% = RM 1,880.00, capped at RM 188.00.
    const quote = quoteDepositPromo(welcome, 100000, MIN);
    expect(quote.bonusMinor).toBe(18800);
    expect(quote.rolloverMinor).toBe((100000 + 18800) * 8);
  });

  it('floors fractional sen before the cap applies', () => {
    // RM 50.01 × 18% = 900.18 sen → 900 sen.
    const daily = { ...welcome, bonusPct: 18, maxBonusMinor: 8800, rolloverMultiplier: 5 };
    expect(quoteDepositPromo(daily, 5001, MIN).bonusMinor).toBe(900);
  });

  it('gives no bonus and no turnover below the method minimum', () => {
    expect(quoteDepositPromo(welcome, 4999, MIN)).toEqual({
      bonusMinor: 0,
      rolloverMinor: 0,
      belowMinimum: true,
      minDepositMinor: MIN,
    });
  });

  it('pays a zero bonus for a promotion without a percentage, but keeps its turnover', () => {
    const freeSpin = { ...welcome, bonusPct: 0, maxBonusMinor: 0, rolloverMultiplier: 20 };
    expect(quoteDepositPromo(freeSpin, 10000, MIN)).toEqual({
      bonusMinor: 0,
      rolloverMinor: 200000,
      belowMinimum: false,
      minDepositMinor: MIN,
    });
  });
});
