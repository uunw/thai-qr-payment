import { describe, expect, it } from 'vitest';
import { encodeBlock } from './rs.js';

describe('encodeBlock — output shape', () => {
  it('returns ecLen codewords', () => {
    const data = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    expect(encodeBlock(data, 4).length).toBe(4);
    expect(encodeBlock(data, 7).length).toBe(7);
    expect(encodeBlock(data, 30).length).toBe(30);
  });

  it('handles single-byte data', () => {
    expect(encodeBlock(new Uint8Array([1]), 10).length).toBe(10);
  });

  it('handles empty data', () => {
    expect(encodeBlock(new Uint8Array(0), 10).length).toBe(10);
  });

  it('handles 255-byte data (max block size)', () => {
    const data = new Uint8Array(255).fill(0xaa);
    expect(encodeBlock(data, 30).length).toBe(30);
  });
});

describe('encodeBlock — determinism', () => {
  it('is deterministic for the same input', () => {
    const data = new Uint8Array([0x10, 0x00, 0x0c, 0x56, 0x61, 0x80]);
    const first = encodeBlock(data, 10);
    const second = encodeBlock(data, 10);
    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it('is deterministic across many random inputs', () => {
    for (let i = 0; i < 30; i += 1) {
      const data = Uint8Array.from({ length: 16 }, (_, k) => (k * 7 + i) & 0xff);
      const a = encodeBlock(data, 10);
      const b = encodeBlock(data, 10);
      expect(Array.from(a)).toEqual(Array.from(b));
    }
  });
});

describe('encodeBlock — properties', () => {
  it('produces non-zero ECC for non-zero data', () => {
    const data = new Uint8Array([0x10, 0x00, 0x0c, 0x56, 0x61, 0x80]);
    const ec = encodeBlock(data, 10);
    const sum = Array.from(ec).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });

  it('all-zero data produces all-zero ECC', () => {
    const ec = encodeBlock(new Uint8Array(16), 10);
    expect(Array.from(ec)).toEqual(Array.from(new Uint8Array(10)));
  });

  it('is linear: enc(a) XOR enc(b) === enc(a XOR b)', () => {
    const a = new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50]);
    const b = new Uint8Array([0x55, 0xaa, 0x33, 0x66, 0x99]);
    const xored = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i += 1) xored[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
    const ea = encodeBlock(a, 8);
    const eb = encodeBlock(b, 8);
    const exored = encodeBlock(xored, 8);
    for (let i = 0; i < 8; i += 1) {
      expect((ea[i] ?? 0) ^ (eb[i] ?? 0)).toBe(exored[i] ?? 0);
    }
  });

  it('different inputs produce different ECC almost always', () => {
    const same: string[] = [];
    for (let i = 0; i < 30; i += 1) {
      const a = Uint8Array.from({ length: 8 }, (_, k) => (k + i) & 0xff);
      const b = Uint8Array.from({ length: 8 }, (_, k) => (k + i + 1) & 0xff);
      const ea = Array.from(encodeBlock(a, 10)).join(',');
      const eb = Array.from(encodeBlock(b, 10)).join(',');
      if (ea === eb) same.push(`${i}`);
    }
    expect(same.length).toBeLessThan(2);
  });

  it('a single-byte change propagates to the ECC', () => {
    const a = new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
    const b = new Uint8Array(a);
    b[3] = 0x41; // flip one byte
    const ea = Array.from(encodeBlock(a, 10));
    const eb = Array.from(encodeBlock(b, 10));
    expect(ea).not.toEqual(eb);
  });
});

describe('encodeBlock — various ec lengths', () => {
  // QR uses ec lengths 7, 10, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30.
  it.each([7, 10, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30])(
    'ecLen=%i produces correct length',
    (n) => {
      expect(encodeBlock(new Uint8Array([1, 2, 3]), n).length).toBe(n);
    },
  );
});
