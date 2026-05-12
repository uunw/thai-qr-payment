import { describe, expect, it } from 'vitest';
import { encodeField, encodeFields, iterateFields, parseFields } from './tlv.js';

describe('encodeField', () => {
  it('produces tag + 2-digit length + value', () => {
    expect(encodeField('00', '01')).toBe('000201');
    expect(encodeField('58', 'TH')).toBe('5802TH');
  });

  it('zero-pads single-digit lengths', () => {
    expect(encodeField('99', 'X')).toBe('9901X');
  });

  it('handles empty value with length 00', () => {
    expect(encodeField('63', '')).toBe('6300');
  });

  it('throws when value is over 99 bytes', () => {
    expect(() => encodeField('00', 'x'.repeat(100))).toThrow(/exceeds 99 bytes/);
  });

  it('accepts exactly 99-char value', () => {
    const value = 'x'.repeat(99);
    expect(encodeField('29', value)).toBe(`2999${value}`);
  });

  it('handles arbitrary printable ASCII', () => {
    expect(encodeField('60', 'BANGKOK')).toBe('6007BANGKOK');
    expect(encodeField('59', 'Acme Coffee')).toBe('5911Acme Coffee');
  });

  it('preserves embedded spaces in value', () => {
    expect(encodeField('60', 'A B C')).toBe('6005A B C');
  });

  it('preserves alphanumeric punctuation per EMVCo set', () => {
    expect(encodeField('00', 'A$%*+-./:')).toBe('0009A$%*+-./:');
  });

  it('handles digit-only tags', () => {
    for (let i = 0; i <= 99; i += 1) {
      const tag = i.toString(10).padStart(2, '0');
      expect(encodeField(tag, 'X')).toBe(`${tag}01X`);
    }
  });

  it('throws cleanly for negative-ish edge: 100-char value', () => {
    expect(() => encodeField('00', 'a'.repeat(100))).toThrow(RangeError);
  });
});

describe('encodeFields', () => {
  it('skips null, undefined, and empty-string values', () => {
    const out = encodeFields([
      ['00', '01'],
      ['01', ''],
      ['58', null],
      ['53', '764'],
      ['54', undefined],
    ]);
    expect(out).toBe('00020153037' + '64');
  });

  it('returns empty string for all-empty input', () => {
    expect(encodeFields([])).toBe('');
    expect(encodeFields([['00', '']])).toBe('');
    expect(encodeFields([['00', null]])).toBe('');
  });

  it('keeps insertion order', () => {
    const out = encodeFields([
      ['53', '764'],
      ['00', '01'],
      ['58', 'TH'],
    ]);
    expect(out).toBe('5303764000201' + '5802TH');
  });

  it('handles duplicate tags by emitting both', () => {
    // Builder usage will dedupe via Map; the raw encoder should not.
    expect(
      encodeFields([
        ['62', 'A'],
        ['62', 'B'],
      ]),
    ).toBe('6201A6201B');
  });

  it('treats "0" as a valid non-empty value', () => {
    expect(encodeFields([['54', '0']])).toBe('54010');
  });
});

describe('iterateFields / parseFields', () => {
  it('round-trips encoded fields', () => {
    const encoded = encodeFields([
      ['00', '01'],
      ['58', 'TH'],
      ['53', '764'],
    ]);
    const parsed = parseFields(encoded);
    expect(parsed.get('00')).toBe('01');
    expect(parsed.get('58')).toBe('TH');
    expect(parsed.get('53')).toBe('764');
  });

  it('walks nested templates as opaque values', () => {
    const inner = encodeField('00', 'A000000677010111') + encodeField('01', '0066812345678');
    const outer = encodeField('29', inner);
    const fields = [...iterateFields(outer)];
    expect(fields).toHaveLength(1);
    expect(fields[0]?.tag).toBe('29');
    expect(fields[0]?.value).toBe(inner);
  });

  it('parses multiple nested templates side-by-side', () => {
    const inner29 = encodeField('00', 'A000000677010111') + encodeField('01', '0066812345678');
    const inner62 = encodeField('01', 'INV001') + encodeField('07', 'T01');
    const outer = encodeField('29', inner29) + encodeField('62', inner62);
    const parsed = parseFields(outer);
    expect(parsed.get('29')).toBe(inner29);
    expect(parsed.get('62')).toBe(inner62);
  });

  it('returns empty Map for empty input', () => {
    expect(parseFields('').size).toBe(0);
  });

  it('throws on truncated header', () => {
    expect(() => parseFields('00')).toThrow(/Truncated TLV header/);
    expect(() => parseFields('001')).toThrow(/Truncated TLV header/);
  });

  it('throws on truncated value', () => {
    expect(() => parseFields('001099')).toThrow(/runs past end/);
  });

  it('throws on non-numeric length', () => {
    expect(() => parseFields('00XXfoo')).toThrow(/Invalid TLV length/);
    expect(() => parseFields('00X1Y')).toThrow(/Invalid TLV length/);
  });

  it('throws on non-numeric length (alphabetic chars)', () => {
    expect(() => parseFields('00ZZX')).toThrow(/Invalid TLV length/);
  });

  it('iterateFields produces one yield per field', () => {
    const encoded = encodeFields([
      ['00', '01'],
      ['58', 'TH'],
      ['53', '764'],
    ]);
    const list = [...iterateFields(encoded)];
    expect(list.map((f) => f.tag)).toEqual(['00', '58', '53']);
    expect(list.map((f) => f.value)).toEqual(['01', 'TH', '764']);
  });

  it('iterateFields halts cleanly at EOF', () => {
    const list = [...iterateFields('')];
    expect(list).toEqual([]);
  });

  it('handles exactly-99-byte values', () => {
    const value = 'x'.repeat(99);
    const wire = `2999${value}`;
    expect(parseFields(wire).get('29')).toBe(value);
  });

  it('preserves field-order even when tags are non-monotonic', () => {
    const wire = encodeField('63', 'CRC') + encodeField('00', '01');
    const list = [...iterateFields(wire)];
    expect(list.map((f) => f.tag)).toEqual(['63', '00']);
  });

  it('rejects input whose length header points past EOF', () => {
    expect(() => parseFields('001050')).toThrow(/runs past end/);
  });
});
