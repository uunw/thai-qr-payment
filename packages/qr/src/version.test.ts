import { describe, expect, it } from 'vitest';
import {
  alignmentCentres,
  ECC_BITS,
  getBlockSpec,
  moduleCount,
  totalCodewords,
} from './version.js';

describe('moduleCount', () => {
  it('version 1 → 21 modules', () => {
    expect(moduleCount(1)).toBe(21);
  });

  it('version 2 → 25 modules', () => {
    expect(moduleCount(2)).toBe(25);
  });

  it('version 7 → 45 modules', () => {
    expect(moduleCount(7)).toBe(45);
  });

  it('version 40 → 177 modules', () => {
    expect(moduleCount(40)).toBe(177);
  });

  it('follows formula (v − 1) × 4 + 21', () => {
    for (let v = 1; v <= 40; v += 1) {
      expect(moduleCount(v)).toBe((v - 1) * 4 + 21);
    }
  });
});

describe('alignmentCentres', () => {
  it('returns empty list for version 1', () => {
    expect(alignmentCentres(1)).toEqual([]);
  });

  // Sourced from ISO/IEC 18004 Annex E. These are load-bearing — if the
  // returned set drifts from the spec, scanners reject the QR even
  // though every other layer (finders, format-info, RS-ECC) is correct.
  it.each([
    [2, [6, 18]],
    [3, [6, 22]],
    [4, [6, 26]],
    [5, [6, 30]],
    [6, [6, 34]],
    [7, [6, 22, 38]],
    [10, [6, 28, 50]],
    [14, [6, 26, 46, 66]],
    [20, [6, 34, 62, 90]],
    [40, [6, 30, 58, 86, 114, 142, 170]],
  ] as const)('v%i matches the ISO/IEC 18004 Annex E table', (version, expected) => {
    expect(alignmentCentres(version)).toEqual(expected);
  });

  it('always starts at 6 (top-left finder edge)', () => {
    for (let v = 2; v <= 40; v += 1) {
      expect(alignmentCentres(v)[0]).toBe(6);
    }
  });

  it('returns count = floor(v/7) + 2 entries for v >= 2', () => {
    for (let v = 2; v <= 40; v += 1) {
      expect(alignmentCentres(v).length).toBe(Math.floor(v / 7) + 2);
    }
  });

  it('all centres are inside the matrix', () => {
    for (let v = 2; v <= 40; v += 1) {
      const dim = moduleCount(v);
      for (const c of alignmentCentres(v)) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(dim);
      }
    }
  });

  it('returns entries in strictly ascending order', () => {
    for (let v = 2; v <= 40; v += 1) {
      const cs = alignmentCentres(v);
      for (let i = 1; i < cs.length; i += 1) {
        expect(cs[i]!).toBeGreaterThan(cs[i - 1]!);
      }
    }
  });
});

describe('getBlockSpec', () => {
  it('v1-L has 19 data codewords + 7 ECC', () => {
    const spec = getBlockSpec(1, 'L');
    expect(spec.dataCodewords).toBe(19);
    expect(spec.ecPerBlock).toBe(7);
  });

  it('v1-M has 16 data codewords + 10 ECC', () => {
    const spec = getBlockSpec(1, 'M');
    expect(spec.dataCodewords).toBe(16);
    expect(spec.ecPerBlock).toBe(10);
  });

  it('v1-H has 9 data codewords + 17 ECC', () => {
    const spec = getBlockSpec(1, 'H');
    expect(spec.dataCodewords).toBe(9);
    expect(spec.ecPerBlock).toBe(17);
  });

  it('v40-H has 1276 data codewords + 30 ECC', () => {
    const spec = getBlockSpec(40, 'H');
    expect(spec.dataCodewords).toBe(1276);
    expect(spec.ecPerBlock).toBe(30);
  });

  it('throws for invalid version', () => {
    expect(() => getBlockSpec(0, 'M')).toThrow(RangeError);
    expect(() => getBlockSpec(41, 'M')).toThrow(RangeError);
  });

  it('returns at least one group', () => {
    for (let v = 1; v <= 40; v += 1) {
      for (const ecc of ['L', 'M', 'Q', 'H'] as const) {
        const spec = getBlockSpec(v, ecc);
        expect(spec.groups.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('totalCodewords', () => {
  it('v1-L → 26 total', () => {
    expect(totalCodewords(1, 'L')).toBe(26);
  });

  it('v1-M → 26 total', () => {
    expect(totalCodewords(1, 'M')).toBe(26);
  });

  it('every version has consistent total across ECC levels (within tolerance)', () => {
    for (let v = 1; v <= 40; v += 1) {
      const totals = (['L', 'M', 'Q', 'H'] as const).map((ecc) => totalCodewords(v, ecc));
      // Spec invariant: total codewords is roughly constant for a given
      // version (data + ECC sums to module-area capacity).
      const min = Math.min(...totals);
      const max = Math.max(...totals);
      expect(max - min).toBeLessThanOrEqual(2);
    }
  });
});

describe('ECC_BITS', () => {
  it('maps each ECC level to its 2-bit format constant', () => {
    expect(ECC_BITS.L).toBe(0b01);
    expect(ECC_BITS.M).toBe(0b00);
    expect(ECC_BITS.Q).toBe(0b11);
    expect(ECC_BITS.H).toBe(0b10);
  });
});
