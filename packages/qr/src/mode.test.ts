import { describe, expect, it } from 'vitest';
import { BitBuffer } from './bitbuffer.js';
import { charCountBits, dataBitLength, detectMode, emitSegment, MODE_INDICATOR } from './mode.js';

describe('detectMode', () => {
  it('detects numeric for digit-only strings', () => {
    expect(detectMode('1234567890')).toBe('numeric');
    expect(detectMode('0')).toBe('numeric');
    expect(detectMode('00000')).toBe('numeric');
  });

  it('detects alphanumeric for EMV charset', () => {
    expect(detectMode('00020101021129AB-./:')).toBe('alphanumeric');
    expect(detectMode('ABCDEF')).toBe('alphanumeric');
    expect(detectMode('HELLO WORLD')).toBe('alphanumeric');
    expect(detectMode('A$%*+-./:')).toBe('alphanumeric');
  });

  it('falls back to byte for lowercase', () => {
    expect(detectMode('hello')).toBe('byte');
    expect(detectMode('abc')).toBe('byte');
    expect(detectMode('Hello World')).toBe('byte');
  });

  it('falls back to byte for non-ASCII', () => {
    expect(detectMode('สวัสดี')).toBe('byte');
    expect(detectMode('世界')).toBe('byte');
    expect(detectMode('café')).toBe('byte');
  });

  it('falls back to byte for special chars not in alphanumeric set', () => {
    expect(detectMode('hello!')).toBe('byte');
    expect(detectMode('foo@bar')).toBe('byte');
    expect(detectMode('a=b')).toBe('byte');
  });

  it('handles single chars', () => {
    expect(detectMode('A')).toBe('alphanumeric');
    expect(detectMode('1')).toBe('numeric');
    expect(detectMode('a')).toBe('byte');
  });
});

describe('charCountBits', () => {
  it.each([
    [1, 'numeric', 10],
    [1, 'alphanumeric', 9],
    [1, 'byte', 8],
    [9, 'numeric', 10],
    [10, 'numeric', 12],
    [10, 'alphanumeric', 11],
    [10, 'byte', 16],
    [26, 'alphanumeric', 11],
    [27, 'numeric', 14],
    [27, 'alphanumeric', 13],
    [40, 'numeric', 14],
    [40, 'byte', 16],
  ] as const)('v%i %s → %i bits', (version, mode, expected) => {
    expect(charCountBits(mode, version)).toBe(expected);
  });

  it('boundary v9 → v10 widens numeric counter', () => {
    expect(charCountBits('numeric', 9)).toBe(10);
    expect(charCountBits('numeric', 10)).toBe(12);
  });

  it('boundary v26 → v27 widens alphanumeric counter', () => {
    expect(charCountBits('alphanumeric', 26)).toBe(11);
    expect(charCountBits('alphanumeric', 27)).toBe(13);
  });
});

describe('dataBitLength', () => {
  it('matches expected bit cost for numeric', () => {
    expect(dataBitLength('numeric', '123', 1)).toBe(14 + 10);
    expect(dataBitLength('numeric', '12', 1)).toBe(14 + 7);
    expect(dataBitLength('numeric', '1', 1)).toBe(14 + 4);
    expect(dataBitLength('numeric', '', 1)).toBe(14);
  });

  it('matches expected bit cost for alphanumeric', () => {
    expect(dataBitLength('alphanumeric', 'AB', 1)).toBe(13 + 11);
    expect(dataBitLength('alphanumeric', 'A', 1)).toBe(13 + 6);
    expect(dataBitLength('alphanumeric', '', 1)).toBe(13);
  });

  it('matches expected bit cost for byte mode', () => {
    expect(dataBitLength('byte', 'A', 1)).toBe(12 + 8);
    expect(dataBitLength('byte', 'AB', 1)).toBe(12 + 16);
  });

  it('grows with longer inputs', () => {
    expect(dataBitLength('numeric', '123456', 1)).toBeGreaterThan(
      dataBitLength('numeric', '123', 1),
    );
    expect(dataBitLength('alphanumeric', 'ABCDEF', 1)).toBeGreaterThan(
      dataBitLength('alphanumeric', 'AB', 1),
    );
  });
});

describe('emitSegment', () => {
  it('emits mode indicator + count + numeric data', () => {
    const bits = new BitBuffer();
    emitSegment('123', 'numeric', 1, bits);
    expect(bits.length).toBe(14 + 10);
    // First 4 bits are mode indicator 0b0001
    const firstByte = bits.toBytes()[0] ?? 0;
    expect((firstByte >> 4) & 0xf).toBe(MODE_INDICATOR.numeric);
  });

  it('emits mode indicator for alphanumeric', () => {
    const bits = new BitBuffer();
    emitSegment('AB', 'alphanumeric', 1, bits);
    const firstByte = bits.toBytes()[0] ?? 0;
    expect((firstByte >> 4) & 0xf).toBe(MODE_INDICATOR.alphanumeric);
  });

  it('emits mode indicator for byte', () => {
    const bits = new BitBuffer();
    emitSegment('a', 'byte', 1, bits);
    const firstByte = bits.toBytes()[0] ?? 0;
    expect((firstByte >> 4) & 0xf).toBe(MODE_INDICATOR.byte);
  });

  it('encodes UTF-8 multi-byte chars in byte mode', () => {
    const bits = new BitBuffer();
    emitSegment('ก', 'byte', 1, bits);
    // 'ก' is 3 bytes in UTF-8 → header(12) + 24 bits of data
    expect(bits.length).toBe(12 + 24);
  });

  it('throws when alphanumeric char is outside the spec set', () => {
    const bits = new BitBuffer();
    expect(() => emitSegment('a', 'alphanumeric', 1, bits)).toThrow(/alphanumeric set/);
  });
});

describe('MODE_INDICATOR constants', () => {
  it('matches the spec values', () => {
    expect(MODE_INDICATOR.numeric).toBe(0b0001);
    expect(MODE_INDICATOR.alphanumeric).toBe(0b0010);
    expect(MODE_INDICATOR.byte).toBe(0b0100);
  });
});
