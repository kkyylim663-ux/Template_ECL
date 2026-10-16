import { describe, expect, it } from 'vitest';
import { formatAmountInput, formatMinorToInput, quickAmounts } from '@/lib/format';
import { bankDepositSchema, validate } from '@/lib/forms';

/** The bank method's limits from mocks/deposit-methods.json: RM 50.00 – RM 50,000.00. */
const schema = bankDepositSchema({ minMinor: 5000, maxMinor: 5000000 });
const valid = { bankId: 'maybank', amount: '50', terms: true };

function errorOf(values: unknown, field: string): string | undefined {
  const result = validate(schema, values);
  expect(result.ok).toBe(false);
  return result.ok ? undefined : result.errors[field];
}

describe('bankDepositSchema', () => {
  it('accepts an amount inside the limits with the terms ticked', () => {
    expect(validate(schema, valid).ok).toBe(true);
  });

  it('accepts a grouped amount and both exact bounds', () => {
    expect(validate(schema, { ...valid, amount: '50,000' }).ok).toBe(true);
    expect(validate(schema, { ...valid, amount: '50.00' }).ok).toBe(true);
  });

  it('requires a bank, an amount and the terms', () => {
    expect(errorOf({ bankId: '', amount: '', terms: false }, 'bankId')).toBe(
      'validation.bankRequired',
    );
    expect(errorOf({ ...valid, amount: '' }, 'amount')).toBe('validation.amountDeposit');
    expect(errorOf({ ...valid, terms: false }, 'terms')).toBe('validation.terms');
  });

  it('rejects what is not an amount', () => {
    expect(errorOf({ ...valid, amount: 'abc' }, 'amount')).toBe('validation.amountFormat');
    expect(errorOf({ ...valid, amount: '12.345' }, 'amount')).toBe('validation.amountFormat');
  });

  it('rejects amounts outside the method limits (reference codes 52 / 53)', () => {
    expect(errorOf({ ...valid, amount: '49.99' }, 'amount')).toBe('validation.amountBelowMin');
    expect(errorOf({ ...valid, amount: '50,000.01' }, 'amount')).toBe('validation.amountAboveMax');
  });
});

describe('formatAmountInput', () => {
  it('groups the integer part and keeps at most two decimals', () => {
    expect(formatAmountInput('12345')).toBe('12,345');
    expect(formatAmountInput('1234567')).toBe('1,234,567');
    expect(formatAmountInput('1234.5')).toBe('1,234.5');
    expect(formatAmountInput('1234.567')).toBe('1,234.56');
  });

  it('drops everything that is not a digit or a dot', () => {
    expect(formatAmountInput('abc')).toBe('');
    expect(formatAmountInput('RM 1,234')).toBe('1,234');
    expect(formatAmountInput('-5')).toBe('5');
  });

  it('handles the typing edges', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('.5')).toBe('0.5');
    expect(formatAmountInput('007')).toBe('7');
    expect(formatAmountInput('0.50')).toBe('0.50');
  });
});

describe('formatMinorToInput', () => {
  it('prints the plain figure an amount input shows', () => {
    expect(formatMinorToInput(5000)).toBe('50');
    expect(formatMinorToInput(5050)).toBe('50.50');
    expect(formatMinorToInput(5)).toBe('0.05');
    expect(formatMinorToInput(1234567)).toBe('12345.67');
  });
});

describe('quickAmounts', () => {
  it('walks the ladder off the minimum and stays inside the limits', () => {
    expect(quickAmounts(5000, 5000000)).toEqual([5000, 10000, 50000, 100000, 500000]);
    expect(quickAmounts(5000, 10000)).toEqual([5000, 10000]);
  });

  it('never returns an amount above the maximum', () => {
    for (const amountMinor of quickAmounts(5000, 5000000)) {
      expect(amountMinor).toBeLessThanOrEqual(5000000);
    }
  });
});
