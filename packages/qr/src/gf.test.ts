import { describe, expect, it } from 'vitest';
import { EXP, LOG, mul } from './gf.js';

describe('GF(2^8) lookup tables', () => {
  it('EXP table has length 512 (255 + mirror)', () => {
    expect(EXP.length).toBe(512);
  });

  it('LOG table has length 256', () => {
    expect(LOG.length).toBe(256);
  });

  it('EXP[0] === 1 (alpha^0)', () => {
    expect(EXP[0]).toBe(1);
  });

  it('EXP and LOG are inverses for non-zero values', () => {
    for (let v = 1; v < 256; v += 1) {
      const exp = EXP[LOG[v] ?? 0];
      expect(exp).toBe(v);
    }
  });

  it('mirror region duplicates the primary range', () => {
    for (let i = 0; i < 255; i += 1) {
      expect(EXP[i + 255]).toBe(EXP[i]);
    }
  });

  it('every non-zero value appears once in EXP[0..255]', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 255; i += 1) seen.add(EXP[i] ?? 0);
    expect(seen.size).toBe(255);
    expect(seen.has(0)).toBe(false);
  });
});

describe('mul()', () => {
  it('multiplying by zero returns zero', () => {
    for (const v of [1, 17, 99, 255]) {
      expect(mul(0, v)).toBe(0);
      expect(mul(v, 0)).toBe(0);
    }
    expect(mul(0, 0)).toBe(0);
  });

  it('multiplying by one is identity', () => {
    for (const v of [1, 17, 99, 200, 255]) {
      expect(mul(1, v)).toBe(v);
      expect(mul(v, 1)).toBe(v);
    }
  });

  it('is commutative', () => {
    for (const a of [3, 17, 200]) {
      for (const b of [5, 99, 255]) {
        expect(mul(a, b)).toBe(mul(b, a));
      }
    }
  });

  it('output is always in 0..255', () => {
    for (let a = 0; a < 256; a += 8) {
      for (let b = 0; b < 256; b += 8) {
        const out = mul(a, b);
        expect(out).toBeGreaterThanOrEqual(0);
        expect(out).toBeLessThanOrEqual(255);
      }
    }
  });

  it('matches known products in GF(2^8) under poly 0x11D', () => {
    // alpha^1 * alpha^1 = alpha^2 = 4
    expect(mul(2, 2)).toBe(4);
    // alpha^7 * alpha^1 = alpha^8 = 0x1D
    expect(mul(128, 2)).toBe(0x1d);
  });

  it('is associative across many triples', () => {
    for (let i = 0; i < 50; i += 1) {
      const a = (i * 7 + 1) & 0xff;
      const b = (i * 13 + 17) & 0xff;
      const c = (i * 31 + 99) & 0xff;
      expect(mul(mul(a, b), c)).toBe(mul(a, mul(b, c)));
    }
  });

  it('distributes over XOR (the field addition)', () => {
    for (let i = 0; i < 20; i += 1) {
      const a = (i * 3 + 5) & 0xff;
      const b = (i * 11 + 7) & 0xff;
      const c = (i * 17 + 11) & 0xff;
      // a * (b XOR c) == (a*b) XOR (a*c)
      expect(mul(a, b ^ c)).toBe(mul(a, b) ^ mul(a, c));
    }
  });
});
