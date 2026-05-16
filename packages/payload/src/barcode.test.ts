import { describe, expect, it } from 'vitest';
import { buildBotBarcode, parseBotBarcode } from './barcode.js';

describe('buildBotBarcode — wire format', () => {
  it('emits biller + ref1 with empty ref2 and "0" amount sentinel', () => {
    const wire = buildBotBarcode({ billerId: '099999999999990', ref1: '111222333444' });
    expect(wire).toBe('|099999999999990\r111222333444\r\r0');
    expect(wire).toHaveLength(32);
  });

  it('emits biller + ref1 + ref2 + integer-satang amount', () => {
    const wire = buildBotBarcode({
      billerId: '099400016550100',
      ref1: '123456789012',
      ref2: '670429',
      amount: 3649.22,
    });
    expect(wire).toBe('|099400016550100\r123456789012\r670429\r364922');
    expect(wire).toHaveLength(43);
  });

  it('always carries three carriage returns', () => {
    const wire = buildBotBarcode({ billerId: '099999999999990', ref1: '111222333444' });
    const crCount = [...wire].filter((c) => c.charCodeAt(0) === 0x0d).length;
    expect(crCount).toBe(3);
  });

  it('zero-pads short biller ids to 15 chars', () => {
    const wire = buildBotBarcode({ billerId: '12345', ref1: 'CUST01' });
    expect(wire.slice(1, 16)).toBe('000000000012345');
  });

  it('writes "0" when amount is omitted', () => {
    const wire = buildBotBarcode({ billerId: '099999999999990', ref1: 'CUST01' });
    expect(wire.endsWith('\r0')).toBe(true);
  });

  it('writes "0" when amount is explicitly 0', () => {
    const wire = buildBotBarcode({ billerId: '099999999999990', ref1: 'CUST01', amount: 0 });
    expect(wire.endsWith('\r0')).toBe(true);
  });

  it('handles whole-baht amounts without trailing zeros', () => {
    const wire = buildBotBarcode({
      billerId: '099999999999990',
      ref1: 'CUST01',
      amount: 50,
    });
    expect(wire.endsWith('\r5000')).toBe(true);
  });

  it('survives float-rounding noise on the amount', () => {
    const wire = buildBotBarcode({
      billerId: '099999999999990',
      ref1: 'CUST01',
      amount: 0.1 + 0.2,
    });
    expect(wire.endsWith('\r30')).toBe(true);
  });

  it('allows empty ref2 explicitly', () => {
    const wire = buildBotBarcode({
      billerId: '099999999999990',
      ref1: 'CUST01',
      ref2: '',
    });
    expect(wire).toBe('|099999999999990\rCUST01\r\r0');
  });
});

