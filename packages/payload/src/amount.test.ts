import { describe, expect, it } from 'vitest';
import { formatAmount } from './amount.js';

describe('formatAmount — happy path', () => {
  it('formats whole baht with two decimals', () => {
    expect(formatAmount(50)).toBe('50.00');
    expect(formatAmount(1)).toBe('1.00');
    expect(formatAmount(100)).toBe('100.00');
  });

  it('formats fractional baht', () => {
    expect(formatAmount(99.5)).toBe('99.50');
    expect(formatAmount(0.05)).toBe('0.05');
    expect(formatAmount(0.5)).toBe('0.50');
  });

  it('formats two-decimal precision exactly', () => {
    expect(formatAmount(123.45)).toBe('123.45');
    expect(formatAmount(1000.99)).toBe('1000.99');
  });

  it('formats large whole-thousand amounts', () => {
    expect(formatAmount(10_000)).toBe('10000.00');
    expect(formatAmount(123_456)).toBe('123456.00');
  });

  it('survives float rounding noise', () => {
    expect(formatAmount(0.1 + 0.2)).toBe('0.30');
    expect(formatAmount(1.005)).toMatch(/^1\.0[01]$/);
  });
});

describe('formatAmount — satang mode', () => {
  it('accepts satang integers', () => {
    expect(formatAmount(12_345, { fromSatang: true })).toBe('123.45');
    expect(formatAmount(100, { fromSatang: true })).toBe('1.00');
    expect(formatAmount(1, { fromSatang: true })).toBe('0.01');
  });

  it('accepts satang BigInt', () => {
    expect(formatAmount(12_345n, { fromSatang: true })).toBe('123.45');
    expect(formatAmount(5_000n, { fromSatang: true })).toBe('50.00');
  });

  it('accepts baht BigInt (no satang flag)', () => {
    expect(formatAmount(50n)).toBe('50.00');
  });

  it('honours fromSatang explicitly false', () => {
    expect(formatAmount(50, { fromSatang: false })).toBe('50.00');
  });

  it('produces 0.01 baht for 1 satang', () => {
    expect(formatAmount(1, { fromSatang: true })).toBe('0.01');
  });

  it('produces 1000.00 baht for 100000 satang', () => {
    expect(formatAmount(100_000, { fromSatang: true })).toBe('1000.00');
  });
});

describe('formatAmount — null / zero / negative', () => {
  it('returns null for undefined', () => {
    expect(formatAmount(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(formatAmount(null)).toBeNull();
  });

  it('returns null for zero', () => {
    expect(formatAmount(0)).toBeNull();
  });

  it('returns null for zero satang', () => {
    expect(formatAmount(0, { fromSatang: true })).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(formatAmount(-1)).toBeNull();
    expect(formatAmount(-100)).toBeNull();
    expect(formatAmount(-0.01)).toBeNull();
  });

  it('returns null for negative satang', () => {
    expect(formatAmount(-100, { fromSatang: true })).toBeNull();
  });
});

describe('formatAmount — invalid input', () => {
  it('throws for Infinity', () => {
    expect(() => formatAmount(Number.POSITIVE_INFINITY)).toThrow(/finite number/);
  });

  it('throws for -Infinity', () => {
    expect(() => formatAmount(Number.NEGATIVE_INFINITY)).toThrow(/finite number/);
  });

  it('throws for NaN', () => {
    expect(() => formatAmount(Number.NaN)).toThrow(/finite number/);
  });

  it('throws for amounts over the 10-digit cap', () => {
    expect(() => formatAmount(10_000_000_000)).toThrow(/exceeds max/);
  });

  it('accepts amounts at the cap', () => {
    expect(formatAmount(9_999_999_999.99)).toBe('9999999999.99');
  });

  it('throws RangeError for over-cap (not TypeError)', () => {
    expect(() => formatAmount(99_999_999_999)).toThrow(RangeError);
  });

  it('throws TypeError for NaN (not RangeError)', () => {
    expect(() => formatAmount(Number.NaN)).toThrow(TypeError);
  });
});

describe('formatAmount — output format', () => {
  it('always emits a single dot', () => {
    for (const v of [1, 1.5, 0.99, 1234.56, 9_999_999.99]) {
      const s = formatAmount(v)!;
      expect(s.split('.').length).toBe(2);
    }
  });

  it('always emits exactly 2 decimal digits', () => {
    for (const v of [1, 1.5, 1.55, 1.555]) {
      const s = formatAmount(v)!;
      expect(s.split('.')[1]).toHaveLength(2);
    }
  });

  it('never emits scientific notation', () => {
    expect(formatAmount(1e-2)).not.toContain('e');
    expect(formatAmount(0.01)).toBe('0.01');
  });

  it('never emits leading zeros on integer part', () => {
    expect(formatAmount(7)).toBe('7.00');
    expect(formatAmount(70)).toBe('70.00');
  });
});
