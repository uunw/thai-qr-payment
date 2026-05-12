import { describe, expect, it } from 'vitest';
import { encodeQR } from './encoder.js';
import { detectMode } from './mode.js';

describe('encodeQR — basic shapes', () => {
  it('encodes a short numeric string as version 1', () => {
    const out = encodeQR('12345', { errorCorrectionLevel: 'M' });
    expect(out.version).toBe(1);
    expect(out.size).toBe(21);
    expect(out.modules.length).toBe(21);
    expect(out.modules[0]?.length).toBe(21);
  });

  it('matrix dimension matches (v − 1) × 4 + 21', () => {
    for (const text of ['1', '12345', 'HELLO', '0'.repeat(50)]) {
      const out = encodeQR(text);
      expect(out.size).toBe((out.version - 1) * 4 + 21);
    }
  });
});

describe('encodeQR — fixed patterns', () => {
  it('places top-left finder pattern correctly', () => {
    const out = encodeQR('HELLO', { errorCorrectionLevel: 'M' });
    // Finder corners
    expect(out.modules[0]?.[0]).toBe(true);
    expect(out.modules[0]?.[6]).toBe(true);
    expect(out.modules[6]?.[0]).toBe(true);
    expect(out.modules[6]?.[6]).toBe(true);
    // Inner 3×3 core
    expect(out.modules[2]?.[2]).toBe(true);
    expect(out.modules[4]?.[4]).toBe(true);
    expect(out.modules[3]?.[3]).toBe(true);
    // Separator strip just outside the finder
    expect(out.modules[7]?.[0]).toBe(false);
    expect(out.modules[0]?.[7]).toBe(false);
  });

  it('places top-right finder pattern', () => {
    const out = encodeQR('HELLO');
    const right = out.size - 1;
    expect(out.modules[0]?.[right]).toBe(true);
    expect(out.modules[0]?.[right - 6]).toBe(true);
    expect(out.modules[6]?.[right]).toBe(true);
    expect(out.modules[6]?.[right - 6]).toBe(true);
  });

  it('places bottom-left finder pattern', () => {
    const out = encodeQR('HELLO');
    const bottom = out.size - 1;
    expect(out.modules[bottom]?.[0]).toBe(true);
    expect(out.modules[bottom - 6]?.[0]).toBe(true);
    expect(out.modules[bottom]?.[6]).toBe(true);
    expect(out.modules[bottom - 6]?.[6]).toBe(true);
  });

  it('places the dark module at (8, 4v + 9)', () => {
    for (const text of ['12345', 'HELLO']) {
      const out = encodeQR(text);
      expect(out.modules[4 * out.version + 9]?.[8]).toBe(true);
    }
  });

  it('emits alternating timing pattern in row 6', () => {
    const out = encodeQR('HELLO');
    const row = out.modules[6];
    if (row == null) throw new Error('row 6 missing');
    for (let x = 8; x < out.size - 8; x += 1) {
      // even position dark, odd light (per spec)
      expect(row[x]).toBe(x % 2 === 0);
    }
  });

  it('emits alternating timing pattern in column 6', () => {
    const out = encodeQR('HELLO');
    for (let y = 8; y < out.size - 8; y += 1) {
      expect(out.modules[y]?.[6]).toBe(y % 2 === 0);
    }
  });
});

describe('encodeQR — mode selection', () => {
  it('selects alphanumeric mode for EMV-style payloads', () => {
    const payload = '00020101021129370016A000000677010111';
    expect(detectMode(payload)).toBe('alphanumeric');
    const out = encodeQR(payload, { errorCorrectionLevel: 'M' });
    expect(out.version).toBeGreaterThanOrEqual(2);
    expect(out.size).toBe((out.version - 1) * 4 + 21);
  });

  it('scales to bigger versions for longer inputs', () => {
    const long = '0'.repeat(400);
    const out = encodeQR(long, { errorCorrectionLevel: 'L' });
    expect(out.version).toBeGreaterThan(5);
  });

  it('encodes maximum-size alphanumeric input at v40-L', () => {
    const long = 'A'.repeat(4000);
    const out = encodeQR(long, { errorCorrectionLevel: 'L' });
    expect(out.version).toBeGreaterThanOrEqual(30);
  });
});

