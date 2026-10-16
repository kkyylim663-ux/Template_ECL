import type { Promotion } from './schemas';

/**
 * T55: the bonus and turnover a deposit earns under one deposit promotion. Lives
 * in lib/api so the mock route is the only place the numbers are computed; the
 * picker shows what the route answers and never works a bonus out itself.
 */
export type DepositPromoQuote = {
  bonusMinor: number;
  rolloverMinor: number;
  belowMinimum: boolean;
  minDepositMinor: number;
};

export function isDepositPromo(promotion: Promotion): boolean {
  return promotion.category === 'deposit';
}

/**
 * Bonus is the percentage of the deposit, capped at the promotion's maximum.
 * Turnover is `(deposit + bonus) × rollover multiplier`. A deposit under the
 * method's minimum does not qualify, so both figures are zero.
 */
export function quoteDepositPromo(
  promotion: Promotion,
  amountMinor: number,
  minDepositMinor: number,
): DepositPromoQuote {
  if (amountMinor < minDepositMinor) {
    return { bonusMinor: 0, rolloverMinor: 0, belowMinimum: true, minDepositMinor };
  }
  const percent = Math.floor((amountMinor * promotion.bonusPct) / 100);
  const bonusMinor = Math.min(percent, promotion.maxBonusMinor);
  const rolloverMinor = Math.floor((amountMinor + bonusMinor) * promotion.rolloverMultiplier);
  return { bonusMinor, rolloverMinor, belowMinimum: false, minDepositMinor };
}
