import { describe, expect, it } from 'vitest';
import { parseAmountMinor } from '@/lib/format';

describe('parseAmountMinor', () => {
  it('reads whole and two-decimal amounts as integer minor units', () => {
    expect(parseAmountMinor('12')).toBe(1200);
    expect(parseAmountMinor('0.1')).toBe(10);
    expect(parseAmountMinor('0.30')).toBe(30);
    expect(parseAmountMinor('1,234.56')).toBe(123456);
  });

  it('adds 0.1 and 0.2 without float drift', () => {
    expect(parseAmountMinor('0.1')! + parseAmountMinor('0.2')!).toBe(30);
  });

  it('rejects signs, exponents, extra decimals and empty input', () => {
    expect(parseAmountMinor('')).toBeNull();
    expect(parseAmountMinor('-5')).toBeNull();
    expect(parseAmountMinor('1e3')).toBeNull();
    expect(parseAmountMinor('1.234')).toBeNull();
    expect(parseAmountMinor('abc')).toBeNull();
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(parseAmountMinor('99999999999999999999')).toBeNull();
  });
});