describe('buildBotBarcode — invalid input', () => {
  it('throws on empty billerId', () => {
    expect(() => buildBotBarcode({ billerId: '', ref1: 'CUST01' })).toThrow(TypeError);
  });

  it('throws on over-long billerId', () => {
    expect(() => buildBotBarcode({ billerId: '0123456789012345', ref1: 'CUST01' })).toThrow(
      RangeError,
    );
  });

  it('throws on empty ref1', () => {
    expect(() => buildBotBarcode({ billerId: '099999999999990', ref1: '' })).toThrow(TypeError);
  });

  it('throws when ref1 contains a carriage return', () => {
    expect(() => buildBotBarcode({ billerId: '099999999999990', ref1: 'CU\rST01' })).toThrow(
      TypeError,
    );
  });

  it('throws when ref2 contains a carriage return', () => {
    expect(() =>
      buildBotBarcode({
        billerId: '099999999999990',
        ref1: 'CUST01',
        ref2: 'foo\rbar',
      }),
    ).toThrow(TypeError);
  });

  it('throws when billerId contains a carriage return', () => {
    expect(() => buildBotBarcode({ billerId: '0999\r99999990', ref1: 'CUST01' })).toThrow(
      TypeError,
    );
  });

  it('throws on negative amount', () => {
    expect(() =>
      buildBotBarcode({ billerId: '099999999999990', ref1: 'CUST01', amount: -1 }),
    ).toThrow(RangeError);
  });

  it('throws on NaN amount', () => {
    expect(() =>
      buildBotBarcode({ billerId: '099999999999990', ref1: 'CUST01', amount: Number.NaN }),
    ).toThrow(TypeError);
  });

  it('throws on Infinity amount', () => {
    expect(() =>
      buildBotBarcode({
        billerId: '099999999999990',
        ref1: 'CUST01',
        amount: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(TypeError);
  });

  it('throws when amount exceeds the wire cap', () => {
    expect(() =>
      buildBotBarcode({
        billerId: '099999999999990',
        ref1: 'CUST01',
        amount: 10_000_000_000,
      }),
    ).toThrow(RangeError);
  });
});

describe('parseBotBarcode — happy paths', () => {
  it('parses the minimal biller + ref1 form', () => {
    const parsed = parseBotBarcode('|099999999999990\r111222333444\r\r0');
    expect(parsed).toEqual({
      billerId: '099999999999990',
      ref1: '111222333444',
    });
  });

  it('parses the full biller + ref1 + ref2 + amount form', () => {
    const parsed = parseBotBarcode('|099400016550100\r123456789012\r670429\r364922');
    expect(parsed).toEqual({
      billerId: '099400016550100',
      ref1: '123456789012',
      ref2: '670429',
      amount: 3649.22,
    });
  });

  it('omits ref2 when empty on the wire', () => {
    const parsed = parseBotBarcode('|099999999999990\rCUST01\r\r0');
    expect(parsed).toEqual({ billerId: '099999999999990', ref1: 'CUST01' });
  });

  it('omits amount when "0" sentinel is present', () => {
    const parsed = parseBotBarcode('|099999999999990\rCUST01\rREF99\r0');
    expect(parsed).toEqual({
      billerId: '099999999999990',
      ref1: 'CUST01',
      ref2: 'REF99',
    });
  });

  it('keeps ref2 when amount is present', () => {
    const parsed = parseBotBarcode('|099999999999990\rCUST01\rREF99\r5000');
    expect(parsed).toEqual({
      billerId: '099999999999990',
      ref1: 'CUST01',
      ref2: 'REF99',
      amount: 50,
    });
  });

  it('decodes integer satang back to baht', () => {
    const parsed = parseBotBarcode('|099999999999990\rCUST01\r\r12345');
    expect(parsed?.amount).toBe(123.45);
  });
});

describe('parseBotBarcode — invalid input', () => {
  it('returns null when prefix is missing', () => {
    expect(parseBotBarcode('099999999999990\rCUST01\r\r0')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBotBarcode('')).toBeNull();
  });

  it('returns null when only the prefix is present', () => {
    expect(parseBotBarcode('|')).toBeNull();
  });

  it('returns null when the field count is wrong (too few)', () => {
    expect(parseBotBarcode('|099999999999990\rCUST01\r0')).toBeNull();
  });

  it('returns null when the field count is wrong (too many)', () => {
    expect(parseBotBarcode('|099999999999990\rCUST01\r\r0\rextra')).toBeNull();
  });

  it('returns null when billerId is shorter than 15 chars', () => {
    expect(parseBotBarcode('|12345\rCUST01\r\r0')).toBeNull();
  });

  it('returns null when ref1 is empty', () => {
    expect(parseBotBarcode('|099999999999990\r\r\r0')).toBeNull();
  });

  it('returns null when amount is empty', () => {
    expect(parseBotBarcode('|099999999999990\rCUST01\r\r')).toBeNull();
  });

  it('returns null when amount has non-digit chars', () => {
    expect(parseBotBarcode('|099999999999990\rCUST01\r\r12.34')).toBeNull();
  });

  it('returns null when amount has a sign', () => {
    expect(parseBotBarcode('|099999999999990\rCUST01\r\r-100')).toBeNull();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  it('returns null for non-string input', () => {
    // Defensive: callers in JS may pass numbers or null.
    expect(parseBotBarcode(null as unknown as string)).toBeNull();
    expect(parseBotBarcode(undefined as unknown as string)).toBeNull();
    expect(parseBotBarcode(123 as unknown as string)).toBeNull();
  });
});

describe('round-trip — build then parse', () => {
  it('round-trips the minimal worked example', () => {
    const input = { billerId: '099999999999990', ref1: '111222333444' };
    const wire = buildBotBarcode(input);
    expect(parseBotBarcode(wire)).toEqual(input);
  });

  it('round-trips the full worked example', () => {
    const input = {
      billerId: '099400016550100',
      ref1: '123456789012',
      ref2: '670429',
      amount: 3649.22,
    };
    const wire = buildBotBarcode(input);
    expect(parseBotBarcode(wire)).toEqual(input);
  });

  it('round-trips with ref2 but no amount', () => {
    const input = { billerId: '099999999999990', ref1: 'CUST01', ref2: 'REF99' };
    const wire = buildBotBarcode(input);
    expect(parseBotBarcode(wire)).toEqual(input);
  });

  it('round-trips with amount but no ref2', () => {
    const input = { billerId: '099999999999990', ref1: 'CUST01', amount: 50 };
    const wire = buildBotBarcode(input);
    expect(parseBotBarcode(wire)).toEqual(input);
  });

  it('round-trips a fractional amount exactly', () => {
    const input = { billerId: '099999999999990', ref1: 'CUST01', amount: 0.05 };
    const wire = buildBotBarcode(input);
    expect(parseBotBarcode(wire)).toEqual(input);
  });

  it('round-trips a zero-padded short biller id', () => {
    const wire = buildBotBarcode({ billerId: '12345', ref1: 'CUST01' });
    const parsed = parseBotBarcode(wire);
    expect(parsed?.billerId).toBe('000000000012345');
  });
});
