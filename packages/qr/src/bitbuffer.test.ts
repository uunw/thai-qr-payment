import { describe, expect, it } from 'vitest';
import { BitBuffer } from './bitbuffer.js';

describe('BitBuffer', () => {
  it('starts empty', () => {
    const buf = new BitBuffer();
    expect(buf.length).toBe(0);
    expect(buf.toBytes().length).toBe(0);
  });

  it('pushes single bits MSB-first', () => {
    const buf = new BitBuffer();
    buf.push(1, 1);
    buf.push(0, 1);
    buf.push(1, 1);
    expect(buf.length).toBe(3);
    expect(buf.toBytes()[0]).toBe(0b10100000);
  });

  it('packs bits across byte boundaries', () => {
    const buf = new BitBuffer();
    for (let i = 0; i < 16; i += 1) buf.push(i & 1, 1);
    expect(buf.length).toBe(16);
    expect(buf.toBytes()).toEqual(new Uint8Array([0x55, 0x55]));
  });

  it('pushes multi-bit values', () => {
    const buf = new BitBuffer();
    buf.push(0b101, 3);
    buf.push(0b1100, 4);
    expect(buf.length).toBe(7);
    // 101 1100 = 1011 1000 (padded right) = 0xB8
    expect(buf.toBytes()[0]).toBe(0b10111000);
  });

  it('grows past initial capacity', () => {
    const buf = new BitBuffer(8);
    for (let i = 0; i < 100; i += 1) buf.push(1, 1);
    expect(buf.length).toBe(100);
    expect(buf.toBytes().length).toBe(Math.ceil(100 / 8));
  });

  it('throws when count is over 31', () => {
    const buf = new BitBuffer();
    expect(() => buf.push(0, 32)).toThrow(RangeError);
  });

  it('throws when count is negative', () => {
    const buf = new BitBuffer();
    expect(() => buf.push(0, -1)).toThrow(RangeError);
  });

  it('treats count = 0 as a no-op', () => {
    const buf = new BitBuffer();
    buf.push(0xff, 0);
    expect(buf.length).toBe(0);
  });

  it('stores 8-bit byte values as expected', () => {
    const buf = new BitBuffer();
    buf.push(0xab, 8);
    buf.push(0xcd, 8);
    expect(buf.toBytes()).toEqual(new Uint8Array([0xab, 0xcd]));
  });

  it('handles 16-bit pushes', () => {
    const buf = new BitBuffer();
    buf.push(0xabcd, 16);
    expect(buf.toBytes()).toEqual(new Uint8Array([0xab, 0xcd]));
  });

  it('pads partial trailing byte with zeros', () => {
    const buf = new BitBuffer();
    buf.push(0b101, 3);
    const bytes = buf.toBytes();
    expect(bytes.length).toBe(1);
    expect(bytes[0]).toBe(0b10100000);
  });

  it('toBytes is idempotent', () => {
    const buf = new BitBuffer();
    buf.push(0x42, 8);
    const a = buf.toBytes();
    const b = buf.toBytes();
    expect(a).toEqual(b);
  });

  it('truncates pushed value to count bits', () => {
    const buf = new BitBuffer();
    buf.push(0xff, 4); // Only low 4 bits stored
    expect(buf.length).toBe(4);
    expect(buf.toBytes()[0]).toBe(0b11110000);
  });
});