describe('encodeQR — ECC levels', () => {
  it.each(['L', 'M', 'Q', 'H'] as const)('encodes with ECC %s', (ecc) => {
    const out = encodeQR('HELLO', { errorCorrectionLevel: ecc });
    expect(out.errorCorrectionLevel).toBe(ecc);
  });

  it('higher ECC may need bigger version for same payload', () => {
    const text = '0'.repeat(100);
    const l = encodeQR(text, { errorCorrectionLevel: 'L' }).version;
    const h = encodeQR(text, { errorCorrectionLevel: 'H' }).version;
    expect(h).toBeGreaterThanOrEqual(l);
  });
});

describe('encodeQR — mask selection', () => {
  it('chooses a mask in 0..7 by default', () => {
    const out = encodeQR('HELLO');
    expect(out.mask).toBeGreaterThanOrEqual(0);
    expect(out.mask).toBeLessThanOrEqual(7);
  });

  it('respects forceMask option', () => {
    for (let m = 0; m < 8; m += 1) {
      const out = encodeQR('TEST', { forceMask: m });
      expect(out.mask).toBe(m);
    }
  });

  it('produces different output for different forced masks', () => {
    const a = encodeQR('TEST', { forceMask: 0 });
    const b = encodeQR('TEST', { forceMask: 3 });
    expect(a.modules.flat().join('')).not.toBe(b.modules.flat().join(''));
  });
});

describe('encodeQR — error cases', () => {
  it('throws when input is too large for the version range', () => {
    expect(() => encodeQR('0'.repeat(8000), { errorCorrectionLevel: 'H', maxVersion: 5 })).toThrow(
      /does not fit/,
    );
  });

  it('throws RangeError when input exceeds spec capacity', () => {
    expect(() => encodeQR('0'.repeat(20_000), { errorCorrectionLevel: 'H' })).toThrow(RangeError);
  });
});

describe('encodeQR — determinism', () => {
  it('same input produces identical matrix', () => {
    const a = encodeQR('HELLO', { errorCorrectionLevel: 'M', forceMask: 2 });
    const b = encodeQR('HELLO', { errorCorrectionLevel: 'M', forceMask: 2 });
    expect(a.modules.flat()).toEqual(b.modules.flat());
    expect(a.mask).toBe(b.mask);
    expect(a.version).toBe(b.version);
  });

  it('default mask choice is stable across runs', () => {
    const first = encodeQR('PROMPTPAY');
    const second = encodeQR('PROMPTPAY');
    expect(first.mask).toBe(second.mask);
  });
});

describe('encodeQR — Thai QR Payment payloads', () => {
  it('encodes a real Thai QR Payment payload', () => {
    const wire =
      '00020101021229370016A00000067701011101130066812345678530376454065000.005802TH6304' + 'ABCD';
    const out = encodeQR(wire, { errorCorrectionLevel: 'M' });
    expect(out.version).toBeLessThanOrEqual(15);
    expect(out.errorCorrectionLevel).toBe('M');
  });

  it('encodes at ECC H for added robustness (e.g. with logo overlay)', () => {
    const wire =
      '00020101021229370016A00000067701011101130066812345678530376454065000.005802TH6304ABCD';
    const out = encodeQR(wire, { errorCorrectionLevel: 'H' });
    expect(out.errorCorrectionLevel).toBe('H');
  });
});

describe('encodeQR — version range options', () => {
  it('honours minVersion', () => {
    const out = encodeQR('1', { minVersion: 10 });
    expect(out.version).toBeGreaterThanOrEqual(10);
  });

  it('honours maxVersion', () => {
    expect(() => encodeQR('0'.repeat(2000), { maxVersion: 5, errorCorrectionLevel: 'M' })).toThrow(
      /does not fit/,
    );
  });

  it('minVersion = maxVersion forces exact version', () => {
    const out = encodeQR('1', { minVersion: 7, maxVersion: 7 });
    expect(out.version).toBe(7);
  });
});
